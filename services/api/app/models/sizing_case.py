"""SizingCase model."""
from typing import Optional

from sqlalchemy import String, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SizingCase(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Sizing case for a protective system scenario."""
    
    __tablename__ = "sizing_cases"
    
    protective_system_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("protective_systems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scenario_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("overpressure_scenarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    standard: Mapped[str] = mapped_column(
        SQLEnum("API-520", "API-521", "API-2000", "ASME-VIII", "ISO-4126", name="sizing_standard"),
        nullable=False,
        default="API-520",
    )
    method: Mapped[str] = mapped_column(
        SQLEnum("gas", "liquid", "steam", "two_phase", name="sizing_method"),
        nullable=False,
    )
    
    # Inputs and outputs stored as JSONB for flexibility
    inputs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    outputs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    unit_preferences: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Soft delete flag
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    
    # Current revision reference
    current_revision_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("revision_history.id"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        SQLEnum("draft", "calculated", "verified", "approved", name="sizing_status"),
        nullable=False,
        default="draft",
    )
    created_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    approved_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    # Relationships
    protective_system = relationship("ProtectiveSystem", back_populates="sizing_cases")
    scenario = relationship("OverpressureScenario", back_populates="sizing_cases")
    current_revision = relationship("RevisionHistory", foreign_keys=[current_revision_id])

