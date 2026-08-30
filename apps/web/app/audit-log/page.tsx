"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { useSession } from "@/lib/session-context";
import { fetchApi, AuditLog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { History, Cpu, User, Settings, Filter } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AuditLogPage() {
  const { selectedBatchId } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBatchId) params.set("batch_id", selectedBatchId);
    const qs = params.toString();
    fetchApi<AuditLog[]>(`/api/audit-logs${qs ? `?${qs}` : ""}`)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBatchId]);

  const filtered = useMemo(() => {
    if (!actorFilter) return logs;
    return logs.filter((l) => l.actor_type === actorFilter);
  }, [logs, actorFilter]);

  const getActorIcon = (type: string) => {
    switch (type) {
      case "SYSTEM":
        return <Settings className="h-3 w-3" />;
      case "AI_INVESTIGATOR":
        return <Cpu className="h-3 w-3" />;
      case "HUMAN":
        return <User className="h-3 w-3" />;
      default:
        return <Settings className="h-3 w-3" />;
    }
  };

  const getActorColor = (type: string) => {
    switch (type) {
      case "SYSTEM":
        return "bg-sky-500/15 text-sky-400";
      case "AI_INVESTIGATOR":
        return "bg-emerald-500/15 text-emerald-400";
      case "HUMAN":
        return "bg-amber-500/15 text-amber-400";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

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
              <h2 className="text-lg font-bold tracking-tight">Audit Trail</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filtered.length} events logged
              </p>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Actor:</span>
            {[
              ["", "All"],
              ["SYSTEM", "System"],
              ["AI_INVESTIGATOR", "AI"],
              ["HUMAN", "Human"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setActorFilter(value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  actorFilter === value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </motion.div>

          {/* Timeline */}
          {loading ? (
            <LoadingState message="Loading audit trail..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<History className="h-5 w-5" />}
              title="No audit events"
              description="Audit events will appear as reconciliation runs process."
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-0">
                  <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border" />

                    <div className="divide-y divide-border/50">
                      {filtered.map((log, i) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.02 }}
                          className="relative flex items-start gap-4 p-4 pl-4 hover:bg-accent/20 transition-colors"
                        >
                          {/* Actor dot */}
                          <div
                            className={`relative z-10 h-[18px] w-[18px] rounded-full flex items-center justify-center mt-0.5 shrink-0 ${getActorColor(
                              log.actor_type
                            )}`}
                          >
                            {getActorIcon(log.actor_type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-medium">
                                  {log.action}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] ${getActorColor(
                                      log.actor_type
                                    )}`}
                                  >
                                    {log.actor_type.replace(/_/g, " ")}
                                  </Badge>
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {log.entity_type}:{log.entity_id.substring(0, 8)}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                                {formatDateTime(log.created_at)}
                              </span>
                            </div>
                            {log.reason && (
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                {log.reason}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
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
