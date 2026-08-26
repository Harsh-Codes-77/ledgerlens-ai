const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error ${res.status}: ${errText}`);
  }
  return res.json();
}

export interface Batch {
  id: string;
  name: string;
  status: string;
  total_records: number;
  matched_count: number;
  auto_resolved_count: number;
  escalated_count: number;
  exception_count: number;
  match_rate: number;
  processing_time_seconds: number;
  created_at: string;
  completed_at?: string;
}

export interface Transaction {
  id: string;
  batch_id: string;
  external_transaction_id: string;
  source: string;
  amount: number;
  currency: string;
  status: string;
  transaction_date: string;
  payment_reference?: string;
  customer_reference?: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
}

export interface TransactionDetail {
  transaction: Transaction;
  settlement: Settlement | null;
  reconciliation_result: ReconciliationResult | null;
  exception: ExceptionCase | null;
  refund: any | null;
  audit_logs: AuditLog[];
}

export interface Settlement {
  id: string;
  batch_id: string;
  external_settlement_id: string;
  source: string;
  amount: number;
  currency: string;
  settlement_date: string;
  reference?: string;
  status: string;
  created_at: string;
}

export interface ReconciliationResult {
  id: string;
  batch_id: string;
  source_record_id: string;
  source_type: string;
  matched_record_id: string | null;
  match_type: string;
  confidence_score: number;
  decision: string;
  reason: string;
  amount_difference: number;
  metadata_json?: Record<string, unknown>;
  created_at: string;
}

export interface ExceptionCase {
  id: string;
  reconciliation_result_id: string;
  exception_type: string;
  severity: string;
  status: string;
  ai_analysis?: {
    exception_type: string;
    summary: string;
    evidence: string[];
    likely_cause: string;
    recommended_action: string;
    ai_confidence: number;
    requires_human_review: boolean;
  };
  recommended_action?: string;
  confidence_score: number;
  assigned_to?: string;
  resolved_by?: string;
  resolution_notes?: string;
  transaction_details?: {
    external_transaction_id: string;
    amount: number;
    currency: string;
    status: string;
    transaction_date: string;
    payment_reference?: string;
    source?: string;
  };
  settlement_search?: {
    records_checked: number;
    matching_references: string[];
    closest_matches: Array<{
      settlement_id: string;
      similarity_score: number;
    }>;
  };
  decision_timeline?: Array<{
    stage: string;
    action: string;
    outcome: string;
    confidence?: number;
  }>;
  related_records?: Array<{
    type: string;
    id: string;
    source: string;
    amount: number;
  }>;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_type: string;
  actor_id?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  reason?: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
}

export interface EvaluationData {
  batch_id: string;
  total_records: number;
  correct_matches: number;
  incorrect_matches: number;
  false_positives: number;
  false_negatives: number;
  escalation_precision?: number;
  match_type_accuracy?: Record<string, number>;
  resolution_distribution?: Record<string, number>;
  known_failures?: Array<{
    type: string;
    description: string;
    expected: string;
    got: string;
  }>;
}
