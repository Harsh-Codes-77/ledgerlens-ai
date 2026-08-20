"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import { fetchApi, Batch, ReconciliationResult } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Cpu } from "lucide-react";

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (batchId) {
      loadData();
    }
  }, [batchId]);

  async function loadData() {
    try {
      setLoading(true);
      const bData = await fetchApi<Batch>(`/api/batches/${batchId}`);
      setBatch(bData);
      const rData = await fetchApi<ReconciliationResult[]>(`/api/batches/${batchId}/results`);
      setResults(rData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !batch) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Batch Detail" />
        <div className="p-6 font-mono text-xs text-secondaryText">Loading batch execution details...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title={`Batch: ${batch.name}`} />

      <main className="p-6 space-y-6 max-w-7xl">
        <Link href="/batches" className="inline-flex items-center space-x-2 text-xs font-mono text-secondaryText hover:text-primaryText">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Batches</span>
        </Link>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 font-mono">
          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-[11px] text-secondaryText uppercase">Total Records</div>
            <div className="text-xl font-bold text-primaryText mt-1">{batch.total_records}</div>
          </div>
          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-[11px] text-secondaryText uppercase">Matched</div>
            <div className="text-xl font-bold text-positive mt-1">{batch.matched_count}</div>
          </div>
          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-[11px] text-secondaryText uppercase">Auto Resolved</div>
            <div className="text-xl font-bold text-primaryText mt-1">{batch.auto_resolved_count}</div>
          </div>
          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-[11px] text-secondaryText uppercase">Escalated</div>
            <div className="text-xl font-bold text-warning mt-1">{batch.escalated_count}</div>
          </div>
          <div className="bg-surface border border-surfaceBorder p-4 rounded">
            <div className="text-[11px] text-secondaryText uppercase">Match Rate</div>
            <div className="text-xl font-bold text-primaryText mt-1">{batch.match_rate}%</div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-surface border border-surfaceBorder rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">
            Reconciliation Execution Log ({results.length} Records)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-surfaceBorder text-secondaryText">
                  <th className="pb-2 font-normal">Source Record</th>
                  <th className="pb-2 font-normal">Matched Record</th>
                  <th className="pb-2 font-normal">Match Type</th>
                  <th className="pb-2 font-normal">Confidence</th>
                  <th className="pb-2 font-normal">Amount Diff</th>
                  <th className="pb-2 font-normal">Decision</th>
                  <th className="pb-2 font-normal">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surfaceBorder/50">
                {results.slice(0, 100).map((r) => (
                  <tr key={r.id} className="hover:bg-background/40">
                    <td className="py-2.5 font-medium text-primaryText">{r.source_record_id}</td>
                    <td className="py-2.5 text-secondaryText">{r.matched_record_id || "—"}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.match_type === "EXACT"
                          ? "bg-positive/10 text-positive border border-positive/20"
                          : r.match_type === "TOLERANCE"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-warning/10 text-warning border border-warning/20"
                      }`}>
                        {r.match_type}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-primaryText">{(r.confidence_score * 100).toFixed(0)}%</td>
                    <td className="py-2.5 text-secondaryText">₹{r.amount_difference.toFixed(2)}</td>
                    <td className="py-2.5 font-semibold text-primaryText">{r.decision}</td>
                    <td className="py-2.5 text-secondaryText text-[11px] max-w-xs truncate">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
