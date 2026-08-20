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
  created_at: string;
  updated_at: string;
}

export interface ReconciliationResult {
  id: string;
  batch_id: string;
  source_record_id: string;
  matched_record_id?: string;
  match_type: string;
  status: string;
  confidence_score: number;
  amount_difference: number;
  date_difference: number;
  decision: string;
  reason?: string;
  created_at: string;
  exception_case?: ExceptionCase;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_type: string;
  actor_id?: string;
  before_state?: any;
  after_state?: any;
  reason?: string;
  metadata_json?: any;
  created_at: string;
}

export interface Transaction {
  id: string;
  external_transaction_id: string;
  source: string;
  amount: number;
  currency: string;
  status: string;
  transaction_date: string;
  customer_reference?: string;
  payment_reference?: string;
  created_at: string;
}

export interface Settlement {
  id: string;
  external_settlement_id: string;
  source: string;
  amount: number;
  currency: string;
  settlement_date: string;
  reference?: string;
  status: string;
  created_at: string;
}

export interface EvaluationData {
  batch_id: string;
  total_records: number;
  matched_count: number;
  auto_resolved: number;
  escalated: number;
  recommended: number;
  accuracy: number;
  auto_resolution_rate: number;
  escalation_rate: number;
  processing_time_seconds: number;
  known_failures: Array<{
    case: string;
    expected: string;
    actual: string;
    reason: string;
  }>;
}
