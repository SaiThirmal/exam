import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
import hashlib
import secrets

from .models import LeaderboardEntry, TeamLeaderboardEntry, TeamSummary, UserPublic


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
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS teams (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    invite_code TEXT NOT NULL UNIQUE,
                    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS team_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    joined_at TEXT NOT NULL,
                    UNIQUE(team_id, user_id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
                    scenario_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    evidence TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    passed INTEGER NOT NULL,
                    submitted_at TEXT NOT NULL
                )
                """
            )
            columns = [row["name"] for row in conn.execute("PRAGMA table_info(attempts)").fetchall()]
            if "team_id" not in columns:
                conn.execute("ALTER TABLE attempts ADD COLUMN team_id INTEGER")
            conn.commit()
            self._seed_default_accounts(conn)
            conn.commit()

    def _seed_default_accounts(self, conn: sqlite3.Connection) -> None:
        now = datetime.now(timezone.utc).isoformat()
        for username, password, role in [
            ("admin", "admin12345", "admin"),
            ("instructor", "instructor123", "instructor"),
        ]:
            existing = conn.execute(
                "SELECT id FROM users WHERE username = ?",
                (username,),
            ).fetchone()
            if existing is None:
                conn.execute(
                    """
                    INSERT INTO users (username, password_hash, role, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (username, self._hash_password(password), role, now),
                )

    @staticmethod
    def _hash_password(password: str) -> str:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()

    def create_user(self, username: str, password: str, role: str) -> UserPublic:
        created_at = datetime.now(timezone.utc)
        with self._connect() as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            try:
                cursor = conn.execute(
                    """
                    INSERT INTO users (username, password_hash, role, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (username, self._hash_password(password), role, created_at.isoformat()),
                )
            except sqlite3.IntegrityError as exc:
                raise ValueError("Username already exists") from exc
            conn.commit()
            user_id = cursor.lastrowid
        return UserPublic(id=user_id, username=username, role=role, created_at=created_at)

    def authenticate_user(self, username: str, password: str) -> Optional[UserPublic]:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, username, role, created_at, password_hash
                FROM users
                WHERE username = ?
                """,
                (username,),
            ).fetchone()
        if row is None:
            return None
        if row["password_hash"] != self._hash_password(password):
            return None
        return UserPublic(
            id=row["id"],
            username=row["username"],
            role=row["role"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def get_user_by_id(self, user_id: int) -> Optional[UserPublic]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT id, username, role, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return UserPublic(
            id=row["id"],
            username=row["username"],
            role=row["role"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def list_users(self) -> List[UserPublic]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, username, role, created_at FROM users ORDER BY created_at ASC"
            ).fetchall()
        return [
            UserPublic(
                id=row["id"],
                username=row["username"],
                role=row["role"],
                created_at=datetime.fromisoformat(row["created_at"]),
            )
            for row in rows
        ]

    def create_team(self, owner_user_id: int, name: str) -> TeamSummary:
        created_at = datetime.now(timezone.utc).isoformat()
        invite_code = secrets.token_hex(4)
        with self._connect() as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            owner = conn.execute("SELECT username FROM users WHERE id = ?", (owner_user_id,)).fetchone()
            if owner is None:
                raise ValueError("Owner user not found")
            try:
                cursor = conn.execute(
                    """
                    INSERT INTO teams (name, invite_code, owner_user_id, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (name, invite_code, owner_user_id, created_at),
                )
            except sqlite3.IntegrityError as exc:
                raise ValueError("Team name already exists") from exc
            team_id = cursor.lastrowid
            conn.execute(
                "INSERT INTO team_members (team_id, user_id, joined_at) VALUES (?, ?, ?)",
                (team_id, owner_user_id, created_at),
            )
            conn.commit()
        return TeamSummary(
            id=team_id,
            name=name,
            invite_code=invite_code,
            owner_username=owner["username"],
            member_count=1,
        )

    def join_team(self, user_id: int, invite_code: str) -> TeamSummary:
        joined_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            team = conn.execute(
                """
                SELECT t.id, t.name, t.invite_code, u.username AS owner_username
                FROM teams t
                JOIN users u ON t.owner_user_id = u.id
                WHERE t.invite_code = ?
                """,
                (invite_code,),
            ).fetchone()
            if team is None:
                raise ValueError("Invalid invite code")
            try:
                conn.execute(
                    "INSERT INTO team_members (team_id, user_id, joined_at) VALUES (?, ?, ?)",
                    (team["id"], user_id, joined_at),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                pass
            member_count = conn.execute(
                "SELECT COUNT(*) AS total FROM team_members WHERE team_id = ?",
                (team["id"],),
            ).fetchone()["total"]
        return TeamSummary(
            id=team["id"],
            name=team["name"],
            invite_code=team["invite_code"],
            owner_username=team["owner_username"],
            member_count=member_count,
        )

    def get_user_teams(self, user_id: int) -> List[TeamSummary]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    t.id,
                    t.name,
                    t.invite_code,
                    owner.username AS owner_username,
                    COUNT(tm2.user_id) AS member_count
                FROM team_members tm
                JOIN teams t ON t.id = tm.team_id
                JOIN users owner ON owner.id = t.owner_user_id
                JOIN team_members tm2 ON tm2.team_id = t.id
                WHERE tm.user_id = ?
                GROUP BY t.id, t.name, t.invite_code, owner.username
                ORDER BY t.created_at ASC
                """,
                (user_id,),
            ).fetchall()
        return [
            TeamSummary(
                id=row["id"],
                name=row["name"],
                invite_code=row["invite_code"],
                owner_username=row["owner_username"],
                member_count=row["member_count"],
            )
            for row in rows
        ]

    def user_in_team(self, user_id: int, team_id: int) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM team_members WHERE user_id = ? AND team_id = ?",
                (user_id, team_id),
            ).fetchone()
        return row is not None

    def record_attempt(
        self,
        *,
        user_id: int,
        scenario_id: str,
        payload: str,
        evidence: str,
        score: int,
        passed: bool,
        submitted_at: datetime,
        team_id: int | None = None,
    ) -> None:
        with self._connect() as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute(
                """
                INSERT INTO attempts (
                    user_id, team_id, scenario_id, payload, evidence, score, passed, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    team_id,
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
                    u.username AS user_id,
                    SUM(score) AS total_score,
                    SUM(passed) AS successful_attempts,
                    COUNT(*) AS total_attempts,
                    MAX(submitted_at) AS last_attempt_at
                FROM attempts
                JOIN users u ON attempts.user_id = u.id
                GROUP BY u.username
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

    def get_team_leaderboard(self, limit: int) -> List[TeamLeaderboardEntry]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    t.id AS team_id,
                    t.name AS team_name,
                    SUM(a.score) AS total_score,
                    SUM(a.passed) AS successful_attempts,
                    COUNT(*) AS total_attempts,
                    MAX(a.submitted_at) AS last_attempt_at
                FROM attempts a
                JOIN teams t ON t.id = a.team_id
                WHERE a.team_id IS NOT NULL
                GROUP BY t.id, t.name
                ORDER BY total_score DESC, successful_attempts DESC, last_attempt_at ASC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        entries: List[TeamLeaderboardEntry] = []
        for row in rows:
            entries.append(
                TeamLeaderboardEntry(
                    team_id=row["team_id"],
                    team_name=row["team_name"],
                    total_score=row["total_score"],
                    successful_attempts=row["successful_attempts"],
                    total_attempts=row["total_attempts"],
                    last_attempt_at=datetime.fromisoformat(row["last_attempt_at"]),
                )
            )
        return entries

    def get_user_progress(self, user_id: int) -> dict:
        with self._connect() as conn:
            totals = conn.execute(
                """
                SELECT
                    COUNT(*) AS attempts,
                    COALESCE(SUM(passed), 0) AS successful_attempts,
                    COALESCE(SUM(score), 0) AS total_score,
                    COALESCE(AVG(score), 0) AS average_score,
                    MAX(submitted_at) AS last_attempt_at
                FROM attempts
                WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()
            scenario_rows = conn.execute(
                """
                SELECT
                    scenario_id,
                    MAX(score) AS best_score,
                    COUNT(*) AS attempts
                FROM attempts
                WHERE user_id = ?
                GROUP BY scenario_id
                ORDER BY scenario_id ASC
                """,
                (user_id,),
            ).fetchall()

        per_scenario = [
            {"scenario_id": row["scenario_id"], "best_score": row["best_score"], "attempts": row["attempts"]}
            for row in scenario_rows
        ]
        return {
            "attempts": totals["attempts"],
            "successful_attempts": totals["successful_attempts"],
            "total_score": totals["total_score"],
            "average_score": float(round(totals["average_score"], 2)),
            "last_attempt_at": totals["last_attempt_at"],
            "per_scenario": per_scenario,
        }
