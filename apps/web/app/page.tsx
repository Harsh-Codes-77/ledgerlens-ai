"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchApi, Batch, ExceptionCase } from "@/lib/api";
import { CheckCircle2, AlertTriangle, ArrowUpRight, Play, ShieldAlert, Zap } from "lucide-react";
import Link from "next/link";

export default function OverviewPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const batchData = await fetchApi<Batch[]>("/api/batches");
      setBatches(batchData);
      const excData = await fetchApi<ExceptionCase[]>("/api/exceptions");
      setExceptions(excData);
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

      await fetchApi<Batch>(`/api/batches/${newBatch.id}/process`, {
        method: "POST",
      });

      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  const latestBatch = batches[0];
  const totalProcessed = batches.reduce((acc, b) => acc + b.total_records, 0);
  const totalMatched = batches.reduce((acc, b) => acc + b.matched_count, 0);
  const totalAutoResolved = batches.reduce((acc, b) => acc + b.auto_resolved_count, 0);
  const pendingReview = exceptions.filter((e) => e.status === "PENDING_REVIEW" || e.status === "ESCALATED").length;
  const matchRate = totalProcessed > 0 ? ((totalMatched / totalProcessed) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title="Reconciliation Overview" />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-surface border border-surfaceBorder p-4 rounded">
          <div>
            <h3 className="font-semibold text-sm text-primaryText">Autonomous Recon Engine</h3>
            <p className="text-xs text-secondaryText mt-0.5">
              Deterministic matching active • Grounded AI exception investigation enabled
            </p>
          </div>
          <button
            onClick={handleRunDemo}
            disabled={creating}
            className="flex items-center space-x-2 bg-primaryText text-background px-4 py-2 rounded text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{creating ? "Processing 500 Records..." : "Run 500-Record Demo Batch"}</span>
          </button>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-xs text-secondaryText font-mono uppercase">Total Processed</div>
            <div className="text-2xl font-bold text-primaryText mt-2 font-mono">
              {loading ? "..." : totalProcessed.toLocaleString()}
            </div>
            <div className="text-[11px] text-secondaryText mt-1">Across {batches.length} batches</div>
          </div>

          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-xs text-secondaryText font-mono uppercase">Match Rate</div>
            <div className="text-2xl font-bold text-primaryText mt-2 font-mono">
              {loading ? "..." : `${matchRate}%`}
            </div>
            <div className="text-[11px] text-positive flex items-center space-x-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Deterministic & Tolerance</span>
            </div>
          </div>

          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-xs text-secondaryText font-mono uppercase">Auto-Resolved</div>
            <div className="text-2xl font-bold text-primaryText mt-2 font-mono">
              {loading ? "..." : totalAutoResolved.toLocaleString()}
            </div>
            <div className="text-[11px] text-secondaryText mt-1">Safe high-confidence cases</div>
          </div>

          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-xs text-secondaryText font-mono uppercase">Pending Review</div>
            <div className="text-2xl font-bold text-warning mt-2 font-mono">
              {loading ? "..." : pendingReview}
            </div>
            <div className="text-[11px] text-secondaryText mt-1">Escalated for human oversight</div>
          </div>
        </div>

        {/* Activity & Recent Exceptions Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batches Table (2 Cols) */}
          <div className="lg:col-span-2 bg-surface border border-surfaceBorder rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
              <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">Recent Batches</h3>
              <Link href="/batches" className="text-xs text-secondaryText hover:text-primaryText flex items-center space-x-1">
                <span>View All</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {batches.length === 0 ? (
              <div className="py-8 text-center text-xs text-secondaryText font-mono">
                No batches executed yet. Click "Run 500-Record Demo Batch" above to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-surfaceBorder text-secondaryText">
                      <th className="pb-2 font-normal">Batch Name</th>
                      <th className="pb-2 font-normal">Records</th>
                      <th className="pb-2 font-normal">Match Rate</th>
                      <th className="pb-2 font-normal">Latency</th>
                      <th className="pb-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surfaceBorder/50">
                    {batches.slice(0, 5).map((b) => (
                      <tr key={b.id} className="hover:bg-background/40">
                        <td className="py-2.5 font-medium text-primaryText">
                          <Link href={`/batches/${b.id}`} className="hover:underline">
                            {b.name}
                          </Link>
                        </td>
                        <td className="py-2.5 text-secondaryText">{b.total_records}</td>
                        <td className="py-2.5 text-primaryText">{b.match_rate}%</td>
                        <td className="py-2.5 text-secondaryText">{b.processing_time_seconds}s</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-positive/10 text-positive border border-positive/20">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Unresolved Exceptions Panel (1 Col) */}
          <div className="bg-surface border border-surfaceBorder rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
              <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">Unresolved Exceptions</h3>
              <Link href="/exceptions" className="text-xs text-secondaryText hover:text-primaryText flex items-center space-x-1">
                <span>View All</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {exceptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-secondaryText font-mono">
                No active exceptions requiring review.
              </div>
            ) : (
              <div className="space-y-2">
                {exceptions.slice(0, 5).map((exc) => (
                  <Link
                    key={exc.id}
                    href={`/exceptions/${exc.id}`}
                    className="block p-2.5 rounded bg-background/50 border border-surfaceBorder hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-primaryText font-medium">
                        {exc.exception_type}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                        {exc.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondaryText mt-1 line-clamp-1">
                      {exc.ai_analysis?.summary || "Requires human finance controller review."}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
