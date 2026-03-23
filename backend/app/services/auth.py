import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass
class Session:
    token: str
    user_id: int
    expires_at: datetime


class SessionStore:
    def __init__(self, ttl_hours: int = 24) -> None:
        self.ttl = timedelta(hours=ttl_hours)
        self._sessions: dict[str, Session] = {}

    def create(self, user_id: int) -> Session:
        token = secrets.token_urlsafe(32)
        session = Session(
            token=token,
            user_id=user_id,
            expires_at=datetime.now(timezone.utc) + self.ttl,
        )
        self._sessions[token] = session
        self._cleanup()
        return session

    def get_user_id(self, token: str) -> int | None:
        self._cleanup()
        session = self._sessions.get(token)
        if session is None:
            return None
        if session.expires_at < datetime.now(timezone.utc):
            self._sessions.pop(token, None)
            return None
        return session.user_id

    def revoke(self, token: str) -> None:
        self._sessions.pop(token, None)

    def _cleanup(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [token for token, session in self._sessions.items() if session.expires_at < now]
        for token in expired:
            self._sessions.pop(token, None)
