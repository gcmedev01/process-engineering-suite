"""Domain service for instrument_links CRUD.

Called from DatabaseService (thin delegation) and directly from the router when
bypassing the DAL pattern is needed. The functions accept a SQLAlchemy
AsyncSession so they can participate in the caller's transaction.
"""
from __future__ import annotations

import logging
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.engineering_object import EngineeringObject
from ..models.instrument_link import InstrumentLink, RELATIONSHIP_TYPES

logger = logging.getLogger(__name__)


def _serialize(link: InstrumentLink) -> dict[str, Any]:
    return {
        "id": str(link.id),
        "instrumentId": str(link.instrument_id),
        "targetId": str(link.target_id),
        "relationshipType": link.relationship_type,
        "protectiveSystemId": link.protective_system_id,
        "notes": link.notes,
        "createdAt": link.created_at.isoformat() if link.created_at else None,
        "updatedAt": link.updated_at.isoformat() if link.updated_at else None,
    }


async def _assert_live_instrument(session: AsyncSession, object_id: str) -> None:
    """Raise ValueError if object_id is not a live INSTRUMENT engineering object."""
    result = await session.execute(
        select(EngineeringObject).where(
            EngineeringObject.uuid == object_id,
            EngineeringObject.deleted_at.is_(None),
        )
    )
    obj = result.scalar_one_or_none()
    if obj is None:
        raise ValueError(f"Engineering object '{object_id}' not found")
    if (obj.object_type or "").strip().upper() != "INSTRUMENT":
        raise TypeError(
            f"instrument_id must reference an INSTRUMENT object; got '{obj.object_type}'"
        )


async def list_instrument_links(
    session: AsyncSession,
    *,
    instrument_id: Optional[str] = None,
    target_id: Optional[str] = None,
    relationship_type: Optional[str] = None,
    protective_system_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    stmt = select(InstrumentLink)
    if instrument_id:
        stmt = stmt.where(InstrumentLink.instrument_id == instrument_id)
    if target_id:
        stmt = stmt.where(InstrumentLink.target_id == target_id)
    if relationship_type:
        stmt = stmt.where(InstrumentLink.relationship_type == relationship_type)
    if protective_system_id:
        stmt = stmt.where(InstrumentLink.protective_system_id == protective_system_id)
    stmt = stmt.order_by(InstrumentLink.created_at.desc())
    result = await session.execute(stmt)
    return [_serialize(link) for link in result.scalars().all()]


async def get_instrument_link(
    session: AsyncSession, link_id: str
) -> Optional[dict[str, Any]]:
    result = await session.execute(
        select(InstrumentLink).where(InstrumentLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    return _serialize(link) if link is not None else None


async def create_instrument_link(
    session: AsyncSession, data: dict[str, Any]
) -> dict[str, Any]:
    """Create an instrument link.

    Raises:
        ValueError: instrument_id not found or target_id not found.
        TypeError: instrument_id does not point to an INSTRUMENT object.
        IntegrityError: duplicate (instrument_id, target_id, relationship_type).
    """
    await _assert_live_instrument(session, data["instrumentId"])
    # Verify target exists (any live object is fine as target).
    target_result = await session.execute(
        select(EngineeringObject).where(
            EngineeringObject.uuid == data["targetId"],
            EngineeringObject.deleted_at.is_(None),
        )
    )
    if target_result.scalar_one_or_none() is None:
        raise ValueError(f"Target engineering object '{data['targetId']}' not found")

    link = InstrumentLink(
        id=str(uuid4()),
        instrument_id=data["instrumentId"],
        target_id=data["targetId"],
        relationship_type=data["relationshipType"],
        protective_system_id=data.get("protectiveSystemId"),
        notes=data.get("notes"),
    )
    session.add(link)
    await session.commit()
    await session.refresh(link)
    return _serialize(link)


async def update_instrument_link(
    session: AsyncSession, link_id: str, data: dict[str, Any]
) -> Optional[dict[str, Any]]:
    """Partial update of notes, relationship_type, or protective_system_id."""
    result = await session.execute(
        select(InstrumentLink).where(InstrumentLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    if link is None:
        return None
    if "relationshipType" in data:
        link.relationship_type = data["relationshipType"]
    if "protectiveSystemId" in data:
        link.protective_system_id = data["protectiveSystemId"]
    if "notes" in data:
        link.notes = data["notes"]
    await session.commit()
    await session.refresh(link)
    return _serialize(link)


async def delete_instrument_link(session: AsyncSession, link_id: str) -> bool:
    result = await session.execute(
        select(InstrumentLink).where(InstrumentLink.id == link_id)
    )
    link = result.scalar_one_or_none()
    if link is None:
        return False
    await session.delete(link)
    await session.commit()
    return True
