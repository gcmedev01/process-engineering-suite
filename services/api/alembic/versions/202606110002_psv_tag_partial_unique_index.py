"""Make protective_systems (area_id, tag) uniqueness soft-delete aware.

protective_systems uses SoftDeleteMixin (deleted_at). The full unique
constraint uq_protective_systems_area_id_tag(area_id, tag) also matches
soft-deleted rows, so a tag freed by soft-deleting a PSV could never be
reused in the same area. Replace the constraint with a partial unique index
that only applies to live rows (deleted_at IS NULL).

Revision ID: 202606110002
Revises: 202606110001
Create Date: 2026-06-11 00:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "202606110002"
down_revision: Union[str, Sequence[str], None] = "202606110001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_protective_systems_area_id_tag",
        "protective_systems",
        type_="unique",
    )
    op.create_index(
        "uq_protective_systems_area_id_tag",
        "protective_systems",
        ["area_id", "tag"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_protective_systems_area_id_tag",
        table_name="protective_systems",
    )
    op.create_unique_constraint(
        "uq_protective_systems_area_id_tag",
        "protective_systems",
        ["area_id", "tag"],
    )
