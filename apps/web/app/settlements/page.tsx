"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { useSession } from "@/lib/session-context";
import { fetchApi, Settlement } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { Landmark, Search } from "lucide-react";
import { formatCurrency, formatDateTime, getSourceColor } from "@/lib/utils";

export default function SettlementsPage() {
  const { selectedBatchId } = useSession();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBatchId) {
      params.set("batch_id", selectedBatchId);
      params.set("limit", "10000");
    }
    const qs = params.toString();
    fetchApi<Settlement[]>(`/api/settlements${qs ? `?${qs}` : ""}`)
      .then(setSettlements)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBatchId]);

  const filtered = useMemo(() => {
    if (!search) return settlements;
    const q = search.toLowerCase();
    return settlements.filter(
      (s) =>
        s.external_settlement_id.toLowerCase().includes(q) ||
        s.reference?.toLowerCase().includes(q)
    );
  }, [settlements, search]);

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
                Settlement Records
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} of {settlements.length} records
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search settlement ID or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-60 rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </motion.div>

          {loading ? (
            <LoadingState message="Loading settlements..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Landmark className="h-5 w-5" />}
              title="No settlement records"
              description="Settlement data will appear after a reconciliation run."
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Settlement ID
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Source
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Amount
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Reference
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-medium font-mono">
                              {s.external_settlement_id}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge
                                variant="secondary"
                                className={`bg-${getSourceColor(s.source)}-500/10 text-${getSourceColor(s.source)}-400 border-${getSourceColor(s.source)}-500/20`}
                              >
                                {s.source}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-mono tabular-nums font-medium">
                              {formatCurrency(s.amount, s.currency)}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="success">{s.status}</Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground font-mono">
                              {s.reference || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">
                              {formatDateTime(s.settlement_date)}
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
