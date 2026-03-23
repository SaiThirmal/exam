from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .database import Database
from .models import (
    AttemptRequest,
    AttemptResponse,
    AuthResponse,
    ScenarioDetail,
    ScenarioSummary,
    TeamCreateRequest,
    TeamJoinRequest,
    UserLoginRequest,
    UserPublic,
    UserRegistrationRequest,
)
from .scenarios import get_scenario, list_scenarios
from .services.auth import SessionStore
from .services.scoring import evaluate_attempt


def create_app(db_path: str = "backend/cyberrange.db") -> FastAPI:
    app = FastAPI(
        title="CyberRange Lite",
        description="Educational cybersecurity simulator with scoring and leaderboard.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.db = Database(db_path=db_path)
    app.state.sessions = SessionStore(ttl_hours=24)

    def _extract_token(authorization: Annotated[str | None, Header()] = None) -> str:
        if authorization is None or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer token",
            )
        return authorization.replace("Bearer ", "", 1).strip()

    def _require_user(token: str = Depends(_extract_token)) -> UserPublic:
        user_id = app.state.sessions.get_user_id(token)
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        user = app.state.db.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User no longer exists",
            )
        return user

    def _require_admin(user: UserPublic = Depends(_require_user)) -> UserPublic:
        if user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return user

    @app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
    def register(request: UserRegistrationRequest) -> AuthResponse:
        try:
            user = app.state.db.create_user(
                username=request.username,
                password=request.password,
                role=request.role,
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

        session = app.state.sessions.create(user.id)
        return AuthResponse(access_token=session.token, user=user)

    @app.post("/api/auth/login", response_model=AuthResponse)
    def login(request: UserLoginRequest) -> AuthResponse:
        user = app.state.db.authenticate_user(
            username=request.username,
            password=request.password,
        )
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        session = app.state.sessions.create(user.id)
        return AuthResponse(access_token=session.token, user=user)

    @app.post("/api/auth/logout", status_code=204)
    def logout(token: str = Depends(_extract_token)) -> None:
        app.state.sessions.revoke(token)
        return None

    @app.get("/api/auth/me", response_model=UserPublic)
    def auth_me(user: UserPublic = Depends(_require_user)) -> UserPublic:
        return user

    @app.get("/api/admin/users", response_model=list[UserPublic])
    def admin_list_users(_: UserPublic = Depends(_require_admin)) -> list[UserPublic]:
        return app.state.db.list_users()

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "service": "cyberrange-lite"}

    @app.get("/api/scenarios", response_model=list[ScenarioSummary])
    def get_scenarios() -> list[ScenarioSummary]:
        return list_scenarios()

    @app.get("/api/scenarios/{scenario_id}", response_model=ScenarioDetail)
    def get_scenario_detail(scenario_id: str) -> ScenarioDetail:
        scenario = get_scenario(scenario_id)
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found")
        return scenario

    @app.post("/api/teams", status_code=201)
    def create_team(request: TeamCreateRequest, user: UserPublic = Depends(_require_user)):
        try:
            return app.state.db.create_team(owner_user_id=user.id, name=request.name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/teams/join")
    def join_team(request: TeamJoinRequest, user: UserPublic = Depends(_require_user)):
        try:
            return app.state.db.join_team(user_id=user.id, invite_code=request.invite_code)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/teams/mine")
    def my_teams(user: UserPublic = Depends(_require_user)):
        return app.state.db.get_user_teams(user_id=user.id)

    @app.post("/api/attempts", response_model=AttemptResponse)
    def submit_attempt(request: AttemptRequest, user: UserPublic = Depends(_require_user)) -> AttemptResponse:
        scenario = get_scenario(request.scenario_id)
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found")
        if request.team_id is not None and not app.state.db.user_in_team(user.id, request.team_id):
            raise HTTPException(status_code=403, detail="You are not a member of this team")

        score, passed, feedback = evaluate_attempt(
            scenario_id=request.scenario_id,
            payload=request.payload,
            evidence=request.evidence,
        )

        submitted_at = datetime.now(timezone.utc)
        app.state.db.record_attempt(
            user_id=user.id,
            scenario_id=request.scenario_id,
            payload=request.payload,
            evidence=request.evidence,
            score=score,
            passed=passed,
            submitted_at=submitted_at,
            team_id=request.team_id,
        )

        return AttemptResponse(
            user_id=user.username,
            scenario_id=request.scenario_id,
            team_id=request.team_id,
            score=score,
            passed=passed,
            feedback=feedback,
            submitted_at=submitted_at,
        )

    @app.get("/api/leaderboard")
    def leaderboard(limit: int = Query(default=10, ge=1, le=100)):
        return app.state.db.get_leaderboard(limit=limit)

    @app.get("/api/leaderboard/teams")
    def team_leaderboard(limit: int = Query(default=10, ge=1, le=100)):
        return app.state.db.get_team_leaderboard(limit=limit)

    @app.get("/api/progress/me")
    def my_progress(user: UserPublic = Depends(_require_user)):
        return app.state.db.get_user_progress(user_id=user.id)

    frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
    if frontend_dir.exists():
        app.mount("/app", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:
        return RedirectResponse(url="/app")

    return app


app = create_app()
