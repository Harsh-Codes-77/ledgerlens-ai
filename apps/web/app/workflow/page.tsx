"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, Batch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/states";
import {
  Database,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  UserCheck,
  FileText,
  ArrowRight,
} from "lucide-react";

const pipelineSteps = [
  {
    id: "ingest",
    title: "Data Ingestion",
    subtitle: "Transactions · Settlements · Refunds",
    icon: Database,
    color: "sky",
    description:
      "Raw financial data flows from payment gateways and bank feeds.",
  },
  {
    id: "validate",
    title: "Validation",
    subtitle: "Schema · Integrity · Format",
    icon: ShieldCheck,
    color: "sky",
    description:
      "Records validated for schema compliance, required fields, and data integrity.",
  },
  {
    id: "exact",
    title: "Exact Match",
    subtitle: "Reference · ID · Amount",
    icon: CheckCircle2,
    color: "emerald",
    description:
      "Deterministic matching on transaction references, IDs, and exact amounts.",
  },
  {
    id: "tolerance",
    title: "Tolerance Match",
    subtitle: "Fee Variance · Date Window",
    icon: Layers,
    color: "sky",
    description:
      "Fuzzy matching for fee variance within tolerance and date window alignment.",
  },
  {
    id: "ai",
    title: "AI Investigation",
    subtitle: "Ambiguous · Missing · Anomalies",
    icon: Cpu,
    color: "emerald",
    description:
      "AI analyzes ambiguous cases with structured evidence and confidence scoring.",
  },
  {
    id: "resolve",
    title: "Resolution",
    subtitle: "Auto-Resolve · Human Review",
    icon: CheckCircle2,
    color: "emerald",
    description:
      "High-confidence cases auto-resolved; uncertain cases escalated to human review.",
  },
  {
    id: "audit",
    title: "Audit Trail",
    subtitle: "Immutable · Complete · Traceable",
    icon: FileText,
    color: "sky",
    description:
      "Every decision, action, and outcome logged for compliance and review.",
  },
];

export default function WorkflowPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<Batch[]>("/api/batches")
      .then(setBatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const latestBatch = batches[0];

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1000px] mx-auto p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-bold tracking-tight">
              Reconciliation Pipeline
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              How LedgerLens AI processes and resolves financial records
            </p>
          </motion.div>

          {loading ? (
            <LoadingState message="Loading pipeline status..." />
          ) : (
            <div className="relative space-y-3">
              {/* Vertical connecting line */}
              <div className="absolute left-[23px] top-6 bottom-6 w-px bg-border" />

              {pipelineSteps.map((step, i) => {
                const Icon = step.icon;
                const isActive = latestBatch
                  ? i <=
                    pipelineSteps.findIndex(
                      (s) => s.id === (latestBatch.status === "COMPLETED" ? "audit" : "ingest")
                    )
                  : false;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <div className="relative flex items-start gap-4">
                      {/* Step dot */}
                      <div
                        className={`relative z-10 h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0 ${
                          isActive
                            ? `bg-${step.color}-500/20 text-${step.color}-400`
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>

                      {/* Step content */}
                      <div className="flex-1 pb-2">
                        <Card className="hover:bg-accent/30 transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-sm font-semibold">
                                  {step.title}
                                </h3>
                                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                  {step.subtitle}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                  {step.description}
                                </p>
                              </div>
                              {isActive && (
                                <Badge variant="success" className="shrink-0">
                                  Active
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {latestBatch && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link href={`/batches/${latestBatch.id}`} className="block">
                <Card className="hover:bg-accent/30 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Latest Run
                      </p>
                      <p className="text-sm font-medium">
                        {latestBatch.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant={
                          latestBatch.status === "COMPLETED"
                            ? "success"
                            : "warning"
                        }
                      >
                        {latestBatch.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
