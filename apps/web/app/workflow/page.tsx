"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Database,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Scale,
  AlertTriangle,
  XCircle,
  Cpu,
  UserCheck,
  FileText,
  ChevronRight,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

interface Stage {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  description: string;
  details: string[];
  link: string;
  linkLabel: string;
}

const stages: Stage[] = [
  {
    id: "data-sources",
    title: "Data Ingestion",
    subtitle: "Transactions · Settlements · Refunds",
    icon: Database,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/40",
    glowColor: "shadow-blue-400/20",
    description: "Raw financial data flows in from multiple sources.",
    details: [
      "Transaction records from payment gateway",
      "Bank settlement records with reference IDs",
      "Refund records linked to transactions",
    ],
    link: "/transactions",
    linkLabel: "View Transactions",
  },
  {
    id: "batch-processing",
    title: "Batch Processing",
    subtitle: "500-Record Batches",
    icon: Layers,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/40",
    glowColor: "shadow-purple-400/20",
    description: "Records are grouped into batches for systematic processing.",
    details: [
      "Records indexed by reference ID",
      "Settlements grouped by payment reference",
      "Refunds mapped to original transactions",
    ],
    link: "/batches",
    linkLabel: "View Batches",
  },
  {
    id: "stage-1",
    title: "Validation",
    subtitle: "Data Integrity Check",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/40",
    glowColor: "shadow-emerald-400/20",
    description: "Validates each transaction for completeness before matching.",
    details: [
      "Checks for missing transaction IDs",
      "Rejects invalid amounts (≤ 0)",
      "Validates currency is supported (INR)",
    ],
    link: "/batches",
    linkLabel: "View Batch Processing",
  },
  {
    id: "stage-2",
    title: "Exact Match",
    subtitle: "Reference + Amount + Currency",
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/40",
    glowColor: "shadow-green-400/20",
    description: "Finds perfect matches where all fields align exactly.",
    details: [
      "Payment reference matches settlement",
      "Amount difference < ₹0.01",
      "Result: AUTO_RESOLVE (100% confidence)",
    ],
    link: "/batches",
    linkLabel: "View Match Results",
  },
  {
    id: "stage-3",
    title: "Tolerance",
    subtitle: "Fee Variance + Refunds",
    icon: Scale,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/40",
    glowColor: "shadow-cyan-400/20",
    description: "Handles processing fees, partial refunds, and small differences.",
    details: [
      "Amount within 2% tolerance",
      "Date within 5-day window",
      "Partial refund adjustment",
    ],
    link: "/batches",
    linkLabel: "View Tolerance Matches",
  },
  {
    id: "stage-4",
    title: "Ambiguous",
    subtitle: "Multiple Candidates",
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/40",
    glowColor: "shadow-amber-400/20",
    description: "Multiple settlements match one transaction — too risky to auto-resolve.",
    details: [
      "Multiple reference matches found",
      "Escalate to human with 65% confidence",
    ],
    link: "/exceptions",
    linkLabel: "View Exceptions",
  },
  {
    id: "stage-5",
    title: "Unmatched",
    subtitle: "No Settlement Found",
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/40",
    glowColor: "shadow-red-400/20",
    description: "No matching settlement record exists — requires investigation.",
    details: [
      "No reference match in bank feed",
      "Escalate for manual review",
    ],
    link: "/exceptions",
    linkLabel: "View Unmatched Cases",
  },
  {
    id: "ai-investigation",
    title: "AI Investigation",
    subtitle: "Grounded Evidence Analysis",
    icon: Cpu,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/40",
    glowColor: "shadow-emerald-400/20",
    description: "AI analyzes exceptions using structured evidence — never guesses.",
    details: [
      "Extracts transaction + settlement evidence",
      "Generates grounded root cause",
      "Confidence < 70% → auto-escalate",
    ],
    link: "/exceptions",
    linkLabel: "View AI Analysis",
  },
  {
    id: "human-review",
    title: "Human Review",
    subtitle: "Controller Decision",
    icon: UserCheck,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/40",
    glowColor: "shadow-violet-400/20",
    description: "Finance controller reviews evidence and makes the final call.",
    details: [
      "APPROVE — Case resolved",
      "REJECT — Return for re-investigation",
      "ESCALATE — Senior controller queue",
    ],
    link: "/exceptions",
    linkLabel: "Review Exceptions",
  },
  {
    id: "audit-trail",
    title: "Audit Trail",
    subtitle: "Immutable Event Log",
    icon: FileText,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/40",
    glowColor: "shadow-blue-400/20",
    description: "Every action is immutably logged for compliance.",
    details: [
      "Actor: system / AI / human",
      "Before and after state snapshots",
      "Tamper-proof audit history",
    ],
    link: "/audit-log",
    linkLabel: "View Audit Log",
  },
];

/* ── Reusable connector arrow between desktop cards ── */
function FlowArrow({ lit }: { lit: boolean }) {
  return (
    <div className="flex items-center justify-center w-8 shrink-0 self-center">
      <div className="relative flex items-center">
        <div
          className={`h-[2px] w-5 transition-colors duration-700 ${
            lit ? "bg-positive" : "bg-surfaceBorder"
          }`}
        />
        <ChevronRight
          className={`w-3.5 h-3.5 -ml-0.5 transition-colors duration-700 ${
            lit ? "text-positive" : "text-surfaceBorder"
          }`}
        />
      </div>
    </div>
  );
}

/* ── Reusable connector arrow for vertical (mobile) ── */
function FlowArrowDown({ lit }: { lit: boolean }) {
  return (
    <div className="flex justify-center py-1">
      <div
        className={`w-[2px] h-5 transition-colors duration-700 ${
          lit ? "bg-positive" : "bg-surfaceBorder"
        }`}
      />
    </div>
  );
}

export default function WorkflowPage() {
  const [activeStage, setActiveStage] = useState(-1);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let current = -1;

    const tick = () => {
      current++;
      if (current < stages.length) {
        setActiveStage(current);
      } else {
        // Done — stop interval, wait 4 seconds, restart
        if (intervalRef.current) clearInterval(intervalRef.current);
        pauseRef.current = setTimeout(() => {
          current = -1;
          setActiveStage(-1);
          // Small delay before first step so the "reset" is visible
          intervalRef.current = setInterval(tick, 1200);
        }, 4000);
      }
    };

    // First tick fires immediately, then every 1.2s
    tick();
    intervalRef.current = setInterval(tick, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pauseRef.current) clearTimeout(pauseRef.current);
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedStage(expandedStage === id ? null : id);
  };

  const getState = (i: number) => {
    if (activeStage === i) return "active";
    if (activeStage > i) return "done";
    return "pending";
  };

  /* ────────────────── STAGE CARD ────────────────── */
  function StageCard({
    stage,
    index,
    layout,
  }: {
    stage: Stage;
    index: number;
    layout: "desktop" | "mobile";
  }) {
    const state = getState(index);
    const Icon = stage.icon;
    const isExpanded = expandedStage === stage.id;

    const wrapperClass =
      layout === "desktop"
        ? `group rounded-xl border p-4 transition-all duration-300 flex flex-col cursor-pointer ${
            state === "active"
              ? `${stage.bgColor} ${stage.borderColor} shadow-lg ${stage.glowColor} scale-[1.02]`
              : state === "done"
              ? `bg-surface border-surfaceBorder/50 opacity-60 hover:opacity-100 hover:border-surfaceBorder hover:shadow-md hover:${stage.borderColor}`
              : `bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-surfaceBorder hover:shadow-md hover:${stage.borderColor}`
          }`
        : `block rounded-xl border p-3 transition-all duration-300 cursor-pointer ${
            state === "active"
              ? `${stage.bgColor} ${stage.borderColor} shadow-md ${stage.glowColor}`
              : state === "done"
              ? `bg-surface border-surfaceBorder/50 opacity-60 hover:opacity-100 hover:border-surfaceBorder hover:shadow-md`
              : `bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-surfaceBorder hover:shadow-md`
          }`;

    const cardContent = (
      <>
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-1.5 rounded-lg transition-colors duration-700 ${
              state === "active" ? stage.bgColor : "bg-surface"
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-colors duration-300 ${
                state === "active"
                  ? stage.color
                  : "text-secondaryText/50 group-hover:text-secondaryText"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={`text-xs font-semibold leading-tight transition-colors duration-300 ${
                state === "active"
                  ? "text-primaryText"
                  : "text-secondaryText/70 group-hover:text-primaryText"
              }`}
            >
              {layout === "desktop"
                ? stage.title.split(": ")[1] || stage.title
                : stage.title}
            </h4>
            <p className="text-[10px] text-secondaryText/60 mt-0.5 leading-tight">
              {stage.subtitle}
            </p>
          </div>
          {state === "active" && (
            <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-positive/20 text-positive rounded shrink-0">
              LIVE
            </span>
          )}
          {state === "done" && (
            <CheckCircle2 className="w-3.5 h-3.5 text-positive/70 shrink-0" />
          )}
          {layout === "mobile" && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-secondaryText/40 shrink-0 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          )}
        </div>

        {/* Stage number badge — desktop only */}
        {layout === "desktop" && (
          <span className="text-[9px] font-mono text-secondaryText/40 uppercase tracking-wider mb-1">
            Stage {index + 1} of {stages.length}
          </span>
        )}

        {/* Link */}
        <Link
          href={stage.link}
          className={`mt-auto pt-2 inline-flex items-center gap-1 text-[10px] font-medium transition-colors duration-300 border-t border-surfaceBorder/30 ${
            state === "active"
              ? "text-primaryText hover:underline"
              : "text-secondaryText/40 group-hover:text-secondaryText hover:underline"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {stage.linkLabel}
          <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </>
    );

    if (layout === "mobile") {
      return (
        <div className={wrapperClass} onClick={() => toggleExpand(stage.id)}>
          {cardContent}
          {/* Expandable detail */}
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isExpanded ? "max-h-60 opacity-100 mt-3" : "max-h-0 opacity-0"
            }`}
          >
            <p className="text-[11px] text-secondaryText mb-2">{stage.description}</p>
            <div className="border-t border-surfaceBorder/30 pt-2 space-y-1.5">
              {stage.details.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-secondaryText">
                  <span className={`${stage.color} shrink-0`}>•</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return <div className={wrapperClass}>{cardContent}</div>;
  }

  /* ────────────────── RENDER ────────────────── */
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header title="How It Works" />

      <main className="p-6 space-y-8 max-w-7xl mx-auto w-full">
        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold text-primaryText">
            Reconciliation Pipeline
          </h2>
          <p className="text-sm text-secondaryText max-w-2xl mx-auto">
            Each record flows through our 5-stage deterministic engine, AI-powered
            investigation, and human oversight — continuously animated below.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-secondaryText">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
            </span>
            Loops automatically
          </div>
        </div>

        {/* ══════════════ DESKTOP (lg+) ══════════════ */}
        <div className="hidden lg:block space-y-6">
          {/* Row 1: 5 pipeline stages with arrows between them */}
          <div className="flex items-stretch">
            {stages.slice(0, 5).map((stage, i) => (
              <div key={stage.id} className="contents">
                <div className="flex-1 min-w-0">
                  <StageCard stage={stage} index={i} layout="desktop" />
                </div>
                {i < 4 && <FlowArrow lit={activeStage > i} />}
              </div>
            ))}
          </div>

          {/* Decision Fork divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-surfaceBorder/60" />
            <span className="text-[10px] font-mono text-secondaryText uppercase tracking-widest">
              Decision Fork
            </span>
            <div className="flex-1 h-px bg-surfaceBorder/60" />
          </div>

          {/* Two outcome cards */}
          <div className="grid grid-cols-2 gap-5">
            {/* Auto-Resolved */}
            <Link
              href="/batches"
              className={`group p-5 rounded-xl border transition-all duration-300 block cursor-pointer ${
                activeStage >= 5
                  ? "bg-emerald-400/5 border-emerald-400/30 shadow-md shadow-emerald-400/10"
                  : "bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-emerald-400/30 hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-primaryText">Auto-Resolved</h4>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-secondaryText/40" />
              </div>
              <p className="text-xs text-secondaryText mb-4">
                High-confidence matches — no human intervention needed.
              </p>
              <div className="space-y-2">
                {["Exact match — 100% confidence", "Tolerance match — ≥95%", "Partial refund match"].map(
                  (item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-secondaryText">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{item}</span>
                    </div>
                  )
                )}
              </div>
            </Link>

            {/* Exception Path */}
            <Link
              href="/exceptions"
              className={`group p-5 rounded-xl border transition-all duration-300 block cursor-pointer ${
                activeStage >= 5
                  ? "bg-amber-400/5 border-amber-400/30 shadow-md shadow-amber-400/10"
                  : "bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-amber-400/30 hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-semibold text-primaryText">Exception Path</h4>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-secondaryText/40" />
              </div>
              <p className="text-xs text-secondaryText mb-4">
                Uncertain cases routed to AI for grounded analysis.
              </p>
              <div className="space-y-2">
                {["Amount mismatch", "Missing settlement", "Duplicate / ambiguous", "Invalid data"].map(
                  (item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-secondaryText">
                      <span className="text-amber-400 font-bold">!</span>
                      <span>{item}</span>
                    </div>
                  )
                )}
              </div>
            </Link>
          </div>

          {/* Arrow down to final row */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-surfaceBorder/60" />
            <ChevronRight className="w-4 h-4 text-secondaryText/40 rotate-90" />
            <div className="flex-1 h-px bg-surfaceBorder/60" />
          </div>

          {/* Bottom 3: AI → Human → Audit */}
          <div className="flex items-stretch">
            {stages.slice(7).map((stage, i) => {
              const Icon = stage.icon;
              return (
              <div key={stage.id} className="contents">
                <div className="flex-1 min-w-0">
                  <Link href={stage.link} className="block group">
                    <div className={`rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
                      getState(i + 7) === "active"
                        ? `${stage.bgColor} ${stage.borderColor} shadow-lg ${stage.glowColor}`
                        : getState(i + 7) === "done"
                        ? `bg-surface border-surfaceBorder/50 opacity-60 hover:opacity-100 hover:border-surfaceBorder hover:shadow-md`
                        : `bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-surfaceBorder hover:shadow-md`
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon
                          className={`w-4 h-4 transition-colors duration-300 ${
                            getState(i + 7) === "active" ? stage.color : "text-secondaryText/50 group-hover:text-secondaryText"
                          }`}
                        />
                        <h4
                          className={`text-xs font-semibold transition-colors duration-300 ${
                            getState(i + 7) === "active" ? "text-primaryText" : "text-secondaryText/70 group-hover:text-primaryText"
                          }`}
                        >
                          {stage.title}
                        </h4>
                      </div>
                      <p className="text-[10px] text-secondaryText/60">{stage.subtitle}</p>
                    </div>
                  </Link>
                </div>
                {i < 2 && <FlowArrow lit={activeStage > i + 7} />}
              </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════ MOBILE / TABLET (< lg) ══════════════ */}
        <div className="lg:hidden">
          {stages.map((stage, i) => (
            <div key={stage.id}>
              {i > 0 && <FlowArrowDown lit={activeStage >= i} />}
              <StageCard stage={stage} index={i} layout="mobile" />
            </div>
          ))}

          {/* Mobile decision divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-surfaceBorder/60" />
            <span className="text-[9px] font-mono text-secondaryText uppercase tracking-widest">
              Decision
            </span>
            <div className="flex-1 h-px bg-surfaceBorder/60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/batches"
              className={`p-3 rounded-xl border transition-all duration-300 block cursor-pointer ${
                activeStage >= 5
                  ? "bg-emerald-400/5 border-emerald-400/30"
                  : "bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-emerald-400/30"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1.5" />
              <p className="text-[11px] font-semibold text-primaryText">Auto-Resolved</p>
              <p className="text-[10px] text-secondaryText/60 mt-0.5">
                Exact + Tolerance matches
              </p>
            </Link>
            <Link
              href="/exceptions"
              className={`p-3 rounded-xl border transition-all duration-300 block cursor-pointer ${
                activeStage >= 5
                  ? "bg-amber-400/5 border-amber-400/30"
                  : "bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-amber-400/30"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 mb-1.5" />
              <p className="text-[11px] font-semibold text-primaryText">Exception Path</p>
              <p className="text-[10px] text-secondaryText/60 mt-0.5">
                AI → Human Review
              </p>
            </Link>
          </div>

          {/* Arrow */}
          <div className="flex justify-center py-3">
            <ChevronRight className="w-4 h-4 text-secondaryText/40 rotate-90" />
          </div>

          {/* Bottom 3 */}
          <div className="grid grid-cols-3 gap-2">
            {stages.slice(7).map((stage, i) => {
              const state = getState(i + 7);
              const Icon = stage.icon;
              return (
                <Link
                  key={stage.id}
                  href={stage.link}
                  className={`group p-2.5 rounded-xl border transition-all duration-300 text-center block cursor-pointer ${
                    state === "active"
                      ? `${stage.bgColor} ${stage.borderColor}`
                      : state === "done"
                      ? "bg-surface border-surfaceBorder/50 opacity-60 hover:opacity-100 hover:border-surfaceBorder"
                      : "bg-surface border-surfaceBorder/20 opacity-20 hover:opacity-100 hover:border-surfaceBorder"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mx-auto mb-1 transition-colors duration-300 ${
                      state === "active" ? stage.color : "text-secondaryText/50 group-hover:text-secondaryText"
                    }`}
                  />
                  <p
                    className={`text-[10px] font-semibold transition-colors duration-300 ${
                      state === "active" ? "text-primaryText" : "text-secondaryText/70 group-hover:text-primaryText"
                    }`}
                  >
                    {stage.title}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-surface border border-surfaceBorder/60 p-3 rounded-xl flex flex-wrap gap-x-6 gap-y-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-positive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
            </span>
            <span className="text-secondaryText">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-positive/70" />
            <span className="text-secondaryText">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3 h-3 text-secondaryText/40" />
            <span className="text-secondaryText">Clickable link</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="h-[2px] w-3 bg-positive" />
              <ChevronRight className="w-2.5 h-2.5 text-positive -ml-0.5" />
            </div>
            <span className="text-secondaryText">Flow direction</span>
          </div>
        </div>
      </main>
    </div>
  );
}
