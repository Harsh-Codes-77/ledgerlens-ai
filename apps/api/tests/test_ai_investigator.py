from app.ai.investigator import AIExceptionInvestigator
from app.ai.providers import MockProvider, AIProvider
import json

class FailingProvider(AIProvider):
    def investigate(self, payload: dict) -> str:
        raise RuntimeError("API Timeout / Outage simulated")

def test_mock_investigation():
    investigator = AIExceptionInvestigator(provider=MockProvider())
    payload = {
        "transaction": {"external_transaction_id": "TXN_1001", "amount": 5000.0},
        "candidate_matches": [],
        "exception_type": "missing_settlement"
    }
    result = investigator.investigate_exception(payload)
    assert result.exception_type == "missing_settlement"
    assert result.requires_human_review is True
    assert result.recommended_action == "escalate"

def test_ai_fallback_on_error():
    investigator = AIExceptionInvestigator(provider=FailingProvider())
    payload = {
        "transaction": {"external_transaction_id": "TXN_ERR", "amount": 100.0},
        "exception_type": "missing_settlement"
    }
    result = investigator.investigate_exception(payload)
    assert result.requires_human_review is True
    assert result.recommended_action == "escalate"
    assert result.ai_confidence == 0.0
    assert "defaulted to human escalation" in result.summary
