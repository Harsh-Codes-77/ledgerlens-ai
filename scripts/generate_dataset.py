#!/usr/bin/env python3
import argparse
import json
import os
import random
from datetime import datetime, timedelta, timezone

SOURCES = ["razorpay", "stripe", "bank_hdfc", "bank_icici"]
CURRENCIES = ["INR"]

def parse_args():
    parser = argparse.ArgumentParser(description="LedgerLens AI Synthetic Financial Dataset Generator")
    parser.add_argument("--records", type=int, default=500, help="Number of records to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--output", type=str, default="data/generated/dataset.json", help="Output file path")
    return parser.parse_args()

def generate_dataset(num_records: int, seed: int) -> dict:
    random.seed(seed)
    start_date = datetime(2026, 1, 1, 10, 0, 0)

    transactions = []
    settlements = []
    refunds = []
    ground_truth = {}

    # Category distribution
    # 65% Exact match
    # 10% Tolerance match (slight amount variance / 1-2 day delay)
    # 8% Missing settlement
    # 5% Duplicate ID / Reference
    # 4% Ambiguous match (2 candidates)
    # 4% Invalid data
    # 4% Partial refund

    for i in range(1, num_records + 1):
        txn_id = f"TXN_{i:04d}"
        set_id = f"SET_{i:04d}"
        ref_id = f"PAY_REF_{i:04d}"
        cust_ref = f"CUST_{random.randint(1000, 9999)}"
        base_amount = round(random.uniform(100.0, 50000.0), 2)
        txn_date = start_date + timedelta(minutes=i * 15 + random.randint(0, 30))
        source = random.choice(SOURCES)

        scenario_roll = random.random()

        if scenario_roll < 0.65:
            # 1. Exact Match
            txn = {
                "external_transaction_id": txn_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "status": "captured",
                "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref,
                "payment_reference": ref_id,
                "metadata": {"type": "normal"}
            }
            settlement = {
                "external_settlement_id": set_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "settlement_date": (txn_date + timedelta(hours=random.randint(2, 24))).isoformat(),
                "reference": ref_id,
                "status": "settled",
                "metadata": {"linked_txn": txn_id}
            }
            transactions.append(txn)
            settlements.append(settlement)
            ground_truth[txn_id] = {
                "expected_match_type": "EXACT",
                "expected_matched_settlement_id": set_id,
                "expected_exception_type": None,
                "expected_decision": "AUTO_RESOLVE"
            }

        elif scenario_roll < 0.75:
            # 2. Tolerance Match (slight fee deduction e.g., 2% fee mismatch or delay)
            fee_deducted_amount = round(base_amount * 0.98, 2)  # 2% fee variance
            set_date = txn_date + timedelta(days=2)
            txn = {
                "external_transaction_id": txn_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "status": "captured",
                "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref,
                "payment_reference": ref_id,
                "metadata": {"type": "fee_deducted"}
            }
            settlement = {
                "external_settlement_id": set_id,
                "source": source,
                "amount": fee_deducted_amount,
                "currency": "INR",
                "settlement_date": set_date.isoformat(),
                "reference": ref_id,
                "status": "settled",
                "metadata": {"linked_txn": txn_id}
            }
            transactions.append(txn)
            settlements.append(settlement)
            ground_truth[txn_id] = {
                "expected_match_type": "TOLERANCE",
                "expected_matched_settlement_id": set_id,
                "expected_exception_type": "amount_mismatch",
                "expected_decision": "RECOMMEND_ACTION"
            }

        elif scenario_roll < 0.83:
            # 3. Missing Settlement (Orphan Transaction)
            txn = {
                "external_transaction_id": txn_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "status": "captured",
                "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref,
                "payment_reference": ref_id,
                "metadata": {"type": "unsettled"}
            }
            transactions.append(txn)
            ground_truth[txn_id] = {
                "expected_match_type": "UNMATCHED",
                "expected_matched_settlement_id": None,
                "expected_exception_type": "missing_settlement",
                "expected_decision": "ESCALATE_TO_HUMAN"
            }

        elif scenario_roll < 0.88:
            # 4. Duplicate Record / Reference
            txn = {
                "external_transaction_id": txn_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "status": "captured",
                "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref,
                "payment_reference": ref_id,
                "metadata": {"type": "duplicate_attempt"}
            }
            # Settlement with duplicated reference
            settlement = {
                "external_settlement_id": set_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "settlement_date": (txn_date + timedelta(hours=6)).isoformat(),
                "reference": ref_id,
                "status": "settled",
                "metadata": {"linked_txn": txn_id}
            }
            settlement_dup = {
                "external_settlement_id": f"SET_DUP_{i:04d}",
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "settlement_date": (txn_date + timedelta(hours=7)).isoformat(),
                "reference": ref_id,
                "status": "settled",
                "metadata": {"linked_txn": txn_id}
            }
            transactions.append(txn)
            settlements.append(settlement)
            settlements.append(settlement_dup)
            ground_truth[txn_id] = {
                "expected_match_type": "AMBIGUOUS",
                "expected_matched_settlement_id": set_id,
                "expected_exception_type": "duplicate_reference",
                "expected_decision": "ESCALATE_TO_HUMAN"
            }

        elif scenario_roll < 0.92:
            # 5. Ambiguous Candidates (2 settlements with matching amount & date but missing/partial reference)
            txn = {
                "external_transaction_id": txn_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "status": "captured",
                "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref,
                "payment_reference": f"AMBIG_REF_{i}",
                "metadata": {"type": "ambiguous"}
            }
            cand1 = {
                "external_settlement_id": f"SET_C1_{i:04d}",
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "settlement_date": (txn_date + timedelta(hours=4)).isoformat(),
                "reference": f"AMBIG_REF_{i}_ALT",
                "status": "settled"
            }
            cand2 = {
                "external_settlement_id": f"SET_C2_{i:04d}",
                "source": source,
                "amount": base_amount + 5.0,
                "currency": "INR",
                "settlement_date": (txn_date + timedelta(hours=5)).isoformat(),
                "reference": f"AMBIG_REF_{i}",
                "status": "settled"
            }
            transactions.append(txn)
            settlements.append(cand1)
            settlements.append(cand2)
            ground_truth[txn_id] = {
                "expected_match_type": "AMBIGUOUS",
                "expected_matched_settlement_id": None,
                "expected_exception_type": "ambiguous_match",
                "expected_decision": "ESCALATE_TO_HUMAN"
            }

        elif scenario_roll < 0.96:
            # 6. Invalid Data Format (e.g., negative amount or corrupted status)
            txn = {
                "external_transaction_id": txn_id,
                "source": source,
                "amount": -base_amount if i % 2 == 0 else base_amount,
                "currency": "USD" if i % 2 != 0 else "INR",  # Unsupported currency mismatch
                "status": "invalid_status",
                "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref,
                "payment_reference": ref_id,
                "metadata": {"type": "corrupted"}
            }
            transactions.append(txn)
            ground_truth[txn_id] = {
                "expected_match_type": "INVALID",
                "expected_matched_settlement_id": None,
                "expected_exception_type": "invalid_data",
                "expected_decision": "ESCALATE_TO_HUMAN"
            }

        else:
            # 7. Partial Refund scenario
            refund_amount = round(base_amount * 0.5, 2)
            txn = {
                "external_transaction_id": txn_id,
                "source": source,
                "amount": base_amount,
                "currency": "INR",
                "status": "refunded",
                "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref,
                "payment_reference": ref_id,
                "metadata": {"type": "refunded"}
            }
            settlement = {
                "external_settlement_id": set_id,
                "source": source,
                "amount": round(base_amount - refund_amount, 2),
                "currency": "INR",
                "settlement_date": (txn_date + timedelta(days=1)).isoformat(),
                "reference": ref_id,
                "status": "settled"
            }
            refund = {
                "external_refund_id": f"REF_{i:04d}",
                "transaction_reference": ref_id,
                "amount": refund_amount,
                "currency": "INR",
                "refund_date": (txn_date + timedelta(hours=12)).isoformat(),
                "status": "processed"
            }
            transactions.append(txn)
            settlements.append(settlement)
            refunds.append(refund)
            ground_truth[txn_id] = {
                "expected_match_type": "TOLERANCE",
                "expected_matched_settlement_id": set_id,
                "expected_exception_type": "partial_refund",
                "expected_decision": "AUTO_RESOLVE"
            }

    dataset = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "records_requested": num_records,
            "seed": seed,
            "total_transactions": len(transactions),
            "total_settlements": len(settlements),
            "total_refunds": len(refunds)
        },
        "transactions": transactions,
        "settlements": settlements,
        "refunds": refunds,
        "ground_truth": ground_truth
    }

    return dataset

def main():
    args = parse_args()
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    dataset = generate_dataset(args.records, args.seed)
    with open(args.output, "w") as f:
        json.dump(dataset, f, indent=2)
    print(f"✅ Generated dataset with {len(dataset['transactions'])} transactions, {len(dataset['settlements'])} settlements, {len(dataset['refunds'])} refunds at: {args.output}")

if __name__ == "__main__":
    main()
