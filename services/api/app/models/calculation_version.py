from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CalculationVersion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = 'calculation_versions'
    __table_args__ = (
        UniqueConstraint('calculation_id', 'version_no', name='uq_calculation_versions_calc_version'),
    )

    calculation_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('calculations.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    version_kind: Mapped[str] = mapped_column(String(50), nullable=False)
    inputs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default='{}')
    results: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    metadata_payload: Mapped[dict] = mapped_column('metadata', JSONB, nullable=False, default=dict, server_default='{}')
    revision_history: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default='[]')
    linked_equipment_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey(
            'engineering_objects.uuid',
            ondelete='SET NULL',
            name='fk_calculation_versions_linked_equipment_id',
        ),
        nullable=True,
        index=True,
    )
    linked_equipment_tag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_version_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('calculation_versions.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    change_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    calculation = relationship('Calculation', back_populates='versions')
