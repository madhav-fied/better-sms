import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EnquiryStatus(str, enum.Enum):
    open = "open"
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
    parent_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    mobile: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    purpose: Mapped[str] = mapped_column(sa.String(30), nullable=False, default="new_admission")
    dob: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    class_section_id: Mapped[Optional[str]] = mapped_column(
        sa.String(36), sa.ForeignKey("class_sections.id"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(sa.String(20), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    registrations: Mapped[list["Registration"]] = relationship("Registration", back_populates="enquiry")


class Registration(Base):
    __tablename__ = "registrations"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=True)
    enquiry_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("enquiries.id"), nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(RegistrationStatus, native_enum=False), nullable=False, default=RegistrationStatus.pending)
    submitted_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
    student_fields: Mapped[Optional[dict]] = mapped_column(sa.JSON, nullable=True)

    enquiry: Mapped[Optional["Enquiry"]] = relationship("Enquiry", back_populates="registrations")
    parent_guardians: Mapped[list["ParentGuardian"]] = relationship("ParentGuardian", back_populates="registration")


class ParentGuardian(Base):
    __tablename__ = "parent_guardians"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    registration_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("registrations.id"), nullable=True)
    student_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("students.id"), nullable=True)
    parent_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("parents.id"), nullable=True)
    relation: Mapped[str] = mapped_column(sa.String(30), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column("mobile", sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=False, server_default="false")

    # Extended fields
    qualification: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    aadhar_no: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    bank_account: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    ifsc_code: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    annual_income: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    anniversary_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    guardian_relation: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    alternate_mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    alternate_email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    emergency_mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)

    registration: Mapped["Registration"] = relationship("Registration", back_populates="parent_guardians")
