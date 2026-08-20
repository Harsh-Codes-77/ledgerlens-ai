import json
import logging
from typing import Dict, Any
from app.ai.providers import get_ai_provider, AIProvider
from app.schemas.domain import AIInvestigationResult

logger = logging.getLogger(__name__)

class AIExceptionInvestigator:
    """
    Structured AI Exception Investigator.
    Invoked for unmatched/ambiguous exception cases. Grounded in deterministic evidence.
    Gracefully falls back to human escalation if AI fails or yields invalid output.
    """

    def __init__(self, provider: AIProvider = None):
        self.provider = provider or get_ai_provider()

    def investigate_exception(self, payload: Dict[str, Any]) -> AIInvestigationResult:
        try:
            raw_response = self.provider.investigate(payload)
            # Clean up potential markdown formatting in response
            cleaned_text = raw_response.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            parsed_data = json.loads(cleaned_text)
            result = AIInvestigationResult(**parsed_data)

            # Apply Strict Safety Rules
            if result.ai_confidence < 0.70 or "ambiguous" in result.exception_type:
                result.requires_human_review = True
                result.recommended_action = "escalate"
            elif result.ai_confidence >= 0.95 and not result.requires_human_review:
                result.recommended_action = "auto_resolve"

            return result

        except Exception as e:
            logger.warning(f"AI investigation failed or timed out: {e}. Falling back to human review.")
            txn = payload.get("transaction", {})
            txn_id = txn.get("external_transaction_id", "UNKNOWN")
            return AIInvestigationResult(
                exception_type=payload.get("exception_type", "missing_settlement"),
                summary=f"Exception investigation for {txn_id} defaulted to human escalation.",
                evidence=[
                    f"Transaction ID: {txn_id}",
                    "AI service unavailable or generated invalid output",
                    f"Error detail: {str(e)}"
                ],
                likely_cause="AI provider timeout or structured JSON validation failure.",
                recommended_action="escalate",
                ai_confidence=0.0,
                requires_human_review=True
            )
