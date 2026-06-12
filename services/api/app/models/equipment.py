"""Equipment model."""
from typing import Optional

from sqlalchemy import Boolean, Enum as SQLEnum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Equipment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Equipment table - protected equipment."""
    
    __tablename__ = "equipment"
    __table_args__ = (
        UniqueConstraint("area_id", "tag", name="uq_equipment_area_id_tag"),
    )
    
    area_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("areas.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        SQLEnum(
            "vessel",
            "tank",
            "heat_exchanger",
            "column",
            "reactor",
            "pump",
            "compressor",
            "piping",
            "vendor_package",
            "other",
            name="equipment_type"
        ),
        nullable=False,
    )
    tag: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    design_pressure: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    design_pressure_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="barg")
    mawp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    mawp_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="barg")
    design_temp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    design_temp_unit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="C")
    owner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    # Soft delete flag
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "inactive", name="equipment_status"),
        nullable=False,
        default="active",
    )
    location_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    area = relationship("Area", back_populates="equipment")
    owner = relationship("User", back_populates="owned_equipment")
