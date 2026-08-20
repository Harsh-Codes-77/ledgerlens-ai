"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchApi, Batch } from "@/lib/api";
import Link from "next/link";
import { Play, Layers, CheckCircle2, Clock } from "lucide-react";

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
      <Header title="Batch Processing Workspace" />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Create Batch Form */}
        <div className="bg-surface border border-surfaceBorder p-4 rounded space-y-3">
          <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">Start New Reconciliation Batch</h3>
          <form onSubmit={handleCreateBatch} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g., Razorpay March 2026 Batch"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="flex-1 bg-background border border-surfaceBorder rounded px-3 py-2 text-xs font-mono text-primaryText focus:outline-none focus:border-neutral-500"
            />
            <button
              type="submit"
              disabled={creating || !batchName.trim()}
              className="flex items-center space-x-2 bg-primaryText text-background px-4 py-2 rounded text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{creating ? "Processing Batch..." : "Run Batch (500 Records)"}</span>
            </button>
          </form>
        </div>

        {/* Batches Table */}
        <div className="bg-surface border border-surfaceBorder rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">Batch History</h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-secondaryText font-mono">Loading batch records...</div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center text-xs text-secondaryText font-mono">No batches recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-surfaceBorder text-secondaryText">
                    <th className="pb-2 font-normal">Batch ID</th>
                    <th className="pb-2 font-normal">Name</th>
                    <th className="pb-2 font-normal">Total Records</th>
                    <th className="pb-2 font-normal">Matched</th>
                    <th className="pb-2 font-normal">Auto-Resolved</th>
                    <th className="pb-2 font-normal">Escalated</th>
                    <th className="pb-2 font-normal">Match Rate</th>
                    <th className="pb-2 font-normal">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceBorder/50">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-background/40">
                      <td className="py-3 text-secondaryText font-mono">{b.id.substring(0, 8)}...</td>
                      <td className="py-3 font-medium text-primaryText">
                        <Link href={`/batches/${b.id}`} className="hover:underline">
                          {b.name}
                        </Link>
                      </td>
                      <td className="py-3 text-primaryText">{b.total_records}</td>
                      <td className="py-3 text-positive">{b.matched_count}</td>
                      <td className="py-3 text-primaryText">{b.auto_resolved_count}</td>
                      <td className="py-3 text-warning">{b.escalated_count}</td>
                      <td className="py-3 font-bold text-primaryText">{b.match_rate}%</td>
                      <td className="py-3 text-secondaryText">
                        {new Date(b.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
