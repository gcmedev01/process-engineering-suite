from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from ..config import get_settings
from ..services.object_properties import is_strict_type, validate_properties

router = APIRouter(prefix="/engineering-objects", tags=["engineering-objects"])


def _validate_properties_or_422(object_type: str, properties: Dict[str, Any]) -> None:
    """Strict types (INSTRUMENT, or all types when EO_STRICT_PROPERTY_VALIDATION
    is on) get a 422 on invalid payloads; others log warnings and proceed."""
    settings_strict = get_settings().EO_STRICT_PROPERTY_VALIDATION
    strict = is_strict_type(object_type, settings_strict)
    problems = validate_properties(object_type, properties, strict=strict)
    if problems and strict:
        raise HTTPException(
            status_code=422,
            detail={"message": "Invalid properties payload", "problems": problems},
        )


class EngineeringObjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: Optional[str] = None
    tag: str
    object_type: str
    properties: Dict[str, Any]
    area_id: Optional[str] = None
    owner_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    location_ref: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class EngineeringObjectUpsert(BaseModel):
    object_type: str
    properties: Dict[str, Any]
    area_id: Optional[str] = None
    owner_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    location_ref: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


class EngineeringObjectUpdate(BaseModel):
    tag: Optional[str] = None
    object_type: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    area_id: Optional[str] = None
    owner_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    location_ref: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


_fallback_store: Dict[str, Dict[str, Any]] = {}


def _is_active(properties: Dict[str, Any]) -> bool:
    if not isinstance(properties, dict):
        return True
    meta = properties.get("meta")
    if not isinstance(meta, dict):
        return True
    return meta.get("isActive", True) is not False


def _response_is_active(item: EngineeringObjectResponse) -> bool:
    return (item.is_active is not False) and _is_active(item.properties)


def _to_response(obj: Any) -> EngineeringObjectResponse:
    return EngineeringObjectResponse(
        id=str(getattr(obj, "uuid", "")) or None,
        tag=obj.tag,
        object_type=obj.object_type,
        properties=obj.properties or {},
        area_id=getattr(obj, "area_id", None),
        owner_id=getattr(obj, "owner_id", None),
        name=getattr(obj, "name", None),
        description=getattr(obj, "description", None),
        location_ref=getattr(obj, "location_ref", None),
        is_active=getattr(obj, "is_active", None),
        status=obj.status,
        created_at=getattr(obj, "created_at", None),
        updated_at=getattr(obj, "updated_at", None),
    )


def _matches_query(item: EngineeringObjectResponse, query: str) -> bool:
    if not query:
        return True

    props = item.properties if isinstance(item.properties, dict) else {}
    meta = props.get("meta") if isinstance(props.get("meta"), dict) else {}
    inputs = props.get("inputs") if isinstance(props.get("inputs"), dict) else {}

    values = [
        item.tag,
        item.object_type,
        str(meta.get("name", "")),
        str(meta.get("description", "")),
        str(inputs.get("tag", "")),
        str(inputs.get("description", "")),
    ]

    haystack = " ".join(values).upper()
    return query in haystack


@router.get("", response_model=List[EngineeringObjectResponse])
async def list_engineering_objects(
    object_type: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=False),
    q: Optional[str] = Query(default=None),
) -> List[EngineeringObjectResponse]:
    query = q.strip().upper() if isinstance(q, str) and q.strip() else ""

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                stmt = select(EngineeringObject)
                if object_type:
                    stmt = stmt.where(EngineeringObject.object_type == object_type)
                stmt = stmt.order_by(EngineeringObject.updated_at.desc())
                result = await db.execute(stmt)
                objects = result.scalars().all()
                payload = [_to_response(obj) for obj in objects]
                if not include_inactive:
                    payload = [item for item in payload if _response_is_active(item)]
                if query:
                    payload = [item for item in payload if _matches_query(item, query)]
                return payload
    except ImportError:
        pass

    items = list(_fallback_store.values())
    payload = [EngineeringObjectResponse(**item) for item in items]
    if object_type:
        payload = [item for item in payload if item.object_type == object_type]
    if not include_inactive:
        payload = [item for item in payload if _response_is_active(item)]
    if query:
        payload = [item for item in payload if _matches_query(item, query)]
    return payload


@router.get("/by-id/{object_id}", response_model=EngineeringObjectResponse)
async def get_engineering_object_by_id(object_id: str) -> EngineeringObjectResponse:
    try:
        object_uuid = UUID(object_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid engineering object id") from exc

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                result = await db.execute(
                    select(EngineeringObject).where(EngineeringObject.uuid == object_uuid)
                )
                obj = result.scalar_one_or_none()
                if obj is None:
                    raise HTTPException(
                        status_code=404, detail=f"Engineering object '{object_id}' not found"
                    )
                return _to_response(obj)
    except ImportError:
        pass

    for item in _fallback_store.values():
        if item.get("id") == object_id:
            return EngineeringObjectResponse(**item)

    raise HTTPException(status_code=404, detail=f"Engineering object '{object_id}' not found")


@router.put("/by-id/{object_id}", response_model=EngineeringObjectResponse)
async def update_engineering_object_by_id(
    object_id: str,
    payload: EngineeringObjectUpdate,
) -> EngineeringObjectResponse:
    try:
        object_uuid = UUID(object_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid engineering object id") from exc

    if payload.object_type is not None and payload.properties is not None:
        _validate_properties_or_422(payload.object_type, payload.properties)

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                result = await db.execute(
                    select(EngineeringObject).where(EngineeringObject.uuid == object_uuid)
                )
                obj = result.scalar_one_or_none()
                if obj is None:
                    raise HTTPException(
                        status_code=404, detail=f"Engineering object '{object_id}' not found"
                    )

                if payload.tag is not None:
                    obj.tag = payload.tag.upper()
                if payload.object_type is not None:
                    obj.object_type = payload.object_type
                if payload.properties is not None:
                    obj.properties = payload.properties
                if payload.area_id is not None:
                    obj.area_id = payload.area_id
                if payload.owner_id is not None:
                    obj.owner_id = payload.owner_id
                if payload.name is not None:
                    obj.name = payload.name
                if payload.description is not None:
                    obj.description = payload.description
                if payload.location_ref is not None:
                    obj.location_ref = payload.location_ref
                if payload.is_active is not None:
                    obj.is_active = payload.is_active
                if payload.status is not None:
                    obj.status = payload.status

                await db.commit()
                await db.refresh(obj)
                return _to_response(obj)
    except ImportError:
        pass

    target = None
    for key, item in _fallback_store.items():
        if item.get("id") == object_id:
            target = key
            break

    if target is None:
        raise HTTPException(status_code=404, detail=f"Engineering object '{object_id}' not found")

    current = _fallback_store[target]
    updated_tag = payload.tag.upper() if payload.tag is not None else current["tag"]
    updated = {
        **current,
        "tag": updated_tag,
        "object_type": payload.object_type or current["object_type"],
        "properties": payload.properties if payload.properties is not None else current["properties"],
        "area_id": payload.area_id if payload.area_id is not None else current["area_id"],
        "owner_id": payload.owner_id if payload.owner_id is not None else current["owner_id"],
        "name": payload.name if payload.name is not None else current["name"],
        "description": payload.description if payload.description is not None else current["description"],
        "location_ref": (
            payload.location_ref if payload.location_ref is not None else current["location_ref"]
        ),
        "is_active": payload.is_active if payload.is_active is not None else current["is_active"],
        "status": payload.status if payload.status is not None else current["status"],
    }
    del _fallback_store[target]
    _fallback_store[_fallback_key(updated.get("area_id"), updated_tag)] = updated
    return EngineeringObjectResponse(**updated)


def _fallback_key(area_id: Optional[str], tag: str) -> str:
    return f"{area_id or ''}::{tag}"


def _ambiguous_tag_error(tag: str, areas: List[Optional[str]]) -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "message": f"Ambiguous tag '{tag}': exists in multiple areas. "
            "Pass areaId to disambiguate.",
            "areas": areas,
        },
    )


@router.get("/{tag}", response_model=EngineeringObjectResponse)
async def get_engineering_object(
    tag: str,
    areaId: Optional[str] = Query(default=None),
) -> EngineeringObjectResponse:
    tag_upper = tag.upper()

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                # Live rows only: with per-area scoping a soft-deleted row must
                # never shadow a live duplicate of the same tag.
                stmt = select(EngineeringObject).where(
                    EngineeringObject.tag == tag_upper,
                    EngineeringObject.deleted_at.is_(None),
                )
                if areaId:
                    stmt = stmt.where(EngineeringObject.area_id == areaId)
                objects = (await db.execute(stmt)).scalars().all()
                if not objects:
                    raise HTTPException(status_code=404, detail=f"Engineering object '{tag}' not found")
                if len(objects) > 1:
                    raise _ambiguous_tag_error(tag, [o.area_id for o in objects])
                return _to_response(objects[0])
    except ImportError:
        pass

    matches = [
        item for item in _fallback_store.values()
        if item.get("tag") == tag_upper
        and (not areaId or item.get("area_id") == areaId)
    ]
    if not matches:
        raise HTTPException(status_code=404, detail=f"Engineering object '{tag}' not found")
    if len(matches) > 1:
        raise _ambiguous_tag_error(tag, [m.get("area_id") for m in matches])
    return EngineeringObjectResponse(**matches[0])


@router.put("/{tag}", response_model=EngineeringObjectResponse)
async def upsert_engineering_object(
    tag: str,
    payload: EngineeringObjectUpsert,
    areaId: Optional[str] = Query(default=None),
) -> EngineeringObjectResponse:
    tag_upper = tag.upper()
    _validate_properties_or_422(payload.object_type, payload.properties)
    # Upsert key is (tag, area): payload.area_id wins, query areaId is the
    # fallback for clients that can't change their body shape.
    effective_area = payload.area_id or areaId

    try:
        from ..database import is_db_available, get_db_optional
        from ..models.engineering_object import EngineeringObject
        from sqlalchemy import select
        from sqlalchemy.exc import IntegrityError

        if await is_db_available():
            async for db in get_db_optional():
                if db is None:
                    continue
                stmt = select(EngineeringObject).where(
                    EngineeringObject.tag == tag_upper,
                    EngineeringObject.deleted_at.is_(None),
                )
                candidates = (await db.execute(stmt)).scalars().all()

                obj = None
                if effective_area:
                    exact = [c for c in candidates if c.area_id == effective_area]
                    if exact:
                        obj = exact[0]
                    elif len(candidates) == 1 and candidates[0].area_id is None:
                        # Claim the unassigned row for this area (matches the
                        # pre-scoping behavior of adopting payload.area_id).
                        obj = candidates[0]
                    # Otherwise: same tag in *other* areas is fine now — create.
                elif len(candidates) == 1:
                    obj = candidates[0]
                elif len(candidates) > 1:
                    raise _ambiguous_tag_error(tag, [c.area_id for c in candidates])

                if obj is None:
                    obj = EngineeringObject(
                        tag=tag_upper,
                        object_type=payload.object_type,
                        properties=payload.properties,
                        area_id=effective_area,
                        owner_id=payload.owner_id,
                        name=payload.name,
                        description=payload.description,
                        location_ref=payload.location_ref,
                        is_active=payload.is_active if payload.is_active is not None else True,
                        status=payload.status,
                    )
                    db.add(obj)
                else:
                    obj.object_type = payload.object_type
                    obj.properties = payload.properties
                    obj.area_id = effective_area if effective_area else obj.area_id
                    obj.owner_id = payload.owner_id
                    obj.name = payload.name
                    obj.description = payload.description
                    obj.location_ref = payload.location_ref
                    if payload.is_active is not None:
                        obj.is_active = payload.is_active
                    obj.status = payload.status
                try:
                    await db.commit()
                except IntegrityError:
                    await db.rollback()
                    raise HTTPException(
                        status_code=409,
                        detail=f"Tag '{tag}' already exists in this area",
                    )
                await db.refresh(obj)
                return _to_response(obj)
    except ImportError:
        pass

    key = _fallback_key(effective_area, tag_upper)
    _fallback_store[key] = {
        "id": None,
        "tag": tag_upper,
        "object_type": payload.object_type,
        "properties": payload.properties,
        "area_id": effective_area,
        "owner_id": payload.owner_id,
        "name": payload.name,
        "description": payload.description,
        "location_ref": payload.location_ref,
        "is_active": payload.is_active if payload.is_active is not None else True,
        "status": payload.status,
    }
    return EngineeringObjectResponse(**_fallback_store[key])
