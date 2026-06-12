"""Add instrument_links table.

Captures directed relationships between an INSTRUMENT engineering_object and any
other engineering object (equipment, vessel, PSV, another instrument, etc.).
Uses String+CHECK for relationship_type so new relationship kinds can be added
with a simple ALTER TABLE rather than a PG ENUM migration.

Revision ID: 202606120003
Revises: 202606120002
Create Date: 2026-06-12 00:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "202606120003"
down_revision: Union[str, Sequence[str], None] = "202606120002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_RELATIONSHIP_TYPES = ("measures", "controls", "mounted_on", "interlocked_with")
_CHECK_SQL = "relationship_type IN ('measures', 'controls', 'mounted_on', 'interlocked_with')"


def upgrade() -> None:
    op.create_table(
        "instrument_links",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("instrument_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("target_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("relationship_type", sa.String(32), nullable=False),
        sa.Column("protective_system_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.CheckConstraint(_CHECK_SQL, name="ck_instrument_links_relationship_type"),
        sa.ForeignKeyConstraint(
            ["instrument_id"],
            ["engineering_objects.uuid"],
            name="fk_instrument_links_instrument_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["target_id"],
            ["engineering_objects.uuid"],
            name="fk_instrument_links_target_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["protective_system_id"],
            ["protective_systems.id"],
            name="fk_instrument_links_protective_system_id",
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint(
            "instrument_id",
            "target_id",
            "relationship_type",
            name="uq_instrument_links_triple",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_instrument_links_instrument_id",
        "instrument_links",
        ["instrument_id"],
    )
    op.create_index(
        "ix_instrument_links_target_id",
        "instrument_links",
        ["target_id"],
    )
    op.create_index(
        "ix_instrument_links_protective_system_id",
        "instrument_links",
        ["protective_system_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_instrument_links_protective_system_id", table_name="instrument_links")
    op.drop_index("ix_instrument_links_target_id", table_name="instrument_links")
    op.drop_index("ix_instrument_links_instrument_id", table_name="instrument_links")
    op.drop_table("instrument_links")
