import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LeaveEntityType(str, enum.Enum):
    student = "student"
    staff = "staff"


class LeaveType(str, enum.Enum):
    sick = "sick"
    casual = "casual"
    earned = "earned"
    other = "other"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class Leave(Base):
    __tablename__ = "leaves"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(sa.Enum(LeaveEntityType, native_enum=False), nullable=False)
    entity_id: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    leave_type: Mapped[str] = mapped_column(sa.Enum(LeaveType, native_enum=False), nullable=False)
    from_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    to_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    days: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(LeaveStatus, native_enum=False), nullable=False, default=LeaveStatus.pending)
    applied_by: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    applied_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    reviewed_by: Mapped[Optional[str]] = mapped_column(sa.String(36), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    review_note: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
