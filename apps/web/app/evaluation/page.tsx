"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, Batch, EvaluationData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { LoadingState, EmptyState } from "@/components/ui/states";
import {
  BarChart3,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const PIE_COLORS = ["#10b981", "#f59e0b", "#0ea5e9", "#ef4444", "#8b5cf6"];

export default function EvaluationPage() {
  const [evalData, setEvalData] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvaluation();
  }, []);

  async function loadEvaluation() {
    try {
      setLoading(true);
      const batches = await fetchApi<Batch[]>("/api/batches");
      if (batches.length > 0) {
        const data = await fetchApi<EvaluationData>(
          `/api/evaluation/${batches[0].id}`
        );
        setEvalData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <LoadingState message="Loading analytics..." />
      </div>
    );
  }

  if (!evalData) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="No evaluation data"
          description="Run a reconciliation batch first to generate analytics."
        />
      </div>
    );
  }

  const accuracyRate =
    evalData.total_records > 0
      ? ((evalData.correct_matches / evalData.total_records) * 100).toFixed(1)
      : "0.0";

  const matchTypeData = [
    { name: "Exact", value: evalData.match_type_accuracy?.EXACT ?? 0 },
    {
      name: "Tolerance",
      value: evalData.match_type_accuracy?.TOLERANCE ?? 0,
    },
    { name: "Ambiguous", value: evalData.match_type_accuracy?.AMBIGUOUS ?? 0 },
    { name: "Unmatched", value: evalData.match_type_accuracy?.UNMATCHED ?? 0 },
  ].filter((d) => d.value > 0);

  const resolutionData = evalData.resolution_distribution
    ? Object.entries(evalData.resolution_distribution).map(([key, val]) => ({
        name: key.replace(/_/g, " "),
        value: val as number,
      }))
    : [];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-bold tracking-tight">
              Analytics & Insights
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evaluation metrics from your latest reconciliation run
            </p>
          </motion.div>

          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <MetricCard
              label="Dataset Size"
              value={evalData.total_records.toLocaleString()}
              subtitle="Ground-truth records"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <MetricCard
              label="Accuracy Rate"
              value={`${accuracyRate}%`}
              subtitle="Correct matches"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <MetricCard
              label="False Positives"
              value={evalData.false_positives}
              subtitle="Incorrect auto-resolves"
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <MetricCard
              label="Escalation Precision"
              value={`${evalData.escalation_precision ?? 0}%`}
              subtitle="Correct human escalations"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matchTypeData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Match Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={matchTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          stroke="none"
                        >
                          {matchTypeData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(240 5% 6%)",
                            border: "1px solid hsl(240 4% 14%)",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {matchTypeData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {d.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {resolutionData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Resolution Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={resolutionData}>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(240 5% 6%)",
                            border: "1px solid hsl(240 4% 14%)",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="value"
                          radius={[4, 4, 0, 0]}
                          fill="#10b981"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Known Failures */}
          {evalData.known_failures && evalData.known_failures.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-red-400" />
                    Known Failure Cases ({evalData.known_failures.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            Type
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            Description
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            Expected
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            Got
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalData.known_failures.map((f, i) => (
                          <tr
                            key={i}
                            className="border-b border-border/50"
                          >
                            <td className="py-2 px-3 font-medium font-mono">
                              {f.type}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {f.description}
                            </td>
                            <td className="py-2 px-3 font-mono text-emerald-400">
                              {f.expected}
                            </td>
                            <td className="py-2 px-3 font-mono text-red-400">
                              {f.got}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
