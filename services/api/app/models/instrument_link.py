"""InstrumentLink model — relationship between an INSTRUMENT and another object."""
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin

RELATIONSHIP_TYPES = ("measures", "controls", "mounted_on", "interlocked_with")


class InstrumentLink(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Directed link from an INSTRUMENT engineering_object to any other object.

    Hard-deleted (no deleted_at): removing a link is always intentional and
    doesn't need audit recovery.
    """

    __tablename__ = "instrument_links"
    __table_args__ = (
        CheckConstraint(
            "relationship_type IN ('measures', 'controls', 'mounted_on', 'interlocked_with')",
            name="ck_instrument_links_relationship_type",
        ),
        UniqueConstraint(
            "instrument_id",
            "target_id",
            "relationship_type",
            name="uq_instrument_links_triple",
        ),
    )

    instrument_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("engineering_objects.uuid", ondelete="CASCADE", name="fk_instrument_links_instrument_id"),
        nullable=False,
        index=True,
    )
    target_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("engineering_objects.uuid", ondelete="CASCADE", name="fk_instrument_links_target_id"),
        nullable=False,
        index=True,
    )
    relationship_type: Mapped[str] = mapped_column(String(32), nullable=False)
    protective_system_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey(
            "protective_systems.id",
            ondelete="SET NULL",
            name="fk_instrument_links_protective_system_id",
        ),
        nullable=True,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    instrument = relationship("EngineeringObject", foreign_keys=[instrument_id])
    target = relationship("EngineeringObject", foreign_keys=[target_id])
    protective_system = relationship("ProtectiveSystem")
