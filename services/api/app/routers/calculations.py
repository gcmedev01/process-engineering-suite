from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError

from ..dependencies import DAL
from ..services.calculation_register import DISCIPLINES

router = APIRouter(prefix='/calculations', tags=['calculations'])


def _validate_discipline(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip().lower()
    if not normalized:
        return None
    if normalized not in DISCIPLINES:
        raise ValueError(
            f"Unknown discipline '{value}'. Allowed: {', '.join(DISCIPLINES)}"
        )
    return normalized


class CalculationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    app: str
    areaId: Optional[str] = None
    ownerId: Optional[str] = None
    name: str
    description: str = ''
    status: str = 'draft'
    tag: Optional[str] = None
    isActive: bool = True
    projectId: Optional[str] = None
    projectCode: Optional[str] = None
    projectName: Optional[str] = None
    calcNumber: Optional[str] = None
    discipline: Optional[str] = None
    currentRevisionCode: Optional[str] = None
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None
    latestVersionNo: int
    latestVersionId: Optional[str] = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    results: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    revisionHistory: List[dict[str, Any]] = Field(default_factory=list)
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    deletedAt: Optional[str] = None


class CalculationVersionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    calculationId: str
    versionNo: int
    versionKind: str
    inputs: dict[str, Any] = Field(default_factory=dict)
    results: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    revisionHistory: List[dict[str, Any]] = Field(default_factory=list)
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None
    sourceVersionId: Optional[str] = None
    changeNote: Optional[str] = None
    createdAt: Optional[str] = None


class CalculationCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    app: str
    areaId: Optional[str] = None
    ownerId: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    tag: Optional[str] = None
    projectId: Optional[str] = None
    calcNumber: Optional[str] = None
    discipline: Optional[str] = None
    inputs: dict[str, Any] = Field(default_factory=dict)
    results: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    revisionHistory: List[dict[str, Any]] = Field(default_factory=list)
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None

    _check_discipline = field_validator('discipline')(_validate_discipline)


class CalculationUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    tag: Optional[str] = None
    projectId: Optional[str] = None
    calcNumber: Optional[str] = None
    discipline: Optional[str] = None
    inputs: Optional[dict[str, Any]] = None
    results: Optional[dict[str, Any]] = None
    metadata: Optional[dict[str, Any]] = None
    revisionHistory: Optional[List[dict[str, Any]]] = None
    linkedEquipmentId: Optional[str] = None
    linkedEquipmentTag: Optional[str] = None
    changeNote: Optional[str] = None

    _check_discipline = field_validator('discipline')(_validate_discipline)


class CalculationRestoreRequest(BaseModel):
    model_config = ConfigDict(extra='ignore')

    versionId: str
    changeNote: Optional[str] = None


@router.get('', response_model=List[CalculationResponse])
async def list_calculations(
    dal: DAL,
    includeInactive: bool = Query(default=False),
    app: Optional[str] = Query(default=None),
    projectId: Optional[str] = Query(default=None),
    discipline: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    calcNumber: Optional[str] = Query(default=None),
):
    return await dal.get_calculations(
        include_inactive=includeInactive,
        app=app,
        project_id=projectId,
        discipline=discipline,
        status=status,
        calc_number=calcNumber,
    )


# NOTE: declared before GET /{calculation_id} so 'next-number' isn't matched
# as a calculation id.
@router.get('/next-number')
async def next_calc_number(
    dal: DAL,
    projectId: str = Query(...),
    discipline: Optional[str] = Query(default=None),
):
    if discipline is not None:
        try:
            discipline = _validate_discipline(discipline)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
    suggestion = await dal.get_next_calc_number(projectId, discipline)
    if suggestion is None:
        raise HTTPException(status_code=404, detail='Project not found')
    return suggestion


@router.get('/{calculation_id}', response_model=CalculationResponse)
async def get_calculation(calculation_id: str, dal: DAL):
    calculation = await dal.get_calculation_by_id(calculation_id)
    if not calculation:
        raise HTTPException(status_code=404, detail='Calculation not found')
    return calculation


@router.post('', response_model=CalculationResponse, status_code=201)
async def create_calculation(data: CalculationCreate, dal: DAL):
    try:
        return await dal.create_calculation(data.model_dump())
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail='Calculation number already exists in this project',
        )


@router.patch('/{calculation_id}', response_model=CalculationResponse)
async def update_calculation(calculation_id: str, data: CalculationUpdate, dal: DAL):
    try:
        return await dal.update_calculation(
            calculation_id,
            {key: value for key, value in data.model_dump().items() if value is not None},
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail='Calculation number already exists in this project',
        )


@router.delete('/{calculation_id}')
async def delete_calculation(calculation_id: str, dal: DAL):
    deleted = await dal.delete_calculation(calculation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail='Calculation not found')
    return {'message': 'Calculation deleted'}


@router.get('/{calculation_id}/versions', response_model=List[CalculationVersionResponse])
async def list_calculation_versions(calculation_id: str, dal: DAL):
    return await dal.get_calculation_versions(calculation_id)


@router.get('/{calculation_id}/versions/{version_id}', response_model=CalculationVersionResponse)
async def get_calculation_version(calculation_id: str, version_id: str, dal: DAL):
    version = await dal.get_calculation_version_by_id(calculation_id, version_id)
    if not version:
        raise HTTPException(status_code=404, detail='Calculation version not found')
    return version


@router.post('/{calculation_id}/restore', response_model=CalculationResponse)
async def restore_calculation(calculation_id: str, data: CalculationRestoreRequest, dal: DAL):
    try:
        return await dal.restore_calculation(
            calculation_id,
            version_id=data.versionId,
            change_note=data.changeNote,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
