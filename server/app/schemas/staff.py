from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

from app.models.staff import StaffGender, StaffCategory, StaffStatus, MaritalStatus, TeachingType, JobType, JobStatus


class StaffCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    short_name: Optional[str] = None
    gender: StaffGender
    email: Optional[str] = None
    mobile: Optional[str] = None
    dob: Optional[date] = None
    religion: Optional[str] = None
    aadhar_no: Optional[str] = None
    blood_group: Optional[str] = None
    caste_category: Optional[str] = None
    contact_address: Optional[str] = None
    pincode: Optional[str] = None
    permanent_address: Optional[str] = None
    city_state: Optional[str] = None
    emp_code: Optional[str] = None
    category: StaffCategory = StaffCategory.teacher
    designation: Optional[str] = None
    qualification: Optional[str] = None
    teaching_type: Optional[TeachingType] = None
    grade: Optional[str] = None
    basic_salary: Optional[float] = None
    total_experience: Optional[int] = None
    card_number: Optional[str] = None
    relieving_date: Optional[date] = None
    licensee_number: Optional[str] = None
    passport_number: Optional[str] = None
    emergency_mobile: Optional[str] = None
    father_first_name: Optional[str] = None
    father_last_name: Optional[str] = None
    mother_first_name: Optional[str] = None
    mother_last_name: Optional[str] = None
    marital_status: Optional[MaritalStatus] = None
    spouse_name: Optional[str] = None
    photo_url: Optional[str] = None


class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    short_name: Optional[str] = None
    gender: Optional[StaffGender] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    dob: Optional[date] = None
    religion: Optional[str] = None
    aadhar_no: Optional[str] = None
    blood_group: Optional[str] = None
    caste_category: Optional[str] = None
    contact_address: Optional[str] = None
    pincode: Optional[str] = None
    permanent_address: Optional[str] = None
    city_state: Optional[str] = None
    emp_code: Optional[str] = None
    category: Optional[StaffCategory] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    teaching_type: Optional[TeachingType] = None
    grade: Optional[str] = None
    basic_salary: Optional[float] = None
    total_experience: Optional[int] = None
    card_number: Optional[str] = None
    relieving_date: Optional[date] = None
    licensee_number: Optional[str] = None
    passport_number: Optional[str] = None
    emergency_mobile: Optional[str] = None
    father_first_name: Optional[str] = None
    father_last_name: Optional[str] = None
    mother_first_name: Optional[str] = None
    mother_last_name: Optional[str] = None
    marital_status: Optional[MaritalStatus] = None
    spouse_name: Optional[str] = None
    photo_url: Optional[str] = None
    status: Optional[StaffStatus] = None


class StaffOut(BaseModel):
    id: str
    school_id: str
    emp_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    short_name: Optional[str] = None
    gender: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    dob: Optional[date] = None
    religion: Optional[str] = None
    aadhar_no: Optional[str] = None
    blood_group: Optional[str] = None
    caste_category: Optional[str] = None
    contact_address: Optional[str] = None
    pincode: Optional[str] = None
    permanent_address: Optional[str] = None
    city_state: Optional[str] = None
    category: str
    designation: Optional[str] = None
    qualification: Optional[str] = None
    teaching_type: Optional[str] = None
    grade: Optional[str] = None
    basic_salary: Optional[float] = None
    total_experience: Optional[int] = None
    card_number: Optional[str] = None
    relieving_date: Optional[date] = None
    licensee_number: Optional[str] = None
    passport_number: Optional[str] = None
    emergency_mobile: Optional[str] = None
    father_first_name: Optional[str] = None
    father_last_name: Optional[str] = None
    mother_first_name: Optional[str] = None
    mother_last_name: Optional[str] = None
    marital_status: Optional[str] = None
    spouse_name: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    created_at: datetime
    job_detail: Optional["StaffJobDetailOut"] = None

    model_config = {"from_attributes": True}


class StaffJobDetailCreate(BaseModel):
    joined_date: Optional[date] = None
    end_of_probation: Optional[date] = None
    position: Optional[str] = None
    effective_date: Optional[date] = None
    superior: Optional[str] = None
    department: Optional[str] = None
    branch: Optional[str] = None
    job_type: Optional[JobType] = None
    job_status: Optional[JobStatus] = None
    workdays: Optional[int] = None
    holidays: Optional[int] = None


class StaffJobDetailOut(BaseModel):
    id: str
    staff_id: str
    joined_date: Optional[date] = None
    end_of_probation: Optional[date] = None
    position: Optional[str] = None
    effective_date: Optional[date] = None
    superior: Optional[str] = None
    department: Optional[str] = None
    branch: Optional[str] = None
    job_type: Optional[str] = None
    job_status: Optional[str] = None
    workdays: Optional[int] = None
    holidays: Optional[int] = None

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
