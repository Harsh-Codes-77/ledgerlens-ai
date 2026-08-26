"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, Batch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { Play, Layers, ArrowRight, Clock, CheckCircle2 } from "lucide-react";

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchName, setBatchName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    try {
      setLoading(true);
      const data = await fetchApi<Batch[]>("/api/batches");
      setBatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!batchName.trim()) return;
    try {
      setCreating(true);
      const newBatch = await fetchApi<Batch>("/api/batches", {
        method: "POST",
        body: JSON.stringify({
          name: batchName,
          use_demo_data: true,
          record_count: 500,
        }),
      });
      await fetchApi<Batch>(`/api/batches/${newBatch.id}/process`, {
        method: "POST",
      });
      setBatchName("");
      await loadBatches();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
          {/* Create Batch */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>New Reconciliation Run</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateBatch} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g., Razorpay March 2026 Batch"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    type="submit"
                    disabled={creating || !batchName.trim()}
                  >
                    <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                    {creating ? "Processing..." : "Run (500 Records)"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Batch List */}
          {loading ? (
            <LoadingState message="Loading reconciliation runs..." />
          ) : batches.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-5 w-5" />}
              title="No reconciliation runs"
              description="Create a batch above to start processing financial records."
            />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
            >
              {batches.map((b) => (
                <motion.div
                  key={b.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <Link href={`/batches/${b.id}`} className="block group">
                    <Card className="hover:bg-accent/30 transition-all cursor-pointer h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-semibold group-hover:text-foreground transition-colors">
                              {b.name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {b.id.substring(0, 8)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              b.status === "COMPLETED"
                                ? "success"
                                : b.status === "PROCESSING"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {b.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                          <ConfidenceRing score={b.match_rate / 100} />
                          <div className="flex-1">
                            <p className="text-lg font-bold tabular-nums">
                              {b.match_rate}%
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Match Rate
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span>
                              {b.matched_count} matched
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3 w-3 text-amber-400" />
                            <span>
                              {b.escalated_count} escalated
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {b.total_records} records
                          </div>
                          <div className="text-muted-foreground font-mono">
                            {b.processing_time_seconds}s
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
