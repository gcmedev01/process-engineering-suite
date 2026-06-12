"""Mock data service - fallback when database is unavailable."""
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from sqlalchemy.exc import IntegrityError

from .dal import DataAccessLayer
from .calculation_register import DISCIPLINE_CODES

logger = logging.getLogger(__name__)


def _normalize_venting_revision_history(rows: object) -> list[dict]:
    if not isinstance(rows, list):
        return []

    normalized: list[dict] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        normalized.append(
            {
                "rev": row.get("rev") or row.get("REV") or "",
                "by": row.get("by") or row.get("BY") or "",
                "byDate": row.get("byDate") or row.get("by_date"),
                "checkedBy": row.get("checkedBy") or row.get("checked_by") or "",
                "checkedDate": row.get("checkedDate") or row.get("checked_date"),
                "approvedBy": row.get("approvedBy") or row.get("approved_by") or "",
                "approvedDate": row.get("approvedDate") or row.get("approved_date"),
            }
        )

    normalized.sort(
        key=lambda item: item.get("byDate") or item.get("checkedDate") or item.get("approvedDate") or "",
        reverse=True,
    )
    return normalized[:3]


class MockService(DataAccessLayer):
    """Mock data implementation using JSON file.
    
    This service reads from mock_data.json and provides
    in-memory CRUD operations. Changes are NOT persisted.
    """
    
    def __init__(self) -> None:
        self._data: dict = {}
        self._load_mock_data()
    
    def _load_mock_data(self) -> None:
        """Load mock data from JSON file."""
        mock_path = Path(__file__).parent.parent.parent / "mock_data.json"
        
        if mock_path.exists():
            with open(mock_path, "r") as f:
                self._data = json.load(f)
            logger.info(f"Loaded mock data from {mock_path}")
        else:
            logger.warning(f"Mock data file not found: {mock_path}")
            # Initialize empty data structure
            self._data = {
                "users": [],
                "credentials": [],
                "calculations": [],
                "calculationVersions": [],
                "customers": [],
                "plants": [],
                "units": [],
                "areas": [],
                "projects": [],
                "protectiveSystems": [],
                "scenarios": [],
                "sizingCases": [],
                "equipment": [],
                "equipmentLinks": [],
                "attachments": [],
                "comments": [],
                "notes": [],
                "todos": [],
            }

    # --- Calculations ---

    def _lift_register_fields(self, data: dict, area_id: Optional[str]) -> dict:
        """Mirror calculation_register.lift_register_fields for the mock store."""
        metadata = data.get("metadata") or {}
        calc_number = (data.get("calcNumber") or "").strip() or None
        if not calc_number:
            calc_number = str(metadata.get("documentNumber") or "").strip()[:64] or None
        discipline = (data.get("discipline") or "").strip().lower() or None
        project_id = (data.get("projectId") or "").strip() or None
        if not project_id and area_id:
            code = str(metadata.get("projectNumber") or "").strip()
            if code:
                for project in self._data.get("projects", []):
                    if project.get("areaId") == area_id and project.get("code") == code:
                        project_id = project.get("id")
                        break
        return {"projectId": project_id, "calcNumber": calc_number, "discipline": discipline}

    def _check_calc_number_unique(
        self, project_id: Optional[str], calc_number: Optional[str], exclude_id: Optional[str] = None
    ) -> None:
        if not project_id or not calc_number:
            return
        for item in self._data.get("calculations", []):
            if (
                item.get("id") != exclude_id
                and item.get("isActive", True)
                and item.get("projectId") == project_id
                and item.get("calcNumber") == calc_number
            ):
                raise IntegrityError(
                    "duplicate calc_number", params=None, orig=Exception("mock unique violation")
                )

    def _project_brief_fields(self, project_id: Optional[str]) -> dict:
        if project_id:
            for project in self._data.get("projects", []):
                if project.get("id") == project_id:
                    return {"projectCode": project.get("code"), "projectName": project.get("name")}
        return {"projectCode": None, "projectName": None}

    async def get_calculations(
        self,
        include_inactive: bool = False,
        app: Optional[str] = None,
        *,
        project_id: Optional[str] = None,
        discipline: Optional[str] = None,
        status: Optional[str] = None,
        calc_number: Optional[str] = None,
    ) -> List[dict]:
        calculations = list(self._data.get("calculations", []))
        if not include_inactive:
            calculations = [item for item in calculations if item.get("isActive", True)]
        if app:
            calculations = [item for item in calculations if item.get("app") == app]
        if project_id:
            calculations = [item for item in calculations if item.get("projectId") == project_id]
        if discipline:
            calculations = [item for item in calculations if item.get("discipline") == discipline]
        if status:
            calculations = [item for item in calculations if item.get("status") == status]
        if calc_number:
            needle = calc_number.lower()
            calculations = [
                item for item in calculations
                if needle in (item.get("calcNumber") or "").lower()
            ]
        calculations.sort(key=lambda item: item.get("updatedAt") or "", reverse=True)
        return calculations

    async def get_next_calc_number(
        self,
        project_id: str,
        discipline: Optional[str] = None,
    ) -> Optional[dict]:
        project = next(
            (p for p in self._data.get("projects", []) if p.get("id") == project_id),
            None,
        )
        if project is None:
            return None
        prefix = project.get("code") or ""
        if discipline and DISCIPLINE_CODES.get(discipline):
            prefix = f"{prefix}-{DISCIPLINE_CODES[discipline]}"
        pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)$")
        max_seq = 0
        width = 3
        for item in self._data.get("calculations", []):
            if item.get("projectId") != project_id or not item.get("isActive", True):
                continue
            match = pattern.match(item.get("calcNumber") or "")
            if match:
                max_seq = max(max_seq, int(match.group(1)))
                width = max(width, len(match.group(1)))
        next_seq = max_seq + 1
        return {
            "nextNumber": f"{prefix}-{next_seq:0{width}d}",
            "sequence": next_seq,
            "pattern": f"{prefix}-<seq>",
        }

    async def get_calculation_by_id(self, calculation_id: str) -> Optional[dict]:
        for calculation in self._data.get("calculations", []):
            if calculation.get("id") == calculation_id:
                return calculation
        return None

    async def create_calculation(self, data: dict) -> dict:
        now = datetime.utcnow().isoformat()
        calculation_id = str(uuid4())
        version_id = str(uuid4())
        register = self._lift_register_fields(data, data.get("areaId"))
        self._check_calc_number_unique(register["projectId"], register["calcNumber"])
        rows = data.get("revisionHistory") or []
        calculation = {
            "id": calculation_id,
            "app": data.get("app"),
            "areaId": data.get("areaId"),
            "ownerId": data.get("ownerId"),
            "name": data.get("name"),
            "description": data.get("description") or "",
            "status": data.get("status") or "draft",
            "tag": data.get("tag"),
            "isActive": True,
            **register,
            **self._project_brief_fields(register["projectId"]),
            "currentRevisionCode": (rows[-1].get("rev") if rows and isinstance(rows[-1], dict) else None) or None,
            "linkedEquipmentId": data.get("linkedEquipmentId"),
            "linkedEquipmentTag": data.get("linkedEquipmentTag"),
            "latestVersionNo": 1,
            "latestVersionId": version_id,
            "inputs": data.get("inputs") or {},
            "results": data.get("results"),
            "metadata": data.get("metadata") or {},
            "revisionHistory": data.get("revisionHistory") or [],
            "createdAt": now,
            "updatedAt": now,
            "deletedAt": None,
        }
        version = {
            "id": version_id,
            "calculationId": calculation_id,
            "versionNo": 1,
            "versionKind": "save",
            "inputs": calculation["inputs"],
            "results": calculation["results"],
            "metadata": calculation["metadata"],
            "revisionHistory": calculation["revisionHistory"],
            "linkedEquipmentId": calculation["linkedEquipmentId"],
            "linkedEquipmentTag": calculation["linkedEquipmentTag"],
            "sourceVersionId": None,
            "changeNote": data.get("changeNote"),
            "createdAt": now,
        }
        self._data.setdefault("calculations", []).append(calculation)
        self._data.setdefault("calculationVersions", []).append(version)
        return calculation

    async def update_calculation(self, calculation_id: str, data: dict) -> dict:
        calculations = self._data.get("calculations", [])
        for index, calculation in enumerate(calculations):
            if calculation.get("id") != calculation_id:
                continue
            now = datetime.utcnow().isoformat()
            next_version_no = int(calculation.get("latestVersionNo") or 0) + 1
            version_id = str(uuid4())
            register = self._lift_register_fields(data, calculation.get("areaId"))
            register = {
                "projectId": register["projectId"] or calculation.get("projectId"),
                "calcNumber": register["calcNumber"] or calculation.get("calcNumber"),
                "discipline": register["discipline"] or calculation.get("discipline"),
            }
            self._check_calc_number_unique(
                register["projectId"], register["calcNumber"], exclude_id=calculation_id
            )
            rows = data.get("revisionHistory", calculation.get("revisionHistory") or [])
            updated = {
                **calculation,
                "name": data.get("name", calculation.get("name")),
                "description": data.get("description", calculation.get("description") or ""),
                "status": data.get("status", calculation.get("status") or "draft"),
                "tag": data.get("tag", calculation.get("tag")),
                **register,
                **self._project_brief_fields(register["projectId"]),
                "currentRevisionCode": (rows[-1].get("rev") if rows and isinstance(rows[-1], dict) else None) or None,
                "linkedEquipmentId": data.get(
                    "linkedEquipmentId", calculation.get("linkedEquipmentId")
                ),
                "linkedEquipmentTag": data.get(
                    "linkedEquipmentTag", calculation.get("linkedEquipmentTag")
                ),
                "latestVersionNo": next_version_no,
                "latestVersionId": version_id,
                "inputs": data.get("inputs", calculation.get("inputs") or {}),
                "results": data.get("results", calculation.get("results")),
                "metadata": data.get("metadata", calculation.get("metadata") or {}),
                "revisionHistory": data.get(
                    "revisionHistory", calculation.get("revisionHistory") or []
                ),
                "updatedAt": now,
            }
            calculations[index] = updated
            self._data.setdefault("calculationVersions", []).append(
                {
                    "id": version_id,
                    "calculationId": calculation_id,
                    "versionNo": next_version_no,
                    "versionKind": "save",
                    "inputs": updated["inputs"],
                    "results": updated["results"],
                    "metadata": updated["metadata"],
                    "revisionHistory": updated["revisionHistory"],
                    "linkedEquipmentId": updated["linkedEquipmentId"],
                    "linkedEquipmentTag": updated["linkedEquipmentTag"],
                    "sourceVersionId": None,
                    "changeNote": data.get("changeNote"),
                    "createdAt": now,
                }
            )
            return updated
        raise ValueError(f"Calculation not found: {calculation_id}")

    async def delete_calculation(self, calculation_id: str) -> bool:
        calculations = self._data.get("calculations", [])
        for index, calculation in enumerate(calculations):
            if calculation.get("id") == calculation_id:
                calculations[index] = {
                    **calculation,
                    "isActive": False,
                    "deletedAt": datetime.utcnow().isoformat(),
                    "updatedAt": datetime.utcnow().isoformat(),
                }
                return True
        return False

    async def get_calculation_versions(self, calculation_id: str) -> List[dict]:
        versions = [
            item
            for item in self._data.get("calculationVersions", [])
            if item.get("calculationId") == calculation_id
        ]
        versions.sort(key=lambda item: item.get("versionNo") or 0, reverse=True)
        return versions

    async def get_calculation_version_by_id(
        self,
        calculation_id: str,
        version_id: str,
    ) -> Optional[dict]:
        for version in self._data.get("calculationVersions", []):
            if (
                version.get("calculationId") == calculation_id
                and version.get("id") == version_id
            ):
                return version
        return None

    async def restore_calculation(
        self,
        calculation_id: str,
        version_id: str,
        change_note: Optional[str] = None,
    ) -> dict:
        calculation = await self.get_calculation_by_id(calculation_id)
        if not calculation:
            raise ValueError("Calculation not found")
        source_version = await self.get_calculation_version_by_id(calculation_id, version_id)
        if not source_version:
            raise ValueError("Calculation version not found")

        now = datetime.utcnow().isoformat()
        next_version_no = int(calculation.get("latestVersionNo") or 0) + 1
        restored_version_id = str(uuid4())
        restored = {
            **calculation,
            "latestVersionNo": next_version_no,
            "latestVersionId": restored_version_id,
            "isActive": True,
            "deletedAt": None,
            "inputs": source_version.get("inputs") or {},
            "results": source_version.get("results"),
            "metadata": source_version.get("metadata") or {},
            "revisionHistory": source_version.get("revisionHistory") or [],
            "linkedEquipmentId": source_version.get("linkedEquipmentId"),
            "linkedEquipmentTag": source_version.get("linkedEquipmentTag"),
            "updatedAt": now,
        }
        calculations = self._data.get("calculations", [])
        for index, item in enumerate(calculations):
            if item.get("id") == calculation_id:
                calculations[index] = restored
                break

        self._data.setdefault("calculationVersions", []).append(
            {
                "id": restored_version_id,
                "calculationId": calculation_id,
                "versionNo": next_version_no,
                "versionKind": "restore",
                "inputs": restored["inputs"],
                "results": restored["results"],
                "metadata": restored["metadata"],
                "revisionHistory": restored["revisionHistory"],
                "linkedEquipmentId": restored.get("linkedEquipmentId"),
                "linkedEquipmentTag": restored.get("linkedEquipmentTag"),
                "sourceVersionId": version_id,
                "changeNote": change_note,
                "createdAt": now,
            }
        )
        return restored
    
    # --- Users & Auth ---
    
    async def get_users(self) -> List[dict]:
        return self._data.get("users", [])
    
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        for user in self._data.get("users", []):
            if user["id"] == user_id:
                return user
        return None
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        for user in self._data.get("users", []):
            if user["email"] == email:
                return user
        return None
    
    async def get_credential_by_username(self, username: str) -> Optional[dict]:
        for cred in self._data.get("credentials", []):
            if cred["username"] == username:
                return cred
        return None
    
    async def update_credential_login(self, credential_id: str, success: bool) -> None:
        for cred in self._data.get("credentials", []):
            if cred["id"] == credential_id:
                if success:
                    cred["lastLogin"] = datetime.utcnow().isoformat()
                    cred["failedAttempts"] = 0
                else:
                    cred["failedAttempts"] = cred.get("failedAttempts", 0) + 1
                break
    
    # --- Hierarchy ---
    
    async def get_customers(self) -> List[dict]:
        return self._data.get("customers", [])
    
    async def get_plants_by_customer(self, customer_id: str) -> List[dict]:
        return [p for p in self._data.get("plants", []) if p["customerId"] == customer_id]
    
    async def get_units_by_plant(self, plant_id: str) -> List[dict]:
        return [u for u in self._data.get("units", []) if u["plantId"] == plant_id]
    
    async def get_areas_by_unit(self, unit_id: str) -> List[dict]:
        return [a for a in self._data.get("areas", []) if a["unitId"] == unit_id]
    
    async def get_projects_by_area(self, area_id: str) -> List[dict]:
        return [p for p in self._data.get("projects", []) if p["areaId"] == area_id]

    async def get_area_by_id(self, area_id: str) -> Optional[dict]:
        for area in self._data.get("areas", []):
            if area["id"] == area_id:
                return area
        return None

    async def get_unit_by_id(self, unit_id: str) -> Optional[dict]:
        for unit in self._data.get("units", []):
            if unit["id"] == unit_id:
                return unit
        return None

    async def get_plant_by_id(self, plant_id: str) -> Optional[dict]:
        for plant in self._data.get("plants", []):
            if plant["id"] == plant_id:
                return plant
        return None

    async def get_customer_by_id(self, customer_id: str) -> Optional[dict]:
        for customer in self._data.get("customers", []):
            if customer["id"] == customer_id:
                return customer
        return None
    
    # --- Protective Systems (PSV) ---
    
    async def get_protective_systems(
        self, area_id: Optional[str] = None, include_deleted: bool = False
    ) -> List[dict]:
        psvs = self._data.get("protectiveSystems", [])
        if area_id:
            psvs = [p for p in psvs if p.get("areaId") == area_id]
        if not include_deleted:
            psvs = [p for p in psvs if p.get("deletedAt") is None]
        return psvs
    
    async def get_protective_system_by_id(
        self, psv_id: str, include_deleted: bool = False
    ) -> Optional[dict]:
        for psv in self._data.get("protectiveSystems", []):
            if psv["id"] == psv_id:
                if not include_deleted and psv.get("deletedAt") is not None:
                    return None
                return psv
        return None
    
    async def create_protective_system(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("protectiveSystems", []).append(data)
        return data
    
    async def update_protective_system(self, psv_id: str, data: dict) -> dict:
        for i, psv in enumerate(self._data.get("protectiveSystems", [])):
            if psv["id"] == psv_id:
                data["id"] = psv_id
                data["updatedAt"] = datetime.utcnow().isoformat()
                next_psv = {**psv, **data}

                # If currentRevisionId changes, derive PSV status from that revision's signatures.
                if "currentRevisionId" in data and next_psv.get("status") != "issued":
                    next_status = "draft"
                    current_rev_id = next_psv.get("currentRevisionId")
                    if current_rev_id:
                        rev = next((r for r in self._data.get("revisionHistory", []) if r.get("id") == current_rev_id), None)
                        if rev and rev.get("originatedBy"):
                            next_status = "in_review"
                            if rev.get("checkedBy"):
                                next_status = "checked"
                                if rev.get("approvedBy"):
                                    next_status = "approved"
                    next_psv["status"] = next_status

                self._data["protectiveSystems"][i] = next_psv
                return self._data["protectiveSystems"][i]
        raise ValueError(f"PSV not found: {psv_id}")
    
    async def delete_protective_system(self, psv_id: str) -> bool:
        psvs = self._data.get("protectiveSystems", [])
        for i, psv in enumerate(psvs):
            if psv["id"] == psv_id:
                psv["deletedAt"] = datetime.utcnow().isoformat()
                psv["isActive"] = False
                return True
        return False

    async def restore_protective_system(self, psv_id: str) -> dict:
        psv = await self.get_protective_system_by_id(psv_id, include_deleted=True)
        if not psv:
            raise ValueError("PSV not found")
        psv["deletedAt"] = None
        psv["isActive"] = True
        psv["updatedAt"] = datetime.utcnow().isoformat()
        return psv

    async def purge_protective_system(self, psv_id: str) -> bool:
        psvs = self._data.get("protectiveSystems", [])
        for i, psv in enumerate(psvs):
            if psv["id"] == psv_id:
                if psv.get("deletedAt") is None:
                    raise ValueError("PSV must be deleted before purge")
                del psvs[i]
                return True
        return False
    
    # --- Scenarios ---
    
    async def get_scenarios_by_psv(self, psv_id: str) -> List[dict]:
        return [s for s in self._data.get("scenarios", []) if s["protectiveSystemId"] == psv_id]
    
    async def create_scenario(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("scenarios", []).append(data)
        return data
    
    async def update_scenario(self, scenario_id: str, data: dict) -> dict:
        for i, scenario in enumerate(self._data.get("scenarios", [])):
            if scenario["id"] == scenario_id:
                data["id"] = scenario_id
                data["updatedAt"] = datetime.utcnow().isoformat()
                self._data["scenarios"][i] = {**scenario, **data}
                return self._data["scenarios"][i]
        raise ValueError(f"Scenario not found: {scenario_id}")
    
    async def delete_scenario(self, scenario_id: str) -> bool:
        scenarios = self._data.get("scenarios", [])
        for i, scenario in enumerate(scenarios):
            if scenario["id"] == scenario_id:
                del scenarios[i]
                return True
        return False
    
    # --- Sizing Cases ---
    
    async def get_sizing_cases_by_psv(self, psv_id: str) -> List[dict]:
        return [s for s in self._data.get("sizingCases", []) if s["protectiveSystemId"] == psv_id]
    
    async def create_sizing_case(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("sizingCases", []).append(data)
        return data
    
    async def update_sizing_case(self, case_id: str, data: dict) -> dict:
        for i, case in enumerate(self._data.get("sizingCases", [])):
            if case["id"] == case_id:
                data["id"] = case_id
                data["updatedAt"] = datetime.utcnow().isoformat()
                self._data["sizingCases"][i] = {**case, **data}
                return self._data["sizingCases"][i]
        raise ValueError(f"Sizing case not found: {case_id}")
    
    async def delete_sizing_case(self, case_id: str) -> bool:
        cases = self._data.get("sizingCases", [])
        for i, case in enumerate(cases):
            if case["id"] == case_id:
                del cases[i]
                return True
        return False
    
    # --- Equipment ---
    
    async def get_equipment(
        self, area_id: Optional[str] = None, type: Optional[str] = None
    ) -> List[dict]:
        equipment = self._data.get("equipment", [])
        if area_id:
            equipment = [e for e in equipment if e.get("areaId") == area_id]
        if type:
            equipment = [e for e in equipment if e.get("type") == type]
        return equipment

    async def get_equipment_by_id(self, equipment_id: str) -> Optional[dict]:
        for equipment in self._data.get("equipment", []):
            if equipment.get("id") == equipment_id:
                return equipment
        return None
    
    async def get_equipment_links_by_psv(self, psv_id: str) -> List[dict]:
        return [
            link
            for link in self._data.get("equipmentLinks", [])
            if link["protectiveSystemId"] == psv_id
        ]

    async def create_equipment_link(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("equipmentLinks", []).append(data)
        return data

    async def delete_equipment_link(self, link_id: str) -> bool:
        links = self._data.get("equipmentLinks", [])
        for i, link in enumerate(links):
            if link["id"] == link_id:
                del links[i]
                return True
        return False
    
    # --- Attachments ---
    
    async def get_attachments_by_psv(self, psv_id: str) -> List[dict]:
        return [a for a in self._data.get("attachments", []) if a["protectiveSystemId"] == psv_id]
    
    async def create_attachment(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("attachments", []).append(data)
        return data
    
    async def delete_attachment(self, attachment_id: str) -> bool:
        attachments = self._data.get("attachments", [])
        for i, att in enumerate(attachments):
            if att["id"] == attachment_id:
                del attachments[i]
                return True
        return False
    
    # --- Comments & Notes ---

    async def get_comments_by_psv(self, psv_id: str) -> List[dict]:
        return [c for c in self._data.get("comments", []) if c["protectiveSystemId"] == psv_id]
    
    async def create_comment(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data["updatedAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("comments", []).append(data)
        return data

    async def update_comment(self, comment_id: str, data: dict) -> dict:
        comments = self._data.get("comments", [])
        for i, comment in enumerate(comments):
            if comment["id"] == comment_id:
                updated = {
                    **comment,
                    **data,
                    "updatedAt": datetime.utcnow().isoformat(),
                }
                comments[i] = updated
                return updated
        raise ValueError(f"Comment not found: {comment_id}")

    async def delete_comment(self, comment_id: str) -> bool:
        comments = self._data.get("comments", [])
        for i, comment in enumerate(comments):
            if comment["id"] == comment_id:
                del comments[i]
                return True
        return False

    async def get_notes_by_psv(self, psv_id: str) -> List[dict]:
        return [n for n in self._data.get("notes", []) if n["protectiveSystemId"] == psv_id]

    async def create_note(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        data.setdefault("updatedAt", None)
        self._data.setdefault("notes", []).append(data)
        return data

    async def update_note(self, note_id: str, data: dict) -> dict:
        notes = self._data.get("notes", [])
        for i, note in enumerate(notes):
            if note["id"] == note_id:
                updated = {
                    **note,
                    **data,
                    "updatedAt": data.get("updatedAt") or datetime.utcnow().isoformat(),
                }
                notes[i] = updated
                return updated
        raise ValueError(f"Note not found: {note_id}")

    async def delete_note(self, note_id: str) -> bool:
        notes = self._data.get("notes", [])
        for i, note in enumerate(notes):
            if note["id"] == note_id:
                del notes[i]
                return True
        return False
    
    # --- Todos ---
    
    async def get_todos_by_psv(self, psv_id: str) -> List[dict]:
        return [t for t in self._data.get("todos", []) if t["protectiveSystemId"] == psv_id]
    
    async def create_todo(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("todos", []).append(data)
        return data
    
    async def update_todo(self, todo_id: str, data: dict) -> dict:
        for i, todo in enumerate(self._data.get("todos", [])):
            if todo["id"] == todo_id:
                data["id"] = todo_id
                self._data["todos"][i] = {**todo, **data}
                return self._data["todos"][i]
        raise ValueError(f"Todo not found: {todo_id}")

    async def delete_todo(self, todo_id: str) -> bool:
        todos = self._data.get("todos", [])
        for i, todo in enumerate(todos):
            if todo["id"] == todo_id:
                del todos[i]
                return True
        return False

    # --- Revision History ---

    async def get_revisions_by_entity(self, entity_type: str, entity_id: str) -> List[dict]:
        """Get revisions for an entity, ordered by originator signed date descending."""
        revisions = self._data.get("revisionHistory", [])
        filtered = [r for r in revisions if r["entityType"] == entity_type and r["entityId"] == entity_id]
        def sort_key(item: dict) -> tuple:
            # Primary: originatedAt (originator signed date), fallback: createdAt, then sequence.
            return (
                item.get("originatedAt") or "",
                item.get("createdAt") or "",
                item.get("sequence", 0),
            )
        return sorted(filtered, key=sort_key, reverse=True)

    async def get_revision_by_id(self, revision_id: str) -> Optional[dict]:
        for rev in self._data.get("revisionHistory", []):
            if rev["id"] == revision_id:
                return rev
        return None

    async def create_revision(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("revisionHistory", []).append(data)
        return data

    async def update_revision(self, revision_id: str, data: dict) -> dict:
        for i, rev in enumerate(self._data.get("revisionHistory", [])):
            if rev["id"] == revision_id:
                next_rev = {**rev, **data}
                self._data["revisionHistory"][i] = next_rev

                # If this is the current revision of a PSV, derive PSV status.
                if next_rev.get("entityType") == "protective_system":
                    psv_id = next_rev.get("entityId")
                    if psv_id:
                        for j, psv in enumerate(self._data.get("protectiveSystems", [])):
                            if psv.get("id") == psv_id and psv.get("currentRevisionId") == revision_id and psv.get("status") != "issued":
                                next_status = "draft"
                                if next_rev.get("originatedBy"):
                                    next_status = "in_review"
                                    if next_rev.get("checkedBy"):
                                        next_status = "checked"
                                        if next_rev.get("approvedBy"):
                                            next_status = "approved"
                                self._data["protectiveSystems"][j] = {**psv, "status": next_status}
                                break

                return next_rev
        raise ValueError(f"Revision not found: {revision_id}")

    async def delete_revision(self, revision_id: str) -> bool:
        revisions = self._data.get("revisionHistory", [])
        for i, rev in enumerate(revisions):
            if rev.get("id") == revision_id:
                del revisions[i]
                # Clear currentRevisionId + set status draft for affected PSVs (unless issued).
                for j, psv in enumerate(self._data.get("protectiveSystems", [])):
                    if psv.get("currentRevisionId") == revision_id:
                        next = {**psv, "currentRevisionId": None}
                        if next.get("status") != "issued":
                            next["status"] = "draft"
                        self._data["protectiveSystems"][j] = next
                return True
        return False

    # --- Equipment CRUD (abstract methods) ---

    async def create_equipment(self, data: dict) -> dict:
        data["id"] = str(uuid4())
        data["createdAt"] = datetime.utcnow().isoformat()
        self._data.setdefault("equipment", []).append(data)
        return data

    async def update_equipment(self, equipment_id: str, data: dict) -> dict:
        for i, eq in enumerate(self._data.get("equipment", [])):
            if eq["id"] == equipment_id:
                self._data["equipment"][i] = {**eq, **data}
                return self._data["equipment"][i]
        raise ValueError(f"Equipment not found: {equipment_id}")

    async def delete_equipment(self, equipment_id: str) -> bool:
        equipment = self._data.get("equipment", [])
        for i, eq in enumerate(equipment):
            if eq["id"] == equipment_id:
                del equipment[i]
                return True
        return False

    # --- Audit Logs (mock in-memory) ---
    
    async def get_audit_logs(self, filters: dict, limit: int, offset: int) -> tuple[list, int]:
        """Get audit logs with filters, returns (logs, total_count)."""
        logs = self._data.get("auditLogs", [])
        
        # Apply filters
        if filters.get("entity_type"):
            logs = [
                log
                for log in logs
                if log.get("entityType") == filters["entity_type"]
            ]
        if filters.get("entity_id"):
            logs = [log for log in logs if log.get("entityId") == filters["entity_id"]]
        if filters.get("user_id"):
            logs = [log for log in logs if log.get("userId") == filters["user_id"]]
        if filters.get("project_id"):
            logs = [log for log in logs if log.get("projectId") == filters["project_id"]]
        if filters.get("action"):
            logs = [log for log in logs if log.get("action") == filters["action"]]
        
        total = len(logs)
        # Sort by createdAt descending
        logs = sorted(logs, key=lambda x: x.get("createdAt", ""), reverse=True)
        return logs[offset:offset + limit], total
    
    async def get_audit_log_by_id(self, log_id: str) -> Optional[dict]:
        """Get a single audit log by ID."""
        for log in self._data.get("auditLogs", []):
            if log.get("id") == log_id:
                return log
        return None
    
    async def create_audit_log(self, data: dict) -> dict:
        """Create a new audit log entry."""
        log = {
            "id": str(uuid4()),
            "action": data.get("action"),
            "entityType": data.get("entityType"),
            "entityId": data.get("entityId"),
            "entityName": data.get("entityName"),
            "userId": data.get("userId"),
            "userName": data.get("userName"),
            "userRole": data.get("userRole"),
            "changes": data.get("changes"),
            "description": data.get("description"),
            "projectId": data.get("projectId"),
            "projectName": data.get("projectName"),
            "createdAt": datetime.utcnow().isoformat(),
        }
        self._data.setdefault("auditLogs", []).insert(0, log)
        return log
    
    async def clear_audit_logs(self) -> int:
        """Clear all audit logs. Returns count of deleted logs."""
        count = len(self._data.get("auditLogs", []))
        self._data["auditLogs"] = []
        return count

    async def get_venting_calculations(
        self,
        area_id: Optional[str] = None,
        equipment_id: Optional[str] = None,
        include_deleted: bool = False,
    ) -> List[dict]:
        calculations = await self.get_calculations(
            include_inactive=include_deleted,
            app="venting-calculation",
        )
        if area_id:
            calculations = [c for c in calculations if c.get("areaId") == area_id]
        if equipment_id:
            calculations = [
                c for c in calculations if c.get("linkedEquipmentId") == equipment_id
            ]
        for calculation in calculations:
            calculation["calculationMetadata"] = calculation.get("metadata", {})
            calculation["equipmentId"] = calculation.get("linkedEquipmentId")
            calculation["revisionHistory"] = _normalize_venting_revision_history(
                calculation.get("revisionHistory", [])
            )
        return calculations

    async def get_venting_calculation_by_id(
        self, calc_id: str, include_deleted: bool = False
    ) -> Optional[dict]:
        calculation = await self.get_calculation_by_id(calc_id)
        if not calculation or calculation.get("app") != "venting-calculation":
            return None
        if not include_deleted and calculation.get("deletedAt") is not None:
            return None
        calculation["calculationMetadata"] = calculation.get("metadata", {})
        calculation["equipmentId"] = calculation.get("linkedEquipmentId")
        calculation["revisionHistory"] = _normalize_venting_revision_history(
            calculation.get("revisionHistory", [])
        )
        return calculation

    async def create_venting_calculation(self, data: dict) -> dict:
        inputs = dict(data.get("inputs") or {})
        if "apiEdition" in data and "apiEdition" not in inputs:
            inputs["apiEdition"] = data["apiEdition"]
        calculation = await self.create_calculation(
            {
                "app": "venting-calculation",
                "areaId": data.get("areaId"),
                "ownerId": data.get("ownerId"),
                "name": data.get("name"),
                "description": data.get("description") or "",
                "status": data.get("status") or "draft",
                "tag": inputs.get("tankNumber") if isinstance(inputs.get("tankNumber"), str) else None,
                "inputs": inputs,
                "results": data.get("results"),
                "metadata": data.get("calculationMetadata") or {},
                "revisionHistory": _normalize_venting_revision_history(data.get("revisionHistory", [])),
                "linkedEquipmentId": data.get("equipmentId"),
                "linkedEquipmentTag": None,
            }
        )
        calculation["calculationMetadata"] = calculation.get("metadata", {})
        calculation["equipmentId"] = calculation.get("linkedEquipmentId")
        return calculation

    async def update_venting_calculation(self, calc_id: str, data: dict) -> dict:
        calculation = await self.get_calculation_by_id(calc_id)
        if not calculation or calculation.get("app") != "venting-calculation":
            raise ValueError(f"Venting calculation not found: {calc_id}")
        next_inputs = dict(calculation.get("inputs") or {})
        if "inputs" in data and isinstance(data["inputs"], dict):
            next_inputs = data["inputs"]
        if "apiEdition" in data:
            next_inputs["apiEdition"] = data["apiEdition"]
        updated = await self.update_calculation(
            calc_id,
            {
                "name": data.get("name", calculation.get("name")),
                "description": data.get("description", calculation.get("description") or ""),
                "status": data.get("status", calculation.get("status") or "draft"),
                "tag": next_inputs.get("tankNumber") if isinstance(next_inputs.get("tankNumber"), str) else calculation.get("tag"),
                "inputs": next_inputs,
                "results": data.get("results", calculation.get("results")),
                "metadata": data.get("calculationMetadata", calculation.get("metadata") or {}),
                "revisionHistory": _normalize_venting_revision_history(
                    data.get("revisionHistory", calculation.get("revisionHistory") or [])
                ),
                "linkedEquipmentId": calculation.get("linkedEquipmentId"),
                "linkedEquipmentTag": calculation.get("linkedEquipmentTag"),
            },
        )
        if "isActive" in data and data["isActive"] is False:
            await self.delete_calculation(calc_id)
            refreshed = await self.get_calculation_by_id(calc_id)
            if refreshed is not None:
                updated = refreshed
        updated["calculationMetadata"] = updated.get("metadata", {})
        updated["equipmentId"] = updated.get("linkedEquipmentId")
        updated["revisionHistory"] = _normalize_venting_revision_history(
            updated.get("revisionHistory", [])
        )
        return updated

    async def delete_venting_calculation(self, calc_id: str) -> bool:
        calculation = await self.get_calculation_by_id(calc_id)
        if not calculation or calculation.get("app") != "venting-calculation":
            return False
        return await self.delete_calculation(calc_id)

    async def restore_venting_calculation(self, calc_id: str) -> dict:
        calculation = await self.get_calculation_by_id(calc_id)
        if not calculation or calculation.get("app") != "venting-calculation":
            raise ValueError(f"Venting calculation not found: {calc_id}")
        latest_version_id = calculation.get("latestVersionId")
        if not latest_version_id:
            raise ValueError("Venting calculation has no versions")
        restored = await self.restore_calculation(calc_id, latest_version_id)
        restored["calculationMetadata"] = restored.get("metadata", {})
        restored["equipmentId"] = restored.get("linkedEquipmentId")
        restored["revisionHistory"] = _normalize_venting_revision_history(
            restored.get("revisionHistory", [])
        )
        return restored

    async def get_network_designs(self, area_id: Optional[str] = None) -> List[dict]:
        designs = self._data.get("networkDesigns", [])
        if area_id:
            designs = [design for design in designs if design.get("areaId") == area_id]
        return designs

    async def get_network_design_by_id(self, design_id: str) -> Optional[dict]:
        for design in self._data.get("networkDesigns", []):
            if design.get("id") == design_id:
                return design
        return None

    async def create_network_design(self, data: dict) -> dict:
        design = {
            **data,
            "id": str(uuid4()),
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        }
        self._data.setdefault("networkDesigns", []).append(design)
        return design

    async def update_network_design(self, design_id: str, data: dict) -> dict:
        designs = self._data.get("networkDesigns", [])
        for i, design in enumerate(designs):
            if design.get("id") == design_id:
                updated = {
                    **design,
                    **data,
                    "id": design_id,
                    "updatedAt": datetime.utcnow().isoformat(),
                }
                designs[i] = updated
                return updated
        raise ValueError(f"Network design not found: {design_id}")

    async def delete_network_design(self, design_id: str) -> bool:
        designs = self._data.get("networkDesigns", [])
        for i, design in enumerate(designs):
            if design.get("id") == design_id:
                del designs[i]
                return True
        return False

    async def get_design_agent_sessions(
        self, owner_id: Optional[str] = None
    ) -> List[dict]:
        sessions = self._data.get("designAgentSessions", [])
        if owner_id:
            sessions = [session for session in sessions if session.get("ownerId") == owner_id]
        return sessions

    async def get_design_agent_session_by_id(self, session_id: str) -> Optional[dict]:
        for session in self._data.get("designAgentSessions", []):
            if session.get("id") == session_id:
                return session
        return None

    async def create_design_agent_session(self, data: dict) -> dict:
        session = {
            **data,
            "id": str(uuid4()),
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        }
        self._data.setdefault("designAgentSessions", []).append(session)
        return session

    async def update_design_agent_session(self, session_id: str, data: dict) -> dict:
        sessions = self._data.get("designAgentSessions", [])
        for i, session in enumerate(sessions):
            if session.get("id") == session_id:
                updated = {
                    **session,
                    **data,
                    "id": session_id,
                    "updatedAt": datetime.utcnow().isoformat(),
                }
                sessions[i] = updated
                return updated
        raise ValueError(f"Design agent session not found: {session_id}")

    async def delete_design_agent_session(self, session_id: str) -> bool:
        sessions = self._data.get("designAgentSessions", [])
        for i, session in enumerate(sessions):
            if session.get("id") == session_id:
                del sessions[i]
                return True
        return False

    # --- Instrument Links ---

    def _find_eo(self, object_id: str) -> Optional[dict]:
        """Find a live engineering object by UUID."""
        for obj in self._data.get("engineeringObjects", []):
            if obj.get("uuid") == object_id or obj.get("id") == object_id:
                if obj.get("deletedAt") is None:
                    return obj
        return None

    async def list_instrument_links(
        self,
        *,
        instrument_id: Optional[str] = None,
        target_id: Optional[str] = None,
        relationship_type: Optional[str] = None,
        protective_system_id: Optional[str] = None,
    ) -> List[dict]:
        links = list(self._data.get("instrumentLinks", []))
        if instrument_id:
            links = [lk for lk in links if lk.get("instrumentId") == instrument_id]
        if target_id:
            links = [lk for lk in links if lk.get("targetId") == target_id]
        if relationship_type:
            links = [lk for lk in links if lk.get("relationshipType") == relationship_type]
        if protective_system_id:
            links = [lk for lk in links if lk.get("protectiveSystemId") == protective_system_id]
        return sorted(links, key=lambda lk: lk.get("createdAt") or "", reverse=True)

    async def create_instrument_link(self, data: dict) -> dict:
        instrument = self._find_eo(data["instrumentId"])
        if instrument is None:
            raise ValueError(f"Engineering object '{data['instrumentId']}' not found")
        if (instrument.get("object_type") or instrument.get("objectType") or "").strip().upper() != "INSTRUMENT":
            raise TypeError(
                f"instrument_id must reference an INSTRUMENT object; got '{instrument.get('object_type') or instrument.get('objectType')}'"
            )
        target = self._find_eo(data["targetId"])
        if target is None:
            raise ValueError(f"Target engineering object '{data['targetId']}' not found")
        # Unique check
        for lk in self._data.get("instrumentLinks", []):
            if (
                lk.get("instrumentId") == data["instrumentId"]
                and lk.get("targetId") == data["targetId"]
                and lk.get("relationshipType") == data["relationshipType"]
            ):
                from sqlalchemy.exc import IntegrityError
                raise IntegrityError(
                    "duplicate instrument link", params=None, orig=Exception("mock unique violation")
                )
        now = datetime.utcnow().isoformat()
        link = {
            "id": str(uuid4()),
            "instrumentId": data["instrumentId"],
            "targetId": data["targetId"],
            "relationshipType": data["relationshipType"],
            "protectiveSystemId": data.get("protectiveSystemId"),
            "notes": data.get("notes"),
            "createdAt": now,
            "updatedAt": now,
        }
        self._data.setdefault("instrumentLinks", []).append(link)
        return link

    async def update_instrument_link(self, link_id: str, data: dict) -> Optional[dict]:
        links = self._data.get("instrumentLinks", [])
        for i, lk in enumerate(links):
            if lk.get("id") == link_id:
                updated = {
                    **lk,
                    **{k: v for k, v in data.items() if k in ("relationshipType", "protectiveSystemId", "notes")},
                    "updatedAt": datetime.utcnow().isoformat(),
                }
                links[i] = updated
                return updated
        return None

    async def delete_instrument_link(self, link_id: str) -> bool:
        links = self._data.get("instrumentLinks", [])
        for i, lk in enumerate(links):
            if lk.get("id") == link_id:
                del links[i]
                return True
        return False
