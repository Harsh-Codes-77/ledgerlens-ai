from app.reconciliation.engine import ReconciliationEngine

def test_exact_match():
    engine = ReconciliationEngine()
    txns = [{
        "external_transaction_id": "TXN_001",
        "payment_reference": "PAY_001",
        "amount": 1000.0,
        "currency": "INR",
        "status": "captured",
        "transaction_date": "2026-01-01T10:00:00"
    }]
    settlements = [{
        "external_settlement_id": "SET_001",
        "reference": "PAY_001",
        "amount": 1000.0,
        "currency": "INR",
        "status": "settled",
        "settlement_date": "2026-01-01T12:00:00"
    }]

    results = engine.process_batch(txns, settlements)
    assert len(results) == 1
    res = results[0]
    assert res["match_type"] == "EXACT"
    assert res["status"] == "MATCHED"
    assert res["confidence_score"] == 1.0
    assert res["decision"] == "AUTO_RESOLVE"

def test_tolerance_match():
    engine = ReconciliationEngine(amount_tolerance_pct=0.03)
    txns = [{
        "external_transaction_id": "TXN_002",
        "payment_reference": "PAY_002",
        "amount": 1000.0,
        "currency": "INR",
        "status": "captured",
        "transaction_date": "2026-01-01T10:00:00"
    }]
    settlements = [{
        "external_settlement_id": "SET_002",
        "reference": "PAY_002",
        "amount": 980.0,  # 2% variance
        "currency": "INR",
        "status": "settled",
        "settlement_date": "2026-01-02T10:00:00"
    }]

    results = engine.process_batch(txns, settlements)
    assert len(results) == 1
    res = results[0]
    assert res["match_type"] == "TOLERANCE"
    assert res["status"] == "EXCEPTION"
    assert res["decision"] == "RECOMMEND_ACTION"

def test_invalid_transaction():
    engine = ReconciliationEngine()
    txns = [{
        "external_transaction_id": "TXN_INV",
        "payment_reference": "PAY_INV",
        "amount": -500.0,  # Negative invalid amount
        "currency": "INR",
        "status": "captured",
        "transaction_date": "2026-01-01T10:00:00"
    }]
    settlements = []

    results = engine.process_batch(txns, settlements)
    assert len(results) == 1
    res = results[0]
    assert res["match_type"] == "INVALID"
    assert res["decision"] == "ESCALATE_TO_HUMAN"
