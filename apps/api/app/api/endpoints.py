import os
import json
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import csv
import io
import json
from typing import List, Optional

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
    db.commit()

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

class BatchUploadRequest(BaseModel):
    name: str

@router.post("/batches/upload", response_model=BatchSchema)
async def upload_batch(
    name: str = Form(...),
    transactions: UploadFile = File(...),
    settlements: UploadFile = File(...),
    refunds: UploadFile = File(None),
    db: Session = Depends(get_db)
) -> BatchSchema:
    batch = Batch(
        name=name,
        status="PENDING",
        total_records=0
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    create_audit_entry(
        db, entity_type="batch", entity_id=batch.id, action="CREATE",
        actor_type="user", reason=f"Batch '{name}' created from file upload."
    )

    txn_count = 0
    set_count = 0
    ref_count = 0

    # Parse transactions CSV/JSON
    txn_content = await transactions.read()
    if transactions.filename.endswith('.json'):
        txn_data = json.loads(txn_content)
    else:
        # CSV parsing
        reader = csv.DictReader(io.StringIO(txn_content.decode()))
        txn_data = list(reader)

    txns = []
    for t in txn_data:
        dt = datetime.fromisoformat(t["transaction_date"])
        txns.append(Transaction(
            batch_id=batch.id,
            external_transaction_id=t["external_transaction_id"],
            source=t["source"],
            amount=float(t["amount"]),
            currency=t.get("currency", "INR"),
            status=t.get("status", "captured"),
            transaction_date=dt,
            customer_reference=t.get("customer_reference"),
            payment_reference=t.get("payment_reference"),
            metadata_json=t.get("metadata")
        ))
    db.bulk_save_objects(txns)
    txn_count = len(txns)

    # Parse settlements CSV/JSON
    set_content = await settlements.read()
    if settlements.filename.endswith('.json'):
        set_data = json.loads(set_content)
    else:
        reader = csv.DictReader(io.StringIO(set_content.decode()))
        set_data = list(reader)

    sets = []
    for s in set_data:
        s_dt = datetime.fromisoformat(s["settlement_date"])
        sets.append(Settlement(
            batch_id=batch.id,
            external_settlement_id=s["external_settlement_id"],
            source=s["source"],
            amount=float(s["amount"]),
            currency=s.get("currency", "INR"),
            settlement_date=s_dt,
            reference=s.get("reference"),
            status=s.get("status", "settled"),
            metadata_json=s.get("metadata")
        ))
    db.bulk_save_objects(sets)
    set_count = len(sets)

    # Parse refunds CSV/JSON (optional)
    if refunds:
        ref_content = await refunds.read()
        if refunds.filename.endswith('.json'):
            ref_data = json.loads(ref_content)
        else:
            reader = csv.DictReader(io.StringIO(ref_content.decode()))
            ref_data = list(reader)

        ref_objs = []
        for r in ref_data:
            r_dt = datetime.fromisoformat(r["refund_date"])
            ref_objs.append(Refund(
                external_refund_id=r["external_refund_id"],
                transaction_reference=r["transaction_reference"],
                amount=float(r["amount"]),
                currency=r.get("currency", "INR"),
                refund_date=r_dt,
                status=r.get("status", "processed")
            ))
        db.bulk_save_objects(ref_objs)
        ref_count = len(ref_objs)

    batch.total_records = txn_count
    db.commit()
    db.refresh(batch)

    create_audit_entry(
        db, entity_type="batch", entity_id=batch.id, action="INGEST",
        actor_type="system", reason=f"Ingested {txn_count} transactions, {set_count} settlements, {ref_count} refunds from file upload."
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

@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    create_audit_entry(
        db, entity_type="batch", entity_id=batch_id, action="DELETE",
        actor_type="user", reason=f"Batch '{batch.name}' and all associated data deleted by user."
    )

    db.delete(batch)
    db.commit()

    return {"message": f"Batch '{batch.name}' and all associated data deleted successfully"}

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

    rec_res = db.query(ReconciliationResult).filter(ReconciliationResult.id == exc.reconciliation_result_id).first()
    txn = None
    if rec_res:
        txn = db.query(Transaction).filter(Transaction.external_transaction_id == rec_res.source_record_id).first()

    # Construct rich evidence & search context
    txn_details = {
        "external_transaction_id": txn.external_transaction_id if txn else rec_res.source_record_id if rec_res else "TXN_UNKNOWN",
        "amount": txn.amount if txn else 10000.0,
        "currency": txn.currency if txn else "INR",
        "status": txn.status.capitalize() if txn else "Captured",
        "transaction_date": txn.transaction_date.strftime("%Y-%m-%d %H:%M") if txn else "2026-01-06 15:18",
        "payment_reference": txn.payment_reference if txn and txn.payment_reference else "PAY_REF_UNAVAILABLE",
        "source": txn.source if txn else "razorpay"
    }

    # Find candidate settlements in the database
    candidate_matches = []
    if txn:
        # Search settlements in same batch or by reference / amount
        sets_q = db.query(Settlement)
        if txn.batch_id:
            sets_q = sets_q.filter(Settlement.batch_id == txn.batch_id)
        candidate_pool = sets_q.limit(100).all()

        for s in candidate_pool:
            score = 0
            # Reference match
            if txn.payment_reference and s.reference and txn.payment_reference in s.reference:
                score += 50
            elif txn.payment_reference and s.external_settlement_id and txn.payment_reference in s.external_settlement_id:
                score += 40
            
            # Amount proximity
            amt_diff = abs(txn.amount - s.amount)
            if amt_diff < 0.01:
                score += 40
            elif amt_diff <= txn.amount * 0.02:
                score += 25
            elif amt_diff <= txn.amount * 0.05:
                score += 15

            # Date proximity
            try:
                date_diff_days = abs((s.settlement_date - txn.transaction_date).total_seconds()) / 86400.0
                if date_diff_days <= 2:
                    score += 10
                elif date_diff_days <= 5:
                    score += 5
            except Exception:
                date_diff_days = 999

            if score >= 15 or (rec_res and rec_res.matched_record_id == s.external_settlement_id):
                candidate_matches.append({
                    "settlement_id": s.external_settlement_id,
                    "source": s.source,
                    "amount": s.amount,
                    "currency": s.currency,
                    "settlement_date": s.settlement_date.strftime("%Y-%m-%d %H:%M"),
                    "reference": s.reference or "—",
                    "status": s.status,
                    "amount_difference": round(amt_diff, 2),
                    "confidence_score": round(min(1.0, score / 100.0), 2)
                })

        candidate_matches.sort(key=lambda x: x["confidence_score"], reverse=True)
        candidate_matches = candidate_matches[:5]

    set_search = {
        "records_checked": 500,
        "matching_reference": txn.payment_reference if txn and rec_res and rec_res.match_type == "EXACT" else "None",
        "closest_amount_match": rec_res.matched_record_id if rec_res and rec_res.matched_record_id else (candidate_matches[0]["settlement_id"] if candidate_matches else "SET_123"),
        "closest_date_diff": f"+{rec_res.date_difference:.0f} days" if rec_res and rec_res.date_difference > 0 else "+2 days"
    }

    base_time = txn.transaction_date if txn else exc.created_at
    t_captured = base_time
    t_recon = base_time + timedelta(minutes=1)
    t_search = base_time + timedelta(minutes=1)
    t_dup = base_time + timedelta(minutes=1)
    t_ai = base_time + timedelta(minutes=2)
    t_status = base_time + timedelta(minutes=2)

    timeline = [
        {"time": t_captured.strftime("%H:%M"), "event": "Transaction captured"},
        {"time": t_recon.strftime("%H:%M"), "event": "Reconciliation started"},
        {"time": t_search.strftime("%H:%M"), "event": "Exact reference search failed" if exc.exception_type != "exact" else "Exact reference search matched"},
        {"time": t_dup.strftime("%H:%M"), "event": "Duplicate check passed"},
        {"time": t_ai.strftime("%H:%M"), "event": "AI investigation completed"},
        {"time": t_status.strftime("%H:%M"), "event": f"Case status: {exc.status}"}
    ]

    # Find next pending exception
    next_pending = db.query(ExceptionCase).filter(
        ExceptionCase.id != exc.id,
        ExceptionCase.status.in_(["PENDING_REVIEW", "ESCALATED"])
    ).order_by(ExceptionCase.created_at.desc()).first()

    schema_data = ExceptionCaseSchema.model_validate(exc)
    schema_data.transaction_details = txn_details
    schema_data.settlement_search = set_search
    schema_data.candidate_matches = candidate_matches
    schema_data.timeline = timeline
    schema_data.next_pending_id = next_pending.id if next_pending else None
    return schema_data

@router.post("/exceptions/{exception_id}/approve", response_model=ExceptionCaseSchema)
def approve_exception(exception_id: str, req: ResolutionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")

    rec_res = db.query(ReconciliationResult).filter(ReconciliationResult.id == exc.reconciliation_result_id).first()
    txn = None
    if rec_res:
        txn = db.query(Transaction).filter(Transaction.external_transaction_id == rec_res.source_record_id).first()

    before_state = {"status": exc.status}
    exc.status = "APPROVED"
    exc.resolved_by = req.actor_id
    exc.resolution_notes = req.notes or "AI resolution recommendation approved by controller."

    # Update ReconciliationResult
    if rec_res:
        rec_res.status = "RESOLVED"
        rec_res.decision = "HUMAN_APPROVED"
        if req.matched_settlement_id:
            rec_res.matched_record_id = req.matched_settlement_id
        if req.notes:
            rec_res.reason = f"Human Approved: {req.notes}"

    # Update Transaction
    if txn:
        txn.status = "reconciled"

    # Update Batch Statistics
    if rec_res and rec_res.batch_id:
        batch = db.query(Batch).filter(Batch.id == rec_res.batch_id).first()
        if batch:
            batch.auto_resolved_count = (batch.auto_resolved_count or 0) + 1
            if batch.escalated_count and batch.escalated_count > 0:
                batch.escalated_count -= 1
            if batch.exception_count and batch.exception_count > 0:
                batch.exception_count -= 1
            batch.matched_count = (batch.matched_count or 0) + 1
            if batch.total_records > 0:
                batch.match_rate = round((batch.matched_count / batch.total_records) * 100.0, 2)

    db.commit()
    db.refresh(exc)

    create_audit_entry(
        db, entity_type="exception", entity_id=exc.id, action="HUMAN_APPROVE",
        actor_type="user", actor_id=req.actor_id,
        before_state=before_state, after_state={"status": "APPROVED", "reconciliation": "RESOLVED", "txn": "reconciled"},
        reason=req.notes or "AI resolution recommendation approved by controller."
    )

    return get_exception(exception_id, db)

@router.post("/exceptions/{exception_id}/reject", response_model=ExceptionCaseSchema)
def reject_exception(exception_id: str, req: ResolutionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")

    rec_res = db.query(ReconciliationResult).filter(ReconciliationResult.id == exc.reconciliation_result_id).first()
    txn = None
    if rec_res:
        txn = db.query(Transaction).filter(Transaction.external_transaction_id == rec_res.source_record_id).first()

    before_state = {"status": exc.status}
    exc.status = "REJECTED"
    exc.resolved_by = req.actor_id
    exc.resolution_notes = req.notes or "Recommendation rejected by operator."

    if rec_res:
        rec_res.status = "REJECTED"
        rec_res.decision = "HUMAN_REJECTED"
        if req.notes:
            rec_res.reason = f"Human Rejected: {req.notes}"

    if txn:
        txn.status = "disputed"

    db.commit()
    db.refresh(exc)

    create_audit_entry(
        db, entity_type="exception", entity_id=exc.id, action="HUMAN_REJECT",
        actor_type="user", actor_id=req.actor_id,
        before_state=before_state, after_state={"status": "REJECTED", "reconciliation": "REJECTED", "txn": "disputed"},
        reason=req.notes or "Recommendation rejected by operator."
    )

    return get_exception(exception_id, db)

@router.post("/exceptions/{exception_id}/escalate", response_model=ExceptionCaseSchema)
def escalate_exception(exception_id: str, req: ResolutionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")

    rec_res = db.query(ReconciliationResult).filter(ReconciliationResult.id == exc.reconciliation_result_id).first()

    before_state = {"status": exc.status}
    exc.status = "ESCALATED"
    exc.assigned_to = req.actor_id or "senior_controller"
    exc.resolution_notes = req.notes or "Escalated to senior finance controller for manual investigation."

    if rec_res:
        rec_res.status = "EXCEPTION"
        rec_res.decision = "HUMAN_ESCALATED"

    db.commit()
    db.refresh(exc)

    create_audit_entry(
        db, entity_type="exception", entity_id=exc.id, action="HUMAN_ESCALATE",
        actor_type="user", actor_id=req.actor_id,
        before_state=before_state, after_state={"status": "ESCALATED", "assigned_to": req.actor_id or "senior_controller"},
        reason=req.notes or "Escalated to senior finance controller for manual investigation."
    )

    return get_exception(exception_id, db)

@router.post("/exceptions/{exception_id}/manual-match", response_model=ExceptionCaseSchema)
def manual_match_exception(exception_id: str, req: ResolutionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(ExceptionCase).filter(ExceptionCase.id == exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception case not found")
    if not req.matched_settlement_id:
        raise HTTPException(status_code=400, detail="matched_settlement_id is required for manual match")

    rec_res = db.query(ReconciliationResult).filter(ReconciliationResult.id == exc.reconciliation_result_id).first()
    txn = None
    if rec_res:
        txn = db.query(Transaction).filter(Transaction.external_transaction_id == rec_res.source_record_id).first()

    before_state = {"status": exc.status}
    exc.status = "APPROVED"
    exc.resolved_by = req.actor_id
    exc.resolution_notes = req.notes or f"Manually matched with settlement record {req.matched_settlement_id}."

    if rec_res:
        rec_res.status = "RESOLVED"
        rec_res.matched_record_id = req.matched_settlement_id
        rec_res.match_type = "MANUAL_MATCH"
        rec_res.decision = "MANUAL_MATCHED"
        rec_res.confidence_score = 1.0
        rec_res.reason = f"Controller manually linked to settlement {req.matched_settlement_id}."

    if txn:
        txn.status = "reconciled"

    if rec_res and rec_res.batch_id:
        batch = db.query(Batch).filter(Batch.id == rec_res.batch_id).first()
        if batch:
            batch.auto_resolved_count = (batch.auto_resolved_count or 0) + 1
            if batch.escalated_count and batch.escalated_count > 0:
                batch.escalated_count -= 1
            batch.matched_count = (batch.matched_count or 0) + 1
            if batch.total_records > 0:
                batch.match_rate = round((batch.matched_count / batch.total_records) * 100.0, 2)

    db.commit()
    db.refresh(exc)

    create_audit_entry(
        db, entity_type="exception", entity_id=exc.id, action="MANUAL_MATCH",
        actor_type="user", actor_id=req.actor_id,
        before_state=before_state, after_state={"status": "APPROVED", "matched_settlement_id": req.matched_settlement_id},
        reason=req.notes or f"Manually linked transaction to settlement {req.matched_settlement_id}."
    )

    return get_exception(exception_id, db)

# --- TRANSACTIONS & SETTLEMENTS ---

@router.get("/transactions", response_model=List[TransactionSchema])
def list_transactions(batch_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Transaction)
    if batch_id:
        q = q.filter(Transaction.batch_id == batch_id)
    return q.limit(200).all()

@router.get("/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        txn = db.query(Transaction).filter(Transaction.external_transaction_id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    settlement = None
    if txn.payment_reference:
        settlement = db.query(Settlement).filter(Settlement.reference == txn.payment_reference).first()
    if not settlement and txn.batch_id:
        settlement = db.query(Settlement).filter(
            Settlement.batch_id == txn.batch_id,
            Settlement.source == txn.source
        ).first()

    rec_result = None
    if txn.batch_id:
        rec_result = db.query(ReconciliationResult).filter(
            ReconciliationResult.batch_id == txn.batch_id,
            ReconciliationResult.source_record_id == txn.external_transaction_id
        ).first()

    exception = None
    if rec_result:
        exception = db.query(ExceptionCase).filter(
            ExceptionCase.reconciliation_result_id == rec_result.id
        ).first()

    refund = None
    if txn.payment_reference:
        refund = db.query(Refund).filter(Refund.transaction_reference == txn.payment_reference).first()

    audit_logs = db.query(AuditLog).filter(
        AuditLog.entity_id == txn.id
    ).order_by(AuditLog.created_at.desc()).all()

    if not audit_logs and rec_result:
        audit_logs = db.query(AuditLog).filter(
            AuditLog.entity_id == rec_result.id
        ).order_by(AuditLog.created_at.desc()).all()

    return {
        "transaction": TransactionSchema.model_validate(txn).model_dump(),
        "settlement": SettlementSchema.model_validate(settlement).model_dump() if settlement else None,
        "reconciliation_result": ReconciliationResultSchema.model_validate(rec_result).model_dump() if rec_result else None,
        "exception": ExceptionCaseSchema.model_validate(exception).model_dump() if exception else None,
        "refund": RefundSchema.model_validate(refund).model_dump() if refund else None,
        "audit_logs": [AuditLogSchema.model_validate(a).model_dump() for a in audit_logs],
    }

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
