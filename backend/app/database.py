import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List

from .models import LeaderboardEntry


class Database:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _initialize(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    scenario_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    evidence TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    passed INTEGER NOT NULL,
                    submitted_at TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def record_attempt(
        self,
        *,
        user_id: str,
        scenario_id: str,
        payload: str,
        evidence: str,
        score: int,
        passed: bool,
        submitted_at: datetime,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO attempts (
                    user_id, scenario_id, payload, evidence, score, passed, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    scenario_id,
                    payload,
                    evidence,
                    score,
                    int(passed),
                    submitted_at.isoformat(),
                ),
            )
            conn.commit()

    def get_leaderboard(self, limit: int) -> List[LeaderboardEntry]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    user_id,
                    SUM(score) AS total_score,
                    SUM(passed) AS successful_attempts,
                    COUNT(*) AS total_attempts,
                    MAX(submitted_at) AS last_attempt_at
                FROM attempts
                GROUP BY user_id
                ORDER BY total_score DESC, successful_attempts DESC, last_attempt_at ASC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        entries: List[LeaderboardEntry] = []
        for row in rows:
            entries.append(
                LeaderboardEntry(
                    user_id=row["user_id"],
                    total_score=row["total_score"],
                    successful_attempts=row["successful_attempts"],
                    total_attempts=row["total_attempts"],
                    last_attempt_at=datetime.fromisoformat(row["last_attempt_at"]),
                )
            )
        return entries
