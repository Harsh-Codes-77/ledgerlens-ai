#!/usr/bin/env python3
import sys
import os
import argparse
import json
import time

# Ensure apps/api is in Python path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from app.reconciliation.engine import ReconciliationEngine
from app.ai.investigator import AIExceptionInvestigator

def parse_args():
    parser = argparse.ArgumentParser(description="Run LedgerLens AI Evaluation Pipeline")
    parser.add_argument("--dataset", type=str, default="data/generated/dataset.json", help="Path to input dataset JSON")
    parser.add_argument("--output", type=str, default="data/generated/evaluation_results.json", help="Path to output results JSON")
    return parser.parse_args()

def run_evaluation(dataset_path: str, output_path: str):
    if not os.path.exists(dataset_path):
        print(f"❌ Error: Dataset file not found at {dataset_path}. Run generate_dataset.py first.")
        sys.exit(1)

    with open(dataset_path, "r") as f:
        dataset = json.load(f)

    transactions = dataset.get("transactions", [])
    settlements = dataset.get("settlements", [])
    refunds = dataset.get("refunds", [])
    ground_truth = dataset.get("ground_truth", {})

    print(f"📊 Starting Evaluation on {len(transactions)} records...")

    start_time = time.time()
    engine = ReconciliationEngine()
    rec_results = engine.process_batch(transactions, settlements, refunds)
    investigator = AIExceptionInvestigator()

    results_by_txn = {}
    for res in rec_results:
        results_by_txn[res["source_record_id"]] = res

    tp = 0  # Correct match or correct exception decision
    fp = 0  # Incorrect auto-resolve when should escalate
    fn = 0  # Incorrect escalate when should auto-resolve
    tn = 0  # Correctly escalated uncertain case

    auto_resolved = 0
    escalated = 0
    known_failures = []

    for txn_id, gt in ground_truth.items():
        predicted = results_by_txn.get(txn_id)
        if not predicted:
            continue

        exp_decision = gt["expected_decision"]
        exp_match_type = gt["expected_match_type"]

        # Run AI investigation on predicted exceptions
        if predicted["status"] == "EXCEPTION":
            ai_payload = {
                "transaction": next((t for t in transactions if t["external_transaction_id"] == txn_id), {}),
                "candidate_matches": predicted.get("candidate_matches", []),
                "exception_type": predicted["exception_type"],
                "deterministic_checks": {"match_type": predicted["match_type"], "confidence": predicted["confidence_score"]}
            }
            ai_res = investigator.investigate_exception(ai_payload)
            if ai_res.recommended_action == "auto_resolve" and ai_res.ai_confidence >= 0.95:
                pred_decision = "AUTO_RESOLVE"
            else:
                pred_decision = "ESCALATE_TO_HUMAN"
        else:
            pred_decision = predicted["decision"]

        if pred_decision == "AUTO_RESOLVE":
            auto_resolved += 1
        else:
            escalated += 1

        if exp_decision == "AUTO_RESOLVE" and pred_decision == "AUTO_RESOLVE":
            tp += 1
        elif exp_decision != "AUTO_RESOLVE" and pred_decision == "AUTO_RESOLVE":
            fp += 1
            known_failures.append({
                "case_id": txn_id,
                "expected": exp_decision,
                "actual": pred_decision,
                "failure_reason": f"False positive auto-resolution on {gt.get('expected_exception_type')}"
            })
        elif exp_decision == "AUTO_RESOLVE" and pred_decision != "AUTO_RESOLVE":
            fn += 1
            known_failures.append({
                "case_id": txn_id,
                "expected": exp_decision,
                "actual": pred_decision,
                "failure_reason": f"Conservative escalation on valid match ({predicted['reason']})"
            })
        else:
            tn += 1

    total = len(ground_truth)
    duration = time.time() - start_time
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0

    metrics = {
        "total_records": total,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "auto_resolved_count": auto_resolved,
        "escalated_count": escalated,
        "auto_resolution_rate": round(auto_resolved / total, 4) if total > 0 else 0.0,
        "escalation_rate": round(escalated / total, 4) if total > 0 else 0.0,
        "processing_time_seconds": round(duration, 2),
        "known_failures_count": len(known_failures),
        "known_failures": known_failures[:10]  # top 10 failure samples
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "=" * 60)
    print("🎯 LEDGERLENS AI — RECONCILIATION EVALUATION REPORT")
    print("=" * 60)
    print(f" Total Records Evaluated : {total}")
    print(f" Processing Time         : {duration:.2f}s (Avg {duration/total*1000:.1f}ms/rec)")
    print(f" Accuracy                : {accuracy * 100:.2f}%")
    print(f" Precision               : {precision * 100:.2f}%")
    print(f" Recall                  : {recall * 100:.2f}%")
    print(f" F1 Score                : {f1 * 100:.2f}%")
    print(f" Auto-resolution Rate    : {metrics['auto_resolution_rate'] * 100:.1f}% ({auto_resolved} cases)")
    print(f" Escalation Rate         : {metrics['escalation_rate'] * 100:.1f}% ({escalated} cases)")
    print(f" False Positive Rate     : {fpr * 100:.2f}%")
    print(f" False Negative Rate     : {fnr * 100:.2f}%")
    print(f" Results Saved To        : {output_path}")
    print("=" * 60 + "\n")

    return metrics

def main():
    args = parse_args()
    run_evaluation(args.dataset, args.output)

if __name__ == "__main__":
    main()
