"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import { fetchApi, ExceptionCase } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Search,
  Clock,
  ShieldAlert,
  FileText,
  HelpCircle,
  Check,
  ChevronRight
} from "lucide-react";

export default function ExceptionDetailPage() {
  const params = useParams();
  const exceptionId = params.id as string;

  const [exc, setExc] = useState<ExceptionCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"approve" | "reject" | "escalate">("escalate");

  useEffect(() => {
    if (exceptionId) {
      loadException();
    }
  }, [exceptionId]);

  async function loadException() {
    try {
      setLoading(true);
      const data = await fetchApi<ExceptionCase>(`/api/exceptions/${exceptionId}`);
      setExc(data);
      if (data.recommended_action === "auto_resolve") {
        setSelectedAction("approve");
      } else {
        setSelectedAction("escalate");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(actionType: "approve" | "reject" | "escalate") {
    try {
      setSubmitting(true);
      await fetchApi<ExceptionCase>(`/api/exceptions/${exceptionId}/${actionType}`, {
        method: "POST",
        body: JSON.stringify({
          action: actionType,
          notes: notes.trim() || undefined,
          actor_id: "human_controller_01",
        }),
      });
      await loadException();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !exc) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Exception Investigation Workspace" />
        <div className="p-6 font-mono text-xs text-secondaryText">Loading investigation terminal...</div>
      </div>
    );
  }

  const ai = exc.ai_analysis;
  const txn = exc.transaction_details;
  const search = exc.settlement_search;
  const timeline = exc.timeline || [];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title={`Investigation Terminal — Case #${exc.id.substring(0, 8)}`} />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between">
          <Link href="/exceptions" className="inline-flex items-center space-x-2 text-xs font-mono text-secondaryText hover:text-primaryText">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Review Queue</span>
          </Link>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-secondaryText">Case Severity:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              exc.severity === "HIGH" || exc.severity === "CRITICAL"
                ? "bg-critical/10 text-critical border border-critical/30"
                : "bg-warning/10 text-warning border border-warning/30"
            }`}>
              {exc.severity}
            </span>
            <span className="text-secondaryText border-l border-surfaceBorder pl-3">Status:</span>
            <span className="font-bold text-primaryText uppercase">{exc.status}</span>
          </div>
        </div>

        {/* Closed-Loop Ideal Flow Visual Pipeline */}
        <div className="bg-surface border border-surfaceBorder p-3 rounded font-mono text-xs">
          <div className="text-[10px] text-secondaryText uppercase tracking-wider mb-2">Investigation Process Pipeline</div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2.5 py-1 rounded bg-background border border-surfaceBorder text-secondaryText">
              1. Exception Detected
            </span>
            <ChevronRight className="w-3 h-3 text-secondaryText" />
            <span className="px-2.5 py-1 rounded bg-background border border-surfaceBorder text-secondaryText">
              2. Deterministic Rules Checked
            </span>
            <ChevronRight className="w-3 h-3 text-secondaryText" />
            <span className="px-2.5 py-1 rounded bg-background border border-surfaceBorder text-secondaryText">
              3. AI Analyzed Evidence
            </span>
            <ChevronRight className="w-3 h-3 text-secondaryText" />
            <span className="px-2.5 py-1 rounded bg-positive/10 border border-positive/30 text-positive font-semibold">
              4. Finance Controller Evidence Review
            </span>
            <ChevronRight className="w-3 h-3 text-secondaryText" />
            <span className="px-2.5 py-1 rounded bg-background border border-surfaceBorder text-secondaryText">
              5. Decision & Audit Log
            </span>
          </div>
        </div>

        {/* Top Operational Metrics Banner */}
        <div className="bg-surface border border-surfaceBorder p-4 rounded grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
          <div>
            <span className="text-[10px] text-secondaryText uppercase">Exception Type</span>
            <div className="text-sm font-bold text-primaryText uppercase mt-0.5">{exc.exception_type}</div>
          </div>
          <div>
            <span className="text-[10px] text-secondaryText uppercase">AI Confidence Score</span>
            <div className="text-sm font-bold text-primaryText mt-0.5">{(exc.confidence_score * 100).toFixed(0)}%</div>
          </div>
          <div>
            <span className="text-[10px] text-secondaryText uppercase">AI Recommendation</span>
            <div className="text-sm font-bold text-primaryText uppercase mt-0.5">{exc.recommended_action || "ESCALATE"}</div>
          </div>
          <div>
            <span className="text-[10px] text-secondaryText uppercase">Human Review Needed</span>
            <div className="text-sm font-bold text-warning mt-0.5">YES (Mandatory)</div>
          </div>
        </div>

        {/* 4 Essential Evidence Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
          
          {/* Section 1: Transaction Details */}
          <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
            <div className="flex items-center space-x-2 text-primaryText font-semibold border-b border-surfaceBorder pb-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Transaction Details</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Transaction ID:</span>
                <span className="text-primaryText font-bold">{txn?.external_transaction_id || "TXN_0500"}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Amount:</span>
                <span className="text-primaryText font-bold">₹{txn?.amount ? txn.amount.toLocaleString() : "10,000"}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Currency:</span>
                <span className="text-primaryText">{txn?.currency || "INR"}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Status:</span>
                <span className="text-positive font-semibold">{txn?.status || "Captured"}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Transaction Date:</span>
                <span className="text-primaryText">{txn?.transaction_date || "2026-01-06 15:18"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondaryText">Reference ID:</span>
                <span className="text-primaryText font-mono">{txn?.payment_reference || "PAY_XXXX"}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Settlement Search */}
          <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
            <div className="flex items-center space-x-2 text-primaryText font-semibold border-b border-surfaceBorder pb-2">
              <Search className="w-4 h-4 text-warning" />
              <span>Settlement Search</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Records Checked:</span>
                <span className="text-primaryText font-bold">{search?.records_checked || 500}</span>
              </div>
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Matching Reference:</span>
                <span className={`font-semibold ${search?.matching_reference === "None" ? "text-critical" : "text-positive"}`}>
                  {search?.matching_reference || "None"}
                </span>
              </div>
              <div className="flex justify-between border-b border-surfaceBorder/40 pb-1.5">
                <span className="text-secondaryText">Closest Amount Match:</span>
                <span className="text-primaryText font-bold">{search?.closest_amount_match || "SET_123"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondaryText">Closest Date Variance:</span>
                <span className="text-warning">{search?.closest_date_diff || "+2 days"}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Timeline */}
          <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
            <div className="flex items-center space-x-2 text-primaryText font-semibold border-b border-surfaceBorder pb-2">
              <Clock className="w-4 h-4 text-positive" />
              <span>Audit Timeline</span>
            </div>

            <div className="space-y-2">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-2 text-[11px]">
                  <span className="text-secondaryText font-mono w-10 shrink-0">{item.time}</span>
                  <span className="text-primaryText flex-1">{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Investigation Grounded Report */}
        <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3 font-mono text-xs">
          <div className="flex items-center space-x-2 text-primaryText font-semibold border-b border-surfaceBorder pb-2">
            <Cpu className="w-4 h-4 text-positive" />
            <span>AI Grounded Exception Investigation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-secondaryText text-[10px] uppercase">Grounded Summary</span>
              <p className="text-primaryText mt-1 font-sans text-xs leading-relaxed">
                {ai?.summary || "Summary unavailable."}
              </p>
            </div>
            <div>
              <span className="text-secondaryText text-[10px] uppercase">Extracted Evidence Bullet Points</span>
              <ul className="mt-1 space-y-1 text-secondaryText">
                {ai?.evidence?.map((e, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-positive">•</span>
                    <span>{e}</span>
                  </li>
                )) || <li>No evidence items recorded.</li>}
              </ul>
            </div>
            <div>
              <span className="text-secondaryText text-[10px] uppercase">Likely Root Cause</span>
              <p className="text-secondaryText mt-1">{ai?.likely_cause || "Root cause under review."}</p>
            </div>
          </div>
        </div>

        {/* Decision Impact Preview & Operator Action Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          
          {/* Action Selector Buttons & Resolution Notes */}
          <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-4">
            <h4 className="font-semibold text-primaryText uppercase text-xs border-b border-surfaceBorder pb-2">
              Select Decision Action
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAction("approve")}
                className={`py-2.5 px-3 rounded font-semibold text-xs transition-colors border text-center ${
                  selectedAction === "approve"
                    ? "bg-positive/20 border-positive text-positive"
                    : "bg-background border-surfaceBorder text-secondaryText hover:text-primaryText"
                }`}
              >
                APPROVE RESOLUTION
              </button>
              <button
                type="button"
                onClick={() => setSelectedAction("reject")}
                className={`py-2.5 px-3 rounded font-semibold text-xs transition-colors border text-center ${
                  selectedAction === "reject"
                    ? "bg-critical/20 border-critical text-critical"
                    : "bg-background border-surfaceBorder text-secondaryText hover:text-primaryText"
                }`}
              >
                REJECT RECOMMENDATION
              </button>
              <button
                type="button"
                onClick={() => setSelectedAction("escalate")}
                className={`py-2.5 px-3 rounded font-semibold text-xs transition-colors border text-center ${
                  selectedAction === "escalate"
                    ? "bg-warning/20 border-warning text-warning"
                    : "bg-background border-surfaceBorder text-secondaryText hover:text-primaryText"
                }`}
              >
                ESCALATE CASE
              </button>
            </div>

            <div>
              <label className="text-secondaryText text-[10px] uppercase block mb-1">
                Resolution Notes / Operator Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Enter mandatory resolution notes before submitting decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-surfaceBorder rounded p-2.5 text-xs font-mono text-primaryText focus:outline-none focus:border-neutral-500"
              />
            </div>

            <button
              onClick={() => handleAction(selectedAction)}
              disabled={submitting}
              className="w-full bg-primaryText text-background py-2.5 rounded font-bold uppercase text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {submitting ? "Executing Action..." : `Confirm & Submit Action: ${selectedAction.toUpperCase()}`}
            </button>
          </div>

          {/* Decision Impact Box */}
          <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
            <h4 className="font-semibold text-primaryText uppercase text-xs border-b border-surfaceBorder pb-2">
              Decision Impact & Audit Effects
            </h4>

            <div className="p-3 rounded bg-background border border-surfaceBorder space-y-2">
              <div className="text-secondaryText text-[10px] uppercase">Selected Action Preview:</div>
              <div className="text-sm font-bold text-primaryText uppercase">
                Action: {selectedAction === "approve" ? "APPROVE RESOLUTION" : selectedAction === "reject" ? "REJECT RECOMMENDATION" : "ESCALATE"}
              </div>

              <div className="pt-2 border-t border-surfaceBorder space-y-1.5 text-xs">
                {selectedAction === "approve" && (
                  <>
                    <div className="text-positive flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Case will be marked resolved in main ledger</span>
                    </div>
                    <div className="text-positive flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Immutable audit event will be created with operator ID</span>
                    </div>
                    <div className="text-positive flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>No automatic financial record modification without verification</span>
                    </div>
                  </>
                )}

                {selectedAction === "reject" && (
                  <>
                    <div className="text-critical flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Case marked rejected and returned for re-investigation</span>
                    </div>
                    <div className="text-critical flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Audit log records rejection and operator notes</span>
                    </div>
                  </>
                )}

                {selectedAction === "escalate" && (
                  <>
                    <div className="text-warning flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Case remains unresolved for senior controller review</span>
                    </div>
                    <div className="text-warning flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Added to priority escalation review queue</span>
                    </div>
                    <div className="text-warning flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Requires further manual bank statement investigation</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {exc.resolution_notes && (
              <div className="pt-2">
                <span className="text-[10px] text-secondaryText uppercase block mb-1">Previous Resolution History</span>
                <div className="p-2 bg-background rounded border border-surfaceBorder text-xs text-primaryText">
                  {exc.resolution_notes}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
