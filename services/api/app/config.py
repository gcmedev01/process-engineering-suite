"""Application configuration from environment variables."""
import os
from functools import lru_cache
from typing import Optional


class Settings:
    """Application settings loaded from environment."""

    def __init__(self) -> None:
        self.DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
        self.USE_MOCK_DATA: bool = os.getenv("USE_MOCK_DATA", "false").lower() == "true"
        self.API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
        self.API_PORT: int = int(os.getenv("API_PORT", "8000"))
        self.SECRET_KEY: str = os.getenv(
            "SECRET_KEY",
            "dev-secret-key-change-in-production",
        )
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
        )
        # Strict per-type validation of engineering_objects.properties for
        # legacy object types (INSTRUMENT is always strict). Default lenient:
        # frontends still send loose payloads; flip once they're clean.
        self.EO_STRICT_PROPERTY_VALIDATION: bool = (
            os.getenv("EO_STRICT_PROPERTY_VALIDATION", "false").lower() == "true"
        )
        self.ALLOWED_ORIGINS: list[str] = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:3003",
            "http://localhost:3004",
            "http://localhost:3005",
            "http://localhost:3006",
            "http://localhost:3007",
            "http://localhost:3008",
            "http://localhost:3009",
        ]

    @property
    def is_db_configured(self) -> bool:
        """Check if database is configured."""
        return self.DATABASE_URL is not None and not self.USE_MOCK_DATA


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
