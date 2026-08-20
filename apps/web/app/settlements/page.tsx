"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchApi, Settlement } from "@/lib/api";

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<Settlement[]>("/api/settlements")
      .then(setSettlements)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title="Bank Settlements Registry" />

      <main className="p-6 space-y-6 max-w-7xl">
        <div className="bg-surface border border-surfaceBorder rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">
            Bank Settlement Records ({settlements.length} Records)
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-secondaryText">Loading settlement records...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-surfaceBorder text-secondaryText">
                    <th className="pb-2 font-normal">Settlement ID</th>
                    <th className="pb-2 font-normal">Source</th>
                    <th className="pb-2 font-normal">Settled Amount</th>
                    <th className="pb-2 font-normal">Currency</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal">Bank Reference</th>
                    <th className="pb-2 font-normal">Settlement Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceBorder/50">
                  {settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-background/40">
                      <td className="py-2.5 font-medium text-primaryText">{s.external_settlement_id}</td>
                      <td className="py-2.5 text-secondaryText uppercase text-[11px]">{s.source}</td>
                      <td className="py-2.5 font-bold text-primaryText">₹{s.amount.toFixed(2)}</td>
                      <td className="py-2.5 text-secondaryText">{s.currency}</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-positive/10 text-positive border border-positive/20">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-secondaryText">{s.reference || "—"}</td>
                      <td className="py-2.5 text-secondaryText">{new Date(s.settlement_date).toLocaleString()}</td>
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
