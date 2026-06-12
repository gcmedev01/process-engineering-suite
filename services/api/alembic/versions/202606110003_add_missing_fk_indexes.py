"""Add indexes on foreign-key columns that lacked them.

PostgreSQL does not auto-index foreign keys. These 33 FK columns had no
covering index (no index=True and not the leading column of any composite
index/constraint), so FK lookups and cascade deletes did sequential scans.
Each gets a single-column btree index following the ix_<table>_<column>
convention. IF NOT EXISTS keeps the migration safe to re-run.

Includes calculations.linked_equipment_id and
calculation_versions.linked_equipment_id, whose FKs to engineering_objects
were added in 202605040002 without backing indexes.

Revision ID: 202606110003
Revises: 202606110002
Create Date: 2026-06-11 00:20:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "202606110003"
down_revision: Union[str, Sequence[str], None] = "202606110002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (index_name, table, column)
_FK_INDEXES = [
    ("ix_calculations_linked_equipment_id", "calculations", "linked_equipment_id"),
    ("ix_calculation_versions_linked_equipment_id", "calculation_versions", "linked_equipment_id"),
    ("ix_attachments_protective_system_id", "attachments", "protective_system_id"),
    ("ix_attachments_uploaded_by", "attachments", "uploaded_by"),
    ("ix_calculation_versions_source_version_id", "calculation_versions", "source_version_id"),
    ("ix_comments_protective_system_id", "comments", "protective_system_id"),
    ("ix_comments_created_by", "comments", "created_by"),
    ("ix_comments_updated_by", "comments", "updated_by"),
    ("ix_credentials_user_id", "credentials", "user_id"),
    ("ix_customers_owner_id", "customers", "owner_id"),
    ("ix_engineering_objects_project_id", "engineering_objects", "project_id"),
    ("ix_equipment_owner_id", "equipment", "owner_id"),
    ("ix_overpressure_scenarios_protective_system_id", "overpressure_scenarios", "protective_system_id"),
    ("ix_overpressure_scenarios_current_revision_id", "overpressure_scenarios", "current_revision_id"),
    ("ix_plants_owner_id", "plants", "owner_id"),
    ("ix_project_notes_created_by", "project_notes", "created_by"),
    ("ix_project_notes_updated_by", "project_notes", "updated_by"),
    ("ix_projects_lead_id", "projects", "lead_id"),
    ("ix_protective_systems_owner_id", "protective_systems", "owner_id"),
    ("ix_protective_systems_current_revision_id", "protective_systems", "current_revision_id"),
    ("ix_revision_history_originated_by", "revision_history", "originated_by"),
    ("ix_revision_history_checked_by", "revision_history", "checked_by"),
    ("ix_revision_history_approved_by", "revision_history", "approved_by"),
    ("ix_sizing_cases_protective_system_id", "sizing_cases", "protective_system_id"),
    ("ix_sizing_cases_scenario_id", "sizing_cases", "scenario_id"),
    ("ix_sizing_cases_current_revision_id", "sizing_cases", "current_revision_id"),
    ("ix_sizing_cases_created_by", "sizing_cases", "created_by"),
    ("ix_sizing_cases_approved_by", "sizing_cases", "approved_by"),
    ("ix_todos_protective_system_id", "todos", "protective_system_id"),
    ("ix_todos_assigned_to", "todos", "assigned_to"),
    ("ix_todos_created_by", "todos", "created_by"),
    ("ix_units_owner_id", "units", "owner_id"),
    ("ix_venting_calculations_equipment_id", "venting_calculations", "equipment_id"),
]


def upgrade() -> None:
    for name, table, column in _FK_INDEXES:
        op.create_index(name, table, [column], if_not_exists=True)


def downgrade() -> None:
    for name, table, _column in _FK_INDEXES:
        op.drop_index(name, table_name=table, if_exists=True)
