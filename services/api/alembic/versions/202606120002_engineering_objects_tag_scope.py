"""Scope engineering_objects.tag uniqueness per area among live rows.

The global unique constraint uq_engineering_objects_tag prevented two plants
(areas) from using the same equipment tag (e.g. "V-100"), which breaks
multi-plant/multi-customer data collection. Replace it with:
- unique (area_id, tag) among live rows when area_id is set
- unique (tag) among live rows when area_id is NULL (unassigned objects keep
  global uniqueness so upsert-by-tag stays unambiguous)

No dedupe is needed: the old global constraint guarantees no duplicates exist
at upgrade time. Note: rows that migration 202603060002 merged via
ON CONFLICT (tag) cannot be un-merged — this migration only prevents future
collisions. Downgrade recreates the global constraint and therefore FAILS if
cross-area duplicate live tags were created after this upgrade; that is
intentional (resolve duplicates first).

Revision ID: 202606120002
Revises: 202606120001
Create Date: 2026-06-12 00:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "202606120002"
down_revision: Union[str, Sequence[str], None] = "202606120001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_engineering_objects_tag", "engineering_objects", type_="unique"
    )
    op.create_index(
        "uq_engineering_objects_area_tag_live",
        "engineering_objects",
        ["area_id", "tag"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND area_id IS NOT NULL"),
    )
    op.create_index(
        "uq_engineering_objects_tag_global_live",
        "engineering_objects",
        ["tag"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL AND area_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_engineering_objects_tag_global_live", table_name="engineering_objects"
    )
    op.drop_index(
        "uq_engineering_objects_area_tag_live", table_name="engineering_objects"
    )
    op.create_unique_constraint(
        "uq_engineering_objects_tag", "engineering_objects", ["tag"]
    )
