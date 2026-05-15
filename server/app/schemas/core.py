from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class SchoolCreate(BaseModel):
    name: str
    branch_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    attendance_mode: str = "period"
    uses_saturday: bool = False


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    branch_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    attendance_mode: Optional[str] = None
    uses_saturday: Optional[bool] = None


class SchoolOut(BaseModel):
    id: str
    name: str
    branch_name: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    attendance_mode: str
    uses_saturday: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AcademicYearCreate(BaseModel):
    school_id: str
    label: str
    start_date: date
    end_date: date


class AcademicYearUpdate(BaseModel):
    label: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class AcademicYearOut(BaseModel):
    id: str
    school_id: str
    label: str
    start_date: date
    end_date: date
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ClassSectionCreate(BaseModel):
    school_id: str
    academic_year_id: str
    class_name: str
    section: str
    class_teacher_id: Optional[str] = None


class ClassSectionUpdate(BaseModel):
    class_name: Optional[str] = None
    section: Optional[str] = None
    class_teacher_id: Optional[str] = None


class ClassSectionOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: str
    class_name: str
    section: str
    class_teacher_id: Optional[str]

    model_config = {"from_attributes": True}
