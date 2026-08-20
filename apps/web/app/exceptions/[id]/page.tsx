"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { fetchApi, ExceptionCase } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Cpu, Send } from "lucide-react";

export default function ExceptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const exceptionId = params.id as string;

  const [exc, setExc] = useState<ExceptionCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        <div className="p-6 font-mono text-xs text-secondaryText">Loading exception case evidence...</div>
      </div>
    );
  }

  const ai = exc.ai_analysis;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title={`Case Investigation: ${exc.id.substring(0, 8)}...`} />

      <main className="p-6 space-y-6 max-w-7xl">
        <Link href="/exceptions" className="inline-flex items-center space-x-2 text-xs font-mono text-secondaryText hover:text-primaryText">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Exceptions Queue</span>
        </Link>

        {/* Case Status Header Banner */}
        <div className="bg-surface border border-surfaceBorder p-4 rounded flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-secondaryText uppercase">Exception Type:</span>
              <span className="font-mono text-sm font-bold text-primaryText uppercase">{exc.exception_type}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-warning/10 text-warning border border-warning/20">
                Severity: {exc.severity}
              </span>
            </div>
            <p className="text-xs text-secondaryText mt-1 font-mono">
              Status: <span className="text-primaryText font-semibold">{exc.status}</span>
            </p>
          </div>

          <div className="flex items-center space-x-4 font-mono">
            <div className="text-right">
              <div className="text-[10px] text-secondaryText uppercase">AI Confidence</div>
              <div className="text-xl font-bold text-primaryText">{(exc.confidence_score * 100).toFixed(0)}%</div>
            </div>
            <div className="text-right border-l border-surfaceBorder pl-4">
              <div className="text-[10px] text-secondaryText uppercase">Recommendation</div>
              <div className="text-sm font-bold text-primaryText uppercase">{exc.recommended_action || "ESCALATE"}</div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          {/* Left Column: AI Grounded Investigation & Evidence */}
          <div className="space-y-4">
            <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
              <div className="flex items-center space-x-2 text-primaryText font-semibold border-b border-surfaceBorder pb-2">
                <Cpu className="w-4 h-4 text-positive" />
                <span>AI Grounded Exception Investigation</span>
              </div>

              <div>
                <span className="text-secondaryText text-[11px] uppercase">Summary:</span>
                <p className="text-primaryText mt-0.5 leading-relaxed font-sans text-sm">
                  {ai?.summary || "No AI summary provided."}
                </p>
              </div>

              <div>
                <span className="text-secondaryText text-[11px] uppercase">Evidence Bullet Points:</span>
                <ul className="mt-1 space-y-1 text-secondaryText">
                  {ai?.evidence?.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-positive mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  )) || <li>No evidence items extracted.</li>}
                </ul>
              </div>

              <div>
                <span className="text-secondaryText text-[11px] uppercase">Likely Root Cause:</span>
                <p className="text-secondaryText mt-0.5">{ai?.likely_cause || "Uncertain root cause."}</p>
              </div>
            </div>

            {/* Operator Actions & Notes */}
            <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
              <h4 className="font-semibold text-primaryText uppercase text-xs">Finance Controller Decision</h4>
              <textarea
                rows={3}
                placeholder="Enter resolution notes or escalation instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-surfaceBorder rounded p-2.5 text-xs font-mono text-primaryText focus:outline-none focus:border-neutral-500"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAction("approve")}
                  disabled={submitting}
                  className="flex-1 bg-positive/10 border border-positive/30 text-positive py-2 rounded font-semibold hover:bg-positive/20 transition-colors disabled:opacity-50"
                >
                  Approve Resolution
                </button>
                <button
                  onClick={() => handleAction("reject")}
                  disabled={submitting}
                  className="flex-1 bg-critical/10 border border-critical/30 text-critical py-2 rounded font-semibold hover:bg-critical/20 transition-colors disabled:opacity-50"
                >
                  Reject Recommendation
                </button>
                <button
                  onClick={() => handleAction("escalate")}
                  disabled={submitting}
                  className="flex-1 bg-warning/10 border border-warning/30 text-warning py-2 rounded font-semibold hover:bg-warning/20 transition-colors disabled:opacity-50"
                >
                  Escalate Case
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Deterministic Checks & Audit Log */}
          <div className="space-y-4">
            <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
              <h4 className="font-semibold text-primaryText uppercase text-xs border-b border-surfaceBorder pb-2">
                Deterministic Rule Checklist
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-surfaceBorder">
                  <span>Reference ID Exact Match</span>
                  {exc.exception_type === "missing_settlement" ? (
                    <span className="text-critical flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>FAILED</span>
                    </span>
                  ) : (
                    <span className="text-positive flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PASSED</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-surfaceBorder">
                  <span>Amount Tolerance Check</span>
                  {exc.exception_type === "amount_mismatch" ? (
                    <span className="text-warning flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>VARIANCE</span>
                    </span>
                  ) : (
                    <span className="text-positive flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PASSED</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-background/50 border border-surfaceBorder">
                  <span>Duplicate Record Check</span>
                  {exc.exception_type === "duplicate_reference" || exc.exception_type === "ambiguous_match" ? (
                    <span className="text-critical flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>DUPLICATE</span>
                    </span>
                  ) : (
                    <span className="text-positive flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PASSED</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Resolution History / Resolution Notes */}
            {exc.resolution_notes && (
              <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-2">
                <h4 className="font-semibold text-primaryText uppercase text-xs">Operator Resolution Log</h4>
                <div className="text-secondaryText text-xs bg-background p-2.5 rounded border border-surfaceBorder">
                  <p className="text-primaryText">{exc.resolution_notes}</p>
                  <div className="mt-1 text-[10px] text-secondaryText">
                    By: {exc.resolved_by || exc.assigned_to || "System"} • Updated: {new Date(exc.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
