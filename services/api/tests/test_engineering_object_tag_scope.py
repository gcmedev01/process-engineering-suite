"""Tests for per-area engineering_objects tag uniqueness."""
from __future__ import annotations

import importlib
import sys
import types

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

# Stub pes_calc
_pes_calc = types.ModuleType("pes_calc")
_pes_calc_vessels = types.ModuleType("pes_calc.vessels")


class _DummyVessel:
    def __init__(self, *a, **kw):
        self.total_volume = self.total_height = 0.0
    def wetted_area(self, *_, **__): return 0.0
    def liquid_volume(self, *_, **__): return 0.0


for _n in [
    "HorizontalConicalVessel", "HorizontalEllipticalVessel", "HorizontalFlatVessel",
    "HorizontalHemisphericalVessel", "HorizontalTorisphericalVessel", "SphericalTank",
    "VerticalConicalVessel", "VerticalEllipticalVessel", "VerticalFlatVessel",
    "VerticalHemisphericalVessel", "VerticalTorisphericalVessel", "Vessel",
]:
    setattr(_pes_calc_vessels, _n, _DummyVessel)
sys.modules.setdefault("pes_calc", _pes_calc)
sys.modules.setdefault("pes_calc.vessels", _pes_calc_vessels)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_app() -> FastAPI:
    import importlib
    eo_mod = importlib.import_module("app.routers.engineering_objects")
    app = FastAPI()
    app.include_router(eo_mod.router)
    return app


def _upsert_body(object_type: str = "VESSEL", area_id: str | None = None) -> dict:
    body: dict = {"object_type": object_type, "properties": {}}
    if area_id:
        body["area_id"] = area_id
    return body


# ---------------------------------------------------------------------------
# Fallback (no-DB) path tests — exercises the in-process _fallback_store
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_same_tag_two_areas_fallback():
    """Two different areas may both have 'V-100' — not a conflict."""
    app = _make_app()
    # Clear the fallback store to avoid cross-test contamination.
    import importlib
    eo_mod = importlib.import_module("app.routers.engineering_objects")
    eo_mod._fallback_store.clear()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.put("/engineering-objects/V-100?areaId=area-alpha", json=_upsert_body())
        r2 = await client.put("/engineering-objects/V-100?areaId=area-beta", json=_upsert_body())
    assert r1.status_code == 200
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_same_tag_same_area_fallback():
    """Same tag in the same area is idempotent (upsert), not an error."""
    import importlib
    eo_mod = importlib.import_module("app.routers.engineering_objects")
    eo_mod._fallback_store.clear()
    app = _make_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.put("/engineering-objects/V-200?areaId=area-gamma", json=_upsert_body())
        r2 = await client.put("/engineering-objects/V-200?areaId=area-gamma", json=_upsert_body())
    # Idempotent upsert — second call updates, not a conflict.
    assert r1.status_code == 200
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_ambiguous_get_fallback():
    """GET without areaId when two live matches exist → 409."""
    import importlib
    eo_mod = importlib.import_module("app.routers.engineering_objects")
    eo_mod._fallback_store.clear()
    app = _make_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.put("/engineering-objects/T-100?areaId=area-x", json=_upsert_body("TANK"))
        await client.put("/engineering-objects/T-100?areaId=area-y", json=_upsert_body("TANK"))
        resp = await client.get("/engineering-objects/T-100")
    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert "Ambiguous" in detail["message"]


@pytest.mark.asyncio
async def test_disambiguated_get_fallback():
    """GET with areaId resolves the ambiguity."""
    import importlib
    eo_mod = importlib.import_module("app.routers.engineering_objects")
    eo_mod._fallback_store.clear()
    app = _make_app()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.put("/engineering-objects/T-200?areaId=area-1", json=_upsert_body("TANK"))
        await client.put("/engineering-objects/T-200?areaId=area-2", json=_upsert_body("VESSEL"))
        resp = await client.get("/engineering-objects/T-200?areaId=area-2")
    assert resp.status_code == 200
    assert resp.json()["object_type"] == "VESSEL"


# ---------------------------------------------------------------------------
# DB integration tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_db_same_tag_two_areas(db_session):
    from app.models import Area, Customer, EngineeringObject, Plant, Unit, User

    user = User(name="Tag User", email="tag-scope-user@example.com")
    customer = Customer(name="Tag Co", code="TAG-CO")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    customer.owner_id = user.id
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    plant = Plant(customer_id=customer.id, name="Tag Plant", code="TAG-PL", owner_id=user.id)
    db_session.add(plant)
    await db_session.commit()
    await db_session.refresh(plant)

    unit = Unit(plant_id=plant.id, name="Tag Unit", code="TAG-U", owner_id=user.id)
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)

    area_a = Area(unit_id=unit.id, name="Area A", code="A-A")
    area_b = Area(unit_id=unit.id, name="Area B", code="A-B")
    db_session.add_all([area_a, area_b])
    await db_session.commit()
    await db_session.refresh(area_a)
    await db_session.refresh(area_b)

    obj_a = EngineeringObject(tag="V-300", object_type="VESSEL", properties={}, area_id=area_a.id)
    obj_b = EngineeringObject(tag="V-300", object_type="VESSEL", properties={}, area_id=area_b.id)
    db_session.add_all([obj_a, obj_b])
    await db_session.commit()  # Must not raise IntegrityError


@pytest.mark.asyncio
async def test_db_soft_delete_then_recreate(db_session):
    """After soft-deleting V-400, creating another V-400 in the same area should succeed."""
    from datetime import datetime, timezone
    from app.models import Area, Customer, EngineeringObject, Plant, Unit, User

    user = User(name="SDel User", email="sdel-user@example.com")
    customer = Customer(name="SDel Co", code="SDEL-CO")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    customer.owner_id = user.id
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    plant = Plant(customer_id=customer.id, name="SDel Plant", code="SDEL-PL", owner_id=user.id)
    db_session.add(plant)
    await db_session.commit()
    await db_session.refresh(plant)

    unit = Unit(plant_id=plant.id, name="SDel Unit", code="SDEL-U", owner_id=user.id)
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)

    area = Area(unit_id=unit.id, name="SDel Area", code="SDEL-A")
    db_session.add(area)
    await db_session.commit()
    await db_session.refresh(area)

    old = EngineeringObject(tag="V-400", object_type="VESSEL", properties={}, area_id=area.id)
    db_session.add(old)
    await db_session.commit()

    # Soft-delete the old one
    old.deleted_at = datetime.now(timezone.utc)
    await db_session.commit()

    # Creating a new live V-400 in the same area should be allowed
    new = EngineeringObject(tag="V-400", object_type="VESSEL", properties={}, area_id=area.id)
    db_session.add(new)
    await db_session.commit()  # Must not raise IntegrityError
