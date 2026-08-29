"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, ExceptionCase, CandidateMatch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { LoadingState } from "@/components/ui/states";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  Clock,
  ShieldAlert,
  FileText,
  Shield,
  Search,
  Landmark,
  Layers,
  ArrowRight,
  Sparkles,
  DollarSign,
  ChevronRight,
  Check,
} from "lucide-react";
import { formatCurrency, formatDateTime, getSourceColor } from "@/lib/utils";

export default function ExceptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const exceptionId = params.id as string;

  const [exc, setExc] = useState<ExceptionCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "manual_match" | "write_off" | "reject" | "escalate"
  >("approve");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (exceptionId) loadException();
  }, [exceptionId]);

  async function loadException() {
    try {
      setLoading(true);
      const data = await fetchApi<ExceptionCase>(
        `/api/exceptions/${exceptionId}`
      );
      setExc(data);

      if (data.recommended_action === "auto_resolve") {
        setSelectedAction("approve");
      } else if (data.candidate_matches && data.candidate_matches.length > 0) {
        setSelectedCandidate(data.candidate_matches[0].settlement_id);
        setSelectedAction("manual_match");
      } else if (data.exception_type === "amount_mismatch") {
        setSelectedAction("write_off");
      } else {
        setSelectedAction("escalate");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecuteAction(actionType: string, candidateSettlementId?: string) {
    try {
      setSubmitting(true);
      let endpoint = `/api/exceptions/${exceptionId}/approve`;
      let body: any = {
        action: actionType,
        notes: notes || undefined,
        actor_id: "finance_controller",
      };

      if (actionType === "manual_match") {
        endpoint = `/api/exceptions/${exceptionId}/manual-match`;
        body.matched_settlement_id = candidateSettlementId || selectedCandidate;
      } else if (actionType === "reject") {
        endpoint = `/api/exceptions/${exceptionId}/reject`;
      } else if (actionType === "escalate") {
        endpoint = `/api/exceptions/${exceptionId}/escalate`;
      } else if (actionType === "write_off") {
        endpoint = `/api/exceptions/${exceptionId}/approve`;
        body.notes = notes || "Fee variance written off by controller.";
      }

      await fetchApi<ExceptionCase>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setActionSuccess(
        actionType === "approve"
          ? "Case approved: reconciliation confirmed and transaction marked reconciled."
          : actionType === "manual_match"
          ? `Case resolved: manually paired with settlement ${body.matched_settlement_id}.`
          : actionType === "write_off"
          ? "Case resolved: fee variance written off and ledger adjusted."
          : actionType === "reject"
          ? "Case rejected: transaction flagged for dispute."
          : "Case escalated to senior finance controller queue."
      );

      await loadException();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to execute action");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !exc) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Investigation Terminal" />
        <LoadingState message="Loading case investigation details..." />
      </div>
    );
  }

  const txn = exc.transaction_details;
  const isResolved = exc.status === "APPROVED" || exc.status === "AUTO_RESOLVED";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar title={`Case Investigation #${exc.id.substring(0, 8)}`} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-5">
          {/* Top Bar Navigation & Next Case Jump */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/exceptions"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Exceptions Queue
            </Link>

            <div className="flex items-center gap-3">
              {exc.next_pending_id && (
                <Button asChild size="sm" variant="outline" className="h-8">
                  <Link href={`/exceptions/${exc.next_pending_id}`}>
                    <span>Next Pending Case</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Action Success Alert */}
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 p-4 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-sm text-emerald-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="font-medium">{actionSuccess}</span>
              </div>
              {exc.next_pending_id && (
                <Button asChild size="sm" variant="success" className="h-7 text-xs">
                  <Link href={`/exceptions/${exc.next_pending_id}`}>
                    Review Next Case →
                  </Link>
                </Button>
              )}
            </motion.div>
          )}

          {/* Case Overview Banner */}
          <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                Case Type
              </span>
              <p className="text-sm font-bold font-mono text-foreground uppercase mt-0.5">
                {exc.exception_type.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                Severity
              </span>
              <div className="mt-0.5">
                <Badge
                  variant={
                    exc.severity === "HIGH" || exc.severity === "CRITICAL"
                      ? "destructive"
                      : exc.severity === "MEDIUM"
                      ? "warning"
                      : "success"
                  }
                >
                  {exc.severity}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                Current Status
              </span>
              <div className="mt-0.5">
                <Badge
                  variant={
                    isResolved
                      ? "success"
                      : exc.status === "ESCALATED"
                      ? "destructive"
                      : "warning"
                  }
                >
                  {exc.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                AI Confidence
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <ConfidenceRing score={exc.confidence_score} size="sm" />
                <span className="text-xs font-mono font-semibold">
                  {Math.round(exc.confidence_score * 100)}%
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                AI Recommendation
              </span>
              <p className="text-xs font-bold uppercase font-mono text-foreground mt-0.5">
                {exc.recommended_action?.replace(/_/g, " ") || "REVIEW"}
              </p>
            </div>
          </div>

          {/* 3-Column Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* LEFT: Transaction Context & Investigation Details */}
            <div className="space-y-4">
              {/* Transaction Card */}
              <Card>
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-sky-400" />
                    Transaction Under Investigation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono font-semibold">{txn?.external_transaction_id}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-mono font-bold text-foreground">
                      {txn ? formatCurrency(txn.amount, txn.currency) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Source:</span>
                    <Badge variant="secondary" className={`bg-${getSourceColor(txn?.source || "")}-500/10 text-${getSourceColor(txn?.source || "")}-400 border-${getSourceColor(txn?.source || "")}-500/20`}>
                      {txn?.source}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={txn?.status === "captured" ? "success" : "secondary"}>
                      {txn?.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Payment Ref:</span>
                    <span className="font-mono">{txn?.payment_reference || "None"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{txn?.transaction_date ? formatDateTime(txn.transaction_date) : "—"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Investigation Timeline */}
              {exc.timeline && (
                <Card>
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Verification Audit Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2 text-xs">
                    {exc.timeline.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <span className="font-mono text-muted-foreground text-[10px] shrink-0 w-10">
                          {t.time}
                        </span>
                        <span className="text-foreground">{t.event}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CENTER: AI Investigation & Candidate Settlements Matcher */}
            <div className="space-y-4">
              {/* AI Report Card */}
              {exc.ai_analysis && (
                <Card className="border-emerald-500/30">
                  <CardHeader className="pb-3 border-b border-border bg-emerald-500/5">
                    <CardTitle className="flex items-center gap-2 text-xs text-emerald-400">
                      <Cpu className="h-3.5 w-3.5" />
                      Grounded AI Investigation Findings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3.5 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">
                        Root Cause Summary
                      </p>
                      <p className="text-sm font-medium leading-relaxed text-foreground">
                        {exc.ai_analysis.summary}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1.5">
                        Extracted Evidence
                      </p>
                      <div className="space-y-1.5">
                        {exc.ai_analysis.evidence.map((ev, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-emerald-400 shrink-0 font-bold">•</span>
                            <span className="text-muted-foreground">{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">
                        Likely Underlying Cause
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {exc.ai_analysis.likely_cause}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Candidate Settlements Matcher */}
              <Card>
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-3.5 w-3.5 text-sky-400" />
                      <span>Matching Settlement Candidates ({exc.candidate_matches?.length || 0})</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {!exc.candidate_matches || exc.candidate_matches.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No matching settlement records detected in bank feed.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {exc.candidate_matches.map((cand) => {
                        const isSelected = selectedCandidate === cand.settlement_id;
                        return (
                          <div
                            key={cand.settlement_id}
                            onClick={() => {
                              setSelectedCandidate(cand.settlement_id);
                              setSelectedAction("manual_match");
                            }}
                            className={`p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : "border-border hover:bg-accent/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-foreground">
                                  {cand.settlement_id}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {cand.source}
                                </Badge>
                              </div>
                              <span className="font-mono font-bold text-foreground">
                                {formatCurrency(cand.amount, cand.currency)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground mt-2">
                              <div>Ref: <span className="font-mono text-foreground">{cand.reference}</span></div>
                              <div className="text-right">
                                Diff: <span className="font-mono text-amber-400">₹{cand.amount_difference.toFixed(2)}</span>
                              </div>
                              <div>Date: {cand.settlement_date}</div>
                              <div className="text-right">
                                Match Score: <span className="font-mono font-semibold text-emerald-400">{Math.round(cand.confidence_score * 100)}%</span>
                              </div>
                            </div>

                            {!isResolved && (
                              <div className="mt-2.5 pt-2 border-t border-border/40 flex justify-end">
                                <Button
                                  size="sm"
                                  variant={isSelected ? "success" : "outline"}
                                  className="h-7 text-[11px]"
                                  disabled={submitting}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExecuteAction("manual_match", cand.settlement_id);
                                  }}
                                >
                                  {isSelected ? "Confirm Match with this Settlement" : "Match with this Record"}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Admin & Controller Action Console */}
            <div className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-3 border-b border-border bg-secondary/30">
                  <CardTitle className="flex items-center gap-2 text-xs">
                    <Shield className="h-3.5 w-3.5 text-foreground" />
                    Human Controller Decision Console
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Previous Resolution Note if already resolved */}
                  {exc.resolved_by && (
                    <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                        Resolved by: {exc.resolved_by}
                      </span>
                      <p className="text-foreground">{exc.resolution_notes || "No remarks recorded."}</p>
                    </div>
                  )}

                  {/* Action Mode Radio Grid */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase font-semibold text-muted-foreground block">
                      Select Controller Action:
                    </label>

                    <div className="space-y-1.5">
                      {[
                        {
                          id: "approve",
                          label: "Approve AI Recommendation",
                          desc: "Concurs with AI root cause & auto-reconciles",
                          color: "emerald",
                        },
                        {
                          id: "manual_match",
                          label: "Manual Match to Settlement",
                          desc: "Pair transaction with selected candidate settlement",
                          color: "sky",
                        },
                        {
                          id: "write_off",
                          label: "Write-off Fee Variance",
                          desc: "Accept variance as gateway fee/expense",
                          color: "emerald",
                        },
                        {
                          id: "reject",
                          label: "Reject / Flag Dispute",
                          desc: "Flag as potential duplicate or fraudulent charge",
                          color: "red",
                        },
                        {
                          id: "escalate",
                          label: "Escalate to Senior Controller",
                          desc: "Send to Senior Controller queue for review",
                          color: "amber",
                        },
                      ].map((act) => {
                        const isSelected = selectedAction === act.id;
                        return (
                          <div
                            key={act.id}
                            onClick={() => setSelectedAction(act.id as any)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? `border-${act.color}-500/50 bg-${act.color}-500/10`
                                : "border-border hover:bg-secondary/40"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{act.label}</span>
                              <div
                                className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected
                                    ? `border-${act.color}-500 bg-${act.color}-500`
                                    : "border-muted-foreground/40"
                                }`}
                              >
                                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-background" />}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{act.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resolution Notes Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase font-semibold text-muted-foreground block">
                      Controller Remarks / Audit Notes:
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter resolution notes for compliance and audit trail..."
                      className="w-full rounded-md border border-input bg-background p-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
                    />
                  </div>

                  {/* Downstream Impact Preview */}
                  <div className="p-3 rounded-md bg-secondary/40 border border-border space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Downstream Ledger Impact:
                    </span>
                    <div className="space-y-1.5 text-[11px]">
                      {selectedAction === "approve" && (
                        <>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Reconciliation result updated to <b>RESOLVED</b></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Transaction status updated to <b>reconciled</b></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Batch match rate automatically recalculated</span>
                          </div>
                        </>
                      )}
                      {selectedAction === "manual_match" && (
                        <>
                          <div className="flex items-center gap-1.5 text-sky-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Linked to Settlement: <b>{selectedCandidate || "Selected ID"}</b></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sky-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Transaction marked <b>reconciled</b></span>
                          </div>
                        </>
                      )}
                      {selectedAction === "write_off" && (
                        <>
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Fee variance accepted and marked resolved</span>
                          </div>
                        </>
                      )}
                      {selectedAction === "reject" && (
                        <>
                          <div className="flex items-center gap-1.5 text-red-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Transaction flagged as <b>disputed</b></span>
                          </div>
                        </>
                      )}
                      {selectedAction === "escalate" && (
                        <>
                          <div className="flex items-center gap-1.5 text-amber-400">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Case prioritized in Senior Review Queue</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Submit Action Button */}
                  <Button
                    className="w-full font-bold uppercase tracking-wider text-xs"
                    disabled={submitting}
                    variant={
                      selectedAction === "reject"
                        ? "destructive"
                        : selectedAction === "escalate"
                        ? "secondary"
                        : "default"
                    }
                    onClick={() => handleExecuteAction(selectedAction)}
                  >
                    {submitting ? "Executing..." : `Submit Decision: ${selectedAction.replace(/_/g, " ")}`}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
