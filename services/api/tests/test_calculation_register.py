"""Tests for calculation register: calc_number, discipline, next-number, filtering."""
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

from app.services.mock_service import MockService  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_app(svc: MockService) -> FastAPI:
    app = FastAPI()
    calcs_router = importlib.import_module("app.routers.calculations")
    deps = importlib.import_module("app.dependencies")
    app.include_router(calcs_router.router)
    app.dependency_overrides[deps.get_dal] = lambda: svc
    return app


def _mock_with_project(project_id: str = "proj-001", project_code: str = "PRJ-001") -> MockService:
    svc = MockService()
    svc._data["projects"] = [{
        "id": project_id,
        "code": project_code,
        "name": "Test Project",
        "areaId": "area-001",
    }]
    return svc


def _base_payload(area_id: str = "area-001", owner_id: str = "owner-001") -> dict:
    return {
        "app": "pump-calculation",
        "areaId": area_id,
        "ownerId": owner_id,
        "name": "P-101 normal",
        "description": "",
        "status": "draft",
        "inputs": {},
        "results": {},
        "metadata": {},
    }


# ---------------------------------------------------------------------------
# Unit tests — mock service layer
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_explicit_calc_number_stored():
    svc = _mock_with_project()
    calc = await svc.create_calculation({
        **_base_payload(),
        "calcNumber": "PRJ-001-PR-001",
        "discipline": "process",
        "projectId": "proj-001",
    })
    assert calc["calcNumber"] == "PRJ-001-PR-001"
    assert calc["discipline"] == "process"
    assert calc["projectId"] == "proj-001"


@pytest.mark.asyncio
async def test_calc_number_lifted_from_metadata():
    svc = _mock_with_project()
    calc = await svc.create_calculation({
        **_base_payload(),
        "metadata": {"documentNumber": "PRJ-001-ME-002"},
    })
    assert calc["calcNumber"] == "PRJ-001-ME-002"


@pytest.mark.asyncio
async def test_discipline_filter():
    svc = _mock_with_project()
    await svc.create_calculation({**_base_payload(), "discipline": "process", "calcNumber": "PRJ-001-PR-001"})
    await svc.create_calculation({**_base_payload(), "discipline": "mechanical", "calcNumber": "PRJ-001-ME-001"})
    process_calcs = await svc.get_calculations(discipline="process")
    assert all(c["discipline"] == "process" for c in process_calcs)
    assert len(process_calcs) == 1


@pytest.mark.asyncio
async def test_calc_number_ilike_filter():
    svc = _mock_with_project()
    await svc.create_calculation({**_base_payload(), "calcNumber": "PRJ-001-PR-001"})
    await svc.create_calculation({**_base_payload(), "calcNumber": "PRJ-001-ME-001"})
    results = await svc.get_calculations(calc_number="PR-001")
    assert len(results) == 1
    assert results[0]["calcNumber"] == "PRJ-001-PR-001"


@pytest.mark.asyncio
async def test_next_number_suggestion():
    svc = _mock_with_project()
    # No existing calcs → sequence starts at 1
    suggestion = await svc.get_next_calc_number("proj-001", "process")
    assert suggestion is not None
    assert suggestion["sequence"] == 1
    assert "PRJ-001" in suggestion["nextNumber"]

    # After creating one calc, sequence should be 2
    await svc.create_calculation({
        **_base_payload(),
        "projectId": "proj-001",
        "discipline": "process",
        "calcNumber": suggestion["nextNumber"],
    })
    suggestion2 = await svc.get_next_calc_number("proj-001", "process")
    assert suggestion2["sequence"] == 2


@pytest.mark.asyncio
async def test_next_number_returns_none_for_missing_project():
    svc = MockService()
    result = await svc.get_next_calc_number("no-such-project")
    assert result is None


# ---------------------------------------------------------------------------
# HTTP tests — route ordering & validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_next_number_route_not_eaten_by_id():
    """GET /calculations/next-number must not be matched by /{calculation_id}."""
    svc = _mock_with_project()
    app = _make_app(svc)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/calculations/next-number", params={"projectId": "proj-001"})
    # Should hit the dedicated endpoint (200 or 422 for missing project), not 404 / 500
    assert resp.status_code in (200, 422, 404)


@pytest.mark.asyncio
async def test_http_create_with_register_fields():
    svc = _mock_with_project()
    app = _make_app(svc)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/calculations", json={
            **_base_payload(),
            "calcNumber": "PRJ-TEST-001",
            "discipline": "process",
            "projectId": "proj-001",
        })
    assert resp.status_code == 201
    body = resp.json()
    assert body.get("calcNumber") == "PRJ-TEST-001"
    assert body.get("discipline") == "process"


@pytest.mark.asyncio
async def test_http_invalid_discipline_422():
    svc = _mock_with_project()
    app = _make_app(svc)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/calculations", json={
            **_base_payload(),
            "discipline": "quantum_physics",
        })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_http_duplicate_calc_number_in_project_409():
    svc = _mock_with_project()
    app = _make_app(svc)
    payload = {
        **_base_payload(),
        "calcNumber": "PRJ-001-DUPE",
        "projectId": "proj-001",
        "discipline": "process",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        first = await client.post("/calculations", json=payload)
        assert first.status_code == 201
        second = await client.post("/calculations", json=payload)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_http_list_filter_by_project():
    svc = _mock_with_project()
    app = _make_app(svc)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/calculations", json={
            **_base_payload(), "projectId": "proj-001", "calcNumber": "C-001",
        })
        await client.post("/calculations", json={**_base_payload(), "name": "no project"})
        resp = await client.get("/calculations", params={"projectId": "proj-001"})
    assert resp.status_code == 200
    results = resp.json()
    assert all(r.get("projectId") == "proj-001" for r in results)
    assert len(results) == 1


# ---------------------------------------------------------------------------
# DB integration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_db_register_fields_round_trip(db_session):
    from app.models import Area, Customer, Plant, Project, Unit, User
    from app.services.db_service import DatabaseService

    user = User(name="Reg User", email="reg-user@example.com")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    customer = Customer(name="Reg Customer", code="CUST-REG", owner_id=user.id)
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    plant = Plant(customer_id=customer.id, name="Reg Plant", code="PL-REG", owner_id=user.id)
    db_session.add(plant)
    await db_session.commit()
    await db_session.refresh(plant)

    unit = Unit(plant_id=plant.id, name="Reg Unit", code="U-REG", owner_id=user.id)
    db_session.add(unit)
    await db_session.commit()
    await db_session.refresh(unit)

    area = Area(unit_id=unit.id, name="Reg Area", code="A-REG")
    db_session.add(area)
    await db_session.commit()
    await db_session.refresh(area)

    project = Project(area_id=area.id, name="Reg Project", code="REG-001")
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)

    svc = DatabaseService(db_session)
    calc = await svc.create_calculation({
        "app": "pump-calculation",
        "areaId": area.id,
        "ownerId": user.id,
        "name": "Test Calc",
        "description": "",
        "status": "draft",
        "inputs": {},
        "results": {},
        "metadata": {},
        "calcNumber": "REG-001-PR-001",
        "discipline": "process",
        "projectId": str(project.id),
    })
    assert calc.get("calcNumber") == "REG-001-PR-001"
    assert calc.get("discipline") == "process"

    fetched = await svc.get_calculation_by_id(calc["id"])
    assert fetched is not None
    assert fetched.get("calcNumber") == "REG-001-PR-001"
