import * as React from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 transition-all duration-200 hover:bg-accent/50",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-md bg-secondary p-2 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-2 flex items-center gap-1 text-[11px]">
          <span
            className={cn(
              "font-medium",
              trend === "up" && "text-emerald-400",
              trend === "down" && "text-red-400",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}{" "}
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}
