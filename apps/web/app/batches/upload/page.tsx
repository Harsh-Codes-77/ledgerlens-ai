"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import TopBar from "@/components/Header";
import { fetchApi, Batch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/states";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface UploadResult {
  success: boolean;
  batch?: Batch;
  error?: string;
  stats?: {
    transactions: number;
    settlements: number;
    refunds: number;
  };
}

export default function BatchUploadPage() {
  const [transactionsFile, setTransactionsFile] = useState<File | null>(null);
  const [settlementsFile, setSettlementsFile] = useState<File | null>(null);
  const [refundsFile, setRefundsFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionsFile || !settlementsFile || !batchName.trim()) {
      setResult({ success: false, error: "Batch name, transactions file, and settlements file are required." });
      return;
    }

    try {
      setUploading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("name", batchName);
      formData.append("transactions", transactionsFile);
      formData.append("settlements", settlementsFile);
      if (refundsFile) {
        formData.append("refunds", refundsFile);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/batches/upload`, {
        method: "POST",
        body: formData,
        credentials: "omit",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setResult({ success: true, batch: data, stats: { transactions: 0, settlements: 0, refunds: 0 } });
      setBatchName("");
      setTransactionsFile(null);
      setSettlementsFile(null);
      setRefundsFile(null);

      // Process the batch automatically
      if (data.id) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/batches/${data.id}/process`, {
          method: "POST",
        });
        window.location.href = `/batches/${data.id}`;
      }
    } catch (e: any) {
      setResult({ success: false, error: e.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(setFile: (f: File | null) => void, accepted: string[]) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["csv", "json"].includes(ext || "")) {
          alert("Only CSV and JSON files are supported");
          return;
        }
        setFile(file);
      }
    };
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar title="Upload New Reconciliation Batch" />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-xl font-bold tracking-tight">Upload Financial Records</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload transaction feeds, bank settlements, and optional refunds to create a new reconciliation batch.
            </p>
          </motion.div>

          <form id="upload-form" onSubmit={handleUpload}>
          <Card>
            <CardHeader>
              <CardTitle>Batch Details</CardTitle>
              <CardDescription>
                Required files: Transactions (CSV/JSON) and Settlements (CSV/JSON). Refunds are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Batch Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g., Razorpay March 2026 Reconciliation"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    Transactions File <span className="text-xs text-red-400">(Required)</span>
                  </label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange(setTransactionsFile, ["csv", "json"])}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-secondary file:text-foreground hover:file:bg-accent"
                    required
                  />
                  {transactionsFile && (
                    <p className="text-xs text-muted-foreground mt-1">{transactionsFile.name} ({(transactionsFile.size / 1024).toFixed(1)} KB)</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    Settlements File <span className="text-xs text-red-400">(Required)</span>
                  </label>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange(setSettlementsFile, ["csv", "json"])}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-secondary file:text-foreground hover:file:bg-accent"
                    required
                  />
                  {settlementsFile && (
                    <p className="text-xs text-muted-foreground mt-1">{settlementsFile.name} ({(settlementsFile.size / 1024).toFixed(1)} KB)</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  Refunds File <span className="text-xs text-muted-foreground">(Optional)</span>
                </label>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange(setRefundsFile, ["csv", "json"])}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-secondary file:text-foreground hover:file:bg-accent"
                />
                {refundsFile && (
                  <p className="text-xs text-muted-foreground mt-1">{refundsFile.name} ({(refundsFile.size / 1024).toFixed(1)} KB)</p>
                )}
              </div>
            </CardContent>
          </Card>
          </form>

          {result && (
            <Card className={result.success ? "border-emerald-500/30" : "border-red-500/30"}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                  <h4 className={`font-semibold ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                    {result.success ? "Upload Successful" : "Upload Failed"}
                  </h4>
                </div>
                {result.error && (
                  <p className="text-sm text-red-400">{result.error}</p>
                )}
                {result.success && result.batch && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 rounded-md bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Batch ID</p>
                      <p className="font-mono text-xs truncate">{result.batch.id}</p>
                    </div>
                    <div className="p-3 rounded-md bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Name</p>
                      <p className="font-medium truncate">{result.batch.name}</p>
                    </div>
                    <div className="p-3 rounded-md bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Status</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400">
                        {result.batch.status}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!result && (
            <Button
              type="submit"
              form="upload-form"
              disabled={uploading || !batchName || !transactionsFile || !settlementsFile}
              className="w-full"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading & Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Auto-Process Batch
                </>
              )}
            </Button>
          )}

          <div className="space-y-3 text-xs text-muted-foreground">
            <h4 className="font-medium text-foreground">Expected File Formats</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-md bg-secondary/50">
                <p className="font-mono text-sm mb-2">Transactions</p>
                <pre className="text-[10px] overflow-x-auto">external_transaction_id,source,amount,currency,status,transaction_date,customer_reference,payment_reference
TXN_001,razorpay,10000.00,INR,captured,2026-01-15T10:30:00,CUST_001,PAY_REF_001
TXN_002,stripe,5500.50,INR,captured,2026-01-15T11:00:00,CUST_002,PAY_REF_002</pre>
              </div>
              <div className="p-3 rounded-md bg-secondary/50">
                <p className="font-mono text-sm mb-2">Settlements</p>
                <pre className="text-[10px] overflow-x-auto">external_settlement_id,source,amount,currency,settlement_date,reference,status
SET_001,razorpay,10000.00,INR,2026-01-15T15:00:00,PAY_REF_001,settled
SET_002,stripe,5500.50,INR,2026-01-15T15:30:00,PAY_REF_002,settled</pre>
              </div>
              <div className="p-3 rounded-md bg-secondary/50">
                <p className="font-mono text-sm mb-2">Refunds (Optional)</p>
                <pre className="text-[10px] overflow-x-auto">external_refund_id,transaction_reference,amount,currency,refund_date,status
REF_001,PAY_REF_001,2000.00,INR,2026-01-16T10:00:00,processed</pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}