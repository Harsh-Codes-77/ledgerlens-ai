"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, ExceptionCase } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { AlertTriangle, Filter, ArrowRight } from "lucide-react";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<ExceptionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "confidence" | "date">("severity");

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

  const sorted = useMemo(() => {
    const copy = [...exceptions];
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
  }, [exceptions, sortBy]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-3"
          >
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Exceptions Queue
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sorted.length} cases requiring review
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Status</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="ESCALATED">Escalated</option>
              <option value="AUTO_RESOLVED">Auto-Resolved</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
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
            <div className="h-4 w-px bg-border" />
            <span className="text-[11px] text-muted-foreground">Sort:</span>
            {(["severity", "confidence", "date"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  sortBy === s
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "date" ? "Newest" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </motion.div>

          {/* Exception Cards */}
          {loading ? (
            <LoadingState message="Loading exceptions..." />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Everything reconciled"
              description="Nothing needs your attention. All records have been matched or resolved."
            />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04 } },
              }}
              className="space-y-2"
            >
              {sorted.map((exc) => (
                <motion.div
                  key={exc.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <Link
                    href={`/exceptions/${exc.id}`}
                    className="block group"
                  >
                    <Card className="hover:bg-accent/30 transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <ConfidenceRing
                            score={exc.confidence_score}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
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
                              <span className="text-xs font-medium font-mono">
                                {exc.exception_type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {exc.ai_analysis?.summary ||
                                "Awaiting investigation"}
                            </p>
                            {exc.transaction_details && (
                              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                                {exc.transaction_details.external_transaction_id}{" "}
                                · ₹
                                {exc.transaction_details.amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={
                                exc.status === "AUTO_RESOLVED"
                                  ? "success"
                                  : exc.status === "ESCALATED"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {exc.status.replace(/_/g, " ")}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
