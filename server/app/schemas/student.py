from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel

from app.models.student import StudentGender, AdmissionType, FeeType
from app.schemas.admission import ParentGuardianCreate, ParentGuardianOut


class StudentCreate(BaseModel):
    first_name: str
    last_name: str = ''
    gender: StudentGender
    class_section_id: Optional[str] = None
    academic_year_id: Optional[str] = None
    dob: Optional[date] = None
    email: Optional[str] = None
    sms_mobile: Optional[str] = None
    whatsapp_mobile: Optional[str] = None
    blood_group: Optional[str] = None
    aadhar_no: Optional[str] = None
    saral_id: Optional[str] = None
    reg_no: Optional[str] = None
    roll_number: Optional[str] = None
    card_number: Optional[str] = None
    cbse_reg_no: Optional[str] = None
    ledger_no: Optional[str] = None
    pen: Optional[str] = None
    apaar_id: Optional[str] = None
    caste_category: Optional[str] = None
    student_category: Optional[str] = None
    house_category: Optional[str] = None
    fee_type: Optional[FeeType] = None
    papers: Optional[List[str]] = None
    additional_papers: Optional[List[str]] = None
    contact_address: Optional[str] = None
    pin_code: Optional[str] = None
    permanent_address: Optional[str] = None
    country: Optional[str] = None
    city_state: Optional[str] = None
    registration_date: Optional[date] = None
    joining_date: Optional[date] = None
    relieving_date: Optional[date] = None
    class_promoted_date: Optional[date] = None
    last_school_name: Optional[str] = None
    last_school_class: Optional[str] = None
    last_school_subjects: Optional[str] = None
    last_school_attendance: Optional[int] = None
    transfer_certificate_no: Optional[str] = None
    fee_concession: Optional[str] = None
    photo_url: Optional[str] = None
    student_type: str = "new"
    hosteller: bool = False
    admission_type: str = "regular"
    has_sibling: bool = False
    sibling_student_id: Optional[str] = None
    parent_guardians: Optional[List[ParentGuardianCreate]] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[StudentGender] = None
    dob: Optional[date] = None
    email: Optional[str] = None
    sms_mobile: Optional[str] = None
    whatsapp_mobile: Optional[str] = None
    blood_group: Optional[str] = None
    aadhar_no: Optional[str] = None
    saral_id: Optional[str] = None
    reg_no: Optional[str] = None
    roll_number: Optional[str] = None
    card_number: Optional[str] = None
    cbse_reg_no: Optional[str] = None
    ledger_no: Optional[str] = None
    pen: Optional[str] = None
    apaar_id: Optional[str] = None
    caste_category: Optional[str] = None
    student_category: Optional[str] = None
    house_category: Optional[str] = None
    fee_type: Optional[FeeType] = None
    class_section_id: Optional[str] = None
    papers: Optional[List[str]] = None
    additional_papers: Optional[List[str]] = None
    contact_address: Optional[str] = None
    pin_code: Optional[str] = None
    permanent_address: Optional[str] = None
    country: Optional[str] = None
    city_state: Optional[str] = None
    registration_date: Optional[date] = None
    joining_date: Optional[date] = None
    relieving_date: Optional[date] = None
    class_promoted_date: Optional[date] = None
    last_school_name: Optional[str] = None
    last_school_class: Optional[str] = None
    last_school_subjects: Optional[str] = None
    last_school_attendance: Optional[int] = None
    transfer_certificate_no: Optional[str] = None
    fee_concession: Optional[str] = None
    photo_url: Optional[str] = None
    hosteller: Optional[bool] = None
    admission_type: Optional[AdmissionType] = None
    student_type: Optional[str] = None
    status: Optional[str] = None
    tc_generated: Optional[bool] = None
    has_sibling: Optional[bool] = None
    sibling_student_id: Optional[str] = None


class StudentOut(BaseModel):
    id: str
    school_id: str
    academic_year_id: Optional[str] = None
    admission_no: str
    first_name: str
    last_name: str
    gender: str
    dob: Optional[date] = None
    email: Optional[str] = None
    sms_mobile: Optional[str] = None
    whatsapp_mobile: Optional[str] = None
    blood_group: Optional[str] = None
    aadhar_no: Optional[str] = None
    saral_id: Optional[str] = None
    reg_no: Optional[str] = None
    roll_number: Optional[str] = None
    card_number: Optional[str] = None
    cbse_reg_no: Optional[str] = None
    ledger_no: Optional[str] = None
    pen: Optional[str] = None
    apaar_id: Optional[str] = None
    caste_category: Optional[str] = None
    student_category: Optional[str] = None
    house_category: Optional[str] = None
    fee_type: Optional[str] = None
    class_section_id: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    papers: Optional[List[str]] = None
    additional_papers: Optional[List[str]] = None
    contact_address: Optional[str] = None
    pin_code: Optional[str] = None
    permanent_address: Optional[str] = None
    country: Optional[str] = None
    city_state: Optional[str] = None
    registration_date: Optional[date] = None
    joining_date: Optional[date] = None
    relieving_date: Optional[date] = None
    class_promoted_date: Optional[date] = None
    last_school_name: Optional[str] = None
    last_school_class: Optional[str] = None
    last_school_subjects: Optional[str] = None
    last_school_attendance: Optional[int] = None
    transfer_certificate_no: Optional[str] = None
    fee_concession: Optional[str] = None
    photo_url: Optional[str] = None
    student_type: Optional[str] = None
    hosteller: bool
    admission_type: Optional[str] = None
    status: str
    tc_generated: bool = False
    registration_id: Optional[str] = None
    has_sibling: bool = False
    sibling_student_id: Optional[str] = None
    created_at: datetime
    parent_guardians: List[ParentGuardianOut] = []

    model_config = {"from_attributes": True}
