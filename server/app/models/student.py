import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StudentGender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class StudentType(str, enum.Enum):
    new = "new"
    old = "old"


class AdmissionType(str, enum.Enum):
    regular = "regular"
    daycare = "daycare"
    boarding = "boarding"
    both = "both"


class StudentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class FeeType(str, enum.Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    half_yearly = "half_yearly"
    annually = "annually"


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=True)
    admission_no: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    gender: Mapped[str] = mapped_column(sa.Enum(StudentGender, native_enum=False), nullable=False)
    dob: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(sa.String(10), nullable=True)
    aadhar_no: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    reg_no: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    class_section_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=True)
    student_type: Mapped[str] = mapped_column(sa.Enum(StudentType, native_enum=False), nullable=False, default=StudentType.new)
    hosteller: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    admission_type: Mapped[str] = mapped_column(sa.Enum(AdmissionType, native_enum=False), nullable=False, default=AdmissionType.regular)
    status: Mapped[str] = mapped_column(sa.Enum(StudentStatus, native_enum=False), nullable=False, default=StudentStatus.active)
    registration_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("registrations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    # Extended fields
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    sms_mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    whatsapp_mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    saral_id: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    roll_number: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    card_number: Mapped[Optional[str]] = mapped_column(sa.String(30), nullable=True)
    cbse_reg_no: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    ledger_no: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    pen: Mapped[Optional[str]] = mapped_column(sa.String(30), nullable=True)
    apaar_id: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    caste_category: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    student_category: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    house_category: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    fee_type: Mapped[Optional[str]] = mapped_column(sa.Enum(FeeType, native_enum=False), nullable=True)
    papers: Mapped[Optional[list]] = mapped_column(sa.JSON, nullable=True)
    additional_papers: Mapped[Optional[list]] = mapped_column(sa.JSON, nullable=True)
    contact_address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    pin_code: Mapped[Optional[str]] = mapped_column(sa.String(10), nullable=True)
    permanent_address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    city_state: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    registration_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    joining_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    relieving_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    class_promoted_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    last_school_name: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    last_school_class: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    last_school_subjects: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    last_school_attendance: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    transfer_certificate_no: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    fee_concession: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)
    has_sibling: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    sibling_student_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("students.id"), nullable=True)
    tc_generated: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
