"""Calculation register domain logic.

Register fields (project linkage, calc numbers, discipline) and normalized
sign-off rows for saved calculations. Kept out of db_service.py per the
decomposition guidance — DatabaseService only delegates here.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Calculation, Project, RevisionHistory, User

logger = logging.getLogger(__name__)

# Allowed disciplines (String column; enforced at the API layer so the list is
# cheap to extend without a migration).
DISCIPLINES = (
    'process',
    'mechanical',
    'safety',
    'instrumentation',
    'electrical',
    'civil',
    'piping',
)

# Short codes used in suggested register numbers: <project.code>-<CODE>-<seq>
DISCIPLINE_CODES = {
    'process': 'PR',
    'mechanical': 'ME',
    'safety': 'SA',
    'instrumentation': 'IN',
    'electrical': 'EL',
    'civil': 'CI',
    'piping': 'PI',
}

REVISION_ENTITY_TYPE = 'calculation'


async def lift_register_fields(
    session: AsyncSession,
    data: dict[str, Any],
    *,
    area_id: Optional[str],
) -> dict[str, Any]:
    """Resolve register fields from an incoming create/update payload.

    Explicit fields (projectId/calcNumber/discipline) always win; otherwise
    calc_number is lifted from metadata.documentNumber and project_id resolved
    from metadata.projectNumber matched against projects on (area_id, code) —
    project codes are only unique per area, so a bare code match is unsafe.

    Returns {'project_id', 'calc_number', 'discipline'} with None for
    anything unresolved.
    """
    metadata = data.get('metadata') or {}

    calc_number = (data.get('calcNumber') or '').strip() or None
    if not calc_number:
        calc_number = (str(metadata.get('documentNumber') or '')).strip()[:64] or None

    discipline = (data.get('discipline') or '').strip().lower() or None

    project_id = (data.get('projectId') or '').strip() or None
    if not project_id and area_id:
        project_code = (str(metadata.get('projectNumber') or '')).strip()
        if project_code:
            stmt = select(Project.id).where(
                Project.area_id == area_id,
                Project.code == project_code,
            )
            project_id = (await session.execute(stmt)).scalar_one_or_none()

    return {
        'project_id': project_id,
        'calc_number': calc_number,
        'discipline': discipline,
    }


async def suggest_next_calc_number(
    session: AsyncSession,
    project_id: str,
    discipline: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Suggest the next register number for a project (+ optional discipline).

    Pattern: <project.code>-<DISCIPLINE_CODE>-<NNN> (e.g. PRJ001-PR-004) or
    <project.code>-<NNN> when no discipline is given. Existing live calc
    numbers that don't match the pattern are ignored for sequencing. The
    suggestion is advisory — the partial unique index is the real guard.

    Returns None if the project doesn't exist.
    """
    project = (
        await session.execute(select(Project).where(Project.id == project_id))
    ).scalar_one_or_none()
    if project is None:
        return None

    prefix = project.code
    if discipline:
        code = DISCIPLINE_CODES.get(discipline)
        if code:
            prefix = f"{project.code}-{code}"

    stmt = select(Calculation.calc_number).where(
        Calculation.project_id == project_id,
        Calculation.calc_number.is_not(None),
        Calculation.deleted_at.is_(None),
    )
    numbers = (await session.execute(stmt)).scalars().all()

    pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)$")
    max_seq = 0
    width = 3
    for number in numbers:
        match = pattern.match(number or '')
        if match:
            max_seq = max(max_seq, int(match.group(1)))
            width = max(width, len(match.group(1)))

    next_seq = max_seq + 1
    return {
        'nextNumber': f"{prefix}-{next_seq:0{width}d}",
        'sequence': next_seq,
        'pattern': f"{prefix}-<seq>",
    }


def _parse_signoff_date(value: Any) -> Optional[datetime]:
    text = str(value or '').strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _initials(name: str) -> str:
    return ''.join(part[0] for part in name.split() if part).upper()


async def _resolve_user_id(
    session: AsyncSession,
    display: str,
    cache: dict[str, Optional[str]],
) -> Optional[str]:
    """Best-effort mapping of a sign-off display string to a user id.

    Match order: exact name (case-insensitive) → stored initials → email
    local-part → initials derived from name. Misses return None — the raw
    string is preserved in revision_history.*_by_name by the caller.
    """
    key = display.strip().lower()
    if not key:
        return None
    if key in cache:
        return cache[key]

    users = cache.get('__all__')
    if users is None:
        rows = (
            await session.execute(select(User.id, User.name, User.initials, User.email))
        ).all()
        users = [(r.id, r.name or '', r.initials or '', r.email or '') for r in rows]
        cache['__all__'] = users  # type: ignore[assignment]

    resolved: Optional[str] = None
    for uid, name, initials, email in users:
        if name.strip().lower() == key:
            resolved = uid
            break
    if resolved is None:
        for uid, name, initials, email in users:
            if initials and initials.strip().lower() == key:
                resolved = uid
                break
    if resolved is None:
        for uid, name, initials, email in users:
            local = email.split('@')[0].lower() if email else ''
            if local and local == key:
                resolved = uid
                break
    if resolved is None:
        for uid, name, initials, email in users:
            if name and _initials(name).lower() == key:
                resolved = uid
                break

    cache[key] = resolved
    return resolved


async def sync_revision_rows(
    session: AsyncSession,
    calculation_id: str,
    revision_rows: list[dict[str, Any]],
) -> Optional[str]:
    """Mirror the JSONB revisionHistory rows into the normalized
    revision_history table (entity_type='calculation').

    Delete-and-reinsert per save — mirrors how the JSONB array is replaced
    wholesale. The JSONB on calculation_versions stays the UI source of truth;
    these rows add FK-validated users and real timestamps for register queries.

    Best-effort by contract: callers wrap this so a sync failure never aborts
    the calculation save. Returns the id of the highest-sequence row (the
    current revision) or None.
    """
    await session.execute(
        delete(RevisionHistory).where(
            RevisionHistory.entity_type == REVISION_ENTITY_TYPE,
            RevisionHistory.entity_id == calculation_id,
        )
    )

    cache: dict[str, Optional[str]] = {}
    current_id: Optional[str] = None
    for sequence, row in enumerate(revision_rows or [], start=1):
        originated = str(row.get('by') or '').strip()
        checked = str(row.get('checkedBy') or '').strip()
        approved = str(row.get('approvedBy') or '').strip()

        record = RevisionHistory(
            entity_type=REVISION_ENTITY_TYPE,
            entity_id=calculation_id,
            revision_code=str(row.get('rev') or '')[:16] or str(sequence),
            sequence=sequence,
            originated_by=await _resolve_user_id(session, originated, cache),
            originated_by_name=originated[:120] or None,
            originated_at=_parse_signoff_date(row.get('byDate')),
            checked_by=await _resolve_user_id(session, checked, cache),
            checked_by_name=checked[:120] or None,
            checked_at=_parse_signoff_date(row.get('checkedDate')),
            approved_by=await _resolve_user_id(session, approved, cache),
            approved_by_name=approved[:120] or None,
            approved_at=_parse_signoff_date(row.get('approvedDate')),
            snapshot=dict(row),
        )
        session.add(record)
        await session.flush()
        current_id = record.id

    return current_id


async def apply_register_state(
    session: AsyncSession,
    calculation: Calculation,
    data: dict[str, Any],
    revision_rows: list[dict[str, Any]],
) -> None:
    """Apply register fields + sign-off sync to a calculation being saved.

    Field application is part of the save; the revision-row mirror is
    best-effort and never raises.
    """
    lifted = await lift_register_fields(session, data, area_id=calculation.area_id)
    if lifted['project_id'] is not None or 'projectId' in data:
        calculation.project_id = lifted['project_id']
    if lifted['calc_number'] is not None or 'calcNumber' in data:
        calculation.calc_number = lifted['calc_number']
    if lifted['discipline'] is not None or 'discipline' in data:
        calculation.discipline = lifted['discipline']

    try:
        calculation.current_revision_id = await sync_revision_rows(
            session, calculation.id, revision_rows
        )
    except Exception:  # noqa: BLE001 — sign-off mirror must never block a save
        logger.warning(
            'revision_history sync failed for calculation %s', calculation.id,
            exc_info=True,
        )
