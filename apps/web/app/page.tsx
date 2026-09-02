"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { useSession } from "@/lib/session-context";
import { fetchApi, Batch, ExceptionCase } from "@/lib/api";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Cpu,
  Layers,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function OverviewPage() {
  const { selectedBatchId, batches, refreshBatches } = useSession();
  const [exceptions, setExceptions] = useState<ExceptionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedBatchId]);

  async function loadData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBatchId) params.set("batch_id", selectedBatchId);
      const qs = params.toString();
      const excData = await fetchApi<ExceptionCase[]>(
        `/api/exceptions${qs ? `?${qs}` : ""}`
      );
      setExceptions(excData);
      if (!selectedBatchId) await refreshBatches();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunDemo() {
    try {
      setCreating(true);
      const newBatch = await fetchApi<Batch>("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          name: `Demo Batch #${Math.floor(Math.random() * 9000) + 1000}`,
          use_demo_data: true,
          record_count: 500,
        }),
      });
      // Process returns immediately — poll until done
      await fetchApi<Batch>(`/api/batches/${newBatch.id}/process`, {
        method: "POST",
      });
      // Poll for completion
      const pollBatch = async () => {
        for (let i = 0; i < 120; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const b = await fetchApi<Batch>(`/api/batches/${newBatch.id}`);
          if (b.status === "COMPLETED" || b.status === "FAILED") {
            await refreshBatches();
            return;
          }
        }
        await refreshBatches();
      };
      await pollBatch();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  // When a session is selected, scope to that batch; otherwise show everything
  const scopedBatches = useMemo(() => {
    if (selectedBatchId) return batches.filter((b) => b.id === selectedBatchId);
    return batches;
  }, [batches, selectedBatchId]);

  const stats = useMemo(() => {
    const totalProcessed = scopedBatches.reduce((a, b) => a + b.total_records, 0);
    const totalMatched = scopedBatches.reduce((a, b) => a + b.matched_count, 0);
    const totalAutoResolved = scopedBatches.reduce(
      (a, b) => a + b.auto_resolved_count,
      0
    );
    const totalEscalated = scopedBatches.reduce(
      (a, b) => a + b.escalated_count,
      0
    );
    const totalExceptions = scopedBatches.reduce(
      (a, b) => a + b.exception_count,
      0
    );
    const pendingReview = exceptions.filter(
      (e) => e.status === "PENDING_REVIEW" || e.status === "ESCALATED"
    ).length;
    const matchRate =
      totalProcessed > 0
        ? ((totalMatched / totalProcessed) * 100).toFixed(1)
        : "0.0";
    const avgConfidence =
      exceptions.length > 0
        ? (
            exceptions.reduce((a, e) => a + e.confidence_score, 0) /
            exceptions.length
          ).toFixed(0)
        : "0";

    return {
      totalProcessed,
      totalMatched,
      totalAutoResolved,
      totalEscalated,
      totalExceptions,
      pendingReview,
      matchRate,
      avgConfidence,
      batchCount: scopedBatches.length,
    };
  }, [scopedBatches, exceptions]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <LoadingState message="Loading financial intelligence..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
          {/* Command Center Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Financial Operations
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stats.batchCount > 0
                  ? `${stats.batchCount} batch${stats.batchCount > 1 ? "es" : ""} processed across ${stats.totalProcessed.toLocaleString()} records`
                  : "No reconciliation runs yet — start with a demo batch below."}
              </p>
            </div>
            <Button
              onClick={handleRunDemo}
              disabled={creating}
              size="default"
              className="shrink-0"
            >
              <Play className="h-3.5 w-3.5 mr-2 fill-current" />
              {creating ? "Processing 500 Records..." : "Run Demo Batch"}
            </Button>
          </motion.div>

          {/* Metrics Grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <motion.div variants={fadeUp}>
              <MetricCard
                label="Total Processed"
                value={stats.totalProcessed.toLocaleString()}
                subtitle={`Across ${stats.batchCount} batches`}
                icon={<Layers className="h-4 w-4" />}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard
                label="Match Rate"
                value={`${stats.matchRate}%`}
                subtitle="Deterministic + tolerance"
                icon={<CheckCircle2 className="h-4 w-4" />}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard
                label="Auto-Resolved"
                value={stats.totalAutoResolved.toLocaleString()}
                subtitle="High-confidence cases"
                icon={<Zap className="h-4 w-4" />}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard
                label="Pending Review"
                value={stats.pendingReview}
                subtitle="Requires human decision"
                icon={<AlertTriangle className="h-4 w-4" />}
              />
            </motion.div>
          </motion.div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Batches */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle>Recent Runs</CardTitle>
                  {scopedBatches.length > 0 && (
                    <Link
                      href="/batches"
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  {scopedBatches.length === 0 ? (
                    <EmptyState
                      icon={<Layers className="h-5 w-5" />}
                      title={selectedBatchId ? "No data in this session" : "No runs yet"}
                      description={
                        selectedBatchId
                          ? "This session has no batch data."
                          : "Click 'Run Demo Batch' above to generate and reconcile 500 financial records."
                      }
                    />
                  ) : (
                    <div className="space-y-2">
                      {scopedBatches.slice(0, 5).map((b, i) => (
                        <motion.div
                          key={b.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                        >
                          <Link
                            href={`/batches/${b.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-foreground">
                                  {b.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {b.total_records} records ·{" "}
                                  {b.processing_time_seconds}s
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <ConfidenceRing
                                score={b.match_rate / 100}
                                size="sm"
                              />
                              <Badge
                                variant={
                                  b.status === "COMPLETED"
                                    ? "success"
                                    : "warning"
                                }
                              >
                                {b.status}
                              </Badge>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Exceptions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle>Active Exceptions</CardTitle>
                  {exceptions.length > 0 && (
                    <Link
                      href="/exceptions"
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </CardHeader>
                <CardContent>
                  {exceptions.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      title="All clear"
                      description="No active exceptions requiring attention."
                    />
                  ) : (
                    <div className="space-y-2">
                      {exceptions.slice(0, 6).map((exc) => (
                        <Link
                          key={exc.id}
                          href={`/exceptions/${exc.id}`}
                          className="block p-3 rounded-lg border border-border hover:bg-accent/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium font-mono">
                              {exc.exception_type.replace(/_/g, " ")}
                            </span>
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
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {exc.ai_analysis?.summary ||
                              "Requires review"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Pipeline Status */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Reconciliation Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {[
                    {
                      label: "Ingest",
                      icon: Layers,
                      active: stats.totalProcessed > 0,
                    },
                    {
                      label: "Validate",
                      icon: ShieldCheck,
                      active: stats.totalProcessed > 0,
                    },
                    {
                      label: "Exact Match",
                      icon: CheckCircle2,
                      active: stats.totalMatched > 0,
                    },
                    {
                      label: "AI Investigation",
                      icon: Cpu,
                      active: stats.totalExceptions > 0,
                    },
                    {
                      label: "Resolution",
                      icon: TrendingUp,
                      active: stats.totalAutoResolved > 0,
                    },
                  ].map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label} className="flex items-center">
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                            step.active
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{step.label}</span>
                        </div>
                        {i < 4 && (
                          <div
                            className={`w-6 h-px mx-0.5 ${
                              step.active ? "bg-emerald-500/40" : "bg-border"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
