import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EnquiryPurpose(str, enum.Enum):
    new_admission = "new_admission"
    daycare = "daycare"
    both = "both"


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
    enq_no: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    parent_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    student_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    mobile: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    dob: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    class_section_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=True)
    purpose: Mapped[str] = mapped_column(sa.Enum(EnquiryPurpose, native_enum=False), nullable=False, default=EnquiryPurpose.new_admission)
    date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(EnquiryStatus, native_enum=False), nullable=False, default=EnquiryStatus.open)
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
    relation: Mapped[str] = mapped_column(sa.Enum(ParentRelation, native_enum=False), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    occupation: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    qualification: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    aadhar_no: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)

    registration: Mapped["Registration"] = relationship("Registration", back_populates="parent_guardians")
