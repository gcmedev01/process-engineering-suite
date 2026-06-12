"""Instrument links router — /instrument-links."""
from __future__ import annotations

from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError

from ..dependencies import get_dal, DAL
from ..services.instrument_links import RELATIONSHIP_TYPES

router = APIRouter(prefix="/instrument-links", tags=["instrument-links"])

VALID_RELATIONSHIP_TYPES = frozenset(RELATIONSHIP_TYPES)


class InstrumentLinkResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    instrumentId: str
    targetId: str
    relationshipType: str
    protectiveSystemId: Optional[str] = None
    notes: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class InstrumentLinkCreate(BaseModel):
    instrumentId: str
    targetId: str
    relationshipType: str
    protectiveSystemId: Optional[str] = None
    notes: Optional[str] = None

    def validate_relationship_type(self) -> None:
        if self.relationshipType not in VALID_RELATIONSHIP_TYPES:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": f"Invalid relationshipType '{self.relationshipType}'",
                    "allowed": sorted(VALID_RELATIONSHIP_TYPES),
                },
            )


class InstrumentLinkUpdate(BaseModel):
    relationshipType: Optional[str] = None
    protectiveSystemId: Optional[str] = None
    notes: Optional[str] = None


@router.get("", response_model=List[InstrumentLinkResponse])
async def list_instrument_links(
    dal: DAL,
    instrumentId: Optional[str] = Query(default=None),
    targetId: Optional[str] = Query(default=None),
    relationshipType: Optional[str] = Query(default=None),
    protectiveSystemId: Optional[str] = Query(default=None),
) -> List[InstrumentLinkResponse]:
    results = await dal.list_instrument_links(
        instrument_id=instrumentId,
        target_id=targetId,
        relationship_type=relationshipType,
        protective_system_id=protectiveSystemId,
    )
    return [InstrumentLinkResponse(**r) for r in results]


@router.post("", response_model=InstrumentLinkResponse, status_code=201)
async def create_instrument_link(
    payload: InstrumentLinkCreate,
    dal: DAL,
) -> InstrumentLinkResponse:
    payload.validate_relationship_type()
    try:
        result = await dal.create_instrument_link(payload.model_dump(by_alias=False))
    except TypeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="An instrument link with this instrument, target, and relationship already exists",
        )
    return InstrumentLinkResponse(**result)


@router.patch("/{link_id}", response_model=InstrumentLinkResponse)
async def update_instrument_link(
    link_id: str,
    payload: InstrumentLinkUpdate,
    dal: DAL,
) -> InstrumentLinkResponse:
    if payload.relationshipType is not None and payload.relationshipType not in VALID_RELATIONSHIP_TYPES:
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Invalid relationshipType '{payload.relationshipType}'",
                "allowed": sorted(VALID_RELATIONSHIP_TYPES),
            },
        )
    result = await dal.update_instrument_link(link_id, payload.model_dump(exclude_none=True, by_alias=False))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Instrument link '{link_id}' not found")
    return InstrumentLinkResponse(**result)


@router.delete("/{link_id}", status_code=204)
async def delete_instrument_link(
    link_id: str,
    dal: DAL,
) -> None:
    deleted = await dal.delete_instrument_link(link_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Instrument link '{link_id}' not found")
