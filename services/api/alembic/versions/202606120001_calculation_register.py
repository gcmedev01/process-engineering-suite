"""Calculation register: project/number/discipline columns + sign-off support.

Adds register fields to calculations so the calculation register can be
filtered and uniqueness-enforced relationally instead of hiding document and
project numbers in current_metadata JSONB:
- project_id FK -> projects.id
- calc_number (document/register number, manual or auto-suggested)
- discipline (free String; allowed values enforced at the API layer)
- current_revision_id FK -> revision_history.id (same pattern as
  protective_systems)

Adds display-string fallback columns to revision_history so calculation
sign-off rows can capture originator/checker/approver names that don't
resolve to user accounts (frontends send initials/free text today).

Backfill:
1. calc_number from current_metadata->>'documentNumber'
2. project_id by joining projects on (code = metadata projectNumber AND
   projects.area_id = calculations.area_id) - projects.code is only unique
   per area, so never match on code alone
3. Dedupe live (project_id, calc_number) collisions (keep oldest, NULL the
   rest - the string survives in JSONB), then add the partial unique index.

Revision ID: 202606120001
Revises: 202606110003
Create Date: 2026-06-12 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "202606120001"
down_revision: Union[str, Sequence[str], None] = "202606110003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- calculations: register columns ---
    op.add_column(
        "calculations",
        sa.Column("project_id", postgresql.UUID(as_uuid=False), nullable=True),
    )
    op.add_column("calculations", sa.Column("calc_number", sa.String(64), nullable=True))
    op.add_column("calculations", sa.Column("discipline", sa.String(50), nullable=True))
    op.add_column(
        "calculations",
        sa.Column("current_revision_id", postgresql.UUID(as_uuid=False), nullable=True),
    )
    op.create_foreign_key(
        "fk_calculations_project_id",
        "calculations",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_calculations_current_revision_id",
        "calculations",
        "revision_history",
        ["current_revision_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_calculations_project_id", "calculations", ["project_id"])
    op.create_index("ix_calculations_calc_number", "calculations", ["calc_number"])
    op.create_index("ix_calculations_discipline", "calculations", ["discipline"])
    op.create_index(
        "ix_calculations_current_revision_id", "calculations", ["current_revision_id"]
    )

    # --- revision_history: display-string fallbacks ---
    op.add_column(
        "revision_history", sa.Column("originated_by_name", sa.String(120), nullable=True)
    )
    op.add_column(
        "revision_history", sa.Column("checked_by_name", sa.String(120), nullable=True)
    )
    op.add_column(
        "revision_history", sa.Column("approved_by_name", sa.String(120), nullable=True)
    )

    # --- Backfill 1: calc_number from metadata documentNumber ---
    op.execute(
        """
        UPDATE calculations
        SET calc_number = LEFT(TRIM(current_metadata->>'documentNumber'), 64)
        WHERE calc_number IS NULL
          AND TRIM(COALESCE(current_metadata->>'documentNumber', '')) <> ''
        """
    )

    # --- Backfill 2: project_id from metadata projectNumber (area-scoped) ---
    op.execute(
        """
        UPDATE calculations c
        SET project_id = p.id
        FROM projects p
        WHERE c.project_id IS NULL
          AND c.area_id IS NOT NULL
          AND p.area_id = c.area_id
          AND p.code = TRIM(c.current_metadata->>'projectNumber')
        """
    )

    # --- Backfill 3: dedupe live (project_id, calc_number) keeping the oldest ---
    op.execute(
        """
        UPDATE calculations
        SET calc_number = NULL
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY project_id, calc_number
                           ORDER BY created_at ASC, id ASC
                       ) AS rn
                FROM calculations
                WHERE deleted_at IS NULL
                  AND project_id IS NOT NULL
                  AND calc_number IS NOT NULL
            ) ranked
            WHERE ranked.rn > 1
        )
        """
    )

    op.create_index(
        "uq_calculations_project_calc_number_live",
        "calculations",
        ["project_id", "calc_number"],
        unique=True,
        postgresql_where=sa.text(
            "deleted_at IS NULL AND project_id IS NOT NULL AND calc_number IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_calculations_project_calc_number_live", table_name="calculations"
    )
    op.drop_column("revision_history", "approved_by_name")
    op.drop_column("revision_history", "checked_by_name")
    op.drop_column("revision_history", "originated_by_name")
    op.drop_index("ix_calculations_current_revision_id", table_name="calculations")
    op.drop_index("ix_calculations_discipline", table_name="calculations")
    op.drop_index("ix_calculations_calc_number", table_name="calculations")
    op.drop_index("ix_calculations_project_id", table_name="calculations")
    op.drop_constraint(
        "fk_calculations_current_revision_id", "calculations", type_="foreignkey"
    )
    op.drop_constraint("fk_calculations_project_id", "calculations", type_="foreignkey")
    op.drop_column("calculations", "current_revision_id")
    op.drop_column("calculations", "discipline")
    op.drop_column("calculations", "calc_number")
    op.drop_column("calculations", "project_id")
