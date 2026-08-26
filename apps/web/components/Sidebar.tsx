"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Layers,
  AlertTriangle,
  Receipt,
  Landmark,
  History,
  BarChart3,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Command Center", href: "/", icon: LayoutDashboard },
  { name: "Reconciliation Runs", href: "/batches", icon: Layers },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Settlements", href: "/settlements", icon: Landmark },
  { name: "Exceptions", href: "/exceptions", icon: AlertTriangle },
  { name: "Audit Trail", href: "/audit-log", icon: History },
  { name: "Analytics", href: "/evaluation", icon: BarChart3 },
  { name: "Pipeline", href: "/workflow", icon: GitBranch },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-border px-4 shrink-0",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <div className="w-8 h-8 rounded-md bg-emerald-500/15 flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-sm font-mono">
              L
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0">
              <span className="text-emerald-400 font-bold text-sm font-mono">
                LL
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold tracking-tight truncate">
                LedgerLens
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Financial Intelligence
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className={cn("space-y-0.5", collapsed && "space-y-1")}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-150",
                  collapsed
                    ? "justify-center h-9 px-0"
                    : "h-9 px-3",
                  active
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                title={collapsed ? item.name : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* System Status */}
      <div
        className={cn(
          "border-t border-border p-3 shrink-0",
          collapsed && "px-2"
        )}
      >
        {collapsed ? (
          <div className="flex justify-center">
            <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-foreground">
                Engine Active
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                Deterministic + AI
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center h-9 border-t border-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="fixed top-3 left-3 z-50 h-9 w-9 rounded-md bg-card border border-border flex items-center justify-center md:hidden"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-40 md:hidden"
                  onClick={() => setMobileOpen(false)}
                />
                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="fixed left-0 top-0 bottom-0 w-[260px] bg-background border-r border-border z-50 md:hidden"
                >
                  {sidebar}
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-background h-screen sticky top-0 shrink-0 transition-all duration-300",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {sidebar}
      </aside>
    </>
  );
}
