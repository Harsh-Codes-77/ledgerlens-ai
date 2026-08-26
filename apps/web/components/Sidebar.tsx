"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  AlertTriangle,
  Receipt,
  Landmark,
  History,
  BarChart3,
  Cpu,
  GitBranch,
} from "lucide-react";

const navItems = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Batches", href: "/batches", icon: Layers },
  { name: "Exceptions", href: "/exceptions", icon: AlertTriangle },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Settlements", href: "/settlements", icon: Landmark },
  { name: "Audit Log", href: "/audit-log", icon: History },
  { name: "Evaluation", href: "/evaluation", icon: BarChart3 },
  { name: "How It Works", href: "/workflow", icon: GitBranch },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-surfaceBorder bg-background flex flex-col justify-between h-screen sticky top-0">
      <div>
        <div className="p-4 border-b border-surfaceBorder flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-primaryText text-background flex items-center justify-center font-bold text-sm">
            LL
          </div>
          <div>
            <h1 className="font-semibold text-sm text-primaryText tracking-tight">LedgerLens AI</h1>
            <p className="text-[11px] text-secondaryText font-mono">Track 4: AI Finance Controller</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-surface text-primaryText border border-surfaceBorder"
                    : "text-secondaryText hover:text-primaryText hover:bg-surface/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-surfaceBorder font-mono text-[11px] text-secondaryText">
        <div className="flex items-center space-x-2">
          <Cpu className="w-3.5 h-3.5 text-positive" />
          <span>Engine: Active</span>
        </div>
        <div className="mt-1 text-[10px]">Deterministic + AI Safety</div>
      </div>
    </aside>
  );
}
