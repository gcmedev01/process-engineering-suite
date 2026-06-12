from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Calculation(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = 'calculations'
    __table_args__ = (
        # Register numbers are unique per project among live rows only, so a
        # number freed by soft-delete can be reused.
        Index(
            'uq_calculations_project_calc_number_live',
            'project_id',
            'calc_number',
            unique=True,
            postgresql_where=text(
                'deleted_at IS NULL AND project_id IS NOT NULL AND calc_number IS NOT NULL'
            ),
        ),
    )

    app: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    area_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('areas.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default='', server_default='')
    status: Mapped[str] = mapped_column(String(50), nullable=False, default='draft', server_default='draft')
    tag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    project_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('projects.id', ondelete='SET NULL', name='fk_calculations_project_id'),
        nullable=True,
        index=True,
    )
    calc_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    discipline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    current_revision_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey(
            'revision_history.id',
            ondelete='SET NULL',
            name='fk_calculations_current_revision_id',
            use_alter=True,
        ),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default='true')
    linked_equipment_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey(
            'engineering_objects.uuid',
            ondelete='SET NULL',
            name='fk_calculations_linked_equipment_id',
        ),
        nullable=True,
        index=True,
    )
    linked_equipment_tag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    latest_version_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default='1')
    latest_version_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), nullable=True)
    current_input_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default='{}')
    current_result_snapshot: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    current_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default='{}')

    area = relationship('Area')
    owner = relationship('User')
    project = relationship('Project')
    current_revision = relationship('RevisionHistory', foreign_keys=[current_revision_id])
    versions = relationship(
        'CalculationVersion',
        back_populates='calculation',
        cascade='all, delete-orphan',
        order_by='desc(CalculationVersion.version_no)',
    )
