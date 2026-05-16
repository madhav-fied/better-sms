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


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)
    admission_no: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    first_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    gender: Mapped[str] = mapped_column(sa.Enum(StudentGender, native_enum=False), nullable=False)
    dob: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(sa.String(10), nullable=True)
    aadhar_no: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    reg_no: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    student_type: Mapped[str] = mapped_column(sa.Enum(StudentType, native_enum=False), nullable=False, default=StudentType.new)
    hosteller: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    admission_type: Mapped[str] = mapped_column(sa.Enum(AdmissionType, native_enum=False), nullable=False, default=AdmissionType.regular)
    status: Mapped[str] = mapped_column(sa.Enum(StudentStatus, native_enum=False), nullable=False, default=StudentStatus.active)
    registration_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("registrations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)
