"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchApi, ExceptionCase } from "@/lib/api";
import Link from "next/link";
import { AlertTriangle, Filter, ArrowRight } from "lucide-react";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<ExceptionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    loadExceptions();
  }, [statusFilter, typeFilter]);

  async function loadExceptions() {
    try {
      setLoading(true);
      let query = "/api/exceptions?";
      if (statusFilter) query += `status=${statusFilter}&`;
      if (typeFilter) query += `exception_type=${typeFilter}&`;

      const data = await fetchApi<ExceptionCase[]>(query);
      setExceptions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title="Exceptions Investigation Queue" />

      <main className="p-6 space-y-6 max-w-7xl">
        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-surface border border-surfaceBorder p-4 rounded font-mono text-xs">
          <div className="flex items-center space-x-3">
            <Filter className="w-4 h-4 text-secondaryText" />
            <span className="text-primaryText font-semibold">Filter Queue:</span>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-surfaceBorder rounded px-2.5 py-1.5 text-xs text-primaryText focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="ESCALATED">Escalated</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="AUTO_RESOLVED">Auto Resolved</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-background border border-surfaceBorder rounded px-2.5 py-1.5 text-xs text-primaryText focus:outline-none"
            >
              <option value="">All Exception Types</option>
              <option value="amount_mismatch">Amount Mismatch</option>
              <option value="missing_settlement">Missing Settlement</option>
              <option value="duplicate_reference">Duplicate Reference</option>
              <option value="ambiguous_match">Ambiguous Match</option>
              <option value="invalid_data">Invalid Data</option>
              <option value="partial_refund">Partial Refund</option>
            </select>
          </div>

          <div className="text-secondaryText">
            Showing <span className="text-primaryText font-bold">{exceptions.length}</span> exceptions
          </div>
        </div>

        {/* Exceptions Data Table */}
        <div className="bg-surface border border-surfaceBorder rounded p-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-secondaryText">Loading exceptions...</div>
          ) : exceptions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-secondaryText">No exceptions found for selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-surfaceBorder text-secondaryText">
                    <th className="pb-2 font-normal">Exception Type</th>
                    <th className="pb-2 font-normal">Severity</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal">AI Confidence</th>
                    <th className="pb-2 font-normal">Recommended Action</th>
                    <th className="pb-2 font-normal">Summary</th>
                    <th className="pb-2 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceBorder/50">
                  {exceptions.map((exc) => (
                    <tr key={exc.id} className="hover:bg-background/40">
                      <td className="py-3 font-semibold text-primaryText">{exc.exception_type}</td>
                      <td className="py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          exc.severity === "HIGH" || exc.severity === "CRITICAL"
                            ? "bg-critical/10 text-critical border border-critical/20"
                            : "bg-warning/10 text-warning border border-warning/20"
                        }`}>
                          {exc.severity}
                        </span>
                      </td>
                      <td className="py-3 text-secondaryText">{exc.status}</td>
                      <td className="py-3 font-bold text-primaryText">{(exc.confidence_score * 100).toFixed(0)}%</td>
                      <td className="py-3 text-primaryText uppercase text-[11px]">{exc.recommended_action || "ESCALATE"}</td>
                      <td className="py-3 text-secondaryText text-[11px] max-w-sm truncate">
                        {exc.ai_analysis?.summary || "Pending investigation"}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/exceptions/${exc.id}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-background border border-surfaceBorder hover:border-neutral-500 text-xs text-primaryText transition-colors"
                        >
                          <span>Investigate</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
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
