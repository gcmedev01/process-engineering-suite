"""RevisionHistory model for tracking document revisions."""
from datetime import datetime
from typing import Optional, Any

from sqlalchemy import ForeignKey, Integer, String, Text, DateTime, func, Boolean
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, UUIDPrimaryKeyMixin


class RevisionHistory(Base, UUIDPrimaryKeyMixin):
    """Tracks revision history for PSV, scenarios, and sizing cases."""
    
    __tablename__ = "revision_history"
    
    is_active: Mapped[bool] = mapped_column(Boolean, server_default='true', default=True, nullable=False)
    
    # Entity reference (polymorphic)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    
    # Revision info
    revision_code: Mapped[str] = mapped_column(String(16), nullable=False)  # 'O1', 'A1', 'B1'
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)  # For ordering
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Lifecycle tracking. The *_by_name columns capture display strings
    # (initials/free text from calculation sign-off rows) when the value
    # doesn't resolve to a user account; the FK stays NULL in that case.
    originated_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True
    )
    originated_by_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    originated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    checked_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True
    )
    checked_by_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    approved_by: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False), ForeignKey("users.id"), nullable=True, index=True
    )
    approved_by_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Snapshot of entity state
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    
    # Relationships
    originator = relationship("User", foreign_keys=[originated_by])
    checker = relationship("User", foreign_keys=[checked_by])
    approver = relationship("User", foreign_keys=[approved_by])
    
    def __repr__(self) -> str:
        return f"<RevisionHistory {self.entity_type}:{self.entity_id} Rev.{self.revision_code}>"
