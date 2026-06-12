"""Merge the two divergent migration heads.

The migration history forked at 202412150001 into two long-lived branches that
were never reconciled:
- Head A: 202601010001 (add is_active to projects/protective_systems + user
  settings, revision history, scenario causes, division-manager role)
- Head B: 202605040002 (PSV soft-delete, equipment->engineering_objects
  unification, calculation versioning, venting/network/design-agent tables)

This empty merge node joins both heads so `alembic upgrade head` resolves to a
single head. It performs no schema operations; the branches' migrations remain
in the DAG and are applied individually by Alembic. Overlapping operations
across the branches (e.g. is_active columns) are guarded with IF [NOT] EXISTS,
so applying any previously-unapplied branch migrations is idempotent-safe.

Revision ID: 202606110001
Revises: 202601010001, 202605040002
Create Date: 2026-06-11 00:00:00
"""

from typing import Sequence, Union

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401


revision: str = "202606110001"
down_revision: Union[str, Sequence[str], None] = ("202601010001", "202605040002")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: pure merge node."""
    pass


def downgrade() -> None:
    """No-op: pure merge node."""
    pass
