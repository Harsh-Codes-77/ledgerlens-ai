"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  Layers,
  Receipt,
  Landmark,
  AlertTriangle,
  CornerDownLeft,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchApi, Batch, Transaction, Settlement, ExceptionCase } from "@/lib/api";

type SearchCategory =
  | "Batches"
  | "Exceptions"
  | "Transactions"
  | "Settlements";

interface SearchItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
}

const CATEGORY_ORDER: SearchCategory[] = [
  "Batches",
  "Exceptions",
  "Transactions",
  "Settlements",
];

const CATEGORY_META: Record<
  SearchCategory,
  { Icon: typeof Layers; iconClass: string }
> = {
  Batches: { Icon: Layers, iconClass: "text-emerald-400" },
  Exceptions: { Icon: AlertTriangle, iconClass: "text-amber-400" },
  Transactions: { Icon: Receipt, iconClass: "text-sky-400" },
  Settlements: { Icon: Landmark, iconClass: "text-violet-400" },
};

export default function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    if (!loaded) {
      setLoading(true);
      (async () => {
        try {
          const [batches, txns, sets, excs] = await Promise.all([
            fetchApi<Batch[]>("/api/batches"),
            fetchApi<Transaction[]>("/api/transactions?limit=400"),
            fetchApi<Settlement[]>("/api/settlements?limit=400"),
            fetchApi<ExceptionCase[]>("/api/exceptions"),
          ]);

          const searchItems: SearchItem[] = [];

          batches.forEach((b) => {
            searchItems.push({
              id: b.id,
              category: "Batches",
              title: b.name,
              subtitle: `${b.total_records} records · ${b.match_rate}% match rate`,
              href: `/batches/${b.id}`,
              keywords: `${b.name} ${b.id} ${b.status} batch session run reconciliation`,
            });
          });

          excs.forEach((e) => {
            const txnId = e.transaction_details?.external_transaction_id || "";
            searchItems.push({
              id: e.id,
              category: "Exceptions",
              title: e.exception_type.replace(/_/g, " ").toUpperCase(),
              subtitle:
                `${e.severity} · ${e.status.replace(/_/g, " ")}` +
                (e.transaction_details
                  ? ` · ${formatCurrency(
                      e.transaction_details.amount,
                      e.transaction_details.currency
                    )}`
                  : ""),
              href: `/exceptions/${e.id}`,
              keywords: `${e.exception_type} ${e.severity} ${e.status} ${txnId} exception case review`,
            });
          });

          txns.forEach((t) => {
            searchItems.push({
              id: t.id,
              category: "Transactions",
              title: t.external_transaction_id,
              subtitle: `${formatCurrency(t.amount, t.currency)} · ${t.source} · ${t.status}`,
              href: `/transactions`,
              keywords: `${t.external_transaction_id} ${t.payment_reference || ""} ${t.customer_reference || ""} ${t.source} ${t.currency} ${t.status} ${t.amount}`,
            });
          });

          sets.forEach((s) => {
            searchItems.push({
              id: s.id,
              category: "Settlements",
              title: s.external_settlement_id,
              subtitle: `${formatCurrency(s.amount, s.currency)} · ${s.source} · ${s.status}`,
              href: `/settlements`,
              keywords: `${s.external_settlement_id} ${s.reference || ""} ${s.source} ${s.currency} ${s.status} ${s.amount}`,
            });
          });

          setItems(searchItems);
          setLoaded(true);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      })();
    }
    return () => clearTimeout(t);
  }, [open, loaded]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items
      .filter((it) => it.keywords.toLowerCase().includes(q))
      .slice(0, 40);
  }, [query, items]);

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        category: cat,
        items: filtered.filter((it) => it.category === cat),
      })).filter((g) => g.items.length > 0),
    [filtered]
  );

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function goTo(item: SearchItem) {
    onOpenChange(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) goTo(item);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed left-1/2 top-[18%] z-50 w-[92vw] max-w-[560px] -translate-x-1/2 rounded-lg border border-border bg-card shadow-2xl shadow-black/50 outline-none"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border px-4 h-12">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search transactions, settlements, exceptions, batches…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
            ) : query ? (
              <button
                onClick={() => setQuery("")}
                className="text-[10px] uppercase font-mono text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-secondary shrink-0"
              >
                Clear
              </button>
            ) : (
              <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
                ESC
              </kbd>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[380px] overflow-y-auto p-2">
            {loading ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Loading search index…
              </div>
            ) : flat.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              groups.map((group) => {
                const meta = CATEGORY_META[group.category];
                const { Icon } = meta;
                return (
                  <div key={group.category} className="mb-1.5 last:mb-0">
                    <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {group.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.map((item) => {
                      const flatIndex = flat.indexOf(item);
                      const active = flatIndex === activeIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => goTo(item)}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                            active ? "bg-secondary" : "hover:bg-secondary/60"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", meta.iconClass)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          </div>
                          {active && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground shrink-0">
                              Open
                              <CornerDownLeft className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-border px-4 h-9 text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> select
            </span>
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> / <ArrowRight className="h-3 w-3 -rotate-180" /> navigate
            </span>
            <span className="ml-auto">
              {items.length.toLocaleString()} records indexed
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}