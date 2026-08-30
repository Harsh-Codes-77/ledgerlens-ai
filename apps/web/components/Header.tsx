"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import {
  User,
  Bell,
  Search,
  ChevronDown,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useSession } from "@/lib/session-context";
import { fetchApi, ExceptionCase } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import GlobalSearch from "@/components/GlobalSearch";

const pageTitles: Record<string, string> = {
  "/": "Command Center",
  "/batches": "Reconciliation Runs",
  "/transactions": "Transaction Explorer",
  "/settlements": "Settlement Records",
  "/exceptions": "Exceptions Queue",
  "/audit-log": "Audit Trail",
  "/evaluation": "Analytics & Insights",
  "/workflow": "Pipeline Overview",
};

interface TopBarProps {
  title?: string;
  className?: string;
}

function NotificationsMenu() {
  const [exceptions, setExceptions] = useState<ExceptionCase[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exceptions !== null) return;
    setLoading(true);
    fetchApi<ExceptionCase[]>("/api/exceptions")
      .then(setExceptions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [exceptions]);

  const actionable =
    exceptions?.filter(
      (e) => e.status === "PENDING_REVIEW" || e.status === "ESCALATED"
    ) || [];
  const resolved =
    exceptions?.filter(
      (e) => e.status === "APPROVED" || e.status === "AUTO_RESOLVED"
    ) || [];
  const critical = actionable.filter((e) => e.severity === "CRITICAL").length;
  const top = actionable.slice(0, 6);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {actionable.length > 0 && (
            <span
              className={cn(
                "absolute top-1 right-1 h-1.5 w-1.5 rounded-full",
                critical > 0 ? "bg-red-500" : "bg-amber-400"
              )}
            />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-[360px] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/40 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {actionable.length > 0
                  ? `${actionable.length} case${
                      actionable.length !== 1 ? "s" : ""
                    } need your review`
                  : "All clear"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {critical > 0 && (
                <Badge variant="destructive">{critical} critical</Badge>
              )}
              {actionable.length > 0 && (
                <Badge variant="warning">{actionable.length} open</Badge>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[300px] overflow-y-auto">
            {loading && !exceptions ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading notifications…
              </div>
            ) : top.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {resolved.length > 0
                    ? `${resolved.length} case${
                        resolved.length !== 1 ? "s" : ""
                      } recently resolved`
                    : "No open exceptions right now."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {top.map((exc) => (
                  <Link
                    key={exc.id}
                    href={`/exceptions/${exc.id}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 group"
                  >
                    <div
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center shrink-0 border",
                        exc.severity === "CRITICAL" || exc.severity === "HIGH"
                          ? "bg-red-500/10 border-red-500/20"
                          : "bg-amber-500/10 border-amber-500/20"
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          "h-3.5 w-3.5",
                          exc.severity === "CRITICAL" || exc.severity === "HIGH"
                            ? "text-red-400"
                            : "text-amber-400"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">
                          {exc.exception_type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {exc.exception_type === "amount_mismatch"
                            ? ""
                            : exc.status === "ESCALATED"
                            ? "ESCALATED"
                            : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        {exc.transaction_details && (
                          <>
                            <span className="font-mono text-foreground">
                              {formatCurrency(
                                exc.transaction_details.amount,
                                exc.transaction_details.currency
                              )}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span className="font-mono">
                          {exc.transaction_details?.external_transaction_id ||
                            exc.id.substring(0, 8)}
                        </span>
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <Link
              href="/exceptions"
              className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium hover:bg-secondary transition-colors"
            >
              <span>Open exception queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ProfileMenu() {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md select-none">
      <div className="h-6 w-6 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
        <User className="h-3.5 w-3.5 text-emerald-400" />
      </div>
      <span className="text-xs font-medium hidden lg:inline">
        Controller
      </span>
    </div>
  );
}

export default function TopBar({ title, className }: TopBarProps) {
  const pathname = usePathname();
  const { selectedBatchId, setSelectedBatchId, batches } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const getPageTitle = () => {
    if (title) return title;
    if (pathname.startsWith("/batches/")) return "Run Detail";
    if (pathname.startsWith("/exceptions/")) return "Investigation";
    return pageTitles[pathname] || "LedgerLens";
  };

  return (
    <header
      className={cn(
        "h-12 border-b border-border bg-background/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20 shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Session/Batch Selector */}
        {batches.length > 0 && (
          <div className="relative">
            <select
              value={selectedBatchId || ""}
              onChange={(e) => setSelectedBatchId(e.target.value || null)}
              className="h-8 rounded-md border border-border bg-secondary/50 pl-3 pr-7 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer max-w-[200px]"
            >
              <option value="">All Sessions</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.match_rate}%)
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            {selectedBatchId && (
              <button
                onClick={() => setSelectedBatchId(null)}
                className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-muted-foreground/80 hover:bg-foreground flex items-center justify-center transition-colors"
                title="Clear session filter"
              >
                <X className="h-2.5 w-2.5 text-background" />
              </button>
            )}
          </div>
        )}

        <div className="h-4 w-px bg-border mx-1" />

        {/* Global Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Search records"
        >
          <Search className="h-4 w-4" />
          <span className="text-xs font-medium hidden xl:inline">
            Search records
          </span>
          <kbd className="text-[10px] font-mono border border-border rounded px-1 text-muted-foreground hidden md:inline">
            Ctrl K
          </kbd>
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="sm:hidden h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Search records"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <NotificationsMenu />

        <div className="h-4 w-px bg-border mx-1" />

        {/* Controller Profile */}
        <ProfileMenu />
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}