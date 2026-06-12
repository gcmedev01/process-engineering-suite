"""Per-object-type validation of engineering_objects.properties payloads.

Shapes follow docs/ENGINEERING_OBJECT_PROPERTIES_REFERENCE.md. All models use
extra='allow' so validation never strips data the frontends send.

Enforcement strategy:
- INSTRUMENT is strict (422 on invalid payload) — the type is new, so no
  legacy loose payloads exist.
- Existing types (TANK, VESSEL, PUMP, ...) are lenient: problems are logged
  as warnings, the write proceeds. The EO_STRICT_PROPERTY_VALIDATION setting
  flips them to strict once the frontends are confirmed clean.
"""
from __future__ import annotations

import logging
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, ValidationError

logger = logging.getLogger(__name__)

INSTRUMENT_TYPES = (
    'pressure_transmitter',
    'temperature_transmitter',
    'level_transmitter',
    'flow_transmitter',
    'flow_meter',
    'control_valve',
    'analyzer',
    'switch',
    'gauge',
    'other',
)


class DesignParameters(BaseModel):
    model_config = ConfigDict(extra='allow')

    designPressure: Optional[float] = None
    designPressureUnit: Optional[str] = None
    mawp: Optional[float] = None
    mawpUnit: Optional[str] = None
    designTemperature: Optional[float] = None
    designTempUnit: Optional[str] = None


class VesselDetails(BaseModel):
    model_config = ConfigDict(extra='allow')

    orientation: Optional[Literal['horizontal', 'vertical']] = None
    innerDiameter: Optional[float] = None
    tangentToTangentLength: Optional[float] = None
    headType: Optional[str] = None
    wallThickness: Optional[float] = None
    insulated: Optional[bool] = None
    insulationThickness: Optional[float] = None
    wettedArea: Optional[float] = None
    totalSurfaceArea: Optional[float] = None
    volume: Optional[float] = None


class TankDetails(BaseModel):
    model_config = ConfigDict(extra='allow')

    tankType: Optional[Literal['atmospheric', 'low_pressure', 'pressure']] = None
    orientation: Optional[Literal['horizontal', 'vertical']] = None
    innerDiameter: Optional[float] = None
    height: Optional[float] = None
    roofType: Optional[str] = None
    insulated: Optional[bool] = None
    insulationThickness: Optional[float] = None
    workingTemperature: Optional[float] = None
    molecularWeight: Optional[float] = None
    volume: Optional[float] = None
    heelVolume: Optional[float] = None


class PumpDetails(BaseModel):
    model_config = ConfigDict(extra='allow')

    pumpType: Optional[str] = None
    ratedFlow: Optional[float] = None
    ratedHead: Optional[float] = None
    dischargePressure: Optional[float] = None
    npshRequired: Optional[float] = None
    efficiency: Optional[float] = None
    motorPower: Optional[float] = None


class InstrumentDetails(BaseModel):
    model_config = ConfigDict(extra='allow')

    instrumentType: Literal[INSTRUMENT_TYPES]  # required — strict for INSTRUMENT
    service: Optional[str] = None
    rangeMin: Optional[float] = None
    rangeMax: Optional[float] = None
    rangeUnit: Optional[str] = None
    accuracy: Optional[str] = None
    signalType: Optional[str] = None
    location: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    datasheetRef: Optional[str] = None


DETAILS_MODELS: dict[str, type[BaseModel]] = {
    'VESSEL': VesselDetails,
    'TANK': TankDetails,
    'PUMP': PumpDetails,
    'INSTRUMENT': InstrumentDetails,
}

# Types validated strictly regardless of the settings flag.
ALWAYS_STRICT_TYPES = frozenset({'INSTRUMENT'})


def validate_properties(
    object_type: str,
    properties: dict[str, Any],
    *,
    strict: bool,
) -> list[str]:
    """Validate a properties payload for an object type.

    Returns a list of human-readable problem strings. In strict mode the
    caller should reject the write when the list is non-empty; in lenient
    mode problems are logged here and the caller proceeds.
    """
    problems: list[str] = []
    type_key = (object_type or '').strip().upper()

    if not isinstance(properties, dict):
        problems.append('properties must be an object')
        return problems

    design = properties.get('design_parameters')
    if design is not None:
        try:
            DesignParameters.model_validate(design)
        except ValidationError as exc:
            problems.extend(
                f"design_parameters.{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                for err in exc.errors()
            )

    details_model = DETAILS_MODELS.get(type_key)
    if details_model is not None:
        details = properties.get('details')
        if details is None:
            if type_key in ALWAYS_STRICT_TYPES:
                problems.append(f'details is required for {type_key}')
        elif not isinstance(details, dict):
            problems.append('details must be an object')
        else:
            try:
                details_model.model_validate(details)
            except ValidationError as exc:
                problems.extend(
                    f"details.{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
                    for err in exc.errors()
                )

    if problems and not strict:
        logger.warning(
            'Lenient property validation issues for %s: %s', type_key, '; '.join(problems)
        )
    return problems


def is_strict_type(object_type: str, settings_strict: bool) -> bool:
    type_key = (object_type or '').strip().upper()
    return type_key in ALWAYS_STRICT_TYPES or settings_strict
