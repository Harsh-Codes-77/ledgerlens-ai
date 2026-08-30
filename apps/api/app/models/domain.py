import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, DateTime, ForeignKey, JSON, Integer, Text, Boolean
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    status = Column(String, default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    total_records = Column(Integer, default=0)
    matched_count = Column(Integer, default=0)
    auto_resolved_count = Column(Integer, default=0)
    escalated_count = Column(Integer, default=0)
    exception_count = Column(Integer, default=0)
    match_rate = Column(Float, default=0.0)
    processing_time_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    results = relationship("ReconciliationResult", back_populates="batch", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="batch", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="batch", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=True)
    external_transaction_id = Column(String, index=True, nullable=False)
    source = Column(String, nullable=False)  # razorpay, stripe, bank, internal
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    status = Column(String, default="captured")  # captured, authorized, failed, pending
    transaction_date = Column(DateTime, nullable=False)
    customer_reference = Column(String, nullable=True)
    payment_reference = Column(String, nullable=True, index=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="transactions")

class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=True)
    external_settlement_id = Column(String, index=True, nullable=False)
    source = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    settlement_date = Column(DateTime, nullable=False)
    reference = Column(String, nullable=True, index=True)
    status = Column(String, default="settled")
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="settlements")

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(String, primary_key=True, default=generate_uuid)
    external_refund_id = Column(String, index=True, nullable=False)
    transaction_reference = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    refund_date = Column(DateTime, nullable=False)
    status = Column(String, default="processed")
    created_at = Column(DateTime, default=datetime.utcnow)

class ReconciliationResult(Base):
    __tablename__ = "reconciliation_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, ForeignKey("batches.id"), nullable=False)
    source_record_id = Column(String, nullable=False)  # e.g., Transaction ID
    matched_record_id = Column(String, nullable=True)  # e.g., Settlement ID
    match_type = Column(String, nullable=False)  # EXACT, TOLERANCE, CANDIDATE, UNMATCHED, INVALID
    status = Column(String, nullable=False)  # MATCHED, EXCEPTION, RESOLVED
    confidence_score = Column(Float, default=0.0)  # 0.0 to 1.0
    amount_difference = Column(Float, default=0.0)
    date_difference = Column(Float, default=0.0)  # in days
    decision = Column(String, nullable=False)  # AUTO_RESOLVE, RECOMMEND_ACTION, ESCALATE_TO_HUMAN, INVALID
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batch = relationship("Batch", back_populates="results")
    exception_case = relationship("ExceptionCase", uselist=False, back_populates="reconciliation_result", cascade="all, delete-orphan")

class ExceptionCase(Base):
    __tablename__ = "exception_cases"

    id = Column(String, primary_key=True, default=generate_uuid)
    reconciliation_result_id = Column(String, ForeignKey("reconciliation_results.id"), nullable=False)
    exception_type = Column(String, nullable=False)  # missing_settlement, amount_mismatch, date_mismatch, duplicate_reference, unknown_transaction, invalid_data, ambiguous_match
    severity = Column(String, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String, default="PENDING_REVIEW")  # PENDING_REVIEW, AUTO_RESOLVED, APPROVED, REJECTED, ESCALATED
    ai_analysis = Column(JSON, nullable=True)
    recommended_action = Column(String, nullable=True)
    confidence_score = Column(Float, default=0.0)
    assigned_to = Column(String, nullable=True)
    resolved_by = Column(String, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reconciliation_result = relationship("ReconciliationResult", back_populates="exception_case")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    batch_id = Column(String, nullable=True)  # NEW: link to batch
    entity_type = Column(String, nullable=False)  # batch, reconciliation, exception, system
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)  # INGEST, RECONCILE, AI_INVESTIGATE, AUTO_RESOLVE, HUMAN_APPROVE, HUMAN_REJECT, HUMAN_ESCALATE
    actor_type = Column(String, nullable=False)  # system, ai, user
    actor_id = Column(String, nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
