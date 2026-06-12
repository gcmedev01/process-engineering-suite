"""Project model."""
from datetime import date
from typing import Optional

from sqlalchemy import Boolean, Date, Enum as SQLEnum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Project(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Project table - engineering project context."""
    
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("area_id", "code", name="uq_projects_area_id_code"),
    )
    
    area_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("areas.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    phase: Mapped[str] = mapped_column(
        SQLEnum("design", "construction", "commissioning", "operation", name="project_phase"),
        nullable=False,
        default="design",
    )
    status: Mapped[str] = mapped_column(
        SQLEnum("draft", "in_review", "checked", "approved", "issued", name="project_status"),
        nullable=False,
        default="draft",
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    lead_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # Display preferences for PSV details/reports (engineering data stays in base units)
    unit_system: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="metric",
    )
    
    # Soft delete flag
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    
    # Relationships
    area = relationship("Area", back_populates="projects")
    protective_systems = relationship("ProtectiveSystem", secondary="protective_system_projects", back_populates="projects")
