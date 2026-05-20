import uuid
import enum
from datetime import datetime, date
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class StaffGender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class StaffCategory(str, enum.Enum):
    teacher = "teacher"
    peon = "peon"
    accounts = "accounts"
    clerk = "clerk"
    electrician = "electrician"
    receptionist = "receptionist"
    security = "security"
    other = "other"


class StaffStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class MaritalStatus(str, enum.Enum):
    single = "single"
    married = "married"
    divorced = "divorced"
    widowed = "widowed"


class TeachingType(str, enum.Enum):
    regular = "regular"
    contract = "contract"
    guest = "guest"
    part_time = "part_time"


class JobType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    probation = "probation"


class JobStatus(str, enum.Enum):
    active = "active"
    on_leave = "on_leave"
    resigned = "resigned"
    terminated = "terminated"


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    emp_code: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    short_name: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    gender: Mapped[str] = mapped_column(sa.Enum(StaffGender, native_enum=False), nullable=False)
    mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    aadhar_no: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    permanent_address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    category: Mapped[str] = mapped_column(sa.Enum(StaffCategory, native_enum=False), nullable=False, default=StaffCategory.teacher)
    grade: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    status: Mapped[str] = mapped_column(sa.Enum(StaffStatus, native_enum=False), nullable=False, default=StaffStatus.active)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False)

    # Extended fields
    religion: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(sa.String(10), nullable=True)
    caste_category: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    contact_address: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(sa.String(10), nullable=True)
    city_state: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    qualification: Mapped[Optional[str]] = mapped_column(sa.String(255), nullable=True)
    teaching_type: Mapped[Optional[str]] = mapped_column(sa.Enum(TeachingType, native_enum=False), nullable=True)
    basic_salary: Mapped[Optional[float]] = mapped_column(sa.Numeric(12, 2), nullable=True)
    total_experience: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    card_number: Mapped[Optional[str]] = mapped_column(sa.String(30), nullable=True)
    relieving_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    licensee_number: Mapped[Optional[str]] = mapped_column(sa.String(50), nullable=True)
    passport_number: Mapped[Optional[str]] = mapped_column(sa.String(30), nullable=True)
    emergency_mobile: Mapped[Optional[str]] = mapped_column(sa.String(20), nullable=True)
    father_first_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    father_last_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    mother_first_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    mother_last_name: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    marital_status: Mapped[Optional[str]] = mapped_column(sa.Enum(MaritalStatus, native_enum=False), nullable=True)
    spouse_name: Mapped[Optional[str]] = mapped_column(sa.String(200), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(sa.String(500), nullable=True)

    job_detail: Mapped[Optional["StaffJobDetail"]] = relationship("StaffJobDetail", uselist=False, lazy="select")


class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"
    __table_args__ = (
        sa.UniqueConstraint(
            "school_id", "class_section_id", "subject", "academic_year_id",
            name="uq_teacher_subjects_class_subject_ay",
        ),
    )

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("schools.id"), nullable=False)
    staff_id: Mapped[Optional[str]] = mapped_column(sa.String(36), sa.ForeignKey("staff.id"), nullable=True)
    subject: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    class_section_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("class_sections.id"), nullable=False)
    academic_year_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("academic_years.id"), nullable=False)


class StaffJobDetail(Base):
    __tablename__ = "staff_job_details"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    staff_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("staff.id"), nullable=False, unique=True)
    joined_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    end_of_probation: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    position: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    effective_date: Mapped[Optional[date]] = mapped_column(sa.Date, nullable=True)
    superior: Mapped[Optional[str]] = mapped_column(sa.String(200), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(sa.String(100), nullable=True)
    job_type: Mapped[Optional[str]] = mapped_column(sa.Enum(JobType, native_enum=False), nullable=True)
    job_status: Mapped[Optional[str]] = mapped_column(sa.Enum(JobStatus, native_enum=False), nullable=True)
    workdays: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
    holidays: Mapped[Optional[int]] = mapped_column(sa.Integer, nullable=True)
