"""Plant model."""
from sqlalchemy import Enum as SQLEnum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Plant(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Plant table - physical location within a customer."""
    
    __tablename__ = "plants"
    __table_args__ = (
        UniqueConstraint("customer_id", "code", name="uq_plants_customer_id_code"),
    )
    
    customer_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "inactive", name="plant_status"),
        nullable=False,
        default="active",
    )
    owner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # Relationships
    customer = relationship("Customer", back_populates="plants")
    owner = relationship("User", back_populates="owned_plants")
    units = relationship("Unit", back_populates="plant", cascade="all, delete-orphan")
