"""ProtectiveSystem (PSV) model."""
from typing import Optional, List

from sqlalchemy import Boolean, CheckConstraint, Column, Enum as SQLEnum, ForeignKey, Index, Integer, Numeric, String, Table, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from .base import Base, TimestampMixin, SoftDeleteMixin, UUIDPrimaryKeyMixin


protective_system_projects = Table(
    "protective_system_projects",
    Base.metadata,
    Column("protective_system_id", UUID(as_uuid=False), ForeignKey("protective_systems.id", ondelete="CASCADE"), primary_key=True),
    Column("project_id", UUID(as_uuid=False), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
)


class ProtectiveSystem(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Protective system (PSV, rupture disc, etc.) table."""
    
    __tablename__ = "protective_systems"
    __table_args__ = (
        # Partial unique index: a (area_id, tag) pair is unique only among live
        # rows, so a tag freed by soft-deleting a PSV can be reused in the area.
        Index(
            "uq_protective_systems_area_id_tag",
            "area_id",
            "tag",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        CheckConstraint(
            "(deleted_at IS NULL) = is_active",
            name="ck_protective_systems_deleted_at_matches_is_active",
        ),
    )
    
    area_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("areas.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tag: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    type: Mapped[str] = mapped_column(
        SQLEnum("psv", "rupture_disc", "breather_valve", "flame_arrestor", 
                "tank_vent", "control_valve", "vent_system", "prv",
                name="protective_system_type"),
        nullable=False,
        default="psv",
    )
    design_code: Mapped[str] = mapped_column(
        SQLEnum("API-520", "API-521", "API-2000", "ASME-VIII", name="design_code"),
        nullable=False,
        default="API-520",
    )
    service_fluid: Mapped[str] = mapped_column(String(255), nullable=True)
    fluid_phase: Mapped[str] = mapped_column(
        SQLEnum("gas", "liquid", "steam", "two_phase", name="fluid_phase"),
        nullable=False,
        default="gas",
    )
    set_pressure: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    mawp: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    owner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        SQLEnum("draft", "in_review", "checked", "approved", "issued", name="psv_status"),
        nullable=False,
        default="draft",
    )
    valve_type: Mapped[Optional[str]] = mapped_column(
        SQLEnum("conventional", "balanced_bellows", "pilot_operated", name="valve_operating_type"),
        nullable=True,
    )
    tags: Mapped[List[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    project_tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(UUID(as_uuid=False)), nullable=True)
    
    # Version for optimistic locking (concurrent editing detection)
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)

    # Current revision reference
    current_revision_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("revision_history.id"),
        nullable=True,
        index=True,
    )

    # Pipeline networks stored as JSONB
    inlet_network: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    outlet_network: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Soft delete flag
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="owned_psvs")
    area = relationship("Area", back_populates="protective_systems")
    projects = relationship("Project", secondary="protective_system_projects", back_populates="protective_systems")
    scenarios = relationship("OverpressureScenario", back_populates="protective_system", cascade="all, delete-orphan")
    sizing_cases = relationship("SizingCase", back_populates="protective_system", cascade="all, delete-orphan")
    equipment_links = relationship("EquipmentLink", back_populates="protective_system", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="protective_system", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="protective_system", cascade="all, delete-orphan")
    todos = relationship("Todo", back_populates="protective_system", cascade="all, delete-orphan")
    notes = relationship("ProjectNote", back_populates="protective_system", cascade="all, delete-orphan")
    current_revision = relationship("RevisionHistory", foreign_keys=[current_revision_id])

    @property
    def project_ids(self) -> list[str]:
        """Return list of project IDs for API compatibility."""
        return [p.id for p in self.projects]
