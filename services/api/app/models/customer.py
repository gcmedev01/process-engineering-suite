"""Customer model - top of hierarchy."""
from sqlalchemy import Enum as SQLEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Customer(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Customer table - top level of organizational hierarchy."""
    
    __tablename__ = "customers"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "inactive", name="customer_status"),
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
    owner = relationship("User", back_populates="owned_customers")
    plants = relationship("Plant", back_populates="customer", cascade="all, delete-orphan")
