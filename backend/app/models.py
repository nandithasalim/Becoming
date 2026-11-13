"""Database tables."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str = ""
    google_sub: str | None = Field(default=None, index=True, unique=True)  # Google's stable user id
    created_at: datetime = Field(default_factory=now)
    last_login_at: datetime = Field(default_factory=now)


class FutureSelf(SQLModel, table=True):
    """Everything a user told us about themselves and who they want to become (one per user).

    Single answers are plain text columns. Multi-pick answers are JSON lists.
    Any answer can be a preset (see questions.py) or the user's own typed text.
    Phase 2 adds the AI-generated story, traits and chapter roadmap.
    """

    __tablename__ = "future_selves"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True)

    # Screen 1 · You, now (required)
    display_name: str
    current_feeling: str = Field(index=True)   # "lost" | "stuck" | "okay" | "hopeful" | typed
    situation: str = Field(index=True)         # "student" | "working" | "job_hunting" | "at_home" | typed

    # Screen 2 · Future you (required)
    role: str
    place: str
    feel: str

    # Screen 3 · Who they are (required)
    traits: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))   # exactly 3
    let_go: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))   # 1 to 5
    voice: str                                  # "gentle" | "coach" | "wise"

    # Screen 4 · The dream (optional)
    loved_as_kid: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    would_try: str = ""
    focus_areas: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))  # up to 3
    dream_done_at: datetime | None = None       # None = skipped, so we can gently ask again later

    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)
