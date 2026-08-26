"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, ExceptionCase } from "@/lib/api";
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
} from "lucide-react";

export default function ExceptionDetailPage() {
  const params = useParams();
  const exceptionId = params.id as string;
  const [exc, setExc] = useState<ExceptionCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "reject" | "escalate"
  >("escalate");
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
      await fetchApi<ExceptionCase>(
        `/api/exceptions/${exceptionId}/${actionType}`,
        {
          method: "POST",
          body: JSON.stringify({
            action: actionType,
            notes: notes || undefined,
          }),
        }
      );
      setActionSuccess(
        actionType === "approve"
          ? "Case approved and resolved."
          : actionType === "reject"
          ? "Case rejected."
          : "Case escalated for senior review."
      );
      await loadException();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !exc) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Investigation" />
        <LoadingState message="Loading investigation details..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar title="Investigation" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-4">
          <Link
            href="/exceptions"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Queue
          </Link>

          {/* Success Banner */}
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              {actionSuccess}
            </motion.div>
          )}

          {/* Pipeline Progress */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 overflow-x-auto pb-1"
          >
            {[
              { label: "Exception Detected", active: true },
              {
                label: "AI Investigation",
                active: !!exc.ai_analysis,
              },
              {
                label:
                  exc.status === "AUTO_RESOLVED"
                    ? "Auto-Resolved"
                    : exc.status === "ESCALATED"
                    ? "Escalated"
                    : "Awaiting Decision",
                active: exc.status !== "PENDING_REVIEW",
              },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                    step.active
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {step.label}
                </div>
                {i < 2 && (
                  <div
                    className={`w-6 h-px mx-0.5 ${
                      step.active ? "bg-emerald-500/40" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Case Context */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    Case Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Exception Type
                    </span>
                    <span className="text-xs font-medium font-mono">
                      {exc.exception_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Severity
                    </span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant={
                        exc.status === "AUTO_RESOLVED"
                          ? "success"
                          : exc.status === "ESCALATED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {exc.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      AI Confidence
                    </span>
                    <ConfidenceRing score={exc.confidence_score} size="sm" />
                  </div>
                  <div className="h-px bg-border" />
                  {exc.transaction_details && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                        Source Transaction
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID</span>
                          <span className="font-mono">
                            {exc.transaction_details.external_transaction_id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-mono tabular-nums">
                            ₹{exc.transaction_details.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Source</span>
                          <span>{exc.transaction_details.source}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span>{exc.transaction_details.status}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Center: Investigation Report */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-1 space-y-4"
            >
              {exc.ai_analysis ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-emerald-400" />
                        AI Investigation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                          Summary
                        </p>
                        <p className="text-sm leading-relaxed">
                          {exc.ai_analysis.summary}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                          Likely Cause
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {exc.ai_analysis.likely_cause}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                          Evidence
                        </p>
                        <div className="space-y-1.5">
                          {exc.ai_analysis.evidence.map((e, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span className="text-emerald-400 mt-0.5">●</span>
                              <span className="text-muted-foreground">{e}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                          Recommended Action
                        </p>
                        <Badge
                          variant={
                            exc.ai_analysis.recommended_action ===
                            "auto_resolve"
                              ? "success"
                              : exc.ai_analysis.recommended_action ===
                                "escalate"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {exc.ai_analysis.recommended_action.replace(
                            /_/g,
                            " "
                          )}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Cpu className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Investigation pending...
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Decision Timeline */}
              {exc.decision_timeline && exc.decision_timeline.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Decision Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {exc.decision_timeline.map((event, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <div className="flex flex-col items-center">
                            <div
                              className={`h-2 w-2 rounded-full mt-1.5 ${
                                event.outcome?.includes("MATCH")
                                  ? "bg-emerald-500"
                                  : event.outcome?.includes("EXCEPTION")
                                  ? "bg-amber-500"
                                  : "bg-sky-500"
                              }`}
                            />
                            {i < (exc.decision_timeline?.length || 0) - 1 && (
                              <div className="w-px flex-1 bg-border my-1" />
                            )}
                          </div>
                          <div className="pb-3">
                            <p className="font-medium">{event.stage}</p>
                            <p className="text-muted-foreground">
                              {event.action}
                            </p>
                            {event.confidence !== undefined && (
                              <p className="text-muted-foreground font-mono">
                                Confidence: {Math.round(event.confidence * 100)}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Right: Decision Panel */}
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="sticky top-16">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Human Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                      Recommended
                    </p>
                    <div className="p-3 rounded-md bg-secondary/50 text-xs text-muted-foreground">
                      {exc.recommended_action
                        ? exc.recommended_action.replace(/_/g, " ")
                        : "Review case and decide"}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {(
                      [
                        ["approve", "Approve Resolution", "success"],
                        ["reject", "Reject Resolution", "destructive"],
                        ["escalate", "Escalate to Senior", "warning"],
                      ] as const
                    ).map(([action, label, variant]) => (
                      <button
                        key={action}
                        onClick={() => setSelectedAction(action)}
                        className={`w-full flex items-center justify-between p-3 rounded-md border text-xs font-medium transition-all ${
                          selectedAction === action
                            ? `border-${variant === "success" ? "emerald" : variant === "destructive" ? "red" : "amber"}-500/40 bg-${variant === "success" ? "emerald" : variant === "destructive" ? "red" : "amber"}-500/10`
                            : "border-border hover:bg-accent/50"
                        }`}
                      >
                        <span>{label}</span>
                        <div
                          className={`h-3 w-3 rounded-full border-2 ${
                            selectedAction === action
                              ? `border-${variant === "success" ? "emerald" : variant === "destructive" ? "red" : "amber"}-500`
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {selectedAction === action && (
                            <div
                              className={`h-full w-full rounded-full bg-${variant === "success" ? "emerald" : variant === "destructive" ? "red" : "amber"}-500 scale-50`}
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add review notes..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>

                  <Button
                    onClick={() => handleAction(selectedAction)}
                    disabled={submitting}
                    variant={
                      selectedAction === "approve"
                        ? "success"
                        : selectedAction === "reject"
                        ? "destructive"
                        : "default"
                    }
                    className="w-full"
                  >
                    {submitting
                      ? "Processing..."
                      : selectedAction === "approve"
                      ? "Approve & Resolve"
                      : selectedAction === "reject"
                      ? "Reject"
                      : "Escalate"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
