"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/Header";
import {
  fetchApi,
  Transaction,
  TransactionDetail,
  ReconciliationResult,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { LoadingState, EmptyState } from "@/components/ui/states";
import {
  Receipt,
  Search,
  X,
  ChevronRight,
  Landmark,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Hash,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  Shield,
} from "lucide-react";
import {
  formatCurrency,
  formatDateTime,
  formatTime,
  getSourceColor,
} from "@/lib/utils";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<TransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchApi<Transaction[]>("/api/transactions")
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        t.external_transaction_id.toLowerCase().includes(q) ||
        t.payment_reference?.toLowerCase().includes(q) ||
        t.customer_reference?.toLowerCase().includes(q);
      const matchSource = !sourceFilter || t.source === sourceFilter;
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchSource && matchStatus;
    });
  }, [transactions, search, sourceFilter, statusFilter]);

  const sources = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.source))),
    [transactions]
  );
  const statuses = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.status))),
    [transactions]
  );

  async function handleRowClick(txn: Transaction) {
    try {
      setDetailLoading(true);
      setSelected(null);
      const detail = await fetchApi<TransactionDetail>(
        `/api/transactions/${txn.id}`
      );
      setSelected(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar />
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Table Panel */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
              selected ? "lg:w-[55%]" : "w-full"
            }`}
          >
            <div className="p-6 pb-3 space-y-3">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <h2 className="text-lg font-bold tracking-tight">
                    Transaction Explorer
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filtered.length} of {transactions.length} records · Click
                    any row to inspect
                  </p>
                </div>
              </motion.div>

              {/* Filters */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="flex flex-wrap items-center gap-2"
              >
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search ID, reference, customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Sources</option>
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Status</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </motion.div>
            </div>

            {/* Table */}
            {loading ? (
              <LoadingState message="Loading transactions..." />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-5 w-5" />}
                title="No transactions found"
                description="Import or connect a data source to begin reconciliation."
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex-1 overflow-y-auto px-6 pb-6"
              >
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Transaction ID
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Source
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Amount
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Payment Ref
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Customer Ref
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Date
                            </th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((t) => {
                            const isSelected =
                              selected?.transaction.id === t.id;
                            return (
                              <tr
                                key={t.id}
                                onClick={() => handleRowClick(t)}
                                className={`border-b border-border/50 cursor-pointer transition-all ${
                                  isSelected
                                    ? "bg-emerald-500/5"
                                    : "hover:bg-accent/30"
                                }`}
                              >
                                <td className="py-2.5 px-4 font-medium font-mono">
                                  {t.external_transaction_id}
                                </td>
                                <td className="py-2.5 px-4">
                                  <Badge
                                    variant="secondary"
                                    className={`bg-${getSourceColor(t.source)}-500/10 text-${getSourceColor(t.source)}-400 border-${getSourceColor(t.source)}-500/20`}
                                  >
                                    {t.source}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-4 font-mono tabular-nums font-medium">
                                  {formatCurrency(t.amount, t.currency)}
                                </td>
                                <td className="py-2.5 px-4">
                                  <Badge
                                    variant={
                                      t.status === "captured"
                                        ? "success"
                                        : t.status === "refunded"
                                        ? "info"
                                        : t.status === "failed"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {t.status}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-4 text-muted-foreground font-mono">
                                  {t.payment_reference || "—"}
                                </td>
                                <td className="py-2.5 px-4 text-muted-foreground font-mono">
                                  {t.customer_reference || "—"}
                                </td>
                                <td className="py-2.5 px-4 text-muted-foreground">
                                  {formatDateTime(t.transaction_date)}
                                </td>
                                <td className="py-2.5 px-2">
                                  <ChevronRight
                                    className={`h-3.5 w-3.5 transition-transform ${
                                      isSelected
                                        ? "text-emerald-400 rotate-90"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {(selected || detailLoading) && (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 40, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "45%" }}
                exit={{ opacity: 0, x: 40, width: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="hidden lg:block border-l border-border bg-background overflow-y-auto"
              >
                <DetailPanel
                  data={selected}
                  loading={detailLoading}
                  onClose={() => setSelected(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/* ── Detail Panel ──────────────────────────────────────── */

function DetailPanel({
  data,
  loading,
  onClose,
}: {
  data: TransactionDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Loading transaction details..." />
      </div>
    );
  }
  if (!data) return null;

  const txn = data.transaction;
  const rec = data.reconciliation_result;
  const exc = data.exception;
  const set = data.settlement;
  const refund = data.refund;
  const logs = data.audit_logs;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Receipt className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold font-mono truncate">
              {txn.external_transaction_id}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Full transaction record
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Core Details */}
        <Section title="Transaction Details" icon={<Receipt className="h-3.5 w-3.5" />}>
          <FieldRow label="Transaction ID" value={txn.external_transaction_id} mono />
          <FieldRow label="Source" value={
            <Badge variant="secondary" className={`bg-${getSourceColor(txn.source)}-500/10 text-${getSourceColor(txn.source)}-400 border-${getSourceColor(txn.source)}-500/20`}>
              {txn.source}
            </Badge>
          } />
          <FieldRow label="Amount" value={
            <span className="font-mono tabular-nums font-semibold">
              {formatCurrency(txn.amount, txn.currency)}
            </span>
          } />
          <FieldRow label="Currency" value={txn.currency} />
          <FieldRow label="Status" value={
            <Badge variant={
              txn.status === "captured" ? "success" :
              txn.status === "refunded" ? "info" :
              txn.status === "failed" ? "destructive" : "secondary"
            }>
              {txn.status}
            </Badge>
          } />
          <FieldRow label="Date" value={formatDateTime(txn.transaction_date)} />
          <FieldRow label="Payment Reference" value={txn.payment_reference || "—"} mono />
          <FieldRow label="Customer Reference" value={txn.customer_reference || "—"} mono />
          <FieldRow label="Created" value={txn.created_at ? formatDateTime(txn.created_at) : "—"} />
        </Section>

        {/* Matched Settlement */}
        {set && (
          <Section title="Matched Settlement" icon={<Landmark className="h-3.5 w-3.5" />} accent="sky">
            <FieldRow label="Settlement ID" value={set.external_settlement_id} mono />
            <FieldRow label="Source" value={set.source} />
            <FieldRow label="Amount" value={
              <span className="font-mono tabular-nums font-semibold">
                {formatCurrency(set.amount, set.currency)}
              </span>
            } />
            <FieldRow label="Status" value={<Badge variant="success">{set.status}</Badge>} />
            <FieldRow label="Reference" value={set.reference || "—"} mono />
            <FieldRow label="Settlement Date" value={formatDateTime(set.settlement_date)} />
            <FieldRow label="Amount Diff" value={
              <span className={`font-mono tabular-nums ${Math.abs(txn.amount - set.amount) < 0.01 ? "text-emerald-400" : "text-amber-400"}`}>
                ₹{Math.abs(txn.amount - set.amount).toFixed(2)}
              </span>
            } />
          </Section>
        )}

        {!set && (
          <Section title="Matched Settlement" icon={<Landmark className="h-3.5 w-3.5" />} accent="sky">
            <div className="py-3 text-center">
              <p className="text-xs text-muted-foreground">No matching settlement found</p>
            </div>
          </Section>
        )}

        {/* Reconciliation Result */}
        {rec && (
          <Section title="Reconciliation Result" icon={<Cpu className="h-3.5 w-3.5" />} accent="emerald">
            <div className="flex items-center gap-3 mb-3">
              <ConfidenceRing score={rec.confidence_score} size="md" />
              <div>
                <p className="text-xs font-medium">{Math.round(rec.confidence_score * 100)}% confidence</p>
                <p className="text-[11px] text-muted-foreground">{rec.match_type} match</p>
              </div>
            </div>
            <FieldRow label="Match Type" value={
              <Badge variant={
                rec.match_type === "EXACT" ? "success" :
                rec.match_type === "TOLERANCE" ? "info" :
                rec.match_type === "AMBIGUOUS" ? "warning" : "destructive"
              }>
                {rec.match_type}
              </Badge>
            } />
            <FieldRow label="Decision" value={
              <span className="text-[11px] font-medium uppercase font-mono">
                {rec.decision.replace(/_/g, " ")}
              </span>
            } />
            <FieldRow label="Amount Difference" value={
              <span className="font-mono tabular-nums">₹{rec.amount_difference.toFixed(2)}</span>
            } />
            <FieldRow label="Reason" value={
              <span className="text-muted-foreground text-xs">{rec.reason}</span>
            } />
          </Section>
        )}

        {/* AI Investigation */}
        {exc?.ai_analysis && (
          <Section title="AI Investigation" icon={<Cpu className="h-3.5 w-3.5" />} accent="emerald">
            <FieldRow label="Exception Type" value={
              <span className="font-mono">{exc.ai_analysis.exception_type.replace(/_/g, " ")}</span>
            } />
            <FieldRow label="Summary" value={
              <span className="text-muted-foreground text-xs">{exc.ai_analysis.summary}</span>
            } />
            <div className="mt-2">
              <p className="text-[11px] text-muted-foreground mb-1">Evidence:</p>
              <div className="space-y-1">
                {exc.ai_analysis.evidence.map((e, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <span className="text-emerald-400 mt-0.5">●</span>
                    <span className="text-muted-foreground">{e}</span>
                  </div>
                ))}
              </div>
            </div>
            <FieldRow label="Likely Cause" value={
              <span className="text-muted-foreground text-xs">{exc.ai_analysis.likely_cause}</span>
            } />
            <FieldRow label="Recommended Action" value={
              <Badge variant={
                exc.ai_analysis.recommended_action === "auto_resolve" ? "success" :
                exc.ai_analysis.recommended_action === "escalate" ? "destructive" : "warning"
              }>
                {exc.ai_analysis.recommended_action.replace(/_/g, " ")}
              </Badge>
            } />
            <FieldRow label="AI Confidence" value={
              <ConfidenceRing score={exc.ai_analysis.ai_confidence} size="sm" />
            } />
            <FieldRow label="Severity" value={<Badge variant={
              exc.severity === "HIGH" || exc.severity === "CRITICAL" ? "destructive" :
              exc.severity === "MEDIUM" ? "warning" : "success"
            }>{exc.severity}</Badge>} />
            <FieldRow label="Status" value={<Badge variant={
              exc.status === "AUTO_RESOLVED" ? "success" :
              exc.status === "ESCALATED" ? "destructive" : "secondary"
            }>{exc.status.replace(/_/g, " ")}</Badge>} />
          </Section>
        )}

        {/* Refund */}
        {refund && (
          <Section title="Refund Record" icon={<RotateCcw className="h-3.5 w-3.5" />} accent="amber">
            <FieldRow label="Refund ID" value={refund.external_refund_id} mono />
            <FieldRow label="Amount" value={
              <span className="font-mono tabular-nums font-semibold text-amber-400">
                {formatCurrency(refund.amount, refund.currency)}
              </span>
            } />
            <FieldRow label="Transaction Ref" value={refund.transaction_reference} mono />
            <FieldRow label="Refund Date" value={formatDateTime(refund.refund_date)} />
            <FieldRow label="Status" value={<Badge variant="info">{refund.status}</Badge>} />
          </Section>
        )}

        {/* Audit Trail */}
        {logs.length > 0 && (
          <Section title="Audit Trail" icon={<Shield className="h-3.5 w-3.5" />}>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs pb-2 border-b border-border/50 last:border-0">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`h-2 w-2 rounded-full mt-1.5 ${
                      log.actor_type === "SYSTEM" ? "bg-sky-500" :
                      log.actor_type === "AI_INVESTIGATOR" ? "bg-emerald-500" : "bg-amber-500"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-muted-foreground font-mono whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[9px]">{log.actor_type.replace(/_/g, " ")}</Badge>
                      {log.reason && <span className="text-muted-foreground truncate">{log.reason}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ── Helper Components ──────────────────────────────────── */

function Section({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: "emerald" | "sky" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
        <span className={`${
          accent === "emerald" ? "text-emerald-400" :
          accent === "sky" ? "text-sky-400" :
          accent === "amber" ? "text-amber-400" :
          "text-muted-foreground"
        }`}>{icon}</span>
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
