import json
import abc
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings

SYSTEM_PROMPT = """You are LedgerLens AI, an autonomous financial reconciliation investigator.
Your job is to analyze unmatched financial records, calculate confidence, summarize evidence, and recommend action.

Rules:
1. Base your decisions strictly on the supplied transaction and candidate evidence.
2. Return ONLY valid JSON matching the exact schema below. Do not include markdown code block formatting like ```json.
3. Schema required:
{
  "exception_type": "missing_settlement" | "amount_mismatch" | "date_mismatch" | "duplicate_reference" | "invalid_data" | "ambiguous_match" | "partial_refund",
  "summary": "Short concise summary of the issue",
  "evidence": ["Bullet point 1", "Bullet point 2"],
  "likely_cause": "Detailed explanation of likely root cause",
  "recommended_action": "auto_resolve" | "recommend_action" | "escalate",
  "ai_confidence": 0.85,
  "requires_human_review": true
}
"""

class AIProvider(abc.ABC):
    @abc.abstractmethod
    def investigate(self, payload: Dict[str, Any]) -> str:
        pass

class MockProvider(AIProvider):
    def investigate(self, payload: Dict[str, Any]) -> str:
        txn = payload.get("transaction", {})
        candidates = payload.get("candidate_matches", [])
        exception_type = payload.get("exception_type", "missing_settlement")
        amount = txn.get("amount", 0.0)
        txn_id = txn.get("external_transaction_id", "UNKNOWN")

        if exception_type == "amount_mismatch" and candidates:
            cand = candidates[0].get("details", {})
            set_amount = cand.get("amount", 0.0)
            diff = abs(amount - set_amount)
            return json.dumps({
                "exception_type": "amount_mismatch",
                "summary": f"Amount mismatch of ₹{diff:.2f} detected between transaction and settlement.",
                "evidence": [
                    f"Transaction {txn_id} amount: ₹{amount:.2f}",
                    f"Candidate settlement amount: ₹{set_amount:.2f}",
                    f"Variance: ₹{diff:.2f} (~2.0% gateway fee deduction)"
                ],
                "likely_cause": "Payment gateway processing fee was deducted directly from settlement.",
                "recommended_action": "recommend_action",
                "ai_confidence": 0.88,
                "requires_human_review": True
            })

        if exception_type == "partial_refund":
            return json.dumps({
                "exception_type": "partial_refund",
                "summary": f"Transaction {txn_id} matched settlement after accounting for partial refund.",
                "evidence": [
                    f"Original transaction amount: ₹{amount:.2f}",
                    "Processed partial refund recorded in refunds feed",
                    "Net settlement amount matches expected balance"
                ],
                "likely_cause": "Customer requested a partial refund prior to bank batch settlement.",
                "recommended_action": "auto_resolve",
                "ai_confidence": 0.96,
                "requires_human_review": False
            })

        if exception_type in ["duplicate_reference", "ambiguous_match"]:
            return json.dumps({
                "exception_type": exception_type,
                "summary": f"Multiple matching settlement candidates detected for {txn_id}.",
                "evidence": [
                    f"Transaction {txn_id} reference appears in {len(candidates)} settlement entries",
                    "Potential duplicate payout or split bank batching"
                ],
                "likely_cause": "Duplicate gateway callback or retry attempt created multiple settlement records.",
                "recommended_action": "escalate",
                "ai_confidence": 0.62,
                "requires_human_review": True
            })

        # Default missing settlement
        return json.dumps({
            "exception_type": "missing_settlement",
            "summary": f"No settlement entry found for transaction {txn_id}.",
            "evidence": [
                f"Transaction {txn_id} recorded on {txn.get('transaction_date')}",
                "Zero matching references found in bank settlement feeds"
            ],
            "likely_cause": "Bank settlement delayed or transaction pending payout batch window.",
            "recommended_action": "escalate",
            "ai_confidence": 0.55,
            "requires_human_review": True
        })

class GroqProvider(AIProvider):
    def investigate(self, payload: Dict[str, Any]) -> str:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured")

        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
            resp.raise_for_status()
            res_json = resp.json()
            return res_json["choices"][0]["message"]["content"]

class OpenAIProvider(AIProvider):
    def investigate(self, payload: Dict[str, Any]) -> str:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": settings.OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload)}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data)
            resp.raise_for_status()
            res_json = resp.json()
            return res_json["choices"][0]["message"]["content"]

class GeminiProvider(AIProvider):
    def investigate(self, payload: Dict[str, Any]) -> str:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        data = {
            "contents": [{
                "parts": [{"text": f"{SYSTEM_PROMPT}\n\nEvidence payload:\n{json.dumps(payload)} animate as json"}]
            }]
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=data)
            resp.raise_for_status()
            res_json = resp.json()
            return res_json["candidates"][0]["content"]["parts"][0]["text"]

def get_ai_provider() -> AIProvider:
    provider_name = settings.AI_PROVIDER.lower()
    if provider_name == "groq" and settings.GROQ_API_KEY:
        return GroqProvider()
    elif provider_name == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider()
    elif provider_name == "gemini" and settings.GEMINI_API_KEY:
        return GeminiProvider()
    return MockProvider()
