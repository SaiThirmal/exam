from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app


@pytest.fixture
def client(tmp_path: Path):
    app = create_app(db_path=str(tmp_path / "test.db"))
    return TestClient(app)


def test_health_endpoint(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_scenarios(client: TestClient):
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    items = response.json()
    assert isinstance(items, list)
    assert len(items) >= 3


def test_submit_attempt_and_leaderboard(client: TestClient):
    submit_response = client.post(
        "/api/attempts",
        json={
            "user_id": "student-a",
            "scenario_id": "sqli-login-bypass",
            "payload": "' OR '1'='1' --",
            "evidence": "Login bypassed with welcome admin banner visible.",
        },
    )
    assert submit_response.status_code == 200
    result = submit_response.json()
    assert result["passed"] is True

    leaderboard_response = client.get("/api/leaderboard")
    assert leaderboard_response.status_code == 200
    leaderboard = leaderboard_response.json()
    assert len(leaderboard) >= 1
    assert leaderboard[0]["user_id"] == "student-a"
