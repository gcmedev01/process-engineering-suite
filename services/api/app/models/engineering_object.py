"""EngineeringObject model."""
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID as PyUUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, TimestampMixin


class EngineeringObject(Base, TimestampMixin):
    """
    EngineeringObject table - central database model for all engineering objects.
    Supports I-DDC Identity and I-GEN AI capabilities.
    """

    __tablename__ = "engineering_objects"
    __table_args__ = (
        # Tags are unique per area among live rows; objects without an area
        # fall back to global uniqueness so upsert-by-tag stays unambiguous.
        Index(
            "uq_engineering_objects_area_tag_live",
            "area_id",
            "tag",
            unique=True,
            postgresql_where=text("deleted_at IS NULL AND area_id IS NOT NULL"),
        ),
        Index(
            "uq_engineering_objects_tag_global_live",
            "tag",
            unique=True,
            postgresql_where=text("deleted_at IS NULL AND area_id IS NULL"),
        ),
    )

    # I-DDC Identity
    uuid: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=uuid4,
    )
    tag: Mapped[str] = mapped_column(
        String,
        index=True,
        nullable=False,
    )
    object_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

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
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default='true'
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # The "Clean Fuel" for AI and I-GEN
    # Stores design data, process data, and vendor info in one place
    properties: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default='{}',
    )

    # Metadata for I-DDC tracking
    project_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('projects.id'),
        nullable=True,
        index=True,
    )
    status: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
    )

    # Relationships
    project = relationship('Project')
    area = relationship('Area')
    owner = relationship('User')
