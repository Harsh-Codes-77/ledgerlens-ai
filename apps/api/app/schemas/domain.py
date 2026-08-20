from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict

class TransactionSchema(BaseModel):
    id: Optional[str] = None
    batch_id: Optional[str] = None
    external_transaction_id: str
    source: str
    amount: float
    currency: str = "INR"
    status: str = "captured"
    transaction_date: datetime
    customer_reference: Optional[str] = None
    payment_reference: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SettlementSchema(BaseModel):
    id: Optional[str] = None
    batch_id: Optional[str] = None
    external_settlement_id: str
    source: str
    amount: float
    currency: str = "INR"
    settlement_date: datetime
    reference: Optional[str] = None
    status: str = "settled"
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class RefundSchema(BaseModel):
    id: Optional[str] = None
    external_refund_id: str
    transaction_reference: str
    amount: float
    currency: str = "INR"
    refund_date: datetime
    status: str = "processed"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AIInvestigationResult(BaseModel):
    exception_type: str
    summary: str
    evidence: List[str]
    likely_cause: str
    recommended_action: str  # auto_resolve, recommend_action, escalate
    ai_confidence: float
    requires_human_review: bool

class ExceptionCaseSchema(BaseModel):
    id: str
    reconciliation_result_id: str
    exception_type: str
    severity: str
    status: str
    ai_analysis: Optional[Dict[str, Any]] = None
    recommended_action: Optional[str] = None
    confidence_score: float
    assigned_to: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReconciliationResultSchema(BaseModel):
    id: str
    batch_id: str
    source_record_id: str
    matched_record_id: Optional[str] = None
    match_type: str
    status: str
    confidence_score: float
    amount_difference: float
    date_difference: float
    decision: str
    reason: Optional[str] = None
    created_at: datetime
    exception_case: Optional[ExceptionCaseSchema] = None

    model_config = ConfigDict(from_attributes=True)

class BatchSchema(BaseModel):
    id: str
    name: str
    status: str
    total_records: int
    matched_count: int
    auto_resolved_count: int
    escalated_count: int
    exception_count: int
    match_rate: float
    processing_time_seconds: float
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AuditLogSchema(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    actor_type: str
    actor_id: Optional[str] = None
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BatchCreateRequest(BaseModel):
    name: str
    use_demo_data: bool = False
    record_count: int = 500

class ResolutionActionRequest(BaseModel):
    action: str  # approve, reject, escalate
    notes: Optional[str] = None
    actor_id: str = "human_operator"
