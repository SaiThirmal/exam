from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .database import Database
from .models import AttemptRequest, AttemptResponse, ScenarioDetail, ScenarioSummary
from .scenarios import get_scenario, list_scenarios
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

    @app.post("/api/attempts", response_model=AttemptResponse)
    def submit_attempt(request: AttemptRequest) -> AttemptResponse:
        scenario = get_scenario(request.scenario_id)
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found")

        score, passed, feedback = evaluate_attempt(
            scenario_id=request.scenario_id,
            payload=request.payload,
            evidence=request.evidence,
        )

        submitted_at = datetime.now(timezone.utc)
        app.state.db.record_attempt(
            user_id=request.user_id,
            scenario_id=request.scenario_id,
            payload=request.payload,
            evidence=request.evidence,
            score=score,
            passed=passed,
            submitted_at=submitted_at,
        )

        return AttemptResponse(
            user_id=request.user_id,
            scenario_id=request.scenario_id,
            score=score,
            passed=passed,
            feedback=feedback,
            submitted_at=submitted_at,
        )

    @app.get("/api/leaderboard")
    def leaderboard(limit: int = Query(default=10, ge=1, le=100)):
        return app.state.db.get_leaderboard(limit=limit)

    frontend_dir = Path(__file__).resolve().parents[2] / "frontend"
    if frontend_dir.exists():
        app.mount("/app", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:
        return RedirectResponse(url="/app")

    return app


app = create_app()
