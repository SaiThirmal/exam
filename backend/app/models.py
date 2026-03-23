from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ScenarioSummary(BaseModel):
    id: str
    title: str
    difficulty: str
    tags: List[str]


class ScenarioDetail(ScenarioSummary):
    description: str
    objective: str
    hints: List[str]
    safe_payload_examples: List[str]


class AttemptRequest(BaseModel):
    user_id: str = Field(default="guest", min_length=2, max_length=40)
    scenario_id: str
    payload: str = Field(min_length=1, max_length=1000)
    evidence: str = Field(default="", max_length=2000)


class AttemptResponse(BaseModel):
    user_id: str
    scenario_id: str
    score: int
    passed: bool
    feedback: List[str]
    submitted_at: datetime


class LeaderboardEntry(BaseModel):
    user_id: str
    total_score: int
    successful_attempts: int
    total_attempts: int
    last_attempt_at: datetime
