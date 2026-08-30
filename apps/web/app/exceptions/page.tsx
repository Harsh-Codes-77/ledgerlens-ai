"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/Header";
import { useSession } from "@/lib/session-context";
import { fetchApi, ExceptionCase } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { MetricCard } from "@/components/ui/metric-card";
import { LoadingState, EmptyState } from "@/components/ui/states";
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Play,
  Layers,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

type TabFilter = "all" | "pending" | "escalated" | "resolved" | "rejected";

export default function ExceptionsPage() {
  const { selectedBatchId, batches } = useSession();
  const [exceptions, setExceptions] = useState<ExceptionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "confidence" | "date">("severity");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadExceptions();
  }, [typeFilter, severityFilter, selectedBatchId]);

  async function loadExceptions() {
    try {
      setLoading(true);
      let query = "/api/exceptions?";
      if (typeFilter) query += `exception_type=${typeFilter}&`;
      if (severityFilter) query += `severity=${severityFilter}&`;
      if (selectedBatchId) query += `batch_id=${selectedBatchId}&`;
      const data = await fetchApi<ExceptionCase[]>(query);
      setExceptions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Calculate Metrics
  const stats = useMemo(() => {
    const pending = exceptions.filter((e) => e.status === "PENDING_REVIEW");
    const escalated = exceptions.filter((e) => e.status === "ESCALATED");
    const resolved = exceptions.filter((e) => e.status === "APPROVED" || e.status === "AUTO_RESOLVED");
    const rejected = exceptions.filter((e) => e.status === "REJECTED");
    const totalExposure = [...pending, ...escalated].reduce(
      (acc, e) => acc + (e.transaction_details?.amount || 0),
      0
    );

    return {
      total: exceptions.length,
      pendingCount: pending.length,
      escalatedCount: escalated.length,
      resolvedCount: resolved.length,
      rejectedCount: rejected.length,
      actionableCount: pending.length + escalated.length,
      totalExposure,
      firstPendingId: [...pending, ...escalated][0]?.id,
    };
  }, [exceptions]);

  // Filter based on active tab
  const tabFiltered = useMemo(() => {
    return exceptions.filter((e) => {
      if (activeTab === "pending") return e.status === "PENDING_REVIEW";
      if (activeTab === "escalated") return e.status === "ESCALATED";
      if (activeTab === "resolved") return e.status === "APPROVED" || e.status === "AUTO_RESOLVED";
      if (activeTab === "rejected") return e.status === "REJECTED";
      return true;
    });
  }, [exceptions, activeTab]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...tabFiltered];
    if (sortBy === "confidence") {
      copy.sort((a, b) => a.confidence_score - b.confidence_score);
    } else if (sortBy === "date") {
      copy.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    } else {
      const order: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };
      copy.sort(
        (a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
      );
    }
    return copy;
  }, [tabFiltered, sortBy]);

  // Batch name lookup for grouping
  const batchNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    batches.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [batches]);

  // Group exceptions by batch (only when showing all sessions)
  const grouped = useMemo(() => {
    if (selectedBatchId) {
      return [{ batchId: selectedBatchId, name: batchNameMap[selectedBatchId] || "Selected Session", items: sorted }];
    }
    const groups: { batchId: string; name: string; items: ExceptionCase[] }[] = [];
    const order: Record<string, number> = {};
    sorted.forEach((exc) => {
      const bid = exc.batch_id || "unknown";
      if (!(bid in order)) {
        order[bid] = groups.length;
        groups.push({ batchId: bid, name: batchNameMap[bid] || "Unknown Batch", items: [] });
      }
      groups[order[bid]].items.push(exc);
    });
    return groups.filter((g) => g.items.length > 0);
  }, [sorted, selectedBatchId, batchNameMap]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar title="Exceptions Management & Human Review Queue" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-5">
          {/* Header & Quick Action */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Exception Investigation Queue
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Review, manually match, or escalate ambiguous financial transactions
              </p>
            </div>
            {stats.firstPendingId && (
              <Button asChild size="default" className="shrink-0">
                <Link href={`/exceptions/${stats.firstPendingId}`}>
                  <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                  Start Reviewing Queue ({stats.actionableCount} Pending)
                </Link>
              </Button>
            )}
          </motion.div>

          {/* Quick Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <MetricCard
              label="Actionable Exposure"
              value={formatCurrency(stats.totalExposure)}
              subtitle={`${stats.actionableCount} pending / escalated`}
              icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
            />
            <MetricCard
              label="Pending Controller Review"
              value={stats.pendingCount}
              subtitle="Awaiting decision"
              icon={<Clock className="h-4 w-4 text-amber-400" />}
            />
            <MetricCard
              label="Senior Escalations"
              value={stats.escalatedCount}
              subtitle="Requires senior review"
              icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
            />
            <MetricCard
              label="Resolved by Humans / AI"
              value={stats.resolvedCount}
              subtitle="Successfully reconciled"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            />
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { key: "pending", label: "Pending Review", count: stats.pendingCount, color: "text-amber-400" },
                { key: "escalated", label: "Escalated", count: stats.escalatedCount, color: "text-red-400" },
                { key: "resolved", label: "Resolved", count: stats.resolvedCount, color: "text-emerald-400" },
                { key: "rejected", label: "Rejected", count: stats.rejectedCount, color: "text-muted-foreground" },
                { key: "all", label: "All Cases", count: stats.total, color: "text-foreground" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabFilter)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? "bg-secondary text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded bg-background/80 ${tab.color}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Types</option>
                <option value="missing_settlement">Missing Settlement</option>
                <option value="amount_mismatch">Amount Mismatch</option>
                <option value="date_mismatch">Date Mismatch</option>
                <option value="duplicate_reference">Duplicate Reference</option>
                <option value="invalid_data">Invalid Data</option>
                <option value="ambiguous_match">Ambiguous Match</option>
                <option value="partial_refund">Partial Refund</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <div className="h-4 w-px bg-border mx-1" />
              {(["severity", "confidence", "date"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    sortBy === s
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "date" ? "Newest" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Exception Groups as Expandable Cards */}
          {loading ? (
            <LoadingState message="Loading exception queue..." />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
              title="No exceptions in this queue"
              description="All cases in this category are clear. Switch tabs or check other queues."
            />
          ) : (
            <div className="space-y-4">
              {grouped.map((group, groupIndex) => {
                const isOpen =
                  expandedGroups[group.batchId] ?? groupIndex === 0;
                const pendingCount = group.items.filter(
                  (e) => e.status === "PENDING_REVIEW"
                ).length;
                const escalatedCount = group.items.filter(
                  (e) => e.status === "ESCALATED"
                ).length;
                const exposure = group.items
                  .filter(
                    (e) =>
                      e.status === "PENDING_REVIEW" || e.status === "ESCALATED"
                  )
                  .reduce(
                    (acc, e) => acc + (e.transaction_details?.amount || 0),
                    0
                  );

                return (
                  <Card
                    key={group.batchId}
                    className="overflow-hidden"
                  >
                    {/* Group Header (clickable) */}
                    <button
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [group.batchId]: !isOpen,
                        }))
                      }
                      className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-accent/40"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Layers className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">
                              {group.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-secondary rounded px-1.5 py-0.5 shrink-0">
                              {group.batchId.substring(0, 8)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {group.items.length} case
                            {group.items.length !== 1 ? "s" : ""} in session
                            {!isOpen &&
                              ` · ${pendingCount} pending / ${escalatedCount} escalated`}
                          </p>
                        </div>
                      </div>

                      {/* Summary badges */}
                      <div className="hidden md:flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-400">
                          {pendingCount} pending
                        </span>
                        {escalatedCount > 0 && (
                          <span className="px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[11px] font-mono text-red-400">
                            {escalatedCount} escalated
                          </span>
                        )}
                        <span className="px-2 py-1 rounded-md bg-secondary/70 border border-border text-[11px] font-mono text-muted-foreground">
                          {formatCurrency(exposure)} exposure
                        </span>
                      </div>

                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                          isOpen && "rotate-90"
                        )}
                      />
                    </button>

                    {/* Expandable Group Body */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: 0.25,
                            ease: [0.4, 0, 0.2, 1],
                          }}
                          className="overflow-hidden border-t border-border"
                        >
                          <div className="divide-y divide-border">
                            {group.items.map((exc) => (
                              <Link
                                key={exc.id}
                                href={`/exceptions/${exc.id}`}
                                className="group flex items-center gap-4 p-4 transition-colors hover:bg-accent/40"
                              >
                                <ConfidenceRing
                                  score={exc.confidence_score}
                                  size="md"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge
                                      variant={
                                        exc.severity === "HIGH" ||
                                        exc.severity === "CRITICAL"
                                          ? "destructive"
                                          : exc.severity === "MEDIUM"
                                          ? "warning"
                                          : "success"
                                      }
                                    >
                                      {exc.severity}
                                    </Badge>
                                    <span className="text-xs font-semibold font-mono">
                                      {exc.exception_type
                                        .replace(/_/g, " ")
                                        .toUpperCase()}
                                    </span>
                                    {exc.transaction_details && (
                                      <span className="text-xs font-mono font-bold text-foreground">
                                        {formatCurrency(
                                          exc.transaction_details.amount,
                                          exc.transaction_details.currency
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {exc.ai_analysis?.summary ||
                                      "Awaiting human controller investigation."}
                                  </p>
                                  {exc.transaction_details && (
                                    <p className="text-[11px] text-muted-foreground font-mono mt-1">
                                      {
                                        exc.transaction_details
                                          .external_transaction_id
                                      }{" "}
                                      · Source:{" "}
                                      {exc.transaction_details.source} · Ref:{" "}
                                      {exc.transaction_details.payment_reference ||
                                        "None"}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right hidden sm:block">
                                    <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                                      Recommendation
                                    </span>
                                    <span className="text-xs font-mono font-medium text-foreground uppercase">
                                      {exc.recommended_action?.replace(/_/g, " ") ||
                                        "REVIEW"}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={
                                      exc.status === "APPROVED" ||
                                      exc.status === "AUTO_RESOLVED"
                                        ? "success"
                                        : exc.status === "ESCALATED"
                                        ? "destructive"
                                        : "warning"
                                    }
                                  >
                                    {exc.status.replace(/_/g, " ")}
                                  </Badge>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
