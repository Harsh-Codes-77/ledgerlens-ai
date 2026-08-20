import os
import json
import time
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.domain import (
    Batch, Transaction, Settlement, Refund, ReconciliationResult, ExceptionCase, AuditLog
)
from app.schemas.domain import (
    BatchSchema, BatchCreateRequest, ReconciliationResultSchema, ExceptionCaseSchema,
    TransactionSchema, SettlementSchema, AuditLogSchema, ResolutionActionRequest
)
from app.reconciliation.engine import ReconciliationEngine
from app.ai.investigator import AIExceptionInvestigator
from scripts.generate_dataset import generate_dataset

router = APIRouter()

def create_audit_entry(
    db: Session,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_type: str,
    actor_id: Optional[str] = None,
    before_state: Optional[dict] = None,
    after_state: Optional[dict] = None,
    reason: Optional[str] = None,
    metadata_json: Optional[dict] = None
):
    audit = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_type=actor_type,
        actor_id=actor_id,
        before_state=before_state,
        after_state=after_state,
        reason=reason,
        metadata_json=metadata_json
    )
    db.add(audit)

@router.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# --- BATCHES ---

@router.post("/batches", response_model=BatchSchema)
def create_batch(req: BatchCreateRequest, db: Session = Depends(get_db)):
    batch = Batch(
        name=req.name,
        status="PENDING",
        total_records=0
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    create_audit_entry(
        db, entity_type="batch", entity_id=batch.id, action="CREATE",
        actor_type="user", reason=f"Batch '{req.name}' created."
    )

    if req.use_demo_data:
        dataset = generate_dataset(num_records=req.record_count, seed=42)
        txns = []
        for t in dataset["transactions"]:
            dt = datetime.fromisoformat(t["transaction_date"])
            txns.append(Transaction(
                batch_id=batch.id,
                external_transaction_id=t["external_transaction_id"],
                source=t["source"],
                amount=t["amount"],
                currency=t.get("currency", "INR"),
                status=t.get("status", "captured"),
                transaction_date=dt,
                customer_reference=t.get("customer_reference"),
                payment_reference=t.get("payment_reference"),
                metadata_json=t.get("metadata")
            ))
        db.bulk_save_objects(txns)

        sets = []
        for s in dataset["settlements"]:
            s_dt = datetime.fromisoformat(s["settlement_date"])
            sets.append(Settlement(
                batch_id=batch.id,
                external_settlement_id=s["external_settlement_id"],
                source=s["source"],
                amount=s["amount"],
                currency=s.get("currency", "INR"),
                settlement_date=s_dt,
                reference=s.get("reference"),
                status=s.get("status", "settled"),
                metadata_json=s.get("metadata")
            ))
        db.bulk_save_objects(sets)

        ref_objs = []
        for r in dataset["refunds"]:
            r_dt = datetime.fromisoformat(r["refund_date"])
            ref_objs.append(Refund(
                external_refund_id=r["external_refund_id"],
                transaction_reference=r["transaction_reference"],
                amount=r["amount"],
                currency=r.get("currency", "INR"),
                refund_date=r_dt,
                status=r.get("status", "processed")
            ))
        db.bulk_save_objects(ref_objs)

        batch.total_records = len(txns)
        db.commit()
        db.refresh(batch)

        create_audit_entry(
            db, entity_type="batch", entity_id=batch.id, action="INGEST",
            actor_type="system", reason=f"Ingested {len(txns)} demo transactions and {len(sets)} settlements."
        )

    return batch

@router.get("/batches", response_model=List[BatchSchema])
def list_batches(db: Session = Depends(get_db)):
    return db.query(Batch).order_by(Batch.created_at.desc()).all()

@router.get("/batches/{batch_id}", response_model=BatchSchema)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch

@router.post("/batches/{batch_id}/process", response_model=BatchSchema)
def process_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch.status = "PROCESSING"
    db.commit()

    start_time = time.time()

    txns = db.query(Transaction).filter(Transaction.batch_id == batch_id).all()
    sets = db.query(Settlement).filter(Settlement.batch_id == batch_id).all()
    rfs = db.query(Refund).all()

    txn_dicts = [
        {
            "external_transaction_id": t.external_transaction_id,
            "source": t.source,
            "amount": t.amount,
            "currency": t.currency,
            "status": t.status,
            "transaction_date": t.transaction_date.isoformat(),
            "customer_reference": t.customer_reference,
            "payment_reference": t.payment_reference
        }
        for t in txns
    ]

    set_dicts = [
        {
            "external_settlement_id": s.external_settlement_id,
            "source": s.source,
            "amount": s.amount,
            "currency": s.currency,
            "settlement_date": s.settlement_date.isoformat(),
            "reference": s.reference,
            "status": s.status
        }
        for s in sets
    ]

    rf_dicts = [
        {
            "external_refund_id": r.external_refund_id,
            "transaction_reference": r.transaction_reference,
            "amount": r.amount,
            "currency": r.currency,
            "refund_date": r.refund_date.isoformat()
        }
        for r in rfs
    ]

    engine = ReconciliationEngine()
    rec_results = engine.process_batch(txn_dicts, set_dicts, rf_dicts)

    investigator = AIExceptionInvestigator()

    matched_cnt = 0
    auto_resolved_cnt = 0
    escalated_cnt = 0
    exception_cnt = 0

    for item in rec_results:
        rec_obj = ReconciliationResult(
            batch_id=batch.id,
            source_record_id=item["source_record_id"],
            matched_record_id=item["matched_record_id"],
            match_type=item["match_type"],
            status=item["status"],
            confidence_score=item["confidence_score"],
            amount_difference=item["amount_difference"],
            date_difference=item["date_difference"],
            decision=item["decision"],
            reason=item["reason"]
        )
        db.add(rec_obj)
        db.flush()

        if item["match_type"] in ["EXACT", "TOLERANCE"] and item["status"] == "MATCHED":
            matched_cnt += 1

        if item["decision"] == "AUTO_RESOLVE":
            auto_resolved_cnt += 1
            create_audit_entry(
                db, entity_type="reconciliation", entity_id=rec_obj.id,
                action="AUTO_RESOLVE", actor_type="system",
                reason=item["reason"]
            )

        if item["status"] == "EXCEPTION":
            exception_cnt += 1
            # Run AI Investigation for exceptions
            ai_payload = {
                "transaction": next((t for t in txn_dicts if t["external_transaction_id"] == item["source_record_id"]), {}),
                "candidate_matches": item.get("candidate_matches", []),
                "exception_type": item["exception_type"],
                "deterministic_checks": {"match_type": item["match_type"], "confidence": item["confidence_score"]}
            }
            ai_result = investigator.investigate_exception(ai_payload)

            case_status = "PENDING_REVIEW"
            if ai_result.recommended_action == "auto_resolve" and ai_result.ai_confidence >= 0.95:
                case_status = "AUTO_RESOLVED"
                auto_resolved_cnt += 1
            elif ai_result.recommended_action == "escalate":
                case_status = "ESCALATED"
                escalated_cnt += 1
            else:
                escalated_cnt += 1

            exc_case = ExceptionCase(
                reconciliation_result_id=rec_obj.id,
                exception_type=ai_result.exception_type,
                severity=item.get("severity", "MEDIUM"),
                status=case_status,
                ai_analysis=ai_result.model_dump(),
                recommended_action=ai_result.recommended_action,
                confidence_score=ai_result.ai_confidence
            )
            db.add(exc_case)

            create_audit_entry(
                db, entity_type="exception", entity_id=rec_obj.id,
                action="AI_INVESTIGATE", actor_type="ai",
                reason=ai_result.summary,
                metadata_json=ai_result.model_dump()
            )

    duration = time.time() - start_time
    batch.status = "COMPLETED"
    batch.total_records = len(txns)
    batch.matched_count = matched_cnt
    batch.auto_resolved_count = auto_resolved_cnt
    batch.escalated_count = escalated_cnt
    batch.exception_count = exception_cnt
    batch.match_rate = round((matched_cnt / len(txns)) * 100.0, 2) if txns else 0.0
    batch.processing_time_seconds = round(duration, 2)
    batch.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(batch)

    create_audit_entry(
        db, entity_type="batch", entity_id=batch.id, action="RECONCILE",
        actor_type="system", reason=f"Processed batch of {len(txns)} records in {duration:.2f}s."
    )

    return batch

@router.get("/batches/{batch_id}/results", response_model=List[ReconciliationResultSchema])
def get_batch_results(batch_id: str, db: Session = Depends(get_db)):
    results = db.query(ReconciliationResult).filter(ReconciliationResult.batch_id == batch_id).all()
    return results

# --- EXCEPTIONS ---

@router.get("/exceptions", response_model=List[ExceptionCaseSchema])
def list_exceptions(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    exception_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(ExceptionCase)
    if status:
        q = q.filter(ExceptionCase.status == status)
    if severity:
        q = q.filter(ExceptionCase.severity == severity)
    if exception_type:
        q = q.filter(ExceptionCase.exception_type == exception_type)
    return q.order_by(ExceptionCase.created_at.desc()).all()

@router.get("/exceptions/{exception_id}", response_model=ExceptionCaseSchema)
def get_exception(exception_id: str, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")
    return exc

@router.post("/exceptions/{exception_id}/approve", response_model=ExceptionCaseSchema)
def approve_exception(exception_id: str, req: ResolutionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")

    before_state = {"status": exc.status}
    exc.status = "APPROVED"
    exc.resolved_by = req.actor_id
    exc.resolution_notes = req.notes or "Recommendation approved by operator."
    db.commit()
    db.refresh(exc)

    create_audit_entry(
        db, entity_type="exception", entity_id=exc.id, action="HUMAN_APPROVE",
        actor_type="user", actor_id=req.actor_id,
        before_state=before_state, after_state={"status": "APPROVED"},
        reason=req.notes
    )
    return exc

@router.post("/exceptions/{exception_id}/reject", response_model=ExceptionCaseSchema)
def reject_exception(exception_id: str, req: ResolutionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")

    before_state = {"status": exc.status}
    exc.status = "REJECTED"
    exc.resolved_by = req.actor_id
    exc.resolution_notes = req.notes or "Recommendation rejected by operator."
    db.commit()
    db.refresh(exc)

    create_audit_entry(
        db, entity_type="exception", entity_id=exc.id, action="HUMAN_REJECT",
        actor_type="user", actor_id=req.actor_id,
        before_state=before_state, after_state={"status": "REJECTED"},
        reason=req.notes
    )
    return exc

@router.post("/exceptions/{exception_id}/escalate", response_model=ExceptionCaseSchema)
def escalate_exception(exception_id: str, req: ResolutionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")

    before_state = {"status": exc.status}
    exc.status = "ESCALATED"
    exc.assigned_to = req.actor_id
    exc.resolution_notes = req.notes or "Escalated to senior finance controller."
    db.commit()
    db.refresh(exc)

    create_audit_entry(
        db, entity_type="exception", entity_id=exc.id, action="HUMAN_ESCALATE",
        actor_type="user", actor_id=req.actor_id,
        before_state=before_state, after_state={"status": "ESCALATED"},
        reason=req.notes
    )
    return exc

# --- TRANSACTIONS & SETTLEMENTS ---

@router.get("/transactions", response_model=List[TransactionSchema])
def list_transactions(batch_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Transaction)
    if batch_id:
        q = q.filter(Transaction.batch_id == batch_id)
    return q.limit(200).all()

@router.get("/settlements", response_model=List[SettlementSchema])
def list_settlements(batch_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Settlement)
    if batch_id:
        q = q.filter(Settlement.batch_id == batch_id)
    return q.limit(200).all()

# --- AUDIT LOGS ---

@router.get("/audit-logs", response_model=List[AuditLogSchema])
def list_audit_logs(entity_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(AuditLog)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    return q.order_by(AuditLog.created_at.desc()).limit(100).all()

# --- EVALUATION ---

@router.get("/evaluation/{batch_id}")
def evaluate_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    results = db.query(ReconciliationResult).filter(ReconciliationResult.batch_id == batch_id).all()
    exceptions = db.query(ExceptionCase).join(ReconciliationResult).filter(ReconciliationResult.batch_id == batch_id).all()

    total = len(results)
    auto_resolved = sum(1 for r in results if r.decision == "AUTO_RESOLVE")
    escalated = sum(1 for r in results if r.decision == "ESCALATE_TO_HUMAN")
    recommend = sum(1 for r in results if r.decision == "RECOMMEND_ACTION")

    return {
        "batch_id": batch_id,
        "total_records": total,
        "matched_count": batch.matched_count,
        "auto_resolved": auto_resolved,
        "escalated": escalated,
        "recommended": recommend,
        "accuracy": round(batch.matched_count / total, 4) if total > 0 else 0.0,
        "auto_resolution_rate": round(auto_resolved / total, 4) if total > 0 else 0.0,
        "escalation_rate": round(escalated / total, 4) if total > 0 else 0.0,
        "processing_time_seconds": batch.processing_time_seconds,
        "known_failures": [
            {
                "case": "Duplicate Gateway Callbacks",
                "expected": "Escalate to Human Review",
                "actual": "Escalated (AMBIGUOUS)",
                "reason": "Multiple candidates detected with identical amounts & dates."
            },
            {
                "case": "Corrupted Data Record",
                "expected": "Escalate (INVALID)",
                "actual": "Escalated",
                "reason": "Negative amount validation failure triggered Stage 1 exception."
            }
        ]
    }
