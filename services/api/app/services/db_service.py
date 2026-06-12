"""Database implementation of DataAccessLayer using SQLAlchemy."""
import logging
from datetime import UTC, datetime
from typing import Any, List, Optional, Type, TypeVar
from uuid import uuid4
from dateutil import parser as dateutil_parser

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, delete, desc, select, update
from sqlalchemy.sql import nullslast
from sqlalchemy.orm import selectinload

from ..models import (
    User, Credential, Customer, Plant, Unit, Area, Project,
    ProtectiveSystem, OverpressureScenario, SizingCase,
    Equipment,
    EquipmentColumn,
    EquipmentCompressor,
    EquipmentLink,
    EquipmentPump,
    EquipmentTank,
    EquipmentVendorPackage,
    EquipmentVessel,
    Attachment,
    Comment,
    Todo,
    ProjectNote, RevisionHistory,
    NetworkDesign,
    DesignAgentSession,
    EngineeringObject,
    Calculation,
    CalculationVersion,
)
from .dal import DataAccessLayer
from .equipment_subtypes import build_details_from_subtype_row, build_subtype_row_values
from . import calculation_register

logger = logging.getLogger(__name__)

T = TypeVar("T")


class AttrDict(dict):
    def __getattr__(self, key: str) -> Any:
        try:
            return self[key]
        except KeyError as exc:
            raise AttributeError(key) from exc

class DatabaseService(DataAccessLayer):
    """PostgreSQL implementation of DataAccessLayer."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._equipment_subtype_models: dict[str, type[Any]] = {
            "vessel": EquipmentVessel,
            "column": EquipmentColumn,
            "tank": EquipmentTank,
            "pump": EquipmentPump,
            "compressor": EquipmentCompressor,
            "vendor_package": EquipmentVendorPackage,
        }

    # --- Generic Helpers ---

    async def _get_all(self, model: Type[T], *filters) -> List[T]:
        stmt = select(model).where(*filters)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_by_id(self, model: Type[T], id: str, options=None) -> Optional[T]:
        stmt = select(model).where(model.id == id)
        if options:
            stmt = stmt.options(*options)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _create(self, model: Type[T], data: dict) -> T:
        instance = model(**data)
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def _update(self, model: Type[T], id: str, data: dict) -> T:
        stmt = update(model).where(model.id == id).values(**data).returning(model)
        result = await self.session.execute(stmt)
        instance = result.scalar_one()
        await self.session.commit()
        return instance

    async def _delete(self, model: Type[T], id: str) -> bool:
        stmt = delete(model).where(model.id == id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0

    async def _delete_equipment_subtype_rows(self, equipment_id: str) -> None:
        for subtype_model in self._equipment_subtype_models.values():
            await self.session.execute(
                delete(subtype_model).where(subtype_model.equipment_id == equipment_id)
            )

    async def _write_equipment_subtype_from_details(
        self, equipment_id: str, equipment_type: str, details: Optional[dict]
    ) -> None:
        await self._delete_equipment_subtype_rows(equipment_id)
        model = self._equipment_subtype_models.get(equipment_type)
        values = build_subtype_row_values(equipment_type, details)
        if model is None or values is None:
            return
        row = model(equipment_id=equipment_id, **values)
        self.session.add(row)

    async def _hydrate_equipment_details_from_subtypes(
        self, equipment_list: list[Equipment]
    ) -> None:
        ids_by_type: dict[str, list[str]] = {}
        for item in equipment_list:
            if item.type in self._equipment_subtype_models:
                ids_by_type.setdefault(item.type, []).append(item.id)

        subtype_rows_by_id: dict[str, dict[str, Any]] = {}
        for equipment_type, ids in ids_by_type.items():
            model = self._equipment_subtype_models[equipment_type]
            stmt = select(model).where(model.equipment_id.in_(ids))
            result = await self.session.execute(stmt)
            subtype_rows_by_id[equipment_type] = {
                row.equipment_id: row for row in result.scalars().all()
            }

        for item in equipment_list:
            if item.type not in subtype_rows_by_id:
                continue
            row = subtype_rows_by_id[item.type].get(item.id)
            details = build_details_from_subtype_row(item.type, row)
            if details is not None:
                item.details = details

    def _snapshot_protective_system(self, instance: ProtectiveSystem) -> AttrDict:
        return AttrDict(
            {
                'id': instance.id,
                'area_id': instance.area_id,
                'project_ids': [project.id for project in instance.projects],
                'name': instance.name,
                'tag': instance.tag,
                'type': instance.type,
                'design_code': instance.design_code,
                'service_fluid': instance.service_fluid,
                'fluid_phase': instance.fluid_phase,
                'set_pressure': instance.set_pressure,
                'mawp': instance.mawp,
                'owner_id': instance.owner_id,
                'status': instance.status,
                'valve_type': instance.valve_type,
                'tags': list(instance.tags or []),
                'current_revision_id': instance.current_revision_id,
                'inlet_network': instance.inlet_network,
                'outlet_network': instance.outlet_network,
                'is_active': instance.is_active,
                'deleted_at': instance.deleted_at,
                'version': instance.version,
                'created_at': instance.created_at,
                'updated_at': instance.updated_at,
            }
        )

    def _normalize_calculation_revision_history(self, value: Any) -> list[dict]:
        if not isinstance(value, list):
            return []
        normalized: list[dict] = []
        for item in value:
            if not isinstance(item, dict):
                continue
            normalized.append(
                {
                    'rev': str(item.get('rev') or ''),
                    'by': str(item.get('by') or ''),
                    'byDate': str(item.get('byDate') or ''),
                    'checkedBy': str(item.get('checkedBy') or ''),
                    'checkedDate': str(item.get('checkedDate') or ''),
                    'approvedBy': str(item.get('approvedBy') or ''),
                    'approvedDate': str(item.get('approvedDate') or ''),
                }
            )
        return normalized

    def _serialize_calculation(
        self,
        calculation: Calculation,
        revision_history: list[Any] | None = None,
        project: tuple[str, str] | None = None,
    ) -> dict[str, Any]:
        # current_revision_history was dropped (migration 202605040002); the
        # revision history now lives on the latest calculation_version and is
        # passed in by the caller (see _latest_revision_history).
        rows = revision_history or []
        last_row = rows[-1] if rows else None
        return {
            'id': calculation.id,
            'app': calculation.app,
            'areaId': calculation.area_id,
            'ownerId': calculation.owner_id,
            'name': calculation.name,
            'description': calculation.description or '',
            'status': calculation.status,
            'tag': calculation.tag,
            'isActive': calculation.is_active,
            'projectId': calculation.project_id,
            'projectCode': project[0] if project else None,
            'projectName': project[1] if project else None,
            'calcNumber': calculation.calc_number,
            'discipline': calculation.discipline,
            'currentRevisionCode': (last_row.get('rev') or None) if isinstance(last_row, dict) else None,
            'linkedEquipmentId': calculation.linked_equipment_id,
            'linkedEquipmentTag': calculation.linked_equipment_tag,
            'latestVersionNo': calculation.latest_version_no,
            'latestVersionId': calculation.latest_version_id,
            'inputs': calculation.current_input_snapshot or {},
            'results': calculation.current_result_snapshot,
            'metadata': calculation.current_metadata or {},
            'revisionHistory': rows,
            'createdAt': calculation.created_at.isoformat() if calculation.created_at else None,
            'updatedAt': calculation.updated_at.isoformat() if calculation.updated_at else None,
            'deletedAt': calculation.deleted_at.isoformat() if calculation.deleted_at else None,
        }

    async def _project_brief(self, project_id: str | None) -> tuple[str, str] | None:
        if not project_id:
            return None
        stmt = select(Project.code, Project.name).where(Project.id == project_id)
        row = (await self.session.execute(stmt)).first()
        return (row.code, row.name) if row else None

    async def _latest_revision_history(self, calculation: Calculation) -> list[Any]:
        """Load just the revision_history of a calculation's latest version.

        Selects only the JSONB revision_history column (not the full version
        row) to keep serialization cheap.
        """
        if not calculation.latest_version_id:
            return []
        stmt = select(CalculationVersion.revision_history).where(
            CalculationVersion.id == calculation.latest_version_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() or []

    def _serialize_calculation_version(self, version: CalculationVersion) -> dict[str, Any]:
        return {
            'id': version.id,
            'calculationId': version.calculation_id,
            'versionNo': version.version_no,
            'versionKind': version.version_kind,
            'inputs': version.inputs or {},
            'results': version.results,
            'metadata': version.metadata_payload or {},
            'revisionHistory': version.revision_history or [],
            'linkedEquipmentId': version.linked_equipment_id,
            'linkedEquipmentTag': version.linked_equipment_tag,
            'sourceVersionId': version.source_version_id,
            'changeNote': version.change_note,
            'createdAt': version.created_at.isoformat() if version.created_at else None,
        }

    def _build_calculation_state(self, data: dict[str, Any], current: dict[str, Any] | None = None) -> dict[str, Any]:
        base = current or {}
        inputs = data['inputs'] if 'inputs' in data else base.get('inputs', {})
        return {
            'app': data.get('app', base.get('app')),
            'area_id': data.get('areaId', base.get('areaId')),
            'owner_id': data.get('ownerId', base.get('ownerId')),
            'name': data.get('name', base.get('name')),
            'description': data.get('description', base.get('description') or ''),
            'status': data.get('status', base.get('status') or 'draft'),
            'tag': data.get('tag') or (inputs.get('tag') if isinstance(inputs, dict) else None) or base.get('tag'),
            'inputs': inputs or {},
            'results': data['results'] if 'results' in data else base.get('results'),
            'metadata': data.get('metadata', base.get('metadata') or {}),
            'revisionHistory': self._normalize_calculation_revision_history(
                data.get('revisionHistory', base.get('revisionHistory') or [])
            ),
            'linkedEquipmentId': data.get('linkedEquipmentId', base.get('linkedEquipmentId')),
            'linkedEquipmentTag': data.get('linkedEquipmentTag', base.get('linkedEquipmentTag')),
        }

    async def _create_calculation_version(
        self,
        calculation_id: str,
        version_no: int,
        version_kind: str,
        state: dict[str, Any],
        source_version_id: str | None = None,
        change_note: str | None = None,
    ) -> CalculationVersion:
        version = CalculationVersion(
            calculation_id=calculation_id,
            version_no=version_no,
            version_kind=version_kind,
            inputs=state['inputs'],
            results=state['results'],
            metadata_payload=state['metadata'],
            revision_history=state['revisionHistory'],
            linked_equipment_id=state['linkedEquipmentId'],
            linked_equipment_tag=state['linkedEquipmentTag'],
            source_version_id=source_version_id,
            change_note=change_note,
        )
        self.session.add(version)
        await self.session.flush()
        return version

    async def get_calculations(
        self,
        include_inactive: bool = False,
        app: str | None = None,
        *,
        project_id: str | None = None,
        discipline: str | None = None,
        status: str | None = None,
        calc_number: str | None = None,
    ) -> list[dict[str, Any]]:
        stmt = select(Calculation)
        if not include_inactive:
            stmt = stmt.where(Calculation.is_active.is_(True))
        if app:
            stmt = stmt.where(Calculation.app == app)
        if project_id:
            stmt = stmt.where(Calculation.project_id == project_id)
        if discipline:
            stmt = stmt.where(Calculation.discipline == discipline)
        if status:
            stmt = stmt.where(Calculation.status == status)
        if calc_number:
            stmt = stmt.where(Calculation.calc_number.ilike(f'%{calc_number}%'))
        stmt = stmt.order_by(desc(Calculation.updated_at))
        result = await self.session.execute(stmt)
        calculations = result.scalars().all()
        # Batch-load latest-version revision histories in one query (avoids N+1).
        version_ids = [c.latest_version_id for c in calculations if c.latest_version_id]
        rh_map: dict[str, list[Any]] = {}
        if version_ids:
            rh_stmt = select(
                CalculationVersion.id, CalculationVersion.revision_history
            ).where(CalculationVersion.id.in_(version_ids))
            for vid, rh in (await self.session.execute(rh_stmt)).all():
                rh_map[vid] = rh or []
        # Batch-load project code/name for register display.
        project_ids = {c.project_id for c in calculations if c.project_id}
        project_map: dict[str, tuple[str, str]] = {}
        if project_ids:
            p_stmt = select(Project.id, Project.code, Project.name).where(
                Project.id.in_(project_ids)
            )
            for pid, code, pname in (await self.session.execute(p_stmt)).all():
                project_map[pid] = (code, pname)
        return [
            self._serialize_calculation(
                item,
                rh_map.get(item.latest_version_id, []),
                project_map.get(item.project_id),
            )
            for item in calculations
        ]

    async def get_next_calc_number(
        self,
        project_id: str,
        discipline: str | None = None,
    ) -> dict[str, Any] | None:
        return await calculation_register.suggest_next_calc_number(
            self.session, project_id, discipline
        )

    async def get_calculation_by_id(self, calculation_id: str) -> dict[str, Any] | None:
        calculation = await self._get_by_id(Calculation, calculation_id)
        if not calculation:
            return None
        revision_history = await self._latest_revision_history(calculation)
        project = await self._project_brief(calculation.project_id)
        return self._serialize_calculation(calculation, revision_history, project)

    async def create_calculation(self, data: dict[str, Any]) -> dict[str, Any]:
        state = self._build_calculation_state(data)
        calculation = Calculation(
            app=state['app'],
            area_id=state['area_id'],
            owner_id=state['owner_id'],
            name=state['name'],
            description=state['description'],
            status=state['status'],
            tag=state['tag'],
            is_active=True,
            linked_equipment_id=state['linkedEquipmentId'],
            linked_equipment_tag=state['linkedEquipmentTag'],
            latest_version_no=1,
            current_input_snapshot=state['inputs'],
            current_result_snapshot=state['results'],
            current_metadata=state['metadata'],
        )
        self.session.add(calculation)
        await self.session.flush()
        version = await self._create_calculation_version(calculation.id, 1, 'save', state)
        calculation.latest_version_id = version.id
        await calculation_register.apply_register_state(
            self.session, calculation, data, state['revisionHistory']
        )
        await self.session.commit()
        await self.session.refresh(calculation)
        project = await self._project_brief(calculation.project_id)
        return self._serialize_calculation(calculation, state['revisionHistory'], project)

    async def update_calculation(self, calculation_id: str, data: dict[str, Any]) -> dict[str, Any]:
        calculation = await self._get_by_id(Calculation, calculation_id)
        if not calculation:
            raise ValueError('Calculation not found')
        existing_revision_history = await self._latest_revision_history(calculation)
        current = self._serialize_calculation(calculation, existing_revision_history)
        state = self._build_calculation_state(data, current)
        next_version_no = calculation.latest_version_no + 1
        version = await self._create_calculation_version(
            calculation.id,
            next_version_no,
            'save',
            state,
            change_note=data.get('changeNote'),
        )
        calculation.name = state['name']
        calculation.description = state['description']
        calculation.status = state['status']
        calculation.tag = state['tag']
        calculation.linked_equipment_id = state['linkedEquipmentId']
        calculation.linked_equipment_tag = state['linkedEquipmentTag']
        calculation.latest_version_no = next_version_no
        calculation.latest_version_id = version.id
        calculation.current_input_snapshot = state['inputs']
        calculation.current_result_snapshot = state['results']
        calculation.current_metadata = state['metadata']
        await calculation_register.apply_register_state(
            self.session, calculation, data, state['revisionHistory']
        )
        await self.session.commit()
        await self.session.refresh(calculation)
        project = await self._project_brief(calculation.project_id)
        return self._serialize_calculation(calculation, state['revisionHistory'], project)

    async def delete_calculation(self, calculation_id: str) -> bool:
        calculation = await self._get_by_id(Calculation, calculation_id)
        if not calculation:
            return False
        calculation.is_active = False
        calculation.deleted_at = datetime.now(UTC)
        await self.session.commit()
        return True

    async def get_calculation_versions(self, calculation_id: str) -> list[dict[str, Any]]:
        stmt = (
            select(CalculationVersion)
            .where(CalculationVersion.calculation_id == calculation_id)
            .order_by(desc(CalculationVersion.version_no))
        )
        result = await self.session.execute(stmt)
        return [self._serialize_calculation_version(item) for item in result.scalars().all()]

    async def get_calculation_version_by_id(
        self,
        calculation_id: str,
        version_id: str,
    ) -> dict[str, Any] | None:
        stmt = select(CalculationVersion).where(
            CalculationVersion.calculation_id == calculation_id,
            CalculationVersion.id == version_id,
        )
        result = await self.session.execute(stmt)
        version = result.scalar_one_or_none()
        if not version:
            return None
        return self._serialize_calculation_version(version)

    async def restore_calculation(
        self,
        calculation_id: str,
        version_id: str,
        change_note: str | None = None,
    ) -> dict[str, Any]:
        calculation = await self._get_by_id(Calculation, calculation_id)
        if not calculation:
            raise ValueError('Calculation not found')
        stmt = select(CalculationVersion).where(
            CalculationVersion.calculation_id == calculation_id,
            CalculationVersion.id == version_id,
        )
        result = await self.session.execute(stmt)
        source_version = result.scalar_one_or_none()
        if not source_version:
            raise ValueError('Calculation version not found')
        state = {
            'inputs': source_version.inputs or {},
            'results': source_version.results,
            'metadata': source_version.metadata_payload or {},
            'revisionHistory': source_version.revision_history or [],
            'linkedEquipmentId': source_version.linked_equipment_id,
            'linkedEquipmentTag': source_version.linked_equipment_tag,
            'name': calculation.name,
            'description': calculation.description,
            'status': calculation.status,
            'tag': calculation.tag,
        }
        next_version_no = calculation.latest_version_no + 1
        restored_version = await self._create_calculation_version(
            calculation.id,
            next_version_no,
            'restore',
            state,
            source_version_id=source_version.id,
            change_note=change_note,
        )
        calculation.latest_version_no = next_version_no
        calculation.latest_version_id = restored_version.id
        calculation.current_input_snapshot = state['inputs']
        calculation.current_result_snapshot = state['results']
        calculation.current_metadata = state['metadata']
        calculation.linked_equipment_id = state['linkedEquipmentId']
        calculation.linked_equipment_tag = state['linkedEquipmentTag']
        calculation.is_active = True
        calculation.deleted_at = None
        # Re-lift register fields from the restored metadata and re-mirror the
        # restored sign-off rows.
        await calculation_register.apply_register_state(
            self.session,
            calculation,
            {'metadata': state['metadata']},
            state['revisionHistory'],
        )
        await self.session.commit()
        await self.session.refresh(calculation)
        project = await self._project_brief(calculation.project_id)
        return self._serialize_calculation(calculation, state['revisionHistory'], project)

    # --- Users & Auth ---

    async def get_users(self) -> List[dict]:
        return await self._get_all(User)

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        return await self._get_by_id(User, user_id)

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_credential_by_username(self, username: str) -> Optional[dict]:
        stmt = select(Credential).where(Credential.username == username)
        result = await self.session.execute(stmt)
        cred = result.scalar_one_or_none()
        # Ensure 'user' relation is loaded if needed, or join
        # But credential usually just needs hash + user_id
        return cred

    async def update_credential_login(self, credential_id: str, success: bool) -> None:
        data = {"last_login": datetime.now(UTC)} if success else {}
        # We might track failed attempts too if model supports it
        if data:
            await self._update(Credential, credential_id, data)

    # --- Hierarchy ---

    async def get_customers(self) -> List[dict]:
        return await self._get_all(Customer)

    async def get_plants_by_customer(self, customer_id: str) -> List[dict]:
        return await self._get_all(Plant, Plant.customer_id == customer_id)

    async def get_units_by_plant(self, plant_id: str) -> List[dict]:
        return await self._get_all(Unit, Unit.plant_id == plant_id)

    async def get_areas_by_unit(self, unit_id: str) -> List[dict]:
        return await self._get_all(Area, Area.unit_id == unit_id)

    async def get_projects_by_area(self, area_id: str) -> List[dict]:
        return await self._get_all(Project, Project.area_id == area_id)

    async def get_area_by_id(self, area_id: str) -> Optional[dict]:
        return await self._get_by_id(Area, area_id)

    async def get_unit_by_id(self, unit_id: str) -> Optional[dict]:
        return await self._get_by_id(Unit, unit_id)

    async def get_plant_by_id(self, plant_id: str) -> Optional[dict]:
        return await self._get_by_id(Plant, plant_id)

    async def get_customer_by_id(self, customer_id: str) -> Optional[dict]:
        return await self._get_by_id(Customer, customer_id)

    async def create_customer(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Customer, converted_data)

    async def update_customer(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Customer, id, converted_data)

    async def delete_customer(self, id: str) -> bool:
        return await self._delete(Customer, id)

    async def create_plant(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Plant, converted_data)

    async def update_plant(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Plant, id, converted_data)

    async def delete_plant(self, id: str) -> bool:
        return await self._delete(Plant, id)

    async def create_unit(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Unit, converted_data)

    async def update_unit(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Unit, id, converted_data)

    async def delete_unit(self, id: str) -> bool:
        return await self._delete(Unit, id)

    async def create_area(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Area, converted_data)

    async def update_area(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Area, id, converted_data)

    async def delete_area(self, id: str) -> bool:
        return await self._delete(Area, id)

    async def create_project(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Project, converted_data)

    async def update_project(self, id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Project, id, converted_data)

    async def delete_project(self, id: str) -> bool:
        return await self._delete(Project, id)

    # --- Protective Systems (PSV) ---

    async def get_protective_systems(
        self, area_id: Optional[str] = None, include_deleted: bool = False
    ) -> List[dict]:
        filters = []
        if area_id:
            filters.append(ProtectiveSystem.area_id == area_id)
        if not include_deleted:
            filters.append(ProtectiveSystem.deleted_at.is_(None))
        
        # Eager load projects for 'projectIds' property
        stmt = select(ProtectiveSystem).where(*filters).options(
            selectinload(ProtectiveSystem.projects)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_protective_system_by_id(
        self, psv_id: str, include_deleted: bool = False
    ) -> Optional[dict]:
        # Eager load projects
        stmt = select(ProtectiveSystem).where(ProtectiveSystem.id == psv_id).options(
            selectinload(ProtectiveSystem.projects)
        )
        if not include_deleted:
            stmt = stmt.where(ProtectiveSystem.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_protective_system(self, data: dict) -> dict:
        # Convert camelCase keys to snake_case for ORM
        converted_data = self._convert_keys(data)
        
        # Remove fields that are relationships or properties
        project_ids = converted_data.pop('projectIds', None) or converted_data.pop('project_ids', None)
        clean_data = {k: v for k, v in converted_data.items() if k not in ['projects']}
        
        instance = ProtectiveSystem(**clean_data)
        
        # Handle project links
        if project_ids:
            stmt = select(Project).where(Project.id.in_(project_ids))
            result = await self.session.execute(stmt)
            instance.projects = list(result.scalars().all())
            
        self.session.add(instance)
        await self.session.commit()
        
        # Refresh to ensure timestamps and scalar columns have latest values
        await self.session.refresh(instance)
        # Ensure projects relationship stays loaded
        await self.session.refresh(instance, attribute_names=['projects'])
        return self._snapshot_protective_system(instance)

    async def update_protective_system(self, psv_id: str, data: dict) -> dict:
        # Convert camelCase keys to snake_case for ORM
        converted_data = self._convert_keys(data)
        
        project_ids = converted_data.pop('projectIds', None) or converted_data.pop('project_ids', None)
        clean_data = {k: v for k, v in converted_data.items() if k not in ['projects']}
        
        # Load instance with projects relationship
        instance = await self._get_by_id(
            ProtectiveSystem, 
            psv_id, 
            options=[selectinload(ProtectiveSystem.projects)]
        )
        if not instance:
            raise ValueError(f"PSV {psv_id} not found")
        
        # Optimistic locking: Check version if provided
        incoming_version = clean_data.pop('version', None)
        if incoming_version is not None:
            current_version = instance.version or 1
            if incoming_version < current_version:
                # Version mismatch - another user updated this record
                raise ValueError(f"Conflict: Version mismatch. Your version: {incoming_version}, Current version: {current_version}")
        
        # Increment version on successful update
        instance.version = (instance.version or 1) + 1
        
        # Update scalar fields directly on instance
        for key, value in clean_data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)

        # If current revision changes, derive PSV status from that revision's signatures.
        if "current_revision_id" in clean_data:
            if instance.status != "issued":
                next_status = "draft"
                if instance.current_revision_id:
                    rev = await self._get_by_id(RevisionHistory, instance.current_revision_id)
                    if rev:
                        if rev.originated_by:
                            next_status = "in_review"
                            if rev.checked_by:
                                next_status = "checked"
                                if rev.approved_by:
                                    next_status = "approved"
                        else:
                            next_status = "draft"
                instance.status = next_status
        
        # Update project links if provided
        if project_ids is not None:
            stmt = select(Project).where(Project.id.in_(project_ids))
            result = await self.session.execute(stmt)
            instance.projects = list(result.scalars().all())
        
        await self.session.commit()
        await self.session.refresh(instance)
        await self.session.refresh(instance, attribute_names=['projects'])
        return instance

    async def delete_protective_system(self, psv_id: str) -> bool:
        instance = await self._get_by_id(ProtectiveSystem, psv_id)
        if not instance:
            return False
        await self._update(
            ProtectiveSystem,
            psv_id,
            {"is_active": False, "deleted_at": datetime.now(UTC)},
        )
        return True

    async def restore_protective_system(self, psv_id: str) -> dict:
        instance = await self._get_by_id(
            ProtectiveSystem,
            psv_id,
            options=[selectinload(ProtectiveSystem.projects)],
        )
        if not instance:
            raise ValueError("PSV not found")
        if instance.deleted_at is None:
            return instance
        instance.deleted_at = None
        instance.is_active = True
        await self.session.commit()
        await self.session.refresh(instance)
        await self.session.refresh(instance, attribute_names=["projects"])
        return instance

    async def purge_protective_system(self, psv_id: str) -> bool:
        instance = await self._get_by_id(ProtectiveSystem, psv_id)
        if not instance:
            return False
        if instance.deleted_at is None:
            raise ValueError("PSV must be deleted before purge")
        return await self._delete(ProtectiveSystem, psv_id)

    # --- Scenarios ---

    async def get_scenarios_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(OverpressureScenario, OverpressureScenario.protective_system_id == psv_id)

    async def create_scenario(self, data: dict) -> dict:
        # Map camelCase to snake_case if needed? 
        # Models use snake_case attributes. 
        # Pydantic dump usually matches unless aliased.
        # Assuming DataAccessLayer receives correct field names (snake_case) or standard dict
        # The routers call data.model_dump(). If models use camelCase alias but field names are standard...
        # Wait, Pydantic models in routers define fields like `protectiveSystemId`.
        # ORM expects `protective_system_id`.
        # I need to convert keys!
        
        converted_data = self._convert_keys(data)
        return await self._create(OverpressureScenario, converted_data)

    async def update_scenario(self, scenario_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(OverpressureScenario, scenario_id, converted_data)

    async def delete_scenario(self, scenario_id: str) -> bool:
        # Perform soft delete
        await self._update(OverpressureScenario, scenario_id, {"is_active": False})
        return True

    # --- Sizing Cases ---

    async def get_sizing_cases_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(SizingCase, SizingCase.protective_system_id == psv_id)

    async def create_sizing_case(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(SizingCase, converted_data)

    async def update_sizing_case(self, case_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(SizingCase, case_id, converted_data)

    async def delete_sizing_case(self, case_id: str) -> bool:
        # Perform soft delete
        await self._update(SizingCase, case_id, {"is_active": False})
        return True

    # --- Equipment (object-based via engineering_objects) ---

    _equipment_object_types = {
        'vessel',
        'tank',
        'heat_exchanger',
        'column',
        'reactor',
        'pump',
        'compressor',
        'piping',
        'instrument',
        'vendor_package',
        'other',
    }

    def _normalize_equipment_type(self, object_type: str) -> str:
        value = (object_type or '').strip().lower()
        return value if value in self._equipment_object_types else 'other'

    def _to_equipment_object_type(self, equipment_type: str) -> str:
        return self._normalize_equipment_type(equipment_type).upper()

    def _extract_design_parameters(self, properties: dict[str, Any]) -> dict[str, Any]:
        raw = properties.get('design_parameters')
        if isinstance(raw, dict):
            return raw
        return {}

    def _merge_design_parameters(
        self,
        current: dict[str, Any],
        converted_data: dict[str, Any],
    ) -> dict[str, Any]:
        next_values = dict(current)

        mapping = {
            'design_pressure': 'designPressure',
            'design_pressure_unit': 'designPressureUnit',
            'mawp': 'mawp',
            'mawp_unit': 'mawpUnit',
            'design_temp': 'designTemperature',
            'design_temp_unit': 'designTempUnit',
        }
        for source_key, target_key in mapping.items():
            if source_key in converted_data:
                value = converted_data[source_key]
                if value is None:
                    next_values.pop(target_key, None)
                else:
                    next_values[target_key] = value

        if 'designPressure' in next_values and 'designPressureUnit' not in next_values:
            next_values['designPressureUnit'] = 'barg'
        if 'mawp' in next_values and 'mawpUnit' not in next_values:
            next_values['mawpUnit'] = 'barg'
        if 'designTemperature' in next_values and 'designTempUnit' not in next_values:
            next_values['designTempUnit'] = 'C'

        return next_values

    def _to_equipment_response(self, obj: EngineeringObject) -> dict:
        properties = dict(obj.properties) if isinstance(obj.properties, dict) else {}
        details = properties.get('details') if isinstance(properties.get('details'), dict) else None
        meta = properties.get('meta') if isinstance(properties.get('meta'), dict) else {}
        design_parameters = self._extract_design_parameters(properties)

        design_pressure = design_parameters.get('designPressure')
        design_pressure_unit = design_parameters.get('designPressureUnit', 'barg')
        mawp = design_parameters.get('mawp')
        mawp_unit = design_parameters.get('mawpUnit', 'barg')
        design_temp = design_parameters.get('designTemperature')
        design_temp_unit = design_parameters.get('designTempUnit', 'C')

        return AttrDict({
            'id': str(obj.uuid),
            'area_id': obj.area_id,
            'type': self._normalize_equipment_type(obj.object_type),
            'tag': obj.tag,
            'name': obj.name or str(meta.get('name') or obj.tag),
            'description': obj.description,
            'design_pressure': design_pressure,
            'design_pressure_unit': design_pressure_unit,
            'mawp': mawp,
            'mawp_unit': mawp_unit,
            'design_temp': design_temp,
            'design_temp_unit': design_temp_unit,
            'owner_id': obj.owner_id,
            'status': obj.status or 'active',
            'is_active': bool(obj.is_active),
            'location_ref': obj.location_ref,
            'details': details,
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
        })

    async def get_equipment(self, area_id: Optional[str] = None, type: Optional[str] = None) -> List[dict]:
        filters = [EngineeringObject.object_type.in_([v.upper() for v in self._equipment_object_types])]
        if area_id:
            filters.append(EngineeringObject.area_id == area_id)
        if type:
            filters.append(EngineeringObject.object_type == self._to_equipment_object_type(type))

        stmt = (
            select(EngineeringObject)
            .where(*filters)
            .order_by(nullslast(EngineeringObject.updated_at.desc()), EngineeringObject.tag.asc())
        )
        result = await self.session.execute(stmt)
        rows = list(result.scalars().all())
        return [self._to_equipment_response(row) for row in rows]

    async def get_equipment_by_id(self, equipment_id: str) -> Optional[dict]:
        try:
            from uuid import UUID
            target_uuid = UUID(str(equipment_id))
        except (ValueError, TypeError):
            return None

        stmt = select(EngineeringObject).where(EngineeringObject.uuid == target_uuid)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        if row is None:
            return None
        if self._normalize_equipment_type(row.object_type) == 'other' and row.object_type.upper() not in {
            v.upper() for v in self._equipment_object_types
        }:
            return None
        return self._to_equipment_response(row)

    async def get_equipment_links_by_psv(self, psv_id: str) -> List[dict]:
        rows = await self._get_all(EquipmentLink, EquipmentLink.protective_system_id == psv_id)
        return [
            {
                'id': row.id,
                'protective_system_id': row.protective_system_id,
                'equipment_id': row.equipment_id,
                'is_primary': row.is_primary,
                'scenario_id': row.scenario_id,
                'relationship_type': row.relationship_type,
                'notes': row.notes,
                'created_at': row.created_at,
            }
            for row in rows
        ]

    async def create_equipment_link(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        equipment_id = converted_data.get('equipment_id')
        if not equipment_id:
            raise ValueError('equipment_id is required')
        try:
            from uuid import UUID
            equipment_uuid = UUID(str(equipment_id))
        except (ValueError, TypeError):
            raise ValueError('equipment_id must be a UUID')

        exists_stmt = select(EngineeringObject.uuid).where(EngineeringObject.uuid == equipment_uuid)
        exists = await self.session.execute(exists_stmt)
        if exists.scalar_one_or_none() is None:
            raise ValueError(f'Engineering object {equipment_id} not found')

        return await self._create(EquipmentLink, converted_data)

    async def delete_equipment_link(self, link_id: str) -> bool:
        return await self._delete(EquipmentLink, link_id)

    async def create_equipment(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        equipment_type = self._normalize_equipment_type(str(converted_data.get('type') or 'other'))
        details = converted_data.get('details') or {}
        object_uuid = uuid4()

        design_parameters = self._merge_design_parameters({}, converted_data)
        properties: dict[str, Any] = {'details': details}
        if design_parameters:
            properties['design_parameters'] = design_parameters

        obj = EngineeringObject(
            uuid=object_uuid,
            tag=str(converted_data.get('tag', '')).upper(),
            object_type=equipment_type.upper(),
            area_id=converted_data.get('area_id'),
            owner_id=converted_data.get('owner_id'),
            name=converted_data.get('name'),
            description=converted_data.get('description'),
            location_ref=converted_data.get('location_ref'),
            status=converted_data.get('status', 'active'),
            is_active=converted_data.get('is_active', True),
            properties=properties,
        )
        self.session.add(obj)
        if equipment_type == 'instrument':
            # Instruments exist only in engineering_objects: the legacy
            # equipment_type enum has no 'instrument' value and instruments
            # never participate in the legacy dual-write.
            await self.session.commit()
            await self.session.refresh(obj)
            return self._to_equipment_response(obj)
        legacy_equipment = Equipment(
            id=str(object_uuid),
            area_id=converted_data.get('area_id'),
            type=equipment_type,
            tag=str(converted_data.get('tag', '')).upper(),
            name=converted_data.get('name') or str(converted_data.get('tag', '')).upper(),
            description=converted_data.get('description'),
            design_pressure=design_parameters.get('designPressure'),
            design_pressure_unit=(
                design_parameters.get('designPressureUnit', 'barg')
                if design_parameters.get('designPressure') is not None
                else None
            ),
            mawp=design_parameters.get('mawp'),
            mawp_unit=(
                design_parameters.get('mawpUnit', 'barg')
                if design_parameters.get('mawp') is not None
                else None
            ),
            design_temp=design_parameters.get('designTemperature'),
            design_temp_unit=(
                design_parameters.get('designTempUnit', 'C')
                if design_parameters.get('designTemperature') is not None
                else None
            ),
            owner_id=converted_data.get('owner_id'),
            is_active=converted_data.get('is_active', True),
            status=converted_data.get('status', 'active'),
            location_ref=converted_data.get('location_ref'),
            details=details,
        )
        self.session.add(legacy_equipment)
        await self._write_equipment_subtype_from_details(legacy_equipment.id, equipment_type, details)
        await self.session.commit()
        await self.session.refresh(obj)
        return self._to_equipment_response(obj)

    async def update_equipment(self, equipment_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        try:
            from uuid import UUID
            target_uuid = UUID(str(equipment_id))
        except (ValueError, TypeError):
            raise ValueError(f'Equipment {equipment_id} not found')

        stmt = select(EngineeringObject).where(EngineeringObject.uuid == target_uuid)
        result = await self.session.execute(stmt)
        obj = result.scalar_one_or_none()
        if obj is None:
            raise ValueError(f'Equipment {equipment_id} not found')

        if 'type' in converted_data:
            obj.object_type = self._to_equipment_object_type(str(converted_data['type']))
        if 'tag' in converted_data and converted_data['tag']:
            obj.tag = str(converted_data['tag']).upper()
        if 'area_id' in converted_data:
            obj.area_id = converted_data['area_id']
        if 'owner_id' in converted_data:
            obj.owner_id = converted_data['owner_id']
        if 'name' in converted_data:
            obj.name = converted_data['name']
        if 'description' in converted_data:
            obj.description = converted_data['description']
        if 'location_ref' in converted_data:
            obj.location_ref = converted_data['location_ref']
        if 'status' in converted_data:
            obj.status = converted_data['status']
        if 'is_active' in converted_data:
            obj.is_active = bool(converted_data['is_active'])
            obj.deleted_at = None if obj.is_active else datetime.now(UTC)

        properties = dict(obj.properties) if isinstance(obj.properties, dict) else {}

        if 'details' in converted_data:
            properties = {**properties, 'details': converted_data['details'] or {}}

        design_parameters = self._merge_design_parameters(
            self._extract_design_parameters(properties),
            converted_data,
        )
        if design_parameters:
            properties['design_parameters'] = design_parameters

        obj.properties = properties
        # Instruments are engineering_objects-only (legacy equipment_type enum
        # has no 'instrument'); skip the legacy mirror for them.
        is_instrument = self._normalize_equipment_type(obj.object_type) == 'instrument'
        legacy_equipment = (
            None if is_instrument else await self._get_by_id(Equipment, equipment_id)
        )
        if legacy_equipment is not None:
            legacy_equipment.type = self._normalize_equipment_type(obj.object_type)
            legacy_equipment.tag = obj.tag
            legacy_equipment.area_id = obj.area_id
            legacy_equipment.owner_id = obj.owner_id
            legacy_equipment.name = obj.name or obj.tag
            legacy_equipment.description = obj.description
            legacy_equipment.design_pressure = design_parameters.get('designPressure')
            legacy_equipment.design_pressure_unit = (
                design_parameters.get('designPressureUnit', 'barg')
                if design_parameters.get('designPressure') is not None
                else None
            )
            legacy_equipment.mawp = design_parameters.get('mawp')
            legacy_equipment.mawp_unit = (
                design_parameters.get('mawpUnit', 'barg')
                if design_parameters.get('mawp') is not None
                else None
            )
            legacy_equipment.design_temp = design_parameters.get('designTemperature')
            legacy_equipment.design_temp_unit = (
                design_parameters.get('designTempUnit', 'C')
                if design_parameters.get('designTemperature') is not None
                else None
            )
            legacy_equipment.status = obj.status or 'active'
            legacy_equipment.is_active = bool(obj.is_active)
            legacy_equipment.location_ref = obj.location_ref
            legacy_equipment.details = properties.get('details') or {}
            await self._write_equipment_subtype_from_details(
                legacy_equipment.id,
                legacy_equipment.type,
                legacy_equipment.details,
            )

        await self.session.commit()
        await self.session.refresh(obj)
        return self._to_equipment_response(obj)

    async def delete_equipment(self, equipment_id: str) -> bool:
        await self.update_equipment(equipment_id, {'isActive': False})
        return True

    # --- Attachments ---

    async def get_attachments_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(Attachment, Attachment.protective_system_id == psv_id)

    async def create_attachment(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Attachment, converted_data)

    async def delete_attachment(self, attachment_id: str) -> bool:
        return await self._delete(Attachment, attachment_id)

    # --- Notes ---

    async def get_notes_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(ProjectNote, ProjectNote.protective_system_id == psv_id)

    async def create_note(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(ProjectNote, converted_data)

    async def update_note(self, note_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(ProjectNote, note_id, converted_data)

    async def delete_note(self, note_id: str) -> bool:
        # Perform soft delete
        await self._update(ProjectNote, note_id, {"is_active": False})
        return True

    # --- Comments ---

    async def get_comments_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(Comment, Comment.protective_system_id == psv_id)

    async def create_comment(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Comment, converted_data)

    async def update_comment(self, comment_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        instance = await self._get_by_id(Comment, comment_id)
        if not instance:
            raise ValueError(f"Comment {comment_id} not found")
        for key, value in converted_data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def delete_comment(self, comment_id: str) -> bool:
        # Perform soft delete
        await self._update(Comment, comment_id, {"is_active": False})
        return True

    # --- Todos ---

    async def get_todos_by_psv(self, psv_id: str) -> List[dict]:
        return await self._get_all(Todo, Todo.protective_system_id == psv_id)

    async def create_todo(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(Todo, converted_data)

    async def update_todo(self, todo_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._update(Todo, todo_id, converted_data)

    async def delete_todo(self, todo_id: str) -> bool:
        # Perform soft delete
        await self._update(Todo, todo_id, {"is_active": False})
        return True

    # --- Revision History ---

    async def get_revisions_by_entity(self, entity_type: str, entity_id: str) -> List[dict]:
        """Get revisions for an entity, ordered by sequence descending."""
        stmt = select(RevisionHistory).where(
            RevisionHistory.entity_type == entity_type,
            RevisionHistory.entity_id == entity_id
        ).order_by(
            nullslast(RevisionHistory.originated_at.desc()),
            RevisionHistory.sequence.desc(),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_revision_by_id(self, revision_id: str) -> Optional[dict]:
        return await self._get_by_id(RevisionHistory, revision_id)

    async def create_revision(self, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        return await self._create(RevisionHistory, converted_data)

    async def update_revision(self, revision_id: str, data: dict) -> dict:
        converted_data = self._convert_keys(data)
        instance = await self._get_by_id(RevisionHistory, revision_id)
        if not instance:
            raise ValueError(f"Revision {revision_id} not found")
        
        for key, value in converted_data.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        
        await self.session.commit()
        await self.session.refresh(instance)

        # If this revision is the current revision of a PSV, derive PSV status.
        if instance.entity_type == "protective_system":
            psv = await self._get_by_id(ProtectiveSystem, instance.entity_id)
            if psv and psv.current_revision_id == revision_id and psv.status != "issued":
                next_status = "draft"
                if instance.originated_by:
                    next_status = "in_review"
                    if instance.checked_by:
                        next_status = "checked"
                        if instance.approved_by:
                            next_status = "approved"
                psv.status = next_status
                await self.session.commit()
                await self.session.refresh(psv)

        return instance

    async def delete_revision(self, revision_id: str) -> bool:
        """Delete a revision and clear any current_revision_id references."""
        # First, clear references from entities so FK constraints don't block deletes.
        # Update status to draft when current revision is removed (unless already issued).
        stmt_psv = update(ProtectiveSystem).where(
            ProtectiveSystem.current_revision_id == revision_id
        ).values(
            current_revision_id=None,
            status=case(
                (ProtectiveSystem.status == "issued", "issued"),
                else_="draft",
            )
        )
        stmt_scenario = update(OverpressureScenario).where(
            OverpressureScenario.current_revision_id == revision_id
        ).values(current_revision_id=None)
        stmt_case = update(SizingCase).where(
            SizingCase.current_revision_id == revision_id
        ).values(current_revision_id=None)

        await self.session.execute(stmt_psv)
        await self.session.execute(stmt_scenario)
        await self.session.execute(stmt_case)
        await self.session.commit()

        return await self._delete(RevisionHistory, revision_id)

    # --- Utils ---
    
    def _convert_keys(self, data: dict) -> dict:
        """Convert camelCase keys (from API) to snake_case (for ORM)."""
        mapping = {
            "protectiveSystemId": "protective_system_id",
            "areaId": "area_id",
            "projectId": "project_id",
            "unitId": "unit_id",
            "plantId": "plant_id",
            "customerId": "customer_id",
            "ownerId": "owner_id",
            "scenarioId": "scenario_id",
            "equipmentId": "equipment_id",
            "leadId": "lead_id",
            "startDate": "start_date",
            "endDate": "end_date",
            "userId": "user_id",
            "passwordHash": "password_hash",
            "failedAttempts": "failed_attempts",
            "lastLogin": "last_login",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
            "deletedAt": "deleted_at",
            "valveType": "valve_type",
            "designCode": "design_code",
            "serviceFluid": "service_fluid",
            "fluidPhase": "fluid_phase",
            "setPressure": "set_pressure",
            "projectIds": "projectIds",  # handled specially
            "relievingTemp": "relieving_temp",
            "relievingPressure": "relieving_pressure",
            "relievingRate": "relieving_rate",
            "accumulationPct": "accumulation_pct",
            "requiredCapacity": "required_capacity",
            "codeRefs": "code_refs",
            "isGoverning": "is_governing",
            # PSV scenario markdown notes (camelCase from frontend -> snake_case DB column)
            "caseConsideration": "case_consideration",
            "designPressure": "design_pressure",
            "designPressureUnit": "design_pressure_unit",
            "mawpUnit": "mawp_unit",
            "designTemperature": "design_temp",
            "designTempUnit": "design_temp_unit",
            "locationRef": "location_ref",
            "fileUri": "file_uri",
            "fileName": "file_name",
            "mimeType": "mime_type",
            "uploadedBy": "uploaded_by",
            "assignedTo": "assigned_to",
            "dueDate": "due_date",
            "unitSystem": "unit_system",
            # Additional mappings
            "unitPreferences": "unit_preferences",
            "isPrimary": "is_primary",
            "createdBy": "created_by",
            "updatedBy": "updated_by",
            "relationship": "relationship_type",
            "inletNetwork": "inlet_network",
            "outletNetwork": "outlet_network",
            "currentRevisionId": "current_revision_id",
            # Revision history
            "entityType": "entity_type",
            "entityId": "entity_id",
            "revisionCode": "revision_code",
            "originatedBy": "originated_by",
            "originatedAt": "originated_at",
            "checkedBy": "checked_by",
            "checkedAt": "checked_at",
            "approvedBy": "approved_by",
            "approvedAt": "approved_at",
            "issuedAt": "issued_at",
            # Audit log fields
            "entityName": "entity_name",
            "userName": "user_name",
            "userRole": "user_role",
            "projectName": "project_name",
            # Soft delete
            "isActive": "is_active",
            "objectType": "object_type",
        }
        new_data = data.copy()
        
        # Handle simple keys
        for camel, snake in mapping.items():
            if camel in new_data:
                new_data[snake] = new_data.pop(camel)
        
        # Parse datetime fields (ISO string -> datetime)
        datetime_fields = [
            'created_at', 'updated_at', 'deleted_at', 'last_login',
            # Revision history
            'originated_at', 'checked_at', 'approved_at', 'issued_at'
        ]
        for field in datetime_fields:
            if field in new_data and isinstance(new_data[field], str):
                try:
                    new_data[field] = dateutil_parser.isoparse(new_data[field])
                except (ValueError, TypeError):
                    pass  # Keep as-is if parsing fails
        
        # Parse date fields (ISO string -> date)
        date_fields = ['start_date', 'end_date', 'due_date']
        for field in date_fields:
            if field in new_data and isinstance(new_data[field], str):
                try:
                    parsed = dateutil_parser.isoparse(new_data[field])
                    new_data[field] = parsed.date() if isinstance(parsed, datetime) else parsed
                except (ValueError, TypeError):
                    pass
                
        # Handle nested objects like inputs/outputs if they are JSONB and keys need preservation or conversion
        # Use as is for JSONB columns, SQLAlchemy handles dicts
        
        return new_data

    async def seed_data(self, data: dict) -> dict:
        """Seed database with mock data (RESET)."""
        from ..models.protective_system import protective_system_projects
        from sqlalchemy import insert
        
        # 1. Delete all data (Order matters for Foreign Keys!)
        # First, nullify FK references to revision_history
        await self.session.execute(
            update(ProtectiveSystem).values(current_revision_id=None)
        )
        await self.session.execute(
            update(OverpressureScenario).values(current_revision_id=None)
        )
        await self.session.execute(
            update(SizingCase).values(current_revision_id=None)
        )
        await self.session.commit()
        
        # Leaf nodes first
        await self.session.execute(delete(Todo))
        await self.session.execute(delete(Comment))
        await self.session.execute(delete(Attachment))
        await self.session.execute(delete(EquipmentLink))
        await self.session.execute(delete(RevisionHistory))  # Now safe to delete
        await self.session.execute(delete(SizingCase))
        await self.session.execute(delete(OverpressureScenario))
        await self.session.execute(delete(protective_system_projects)) # Association table
        await self.session.execute(delete(ProtectiveSystem))
        await self.session.execute(delete(Equipment))
        await self.session.execute(delete(EngineeringObject))
        await self.session.execute(delete(Project))
        await self.session.execute(delete(Area))
        await self.session.execute(delete(Unit))
        await self.session.execute(delete(Plant))
        await self.session.execute(delete(Customer))
        await self.session.execute(delete(Credential))
        await self.session.execute(delete(User))
        
        await self.session.commit()
        
        counts = {}

        # 2. Insert Data (Root nodes first)
        
        # Users
        users = data.get("users", [])
        for item in users:
            await self._create(User, self._convert_keys(item))
        counts["users"] = len(users)

        # Credentials
        creds = data.get("credentials", [])
        for item in creds:
             await self._create(Credential, self._convert_keys(item))
        counts["credentials"] = len(creds)

        # Customers
        customers = data.get("customers", [])
        for item in customers:
             await self._create(Customer, self._convert_keys(item))
        counts["customers"] = len(customers)

        # Plants
        plants = data.get("plants", [])
        for item in plants:
             await self._create(Plant, self._convert_keys(item))
        counts["plants"] = len(plants)

        # Units
        units = data.get("units", [])
        for item in units:
             await self._create(Unit, self._convert_keys(item))
        counts["units"] = len(units)

        # Areas
        areas = data.get("areas", [])
        for item in areas:
             await self._create(Area, self._convert_keys(item))
        counts["areas"] = len(areas)

        # Projects
        projects = data.get("projects", [])
        for item in projects:
             await self._create(Project, self._convert_keys(item))
        counts["projects"] = len(projects)

        # Engineering Objects (single source of truth for all equipment/object records)
        equipment = data.get("equipment", [])
        engineering_objects = data.get("engineeringObjects", [])

        merged_objects: list[dict] = []
        seen_tags: set[str] = set()

        for item in engineering_objects:
            converted = self._convert_keys(item)
            tag = str(converted.get('tag', '')).upper()
            if not tag or tag in seen_tags:
                continue
            converted['tag'] = tag
            if 'is_active' not in converted:
                converted['is_active'] = True
            merged_objects.append(converted)
            seen_tags.add(tag)

        for item in equipment:
            converted = self._convert_keys(item)
            tag = str(converted.get('tag', '')).upper()
            if not tag or tag in seen_tags:
                continue
            design_parameters = {
                'designPressure': converted.get('design_pressure'),
                'designPressureUnit': converted.get('design_pressure_unit') or 'barg',
                'mawp': converted.get('mawp'),
                'mawpUnit': converted.get('mawp_unit') or 'barg',
                'designTemperature': converted.get('design_temp'),
                'designTempUnit': converted.get('design_temp_unit') or 'C',
            }
            design_parameters = {
                key: value for key, value in design_parameters.items() if value is not None
            }

            properties = {'details': converted.get('details') or {}}
            if design_parameters:
                properties['design_parameters'] = design_parameters

            mapped = {
                'uuid': converted.get('id'),
                'tag': tag,
                'object_type': str(converted.get('type') or 'other').upper(),
                'area_id': converted.get('area_id'),
                'owner_id': converted.get('owner_id'),
                'name': converted.get('name'),
                'description': converted.get('description'),
                'location_ref': converted.get('location_ref'),
                'status': converted.get('status', 'active'),
                'is_active': converted.get('is_active', True),
                'properties': properties,
            }
            merged_objects.append(mapped)
            seen_tags.add(tag)

        for item in merged_objects:
            await self._create(EngineeringObject, item)

        counts["equipment"] = len(equipment)
        counts["engineeringObjects"] = len(merged_objects)

        # Protective Systems
        psvs = data.get("protectiveSystems", [])
        psv_project_links = []
        for item in psvs:
            clean_item = self._convert_keys(item)
            # projectIds is preserved by _convert_keys if mapped to itself or ignored? 
            # I mapped "projectIds": "projectIds" in _convert_keys above.
            p_ids = clean_item.pop("projectIds", [])
            
            # Create PSV
            await self._create(ProtectiveSystem, clean_item)
            
            # Store links
            for pid in p_ids:
                psv_project_links.append({"protective_system_id": clean_item["id"], "project_id": pid})
                
        # Insert links
        if psv_project_links:
            await self.session.execute(insert(protective_system_projects).values(psv_project_links))
            await self.session.commit()
            
        counts["protectiveSystems"] = len(psvs)

        # Scenarios
        scenarios = data.get("scenarios", [])
        for item in scenarios:
             await self._create(OverpressureScenario, self._convert_keys(item))
        counts["scenarios"] = len(scenarios)

        # Sizing Cases
        cases = data.get("sizingCases", [])
        for item in cases:
             await self._create(SizingCase, self._convert_keys(item))
        counts["sizingCases"] = len(cases)

        # Equipment Links
        links = data.get("equipmentLinks", [])
        for item in links:
             await self._create(EquipmentLink, self._convert_keys(item))
        counts["equipmentLinks"] = len(links)
        
        # Attachments
        att = data.get("attachments", [])
        for item in att:
             await self._create(Attachment, self._convert_keys(item))
        counts["attachments"] = len(att)

        # Comments
        comments = data.get("comments", [])
        for item in comments:
             await self._create(Comment, self._convert_keys(item))
        counts["comments"] = len(comments)

        # Todos
        todos = data.get("todos", [])
        for item in todos:
             await self._create(Todo, self._convert_keys(item))
        counts["todos"] = len(todos)

        # Revision History
        revisions = data.get("revisionHistory", [])
        for item in revisions:
             await self._create(RevisionHistory, self._convert_keys(item))
        counts["revisionHistory"] = len(revisions)

        return counts

    # --- Audit Logs ---
    
    async def get_audit_logs(self, filters: dict, limit: int, offset: int) -> tuple[list, int]:
        """Get audit logs with filters, returns (logs, total_count)."""
        from ..models import AuditLog
        
        # Build filter conditions
        conditions = []
        if filters.get("entity_type"):
            conditions.append(AuditLog.entity_type == filters["entity_type"])
        if filters.get("entity_id"):
            conditions.append(AuditLog.entity_id == filters["entity_id"])
        if filters.get("user_id"):
            conditions.append(AuditLog.user_id == filters["user_id"])
        if filters.get("project_id"):
            conditions.append(AuditLog.project_id == filters["project_id"])
        if filters.get("action"):
            conditions.append(AuditLog.action == filters["action"])
        
        # Count total
        from sqlalchemy import func
        count_stmt = select(func.count(AuditLog.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0
        
        # Get paginated results, ordered by created_at descending
        stmt = select(AuditLog)
        if conditions:
            stmt = stmt.where(*conditions)
        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        logs = list(result.scalars().all())
        
        return logs, total
    
    async def get_audit_log_by_id(self, log_id: str):
        """Get a single audit log by ID."""
        from ..models import AuditLog
        return await self._get_by_id(AuditLog, log_id)
    
    async def create_audit_log(self, data: dict):
        """Create a new audit log entry."""
        from ..models import AuditLog
        from uuid import uuid4
        
        # Convert camelCase to snake_case
        db_data = self._convert_keys(data)
        db_data["id"] = str(uuid4())
        
        log = AuditLog(**db_data)
        self.session.add(log)
        await self.session.commit()
        await self.session.refresh(log)
        return log
    
    async def clear_audit_logs(self) -> int:
        """Clear all audit logs. Returns count of deleted logs."""
        from ..models import AuditLog
        
        # Count before delete
        from sqlalchemy import func
        count_stmt = select(func.count(AuditLog.id))
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0
        
        # Delete all
        stmt = delete(AuditLog)
        await self.session.execute(stmt)
        await self.session.commit()

        return total

    # --- Venting Calculations ---

    def _normalize_venting_revision_history(self, rows: Optional[list[dict]]) -> list[dict]:
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

    def _serialize_venting_calculation(self, calculation: dict[str, Any]) -> dict[str, Any]:
        inputs = calculation.get("inputs")
        metadata = calculation.get("metadata")
        return {
            "id": calculation["id"],
            "area_id": calculation.get("areaId"),
            "equipment_id": calculation.get("linkedEquipmentId"),
            "owner_id": calculation.get("ownerId"),
            "name": calculation["name"],
            "description": calculation.get("description") or "",
            "status": calculation.get("status") or "draft",
            "inputs": inputs if isinstance(inputs, dict) else {},
            "results": calculation.get("results"),
            "calculation_metadata": metadata if isinstance(metadata, dict) else {},
            "revision_history": self._normalize_venting_revision_history(
                calculation.get("revisionHistory")
            ),
            "api_edition": (
                inputs.get("apiEdition")
                if isinstance(inputs, dict) and isinstance(inputs.get("apiEdition"), str)
                else "7TH"
            ),
            "is_active": calculation.get("isActive", True),
            "deleted_at": calculation.get("deletedAt"),
            "created_at": calculation.get("createdAt"),
            "updated_at": calculation.get("updatedAt"),
        }

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
        serialized = [self._serialize_venting_calculation(item) for item in calculations]
        if area_id:
            serialized = [item for item in serialized if item["area_id"] == area_id]
        if equipment_id:
            serialized = [item for item in serialized if item["equipment_id"] == equipment_id]
        return serialized

    async def get_venting_calculation_by_id(self, calc_id: str) -> Optional[dict]:
        calculation = await self.get_calculation_by_id(calc_id)
        if not calculation:
            return None
        if calculation.get("app") != "venting-calculation":
            return None
        return self._serialize_venting_calculation(calculation)

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
                "status": data.get("status", "draft"),
                "tag": inputs.get("tankNumber") if isinstance(inputs.get("tankNumber"), str) else None,
                "inputs": inputs,
                "results": data.get("results"),
                "metadata": data.get("calculationMetadata") or {},
                "revisionHistory": self._normalize_venting_revision_history(
                    data.get("revisionHistory") or []
                ),
                "linkedEquipmentId": data.get("equipmentId"),
                "linkedEquipmentTag": None,
            }
        )
        return self._serialize_venting_calculation(calculation)

    async def update_venting_calculation(self, calc_id: str, data: dict) -> dict:
        current = await self.get_calculation_by_id(calc_id)
        if not current or current.get("app") != "venting-calculation":
            raise ValueError("Venting calculation not found")

        next_inputs = dict(current.get("inputs") or {})
        if "inputs" in data and isinstance(data["inputs"], dict):
            next_inputs = data["inputs"]
        if "apiEdition" in data:
            next_inputs["apiEdition"] = data["apiEdition"]

        tag = (
            next_inputs.get("tankNumber")
            if isinstance(next_inputs.get("tankNumber"), str)
            else current.get("tag")
        )

        calculation = await self.update_calculation(
            calc_id,
            {
                "name": data.get("name", current.get("name")),
                "description": data.get("description", current.get("description") or ""),
                "status": data.get("status", current.get("status") or "draft"),
                "tag": tag,
                "inputs": next_inputs,
                "results": data["results"] if "results" in data else current.get("results"),
                "metadata": (
                    data.get("calculationMetadata")
                    if "calculationMetadata" in data
                    else current.get("metadata") or {}
                ),
                "revisionHistory": (
                    self._normalize_venting_revision_history(data["revisionHistory"])
                    if "revisionHistory" in data
                    else current.get("revisionHistory") or []
                ),
                "linkedEquipmentId": current.get("linkedEquipmentId"),
                "linkedEquipmentTag": current.get("linkedEquipmentTag"),
            },
        )
        if "isActive" in data and data["isActive"] is False:
            await self.delete_calculation(calc_id)
            calculation = await self.get_calculation_by_id(calc_id)
            if calculation is None:
                raise ValueError("Venting calculation not found")
        return self._serialize_venting_calculation(calculation)

    async def delete_venting_calculation(self, calc_id: str) -> bool:
        calculation = await self.get_calculation_by_id(calc_id)
        if not calculation or calculation.get("app") != "venting-calculation":
            return False
        return await self.delete_calculation(calc_id)

    async def restore_venting_calculation(self, calc_id: str) -> dict:
        calculation = await self.get_calculation_by_id(calc_id)
        if not calculation or calculation.get("app") != "venting-calculation":
            raise ValueError("Venting calculation not found")
        latest_version_id = calculation.get("latestVersionId")
        if not latest_version_id:
            raise ValueError("Venting calculation has no versions")
        restored = await self.restore_calculation(calc_id, latest_version_id)
        return self._serialize_venting_calculation(restored)

    # --- Network Designs ---

    async def get_network_designs(self, area_id: Optional[str] = None) -> List[dict]:
        filters = []
        if area_id:
            filters.append(NetworkDesign.area_id == area_id)
        return await self._get_all(NetworkDesign, *filters)

    async def get_network_design_by_id(self, design_id: str) -> Optional[dict]:
        return await self._get_by_id(NetworkDesign, design_id)

    async def create_network_design(self, data: dict) -> dict:
        mapped = {
            "area_id": data.get("areaId"),
            "owner_id": data.get("ownerId"),
            "name": data.get("name"),
            "description": data.get("description"),
            "network_data": data.get("networkData", {}),
            "node_count": data.get("nodeCount", 0),
            "pipe_count": data.get("pipeCount", 0),
        }
        return await self._create(NetworkDesign, {k: v for k, v in mapped.items() if v is not None or k in ("network_data", "area_id", "description")})

    async def update_network_design(self, design_id: str, data: dict) -> dict:
        mapped = {}
        if "name" in data:
            mapped["name"] = data["name"]
        if "description" in data:
            mapped["description"] = data["description"]
        if "networkData" in data:
            mapped["network_data"] = data["networkData"]
        if "nodeCount" in data:
            mapped["node_count"] = data["nodeCount"]
        if "pipeCount" in data:
            mapped["pipe_count"] = data["pipeCount"]
        return await self._update(NetworkDesign, design_id, mapped)

    async def delete_network_design(self, design_id: str) -> bool:
        return await self._delete(NetworkDesign, design_id)

    # --- Design Agent Sessions ---

    async def get_design_agent_sessions(self, owner_id: Optional[str] = None) -> List[dict]:
        filters = []
        if owner_id:
            filters.append(DesignAgentSession.owner_id == owner_id)
        return await self._get_all(DesignAgentSession, *filters)

    async def get_design_agent_session_by_id(self, session_id: str) -> Optional[dict]:
        return await self._get_by_id(DesignAgentSession, session_id)

    async def create_design_agent_session(self, data: dict) -> dict:
        mapped = {
            "owner_id": data.get("ownerId", "default"),
            "name": data.get("name"),
            "description": data.get("description"),
            "state_data": data.get("stateData", {}),
            "active_step_id": data.get("activeStepId"),
            "completed_steps": data.get("completedSteps", []),
            "status": data.get("status", "active"),
        }
        return await self._create(DesignAgentSession, {k: v for k, v in mapped.items() if v is not None or k in ("state_data", "completed_steps", "description", "active_step_id")})

    async def update_design_agent_session(self, session_id: str, data: dict) -> dict:
        mapped = {}
        if "name" in data:
            mapped["name"] = data["name"]
        if "description" in data:
            mapped["description"] = data["description"]
        if "stateData" in data:
            mapped["state_data"] = data["stateData"]
        if "activeStepId" in data:
            mapped["active_step_id"] = data["activeStepId"]
        if "completedSteps" in data:
            mapped["completed_steps"] = data["completedSteps"]
        if "status" in data:
            mapped["status"] = data["status"]
        return await self._update(DesignAgentSession, session_id, mapped)

    async def delete_design_agent_session(self, session_id: str) -> bool:
        return await self._delete(DesignAgentSession, session_id)

    # --- Instrument Links ---

    async def list_instrument_links(
        self,
        *,
        instrument_id=None,
        target_id=None,
        relationship_type=None,
        protective_system_id=None,
    ):
        from . import instrument_links as il_svc
        return await il_svc.list_instrument_links(
            self.session,
            instrument_id=instrument_id,
            target_id=target_id,
            relationship_type=relationship_type,
            protective_system_id=protective_system_id,
        )

    async def create_instrument_link(self, data: dict) -> dict:
        from . import instrument_links as il_svc
        return await il_svc.create_instrument_link(self.session, data)

    async def update_instrument_link(self, link_id: str, data: dict):
        from . import instrument_links as il_svc
        return await il_svc.update_instrument_link(self.session, link_id, data)

    async def delete_instrument_link(self, link_id: str) -> bool:
        from . import instrument_links as il_svc
        return await il_svc.delete_instrument_link(self.session, link_id)
