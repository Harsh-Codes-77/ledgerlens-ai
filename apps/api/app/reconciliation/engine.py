from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional

class ReconciliationEngine:
    """
    Deterministic Multi-Stage Financial Reconciliation Engine.
    Intentionally separates deterministic rule-based matching from LLM-based exception investigation.
    """

    def __init__(self, amount_tolerance_pct: float = 0.02, date_window_days: int = 5):
        self.amount_tolerance_pct = amount_tolerance_pct
        self.date_window_days = date_window_days

    def process_batch(
        self,
        transactions: List[Dict[str, Any]],
        settlements: List[Dict[str, Any]],
        refunds: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        refunds = refunds or []

        # Index settlements by reference and ID for fast lookup
        settlements_by_ref: Dict[str, List[Dict[str, Any]]] = {}
        for s in settlements:
            ref = s.get("reference") or s.get("external_settlement_id")
            if ref:
                settlements_by_ref.setdefault(ref, []).append(s)

        # Index refunds by transaction reference
        refunds_by_ref: Dict[str, List[Dict[str, Any]]] = {}
        for r in refunds:
            ref = r.get("transaction_reference")
            if ref:
                refunds_by_ref.setdefault(ref, []).append(r)

        results = []
        used_settlement_ids = set()

        for txn in transactions:
            txn_id = txn.get("external_transaction_id")
            ref_id = txn.get("payment_reference") or txn_id

            # Stage 1: Validation
            validation_error = self._validate_transaction(txn)
            if validation_error:
                results.append({
                    "source_record_id": txn_id,
                    "matched_record_id": None,
                    "match_type": "INVALID",
                    "status": "EXCEPTION",
                    "confidence_score": 0.0,
                    "amount_difference": 0.0,
                    "date_difference": 0.0,
                    "decision": "ESCALATE_TO_HUMAN",
                    "reason": f"Validation failed: {validation_error}",
                    "exception_type": "invalid_data",
                    "severity": "HIGH",
                    "candidate_matches": []
                })
                continue

            candidates = settlements_by_ref.get(ref_id, [])

            # Check if refund applies
            related_refunds = refunds_by_ref.get(ref_id, [])
            total_refund_amount = sum(r.get("amount", 0.0) for r in related_refunds)

            # Stage 2: Exact Matching
            exact_match = None
            for c in candidates:
                if c["external_settlement_id"] in used_settlement_ids:
                    continue
                if abs(c["amount"] - txn["amount"]) < 0.01 and c.get("currency") == txn.get("currency"):
                    exact_match = c
                    break

            if exact_match and len(candidates) == 1:
                used_settlement_ids.add(exact_match["external_settlement_id"])
                date_diff = self._calc_date_diff(txn.get("transaction_date"), exact_match.get("settlement_date"))
                results.append({
                    "source_record_id": txn_id,
                    "matched_record_id": exact_match["external_settlement_id"],
                    "match_type": "EXACT",
                    "status": "MATCHED",
                    "confidence_score": 1.0,
                    "amount_difference": 0.0,
                    "date_difference": date_diff,
                    "decision": "AUTO_RESOLVE",
                    "reason": "Exact transaction reference, amount, and currency match.",
                    "exception_type": None,
                    "severity": "LOW",
                    "candidate_matches": []
                })
                continue

            # Stage 4 check: Multiple exact/ambiguous candidates (Duplicate reference)
            if len(candidates) > 1:
                candidate_list = []
                for c in candidates:
                    score = self._calculate_confidence(txn, c)
                    candidate_list.append({"record": c["external_settlement_id"], "score": score, "details": c})

                best_candidate = candidates[0]
                date_diff = self._calc_date_diff(txn.get("transaction_date"), best_candidate.get("settlement_date"))
                results.append({
                    "source_record_id": txn_id,
                    "matched_record_id": best_candidate["external_settlement_id"],
                    "match_type": "AMBIGUOUS",
                    "status": "EXCEPTION",
                    "confidence_score": 0.65,
                    "amount_difference": abs(txn["amount"] - best_candidate["amount"]),
                    "date_difference": date_diff,
                    "decision": "ESCALATE_TO_HUMAN",
                    "reason": f"Multiple potential settlement matches found ({len(candidates)} candidates).",
                    "exception_type": "duplicate_reference" if len(candidates) > 1 else "ambiguous_match",
                    "severity": "HIGH",
                    "candidate_matches": candidate_list
                })
                continue

            # Stage 3: Tolerance Matching & Partial Refund matching
            if candidates:
                candidate = candidates[0]
                amount_diff = abs(txn["amount"] - candidate["amount"])
                date_diff = self._calc_date_diff(txn.get("transaction_date"), candidate.get("settlement_date"))

                # Check partial refund case
                if total_refund_amount > 0 and abs((txn["amount"] - total_refund_amount) - candidate["amount"]) < 0.05:
                    used_settlement_ids.add(candidate["external_settlement_id"])
                    results.append({
                        "source_record_id": txn_id,
                        "matched_record_id": candidate["external_settlement_id"],
                        "match_type": "TOLERANCE",
                        "status": "MATCHED",
                        "confidence_score": 0.96,
                        "amount_difference": amount_diff,
                        "date_difference": date_diff,
                        "decision": "AUTO_RESOLVE",
                        "reason": f"Matched settlement considering processed partial refund of ₹{total_refund_amount}.",
                        "exception_type": "partial_refund",
                        "severity": "LOW",
                        "candidate_matches": [{"record": candidate["external_settlement_id"], "score": 0.96}]
                    })
                    continue

                # Check fee tolerance variance (e.g. within 2% or 5%)
                if amount_diff <= txn["amount"] * self.amount_tolerance_pct and date_diff <= self.date_window_days:
                    used_settlement_ids.add(candidate["external_settlement_id"])
                    score = self._calculate_confidence(txn, candidate)
                    results.append({
                        "source_record_id": txn_id,
                        "matched_record_id": candidate["external_settlement_id"],
                        "match_type": "TOLERANCE",
                        "status": "EXCEPTION",
                        "confidence_score": score,
                        "amount_difference": amount_diff,
                        "date_difference": date_diff,
                        "decision": "RECOMMEND_ACTION",
                        "reason": f"Amount difference of ₹{amount_diff:.2f} is within tolerance threshold.",
                        "exception_type": "amount_mismatch",
                        "severity": "MEDIUM",
                        "candidate_matches": [{"record": candidate["external_settlement_id"], "score": score}]
                    })
                    continue

            # Check secondary candidate search by amount across all settlements if no reference candidate
            nearby_candidates = self._find_candidates_by_amount(txn, settlements, used_settlement_ids)
            if len(nearby_candidates) == 2:
                results.append({
                    "source_record_id": txn_id,
                    "matched_record_id": None,
                    "match_type": "AMBIGUOUS",
                    "status": "EXCEPTION",
                    "confidence_score": 0.60,
                    "amount_difference": 0.0,
                    "date_difference": 0.0,
                    "decision": "ESCALATE_TO_HUMAN",
                    "reason": "Multiple candidate settlements found matching amount but with reference mismatches.",
                    "exception_type": "ambiguous_match",
                    "severity": "HIGH",
                    "candidate_matches": nearby_candidates
                })
                continue

            # Stage 5: Unmatched / Missing Settlement
            results.append({
                "source_record_id": txn_id,
                "matched_record_id": None,
                "match_type": "UNMATCHED",
                "status": "EXCEPTION",
                "confidence_score": 0.0,
                "amount_difference": 0.0,
                "date_difference": 0.0,
                "decision": "ESCALATE_TO_HUMAN",
                "reason": "No matching settlement record found in settlement feed.",
                "exception_type": "missing_settlement",
                "severity": "HIGH",
                "candidate_matches": []
            })

        return results

    def _validate_transaction(self, txn: Dict[str, Any]) -> Optional[str]:
        if not txn.get("external_transaction_id"):
            return "Missing external_transaction_id"
        if txn.get("amount", 0) <= 0:
            return f"Invalid transaction amount: {txn.get('amount')}"
        if txn.get("currency") not in ["INR"]:
            return f"Unsupported currency: {txn.get('currency')}"
        if txn.get("status") == "invalid_status":
            return "Invalid transaction status"
        return None

    def _calculate_confidence(self, txn: Dict[str, Any], settlement: Dict[str, Any]) -> float:
        points = 0.0
        # Reference Match: 40 pts
        txn_ref = txn.get("payment_reference") or txn.get("external_transaction_id")
        set_ref = settlement.get("reference") or settlement.get("external_settlement_id")
        if txn_ref and set_ref and txn_ref == set_ref:
            points += 40.0
        elif txn_ref and set_ref and txn_ref in set_ref:
            points += 20.0

        # Amount Match: 30 pts
        amount_diff = abs(txn.get("amount", 0) - settlement.get("amount", 0))
        if amount_diff < 0.01:
            points += 30.0
        elif amount_diff <= txn.get("amount", 1) * 0.02:
            points += 20.0
        elif amount_diff <= txn.get("amount", 1) * 0.05:
            points += 10.0

        # Date Match: 15 pts
        date_diff = self._calc_date_diff(txn.get("transaction_date"), settlement.get("settlement_date"))
        if date_diff <= 1.0:
            points += 15.0
        elif date_diff <= 3.0:
            points += 10.0
        elif date_diff <= 7.0:
            points += 5.0

        # Currency Match: 10 pts
        if txn.get("currency") == settlement.get("currency"):
            points += 10.0

        # Status Compatibility: 5 pts
        if txn.get("status") in ["captured", "settled", "refunded"]:
            points += 5.0

        return round(points / 100.0, 2)

    def _calc_date_diff(self, d1_str: Optional[str], d2_str: Optional[str]) -> float:
        if not d1_str or not d2_str:
            return 999.0
        try:
            d1 = datetime.fromisoformat(d1_str.replace("Z", "+00:00"))
            d2 = datetime.fromisoformat(d2_str.replace("Z", "+00:00"))
            return abs((d2 - d1).total_seconds()) / 86400.0
        except Exception:
            return 999.0

    def _find_candidates_by_amount(
        self, txn: Dict[str, Any], settlements: List[Dict[str, Any]], used_ids: set
    ) -> List[Dict[str, Any]]:
        cands = []
        for s in settlements:
            if s["external_settlement_id"] in used_ids:
                continue
            if abs(s["amount"] - txn["amount"]) < 10.0:
                score = self._calculate_confidence(txn, s)
                cands.append({"record": s["external_settlement_id"], "score": score})
                if len(cands) >= 2:
                    break
        return cands
