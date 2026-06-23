"""Seed the database from mock_data.json."""
import asyncio
import json
import os
from pathlib import Path

from sqlalchemy import select
from sqlalchemy import update

from services.api.app.database import get_db_context
from services.api.app.models.credential import Credential
from services.api.app.models.user import User
from services.api.app.services import DatabaseService


async def _sync_mock_credentials(session, data: dict) -> None:
    for item in data.get("credentials", []):
        username = item.get("username")
        password_hash = item.get("passwordHash")
        if not username or not password_hash:
            continue

        await session.execute(
            update(Credential)
            .where(Credential.username == username)
            .values(password_hash=password_hash)
        )
    await session.commit()


async def seed_from_mock() -> None:
    if os.getenv("SEED_FROM_MOCK", "false").lower() != "true":
        return

    mock_path = Path(__file__).parent.parent / "mock_data.json"
    if not mock_path.exists():
        return

    data = json.loads(mock_path.read_text())
    async with get_db_context() as session:
        try:
            existing = await session.execute(select(User.id).limit(1))
            if existing.first() is not None:
                await _sync_mock_credentials(session, data)
                return
        except Exception:
            return
        dal = DatabaseService(session)
        await dal.seed_data(data)


def main() -> None:
    asyncio.run(seed_from_mock())


if __name__ == "__main__":
    main()
