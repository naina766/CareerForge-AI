import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_returns_200():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"
    assert data["data"]["service"] == "ai-service"
    assert "correlationId" in data["meta"]

def test_correlation_id_propagation():
    custom_id = "test-correlation-12345"
    response = client.get("/health", headers={"X-Correlation-ID": custom_id})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-ID") == custom_id
    assert response.json()["meta"]["correlationId"] == custom_id
