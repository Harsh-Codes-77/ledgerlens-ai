# 5-Minute Demonstration Script — LedgerLens AI

## Step 1: Opening Overview Dashboard (0:00 - 0:45)
- Open `http://localhost:3000`.
- Highlight key metrics: Total Processed, Match Rate, Auto-Resolved vs Escalated count.
- Point out the monochrome institutional financial terminal aesthetic.

## Step 2: Running 500-Record Reconciliation Batch (0:45 - 1:30)
- Click **"Run 500-Record Demo Batch"**.
- Show batch processing execution completing deterministically across 500 records.

## Step 3: Inspecting Batch Execution Log (1:30 - 2:30)
- Navigate to `/batches/[id]`.
- Demonstrate the 5-stage reconciliation pipeline results (EXACT, TOLERANCE, AMBIGUOUS).

## Step 4: Investigating AI Exception Evidence (2:30 - 3:30)
- Navigate to `/exceptions` and open a case (e.g. `amount_mismatch` or `missing_settlement`).
- Show the AI Grounded Investigation summary, evidence bullet points, likely cause, and confidence score.
- Approve or Escalate the case and show the audit log updated in real-time.

## Step 5: Audit Log & Evaluation Benchmarks (3:30 - 5:00)
- Open `/audit-log` to demonstrate immutable system, AI, and human actor logs.
- Open `/evaluation` to display actual metrics (100% accuracy, 69.8% auto-resolve rate) and the Failure Analysis matrix.
