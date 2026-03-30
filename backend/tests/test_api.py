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


def _register(client: TestClient, username: str, password: str = "password123", role: str = "student"):
    response = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "password": password,
            "role": role,
        },
    )
    assert response.status_code == 201
    payload = response.json()
    return payload["access_token"], payload["user"]


def test_submit_attempt_and_both_leaderboards(client: TestClient):
    token, _ = _register(client, username="student-a")
    headers = {"Authorization": f"Bearer {token}"}

    create_team_response = client.post("/api/teams", headers=headers, json={"name": "RedOps"})
    assert create_team_response.status_code == 201
    team = create_team_response.json()
    assert team["name"] == "RedOps"

    submit_response = client.post(
        "/api/attempts",
        headers=headers,
        json={
            "scenario_id": "sqli-login-bypass",
            "payload": "' OR '1'='1' --",
            "evidence": "Login bypassed with welcome admin banner visible.",
            "team_id": team["id"],
        },
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["passed"] is True

    leaderboard_response = client.get("/api/leaderboard")
    assert leaderboard_response.status_code == 200
    leaderboard = leaderboard_response.json()
    assert len(leaderboard) >= 1
    assert leaderboard[0]["user_id"] == "student-a"

    team_leaderboard_response = client.get("/api/leaderboard/teams")
    assert team_leaderboard_response.status_code == 200
    team_leaderboard = team_leaderboard_response.json()
    assert len(team_leaderboard) >= 1
    assert team_leaderboard[0]["team_name"] == "RedOps"

    progress_response = client.get("/api/progress/me", headers=headers)
    assert progress_response.status_code == 200
    progress = progress_response.json()
    assert progress["attempts"] == 1
    assert progress["successful_attempts"] == 1


def test_admin_users_access_control(client: TestClient):
    student_token, _ = _register(client, username="student-b")
    forbidden = client.get("/api/admin/users", headers={"Authorization": f"Bearer {student_token}"})
    assert forbidden.status_code == 403

    admin_login = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin12345"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    admin_response = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_response.status_code == 200
    usernames = [user["username"] for user in admin_response.json()]
    assert "admin" in usernames
