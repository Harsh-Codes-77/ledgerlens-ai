import random
from datetime import datetime, timedelta, timezone

SOURCES = ["razorpay", "stripe", "bank_hdfc", "bank_icici"]

def generate_dataset(num_records: int = 500, seed: int = 42) -> dict:
    random.seed(seed)
    start_date = datetime(2026, 1, 1, 10, 0, 0)

    transactions = []
    settlements = []
    refunds = []
    ground_truth = {}

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
            txn = {
                "external_transaction_id": txn_id, "source": source, "amount": base_amount,
                "currency": "INR", "status": "captured", "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref, "payment_reference": ref_id,
                "metadata": {"type": "normal"}
            }
            settlement = {
                "external_settlement_id": set_id, "source": source, "amount": base_amount,
                "currency": "INR", "settlement_date": (txn_date + timedelta(hours=random.randint(2, 24))).isoformat(),
                "reference": ref_id, "status": "settled", "metadata": {"linked_txn": txn_id}
            }
            transactions.append(txn)
            settlements.append(settlement)
            ground_truth[txn_id] = {"expected_match_type": "EXACT", "expected_matched_settlement_id": set_id, "expected_exception_type": None, "expected_decision": "AUTO_RESOLVE"}

        elif scenario_roll < 0.75:
            fee_deducted_amount = round(base_amount * 0.98, 2)
            set_date = txn_date + timedelta(days=2)
            txn = {
                "external_transaction_id": txn_id, "source": source, "amount": base_amount,
                "currency": "INR", "status": "captured", "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref, "payment_reference": ref_id,
                "metadata": {"type": "fee_deducted"}
            }
            settlement = {
                "external_settlement_id": set_id, "source": source, "amount": fee_deducted_amount,
                "currency": "INR", "settlement_date": set_date.isoformat(),
                "reference": ref_id, "status": "settled", "metadata": {"linked_txn": txn_id}
            }
            transactions.append(txn)
            settlements.append(settlement)
            ground_truth[txn_id] = {"expected_match_type": "TOLERANCE", "expected_matched_settlement_id": set_id, "expected_exception_type": "amount_mismatch", "expected_decision": "RECOMMEND_ACTION"}

        elif scenario_roll < 0.83:
            txn = {
                "external_transaction_id": txn_id, "source": source, "amount": base_amount,
                "currency": "INR", "status": "captured", "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref, "payment_reference": ref_id,
                "metadata": {"type": "unsettled"}
            }
            transactions.append(txn)
            ground_truth[txn_id] = {"expected_match_type": "UNMATCHED", "expected_matched_settlement_id": None, "expected_exception_type": "missing_settlement", "expected_decision": "ESCALATE_TO_HUMAN"}

        elif scenario_roll < 0.88:
            txn = {
                "external_transaction_id": txn_id, "source": source, "amount": base_amount,
                "currency": "INR", "status": "captured", "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref, "payment_reference": ref_id,
                "metadata": {"type": "duplicate_attempt"}
            }
            settlement = {
                "external_settlement_id": set_id, "source": source, "amount": base_amount,
                "currency": "INR", "settlement_date": (txn_date + timedelta(hours=6)).isoformat(),
                "reference": ref_id, "status": "settled", "metadata": {"linked_txn": txn_id}
            }
            settlement_dup = {
                "external_settlement_id": f"SET_DUP_{i:04d}", "source": source, "amount": base_amount,
                "currency": "INR", "settlement_date": (txn_date + timedelta(hours=7)).isoformat(),
                "reference": ref_id, "status": "settled", "metadata": {"linked_txn": txn_id}
            }
            transactions.append(txn)
            settlements.append(settlement)
            settlements.append(settlement_dup)
            ground_truth[txn_id] = {"expected_match_type": "AMBIGUOUS", "expected_matched_settlement_id": set_id, "expected_exception_type": "duplicate_reference", "expected_decision": "ESCALATE_TO_HUMAN"}

        elif scenario_roll < 0.92:
            txn = {
                "external_transaction_id": txn_id, "source": source, "amount": base_amount,
                "currency": "INR", "status": "captured", "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref, "payment_reference": f"AMBIG_REF_{i}",
                "metadata": {"type": "ambiguous"}
            }
            cand1 = {
                "external_settlement_id": f"SET_C1_{i:04d}", "source": source, "amount": base_amount,
                "currency": "INR", "settlement_date": (txn_date + timedelta(hours=4)).isoformat(),
                "reference": f"AMBIG_REF_{i}_ALT", "status": "settled"
            }
            cand2 = {
                "external_settlement_id": f"SET_C2_{i:04d}", "source": source, "amount": base_amount + 5.0,
                "currency": "INR", "settlement_date": (txn_date + timedelta(hours=5)).isoformat(),
                "reference": f"AMBIG_REF_{i}", "status": "settled"
            }
            transactions.append(txn)
            settlements.append(cand1)
            settlements.append(cand2)
            ground_truth[txn_id] = {"expected_match_type": "AMBIGUOUS", "expected_matched_settlement_id": None, "expected_exception_type": "ambiguous_match", "expected_decision": "ESCALATE_TO_HUMAN"}

        elif scenario_roll < 0.96:
            txn = {
                "external_transaction_id": txn_id, "source": source,
                "amount": -base_amount if i % 2 == 0 else base_amount,
                "currency": "USD" if i % 2 != 0 else "INR",
                "status": "invalid_status", "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref, "payment_reference": ref_id,
                "metadata": {"type": "corrupted"}
            }
            transactions.append(txn)
            ground_truth[txn_id] = {"expected_match_type": "INVALID", "expected_matched_settlement_id": None, "expected_exception_type": "invalid_data", "expected_decision": "ESCALATE_TO_HUMAN"}

        else:
            refund_amount = round(base_amount * 0.5, 2)
            txn = {
                "external_transaction_id": txn_id, "source": source, "amount": base_amount,
                "currency": "INR", "status": "refunded", "transaction_date": txn_date.isoformat(),
                "customer_reference": cust_ref, "payment_reference": ref_id,
                "metadata": {"type": "refunded"}
            }
            settlement = {
                "external_settlement_id": set_id, "source": source, "amount": round(base_amount - refund_amount, 2),
                "currency": "INR", "settlement_date": (txn_date + timedelta(days=1)).isoformat(),
                "reference": ref_id, "status": "settled"
            }
            refund = {
                "external_refund_id": f"REF_{i:04d}", "transaction_reference": ref_id,
                "amount": refund_amount, "currency": "INR",
                "refund_date": (txn_date + timedelta(hours=12)).isoformat(), "status": "processed"
            }
            transactions.append(txn)
            settlements.append(settlement)
            refunds.append(refund)
            ground_truth[txn_id] = {"expected_match_type": "TOLERANCE", "expected_matched_settlement_id": set_id, "expected_exception_type": "partial_refund", "expected_decision": "AUTO_RESOLVE"}

    return {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "records_requested": num_records, "seed": seed,
            "total_transactions": len(transactions),
            "total_settlements": len(settlements),
            "total_refunds": len(refunds)
        },
        "transactions": transactions,
        "settlements": settlements,
        "refunds": refunds,
        "ground_truth": ground_truth
    }
