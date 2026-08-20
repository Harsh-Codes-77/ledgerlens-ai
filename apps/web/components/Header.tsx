"use client";

import { ShieldCheck, User } from "lucide-react";

export default function Header({ title }: { title: string }) {
  return (
    <header className="h-14 border-b border-surfaceBorder bg-background/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <h2 className="text-sm font-semibold text-primaryText uppercase tracking-wider">{title}</h2>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface border border-surfaceBorder text-secondaryText">
          PROD-SIM
        </span>
      </div>

      <div className="flex items-center space-x-4 text-xs font-mono text-secondaryText">
        <div className="flex items-center space-x-1.5 bg-surface border border-surfaceBorder px-2.5 py-1 rounded">
          <ShieldCheck className="w-3.5 h-3.5 text-positive" />
          <span>Strict Policy: Enabled</span>
        </div>
        <div className="flex items-center space-x-2 border-l border-surfaceBorder pl-4">
          <User className="w-3.5 h-3.5" />
          <span className="text-primaryText font-sans font-medium">Finance Controller</span>
        </div>
      </div>
    </header>
  );
}
