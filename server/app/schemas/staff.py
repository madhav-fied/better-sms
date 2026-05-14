from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

from app.models.staff import StaffGender, StaffCategory, StaffStatus


class StaffCreate(BaseModel):
    emp_code: str
    name: str
    dob: Optional[date] = None
    gender: StaffGender
    mobile: Optional[str] = None
    email: Optional[str] = None
    aadhar_no: Optional[str] = None
    permanent_address: Optional[str] = None
    category: StaffCategory = StaffCategory.teacher
    grade: Optional[str] = None


class StaffUpdate(BaseModel):
    emp_code: Optional[str] = None
    name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[StaffGender] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    aadhar_no: Optional[str] = None
    permanent_address: Optional[str] = None
    category: Optional[StaffCategory] = None
    grade: Optional[str] = None


class StaffOut(BaseModel):
    id: str
    school_id: str
    emp_code: str
    name: str
    dob: Optional[date]
    gender: str
    mobile: Optional[str]
    email: Optional[str]
    aadhar_no: Optional[str]
    permanent_address: Optional[str]
    category: str
    grade: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TeacherSubjectCreate(BaseModel):
    staff_id: str
    subject: str
    class_section_id: str
    academic_year_id: str


class TeacherSubjectOut(BaseModel):
    id: str
    school_id: str
    staff_id: str
    subject: str
    class_section_id: str
    academic_year_id: str

    model_config = {"from_attributes": True}
