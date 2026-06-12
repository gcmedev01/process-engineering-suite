"""VentingCalculation model — stores API 2000 tank venting calculation inputs and results."""
from typing import Optional

from sqlalchemy import Boolean, Enum as SQLEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, TimestampMixin, SoftDeleteMixin, UUIDPrimaryKeyMixin


class VentingCalculation(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Saved venting calculation (API 2000) for a tank."""

    __tablename__ = "venting_calculations"

    # Optional hierarchy link — nullable so standalone use is also valid
    area_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("areas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Optional link to an existing Tank equipment record
    equipment_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("engineering_objects.uuid", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    # Human-readable identification
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status lifecycle
    status: Mapped[str] = mapped_column(
        SQLEnum("draft", "in_review", "approved", name="vent_calc_status"),
        nullable=False,
        default="draft",
        server_default="draft",
    )

    # Full CalculationInput shape from the venting-calculation frontend app
    inputs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")

    # Full CalculationResult shape (set after successful calculation)
    results: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Document metadata used by report/export flows.
    calculation_metadata: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    revision_history: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list, server_default="[]"
    )

    # API 2000 edition used
    api_edition: Mapped[str] = mapped_column(
        String(10), nullable=False, default="7TH", server_default="7TH"
    )

    # Soft delete flag (required by SoftDeleteMixin pattern)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    # Relationships
    area = relationship("Area")
    engineering_object = relationship("EngineeringObject")
    owner = relationship("User")
