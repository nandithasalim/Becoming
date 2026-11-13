"""App settings, read from environment variables (or a .env file)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres in production (e.g. Supabase): postgresql+psycopg://user:pass@host:5432/db
    # SQLite is used for local development when nothing is set.
    database_url: str = "sqlite:///./future_self.db"

    # Secret used to sign our own session tokens (JWT). Must be long and random in production.
    jwt_secret: str = "dev-only-change-me-dev-only-change-me"
    jwt_days: int = 30

    # OAuth client ID from Google Cloud Console (Credentials -> OAuth client ID -> Web application).
    google_client_id: str = ""

    # Lets you log in with just an email while developing. Never enable in production.
    dev_login: bool = False

    # Comma-separated list of front-end origins allowed to call the API.
    cors_origins: str = "http://localhost:8000,http://127.0.0.1:8000"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
