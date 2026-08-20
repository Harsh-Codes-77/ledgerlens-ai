from fastapi.testclient import TestClient
from app.main import app
from app.database.session import init_db

init_db()
client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_batch_lifecycle():
    # 1. Create batch
    resp = client.post("/api/batches", json={
        "name": "Test Batch",
        "use_demo_data": True,
        "record_count": 50
    })
    assert resp.status_code == 200
    batch_data = resp.json()
    batch_id = batch_data["id"]

    # 2. Process batch
    proc_resp = client.post(f"/api/batches/{batch_id}/process")
    assert proc_resp.status_code == 200
    proc_data = proc_resp.json()
    assert proc_data["status"] == "COMPLETED"
    assert proc_data["total_records"] == 50

    # 3. Check results
    res_resp = client.get(f"/api/batches/{batch_id}/results")
    assert res_resp.status_code == 200
    assert len(res_resp.json()) == 50

    # 4. Check evaluation endpoint
    eval_resp = client.get(f"/api/evaluation/{batch_id}")
    assert eval_resp.status_code == 200
    assert eval_resp.json()["total_records"] == 50

def test_exception_action_audit_logging():
    # Create and process batch to get exceptions
    resp = client.post("/api/batches", json={"name": "Audit Test Batch", "use_demo_data": True, "record_count": 20})
    batch_id = resp.json()["id"]
    client.post(f"/api/batches/{batch_id}/process")

    exceptions = client.get("/api/exceptions").json()
    assert len(exceptions) > 0
    exc_id = exceptions[0]["id"]

    # Approve exception
    app_resp = client.post(f"/api/exceptions/{exc_id}/approve", json={"action": "approve", "notes": "Approved by test operator", "actor_id": "test_operator"})
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "APPROVED"

    # Verify audit log recorded event
    logs_resp = client.get("/api/audit-logs")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    action_logs = [l for l in logs if l["entity_id"] == exc_id and l["action"] == "HUMAN_APPROVE"]
    assert len(action_logs) > 0
    assert action_logs[0]["actor_id"] == "test_operator"
