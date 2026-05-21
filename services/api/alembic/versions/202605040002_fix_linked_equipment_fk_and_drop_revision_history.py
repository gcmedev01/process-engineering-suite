"""Fix linked_equipment_id FK types and drop current_revision_history.

Changes:
- calculations.linked_equipment_id: String(255) -> UUID with FK to engineering_objects.uuid
- calculation_versions.linked_equipment_id: String(255) -> UUID with FK to engineering_objects.uuid
- Drop calculations.current_revision_history (denormalized, data lives in calculation_versions)

Revision ID: 202605040002
Revises: 202605040001
Create Date: 2026-05-04 15:23:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "202605040002"
down_revision: Union[str, Sequence[str], None] = "202605040001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Change calculations.linked_equipment_id from String(255) to UUID
    op.alter_column(
        "calculations",
        "linked_equipment_id",
        type_=postgresql.UUID(as_uuid=False),
        postgresql_using="linked_equipment_id::uuid",
    )

    # Step 2: Add FK constraint on calculations.linked_equipment_id
    op.create_foreign_key(
        "fk_calculations_linked_equipment_id",
        "calculations",
        "engineering_objects",
        ["linked_equipment_id"],
        ["uuid"],
        ondelete="SET NULL",
    )

    # Step 3: Change calculation_versions.linked_equipment_id from String(255) to UUID
    op.alter_column(
        "calculation_versions",
        "linked_equipment_id",
        type_=postgresql.UUID(as_uuid=False),
        postgresql_using="linked_equipment_id::uuid",
    )

    # Step 4: Add FK constraint on calculation_versions.linked_equipment_id
    op.create_foreign_key(
        "fk_calculation_versions_linked_equipment_id",
        "calculation_versions",
        "engineering_objects",
        ["linked_equipment_id"],
        ["uuid"],
        ondelete="SET NULL",
    )

    # Step 5: Drop denormalized current_revision_history column
    op.drop_column("calculations", "current_revision_history")


def downgrade() -> None:
    # Step 1: Add back current_revision_history column
    op.add_column(
        "calculations",
        sa.Column(
            "current_revision_history",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )

    # Step 2: Drop FK on calculation_versions.linked_equipment_id
    op.drop_constraint(
        "fk_calculation_versions_linked_equipment_id",
        "calculation_versions",
        type_="foreignkey",
    )

    # Step 3: Change calculation_versions.linked_equipment_id back to String(255)
    op.alter_column(
        "calculation_versions",
        "linked_equipment_id",
        type_=sa.String(255),
        postgresql_using="linked_equipment_id::varchar(255)",
    )

    # Step 4: Drop FK on calculations.linked_equipment_id
    op.drop_constraint(
        "fk_calculations_linked_equipment_id",
        "calculations",
        type_="foreignkey",
    )

    # Step 5: Change calculations.linked_equipment_id back to String(255)
    op.alter_column(
        "calculations",
        "linked_equipment_id",
        type_=sa.String(255),
        postgresql_using="linked_equipment_id::varchar(255)",
    )
