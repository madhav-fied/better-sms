import uuid
import enum
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EnquiryStatus(str, enum.Enum):
    new = "new"
    converted = "converted"
    rejected = "rejected"


class RegistrationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class ParentRelation(str, enum.Enum):
    father = "father"
    mother = "mother"
    guardian = "guardian"


class Enquiry(Base):
    __tablename__ = "enquiries"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    enq_no: Mapped[str] = mapped_column(sa.String(30), nullable=False)
    student_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    parent_name: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    class_seeking: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(sa.String(20), nullable=False, default="new")
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    registrations: Mapped[list["Registration"]] = relationship("Registration", back_populates="enquiry")


class Registration(Base):
    __tablename__ = "registrations"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    enquiry_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("enquiries.id"), nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(RegistrationStatus, native_enum=False), nullable=False, default=RegistrationStatus.pending)
    submitted_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    student_fields: Mapped[Optional[dict]] = mapped_column(sa.JSON, nullable=True)

    enquiry: Mapped[Optional["Enquiry"]] = relationship("Enquiry", back_populates="registrations")
    parent_guardians: Mapped[list["ParentGuardian"]] = relationship("ParentGuardian", back_populates="registration")


class ParentGuardian(Base):
    __tablename__ = "parent_guardians"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    registration_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("registrations.id"), nullable=False)
    relation: Mapped[str] = mapped_column(sa.String(30), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=False)

    registration: Mapped["Registration"] = relationship("Registration", back_populates="parent_guardians")
