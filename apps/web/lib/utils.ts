import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

export function relativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getConfidenceColor(score: number): string {
  if (score >= 0.95) return "text-emerald-500";
  if (score >= 0.80) return "text-emerald-400";
  if (score >= 0.60) return "text-amber-400";
  if (score >= 0.40) return "text-amber-500";
  return "text-red-400";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
    case "MATCHED":
    case "APPROVED":
    case "AUTO_RESOLVED":
    case "captured":
    case "settled":
    case "processed":
      return "emerald";
    case "PROCESSING":
    case "PENDING_REVIEW":
    case "pending":
      return "amber";
    case "FAILED":
    case "REJECTED":
    case "ESCALATED":
    case "EXCEPTION":
    case "failed":
      return "red";
    case "PENDING":
      return "zinc";
    default:
      return "zinc";
  }
}

export function getMatchTypeColor(type: string): string {
  switch (type) {
    case "EXACT":
      return "emerald";
    case "TOLERANCE":
      return "sky";
    case "AMBIGUOUS":
      return "amber";
    case "UNMATCHED":
    case "INVALID":
      return "red";
    default:
      return "zinc";
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "red";
    case "MEDIUM":
      return "amber";
    case "LOW":
      return "emerald";
    default:
      return "zinc";
  }
}

export function getSourceColor(source: string): string {
  switch (source) {
    case "razorpay":
      return "sky";
    case "stripe":
      return "violet";
    case "bank_hdfc":
    case "bank_icici":
      return "emerald";
    default:
      return "zinc";
  }
}
