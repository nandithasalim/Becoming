"""Database engine and session."""
from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import get_settings

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = get_settings().database_url
        kwargs = {"connect_args": {"check_same_thread": False}} if url.startswith("sqlite") else {"pool_pre_ping": True}
        _engine = create_engine(url, **kwargs)
    return _engine


def init_db() -> None:
    # Phase 1 creates tables directly. Once the schema settles, switch to Alembic migrations.
    from . import models  # noqa: F401  (registers the tables)

    SQLModel.metadata.create_all(get_engine())


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
