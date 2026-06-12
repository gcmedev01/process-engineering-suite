"""EquipmentLink model - junction table between PSV and Equipment."""
from typing import Optional

from sqlalchemy import Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class EquipmentLink(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Link between protective systems and equipment."""
    
    __tablename__ = "equipment_links"
    
    protective_system_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("protective_systems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    equipment_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("engineering_objects.uuid", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scenario_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("overpressure_scenarios.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    relationship_type: Mapped[str] = mapped_column(
        SQLEnum("protects", "inlet_from", "discharge_to", name="equipment_relationship"),
        nullable=False,
        default="protects",
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    protective_system = relationship("ProtectiveSystem", back_populates="equipment_links")
    engineering_object = relationship("EngineeringObject")
