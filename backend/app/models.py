from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field


Role = Literal["student", "instructor", "admin"]


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
    scenario_id: str
    payload: str = Field(min_length=1, max_length=1000)
    evidence: str = Field(default="", max_length=2000)
    team_id: int | None = None


class AttemptResponse(BaseModel):
    user_id: str
    scenario_id: str
    team_id: int | None
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


class TeamLeaderboardEntry(BaseModel):
    team_id: int
    team_name: str
    total_score: int
    successful_attempts: int
    total_attempts: int
    last_attempt_at: datetime


class UserRegistrationRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_\-]+$")
    password: str = Field(min_length=8, max_length=100)
    role: Role = "student"


class UserLoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=8, max_length=100)


class UserPublic(BaseModel):
    id: int
    username: str
    role: Role
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class TeamCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=60)


class TeamJoinRequest(BaseModel):
    invite_code: str = Field(min_length=6, max_length=32)


class TeamSummary(BaseModel):
    id: int
    name: str
    invite_code: str
    owner_username: str
    member_count: int


class TeamMembership(BaseModel):
    team: TeamSummary
    joined_at: datetime
