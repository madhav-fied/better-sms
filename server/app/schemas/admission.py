from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, model_validator

from app.models.admission import EnquiryStatus, RegistrationStatus, ParentRelation


class EnquiryCreate(BaseModel):
    student_name: str
    parent_name: str
    mobile: str
    date: date
    purpose: str = "new_admission"
    notes: Optional[str] = None
    dob: Optional[date] = None
    class_section_id: Optional[str] = None


class EnquiryUpdate(BaseModel):
    student_name: Optional[str] = None
    parent_name: Optional[str] = None
    mobile: Optional[str] = None
    date: Optional[date] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    dob: Optional[date] = None
    class_section_id: Optional[str] = None
    status: Optional[EnquiryStatus] = None


class EnquiryOut(BaseModel):
    id: str
    school_id: str
    enq_no: str
    student_name: str
    parent_name: str
    mobile: str
    date: date
    purpose: str
    notes: Optional[str]
    dob: Optional[date] = None
    class_section_id: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ParentGuardianCreate(BaseModel):
    relation: ParentRelation
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    is_primary: bool = False
    qualification: Optional[str] = None
    aadhar_no: Optional[str] = None
    dob: Optional[date] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    annual_income: Optional[int] = None
    photo_url: Optional[str] = None
    anniversary_date: Optional[date] = None
    address: Optional[str] = None
    guardian_relation: Optional[str] = None
    alternate_mobile: Optional[str] = None
    alternate_email: Optional[str] = None
    emergency_mobile: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data):
        if not isinstance(data, dict):
            return data
        if data.get("mobile") and not data.get("phone"):
            data["phone"] = data["mobile"]
        name = (data.get("name") or "").strip() or None
        first = (data.get("first_name") or "").strip() or None
        if name and not first:
            parts = name.split(None, 1)
            data["first_name"] = parts[0]
            if len(parts) > 1 and not data.get("last_name"):
                data["last_name"] = parts[1]
        return data


class ParentGuardianUpdate(BaseModel):
    relation: Optional[ParentRelation] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    is_primary: Optional[bool] = None
    qualification: Optional[str] = None
    aadhar_no: Optional[str] = None
    dob: Optional[date] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    annual_income: Optional[int] = None
    photo_url: Optional[str] = None
    anniversary_date: Optional[date] = None
    address: Optional[str] = None
    guardian_relation: Optional[str] = None
    alternate_mobile: Optional[str] = None
    alternate_email: Optional[str] = None
    emergency_mobile: Optional[str] = None


class ParentGuardianOut(BaseModel):
    id: str
    registration_id: Optional[str] = None
    student_id: Optional[str] = None
    parent_id: Optional[str] = None
    relation: str
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    is_primary: bool = False
    qualification: Optional[str] = None
    aadhar_no: Optional[str] = None
    dob: Optional[date] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    annual_income: Optional[int] = None
    photo_url: Optional[str] = None
    anniversary_date: Optional[date] = None
    address: Optional[str] = None
    guardian_relation: Optional[str] = None
    alternate_mobile: Optional[str] = None
    alternate_email: Optional[str] = None
    emergency_mobile: Optional[str] = None

    model_config = {"from_attributes": True}


class RegistrationCreate(BaseModel):
    academic_year_id: Optional[str] = None
    enquiry_id: Optional[str] = None
    student_fields: Optional[dict] = None
    parent_guardians: Optional[List[ParentGuardianCreate]] = None


class RegistrationOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: Optional[str] = None
    enquiry_id: Optional[str]
    status: str
    submitted_at: datetime
    student_fields: Optional[Any]
    parent_guardians: List[ParentGuardianOut] = []

    model_config = {"from_attributes": True}


class EnquiryStatusUpdate(BaseModel):
    status: EnquiryStatus


class RegistrationStatusUpdate(BaseModel):
    status: RegistrationStatus


class AdmitStudentIn(BaseModel):
    registration_id: str
    class_section_id: str
    student_type: str = "new"
    hosteller: bool = False
    admission_type: str = "regular"
