"""ProjectNote model - formal notes for protective systems."""
from typing import Optional

from sqlalchemy import Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProjectNote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Printable note associated with a protective system."""

    __tablename__ = "project_notes"

    protective_system_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("protective_systems.id", ondelete="CASCADE"),
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    updated_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    # Soft delete flag
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    protective_system = relationship(
        "ProtectiveSystem", back_populates="notes", lazy="joined"
    )
