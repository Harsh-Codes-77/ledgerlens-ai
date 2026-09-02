"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, Batch, ReconciliationResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { MetricCard } from "@/components/ui/metric-card";
import { LoadingState } from "@/components/ui/states";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Clock,
  Layers,
  TrendingUp,
} from "lucide-react";
import { getMatchTypeColor } from "@/lib/utils";

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (batchId) loadData();
  }, [batchId]);

  async function loadData() {
    try {
      setLoading(true);
      const [bData, rData] = await Promise.all([
        fetchApi<Batch>(`/api/batches/${batchId}`),
        fetchApi<ReconciliationResult[]>(`/api/batches/${batchId}/results`),
      ]);
      setBatch(bData);
      setResults(rData);
      // If still processing, poll
      if (bData.status === "PROCESSING") {
        pollBatch();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function pollBatch() {
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const [bData, rData] = await Promise.all([
          fetchApi<Batch>(`/api/batches/${batchId}`),
          fetchApi<ReconciliationResult[]>(`/api/batches/${batchId}/results`),
        ]);
        setBatch(bData);
        setResults(rData);
        if (bData.status === "COMPLETED" || bData.status === "FAILED") return;
      } catch {
        // retry
      }
    }
  }

  if (loading || !batch) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title="Run Detail" />
        <LoadingState message="Loading run details..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar title={batch.name} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
          <Link
            href="/batches"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Runs
          </Link>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-5 gap-3"
          >
            <MetricCard
              label="Total Records"
              value={batch.total_records}
              icon={<Layers className="h-4 w-4" />}
            />
            <MetricCard
              label="Matched"
              value={batch.matched_count}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <MetricCard
              label="Auto-Resolved"
              value={batch.auto_resolved_count}
              icon={<Zap className="h-4 w-4" />}
            />
            <MetricCard
              label="Escalated"
              value={batch.escalated_count}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <MetricCard
              label="Match Rate"
              value={`${batch.match_rate}%`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </motion.div>

          {/* Results Table */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>
                  Execution Log ({results.length} records)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                          Source
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                          Matched
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                          Confidence
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                          Amount Diff
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                          Decision
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground max-w-xs">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 100).map((r) => {
                        const matchColor = getMatchTypeColor(r.match_type);
                        return (
                          <tr
                            key={r.id}
                            className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-medium font-mono">
                              {r.source_record_id}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground font-mono">
                              {r.matched_record_id || "—"}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={
                                  r.match_type === "EXACT"
                                    ? "success"
                                    : r.match_type === "TOLERANCE"
                                    ? "info"
                                    : r.match_type === "AMBIGUOUS"
                                    ? "warning"
                                    : "destructive"
                                }
                              >
                                {r.match_type}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <ConfidenceRing
                                score={r.confidence_score}
                                size="sm"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums">
                              ₹{r.amount_difference.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[11px] font-medium font-mono uppercase">
                                {r.decision.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                              {r.reason}
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
        </div>
      </main>
    </div>
  );
}
