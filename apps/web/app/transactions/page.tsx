"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchApi, Transaction } from "@/lib/api";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<Transaction[]>("/api/transactions")
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title="Transactions Registry" />

      <main className="p-6 space-y-6 max-w-7xl">
        <div className="bg-surface border border-surfaceBorder rounded p-4 space-y-3">
          <h3 className="text-xs font-semibold text-primaryText uppercase font-mono tracking-wider">
            Transaction Feeds ({transactions.length} Records)
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-secondaryText">Loading transaction feed...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-surfaceBorder text-secondaryText">
                    <th className="pb-2 font-normal">Transaction ID</th>
                    <th className="pb-2 font-normal">Source</th>
                    <th className="pb-2 font-normal">Amount</th>
                    <th className="pb-2 font-normal">Currency</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal">Payment Ref</th>
                    <th className="pb-2 font-normal">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surfaceBorder/50">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-background/40">
                      <td className="py-2.5 font-medium text-primaryText">{t.external_transaction_id}</td>
                      <td className="py-2.5 text-secondaryText uppercase text-[11px]">{t.source}</td>
                      <td className="py-2.5 font-bold text-primaryText">₹{t.amount.toFixed(2)}</td>
                      <td className="py-2.5 text-secondaryText">{t.currency}</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-surfaceBorder text-primaryText">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-secondaryText">{t.payment_reference || "—"}</td>
                      <td className="py-2.5 text-secondaryText">{new Date(t.transaction_date).toLocaleString()}</td>
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
