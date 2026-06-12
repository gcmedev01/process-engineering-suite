"""OverpressureScenario model."""
from typing import Optional

from sqlalchemy import String, Text, Numeric, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class OverpressureScenario(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Overpressure scenario for a protective system."""
    
    __tablename__ = "overpressure_scenarios"
    
    protective_system_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("protective_systems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cause: Mapped[str] = mapped_column(
        SQLEnum(
            "blocked_outlet",
            "fire_case",
            "external_fire",
            "tube_rupture",
            "thermal_expansion",
            "utility_failure",
            "control_valve_failure",
            "power_failure",
            "cooling_water_failure",
            "reflux_failure",
            "abnormal_heat_input",
            "check_valve_failure",
            "other",
            name="scenario_cause",
        ),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=True)
    relieving_temp: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    relieving_pressure: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    phase: Mapped[str] = mapped_column(
        SQLEnum("gas", "liquid", "steam", "two_phase", name="scenario_phase"),
        nullable=False,
    )
    relieving_rate: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    accumulation_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    required_capacity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    assumptions: Mapped[list] = mapped_column(ARRAY(String), default=list, nullable=False)
    code_refs: Mapped[list] = mapped_column(ARRAY(String), default=list, nullable=False)
    is_governing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Free-form markdown notes used in the UI "Case Consideration" editor.
    case_consideration: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Soft delete flag
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    
    # Current revision reference
    current_revision_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("revision_history.id"),
        nullable=True,
        index=True,
    )

    # Relationships
    protective_system = relationship("ProtectiveSystem", back_populates="scenarios")
    sizing_cases = relationship("SizingCase", back_populates="scenario")
    current_revision = relationship("RevisionHistory", foreign_keys=[current_revision_id])
