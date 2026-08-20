"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchApi, AuditLog } from "@/lib/api";
import { ShieldCheck, Cpu, User, Activity } from "lucide-react";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<AuditLog[]>("/api/audit-logs")
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title="System & AI Audit Trail" />

      <main className="p-6 space-y-6 max-w-7xl">
        <div className="bg-surface border border-surfaceBorder rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-surfaceBorder pb-3">
            <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">
              Immutable Action History ({logs.length} Logged Events)
            </h3>
            <span className="text-[11px] font-mono text-secondaryText">Audit Trail Version 1.0</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-secondaryText">Loading audit log stream...</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded bg-background/50 border border-surfaceBorder font-mono text-xs flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded bg-surface border border-surfaceBorder text-secondaryText">
                      {log.actor_type === "ai" ? (
                        <Cpu className="w-4 h-4 text-positive" />
                      ) : log.actor_type === "user" ? (
                        <User className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Activity className="w-4 h-4 text-secondaryText" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-primaryText uppercase">{log.action}</span>
                        <span className="text-[10px] text-secondaryText">({log.entity_type}: {log.entity_id.substring(0, 8)})</span>
                      </div>
                      <p className="text-[11px] text-secondaryText mt-0.5">{log.reason || "Action performed"}</p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-secondaryText">
                    <div>Actor: <span className="text-primaryText uppercase">{log.actor_type}</span> ({log.actor_id || "system"})</div>
                    <div>{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
