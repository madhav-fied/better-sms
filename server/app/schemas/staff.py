from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, model_validator

from app.models.staff import StaffGender, StaffCategory, StaffStatus, MaritalStatus, TeachingType, JobType, JobStatus


def _split_name(name: str) -> tuple[str, Optional[str]]:
    parts = name.strip().split(None, 1)
    first = parts[0]
    last = parts[1] if len(parts) > 1 else None
    return first, last


class StaffCreate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
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

    @model_validator(mode="before")
    @classmethod
    def normalize_name_fields(cls, data):
        if not isinstance(data, dict):
            return data
        name = (data.get("name") or "").strip() or None
        first = (data.get("first_name") or "").strip() or None
        last = (data.get("last_name") or "").strip() or None
        if name and not first:
            first, extra_last = _split_name(name)
            data["first_name"] = first
            if extra_last and not last:
                data["last_name"] = extra_last
        elif first and not name:
            data["name"] = f"{first} {last}".strip() if last else first
        elif not first and not name:
            raise ValueError("Either name or first_name is required")
        if not data.get("name"):
            fn = data.get("first_name", "")
            ln = data.get("last_name") or ""
            data["name"] = f"{fn} {ln}".strip() or fn
        return data


class StaffUpdate(BaseModel):
    name: Optional[str] = None
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

    @model_validator(mode="before")
    @classmethod
    def normalize_name_fields(cls, data):
        if not isinstance(data, dict):
            return data
        name = (data.get("name") or "").strip() or None
        first = (data.get("first_name") or "").strip() or None
        last = (data.get("last_name") or "").strip() or None
        if name and not first:
            first, extra_last = _split_name(name)
            data["first_name"] = first
            if extra_last and not last:
                data["last_name"] = extra_last
            data["name"] = name
        elif first and not name:
            data["name"] = f"{first} {last}".strip() if last else first
        return data


class StaffOut(BaseModel):
    id: str
    school_id: str
    emp_code: Optional[str] = None
    name: Optional[str] = None
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
    academic_year_id: Optional[str] = None


class TeacherSubjectOut(BaseModel):
    id: str
    school_id: str
    staff_id: Optional[str]
    subject: str
    class_section_id: str
    academic_year_id: str

    model_config = {"from_attributes": True}


class TeacherSubjectEnrichedOut(BaseModel):
    id: str
    school_id: str
    staff_id: Optional[str] = None
    staff_name: Optional[str] = None
    subject: str
    class_section_id: str
    academic_year_id: str

    model_config = {"from_attributes": True}
