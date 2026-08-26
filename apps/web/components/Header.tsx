"use client";

import { usePathname } from "next/navigation";
import { ShieldCheck, User, Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function TopBar({ title, className }: TopBarProps) {
  const pathname = usePathname();

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
        <button className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-secondary transition-colors cursor-pointer">
          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium hidden lg:inline">
            Controller
          </span>
        </div>
      </div>
    </header>
  );
}
