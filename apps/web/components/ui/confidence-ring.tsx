import * as React from "react";
import { cn } from "@/lib/utils";

interface ConfidenceRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceRing({
  score,
  size = "md",
  showLabel = true,
  className,
}: ConfidenceRingProps) {
  const percentage = Math.round(score * 100);
  const radius = size === "sm" ? 14 : size === "md" ? 20 : 28;
  const stroke = size === "sm" ? 2.5 : size === "md" ? 3 : 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    score >= 0.95
      ? "text-emerald-400"
      : score >= 0.80
      ? "text-emerald-400"
      : score >= 0.60
      ? "text-amber-400"
      : score >= 0.40
      ? "text-amber-500"
      : "text-red-400";

  const strokeColor =
    score >= 0.95
      ? "stroke-emerald-400"
      : score >= 0.80
      ? "stroke-emerald-400"
      : score >= 0.60
      ? "stroke-amber-400"
      : score >= 0.40
      ? "stroke-amber-500"
      : "stroke-red-400";

  const dim = radius * 2 + stroke * 2;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="-rotate-90"
      >
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary/50"
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(strokeColor, "transition-all duration-700 ease-out")}
        />
      </svg>
      {showLabel && (
        <span
          className={cn(
            "absolute font-mono font-bold tabular-nums",
            color,
            size === "sm" && "text-[9px]",
            size === "md" && "text-[11px]",
            size === "lg" && "text-sm"
          )}
        >
          {percentage}
        </span>
      )}
    </div>
  );
}
