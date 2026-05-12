# RFC-002: Admission Pipeline

**Status:** Draft  
**Scope:** Enquiry → Registration → Admission  
**Actors:** Receptionist, Admin, Parent (future)

---

## 1. Summary

Three-stage funnel: Enquiry (lead capture) → Registration (intent + docs) → Admission (student record created). Each stage is discrete — you can skip enquiry and go straight to registration, or register directly into admission. Enquiry-to-Registration conversion links the records.

---

## 2. User Flows

### 2.1 Enquiry Creation (Receptionist)

```
Admissions → Enquiries → "+ New Enquiry"
  → Form:
      Parent Name, Student Name, Mobile
      Date of Birth
      Class Applying For (dropdown: ClassSection list)
      Purpose: new_admission | daycare | both
      Date (defaults to today)
      Notes (optional)
  → Submit → enq_no shown: "ENQ-2026-0042"
  → Toast: "Enquiry created. Follow up scheduled."

List View (Admissions → Enquiries):
  → Table: enq_no, student_name, parent_name, mobile, class, purpose, status, date
  → Filters: date range, status (open/converted/rejected), class, purpose
  → Row actions: View, Edit, Convert to Registration, Reject
```

**Edge cases:**
- Same mobile + class + AY → soft warning (not block): "An enquiry for this mobile already exists this year. Continue?"
- Convert on already-converted enquiry → button disabled, tooltip: "Already converted (Reg #R-2026-0011)"
- Rejecting shows a notes field (reason stored in notes)

---

### 2.2 Registration Submission (Admin / Receptionist)

**Path A — from enquiry:**
```
Enquiries list → Row → "Convert to Registration"
  → Pre-fills: student_name, parent_name, mobile, dob, class_section
  → Admin fills remaining required fields:
      Gender, Blood Group, Aadhar (optional)
      Father / Mother / Guardian details (min 1)
      Fee Payment Mode
  → Upload Documents (optional at this stage)
  → Submit → Registration created, status = pending
  → Shows: "Reg #R-2026-0011 submitted"
```

**Path B — direct registration:**
```
Admissions → Registrations → "+ New Registration"
  → Same form as Path A, no pre-fill
  → Submit → Registration status = pending
```

**Registration List View:**
```
Admissions → Registrations
  → Table: reg_no, student_name, class, status, submitted_at
  → Filters: status, class_section, name search, date range
  → Row actions: View, Edit, Accept, Reject, Download Admission Form (PDF)
```

**Accept flow:**
```
Admin clicks "Accept" on a pending registration
  → Confirmation modal: "Accept registration for {student_name}?"
  → On confirm → status = accepted
  → "Admit Student" button now active on the record
```

**Reject flow:**
```
Admin clicks "Reject"
  → Modal with reason text field (optional)
  → Confirm → status = rejected, reason stored in notes
  → Cannot be undone from UI (requires re-registration)
```

---

### 2.3 Admission (Admin)

**Path A — from accepted registration:**
```
Registration detail → "Admit Student"
  → Pre-fills all fields from registration
  → Admin reviews and fills:
      Reg No (manual entry), SMS Mobile
      Student Type: new | old
      Hosteller: yes/no
      Admission Type: regular | daycare | boarding | both
  → Submit → Student record created
  → Admission No shown: "2026 0001"
  → Option to print Admission Form PDF
```

**Path B — direct admit (walk-in):**
```
Admissions → Students → "+ Admit Student"
  → Full form without pre-fill
  → Same fields as Path A
```

**Edge cases:**
- Admitting to a class section at capacity (if capacity is configured) → warning shown
- Duplicate aadhar_no within same school → 409 error
- reg_no must be unique per school — inline validation on blur

---

## 3. Data Models

```python
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

class EnquiryPurpose(str, Enum):
    new_admission = "new_admission"
    daycare = "daycare"
    both = "both"

class EnquiryStatus(str, Enum):
    open = "open"
    converted = "converted"
    rejected = "rejected"

class EnquiryCreate(BaseModel):
    purpose: EnquiryPurpose
    parent_name: str
    student_name: str
    mobile: str
    dob: date
    class_section_id: int
    date: date
    academic_year_id: Optional[int] = None
    notes: Optional[str] = None

class EnquiryResponse(EnquiryCreate):
    id: int
    school_id: int
    enq_no: str
    status: EnquiryStatus
    created_at: datetime

# ----

class FeePaymentMode(str, Enum):
    cash = "cash"
    cheque = "cheque"
    online = "online"
    dd = "dd"

class ParentRelation(str, Enum):
    father = "father"
    mother = "mother"
    guardian = "guardian"

class ParentGuardianCreate(BaseModel):
    relation: ParentRelation
    name: str
    mobile: str
    email: Optional[str] = None
    occupation: Optional[str] = None
    qualification: Optional[str] = None
    aadhar_no: Optional[str] = None

class RegistrationStudentFields(BaseModel):
    first_name: str
    last_name: str
    gender: str                           # male|female|other
    dob: date
    blood_group: Optional[str] = None
    aadhar_no: Optional[str] = None
    class_section_id: int
    academic_year_id: Optional[int] = None
    fee_payment_mode: FeePaymentMode

class RegistrationCreate(BaseModel):
    student: RegistrationStudentFields
    parents: List[ParentGuardianCreate]   # 1–3
    enquiry_id: Optional[int] = None      # links back if converted from enquiry

class RegistrationStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"

class RegistrationResponse(BaseModel):
    id: int
    school_id: int
    academic_year_id: int
    enquiry_id: Optional[int]
    student_id: Optional[int]             # null until admitted
    status: RegistrationStatus
    submitted_at: datetime

# ----

class StudentType(str, Enum):
    new = "new"
    old = "old"

class AdmissionType(str, Enum):
    regular = "regular"
    daycare = "daycare"
    boarding = "boarding"
    both = "both"

class AdmitStudentRequest(BaseModel):
    registration_id: Optional[int] = None
    first_name: str
    last_name: str
    reg_no: str
    dob: date
    sms_mobile: str
    gender: str
    class_section_id: int
    blood_group: Optional[str] = None
    student_type: StudentType
    hosteller: bool
    admission_type: AdmissionType
    academic_year_id: Optional[int] = None
    aadhar_no: Optional[str] = None

class AdmitStudentResponse(BaseModel):
    student_id: int
    admission_no: str                     # e.g. "20260001"
```

---

## 4. Endpoints

### 4.1 Enquiries

```python
POST   /enquiries                       # create enquiry
GET    /enquiries                       # list with filters
GET    /enquiries/{id}                  # detail
PUT    /enquiries/{id}                  # edit (only if status=open)
POST   /enquiries/{id}/convert          # convert to registration
PATCH  /enquiries/{id}/reject           # reject with optional notes
```

**POST /enquiries**
```
Request:  EnquiryCreate
Response: 201 { success: true, data: { id, enq_no } }
Note:     enq_no format: ENQ-{AY_start_year}-{zero_padded_seq}
```

**GET /enquiries**
```
Query params:
  academic_year_id?: int
  name?: str                  # searches student_name and parent_name
  mobile?: str
  date_from?: date
  date_to?: date
  purpose?: EnquiryPurpose
  status?: EnquiryStatus
  class_section_id?: int
  page: int = 1
  limit: int = 20

Response: 200 { success: true, data: EnquiryResponse[], meta: PaginationMeta }
```

**PUT /enquiries/{id}**
```
Request:  Partial[EnquiryCreate]
Response: 200 { success: true, data: EnquiryResponse }
Errors:   409 if status != open ("Cannot edit a converted/rejected enquiry")
```

**POST /enquiries/{id}/convert**
```
Request:  (empty — or optionally pass notes)
Response: 201 {
  success: true,
  data: {
    registration_id: int,
    enquiry_id: int,
    enquiry_status: "converted"
  }
}
Errors:   409 if already converted
          404 if enquiry not found
```

**PATCH /enquiries/{id}/reject**
```
Request:  { notes?: str }
Response: 200 { success: true, data: { id, status: "rejected" } }
Errors:   409 if already converted
```

---

### 4.2 Registrations

```python
POST   /registrations                   # create (direct or from enquiry)
GET    /registrations                   # list
GET    /registrations/{id}              # detail with student + parent data
PUT    /registrations/{id}              # edit (only if status=pending)
POST   /registrations/{id}/accept       # accept → status=accepted
POST   /registrations/{id}/reject       # reject with reason
GET    /registrations/{id}/admission-form  # PDF download
```

**POST /registrations**
```
Request:  RegistrationCreate
Response: 201 { success: true, data: { registration_id, reg_no_preview } }
Errors:   422 if parents list empty or > 3
          404 if enquiry_id provided but not found
          409 if enquiry already has a registration
```

**GET /registrations**
```
Query params:
  academic_year_id?: int
  name?: str
  class_section_id?: int
  status?: RegistrationStatus
  date_from?: date
  date_to?: date
  page: int = 1
  limit: int = 20

Response: 200 { success: true, data: RegistrationResponse[], meta: PaginationMeta }
```

**POST /registrations/{id}/accept**
```
Request:  (empty)
Response: 200 { success: true, data: { id, status: "accepted" } }
Errors:   409 if status != pending
```

**POST /registrations/{id}/reject**
```
Request:  { reason?: str }
Response: 200 { success: true, data: { id, status: "rejected" } }
Errors:   409 if status != pending
```

**GET /registrations/{id}/admission-form**
```
Response: 200  Content-Type: application/pdf
               Content-Disposition: attachment; filename="admission_form_{id}.pdf"
Errors:   404 if registration not found
```

---

### 4.3 Admission

```python
POST  /students/admit                   # admit student (creates Student record)
```

**POST /students/admit**
```
Request:  AdmitStudentRequest
Response: 201 {
  success: true,
  data: {
    student_id: int,
    admission_no: str     # "{AY_start_year}{4-digit-seq}", e.g. "20260001"
  }
}
Errors:
  409 if reg_no already exists for this school
  409 if aadhar_no already exists for this school
  404 if registration_id provided but not found
  409 if registration status != accepted (when registration_id is provided)
  422 if class_section_id not in active AY
```

---

## 5. State Machine

```
Enquiry:      open ──convert──→ converted
                   └──reject──→ rejected

Registration: pending ──accept──→ accepted ──admit──→ (Student created)
                      └──reject──→ rejected

Note: rejected registrations cannot be re-opened. Create a new one.
```

---

## 6. Admission Number Generation

- Format: `{AY start year}{4-digit zero-padded sequence}`
- Sequence is per-school per-AY
- Generated server-side at admit time — not editable
- Example: First student admitted in AY 2026-27 for a school → `20260001`
- Concurrent admits: use DB sequence or row-level lock to avoid duplicates

---

## 7. Open Questions

- [ ] Can a registration be re-opened after rejection, or is a new submission required?
- [ ] Is there a capacity limit per class section? If so, what happens when full — hard block or waitlist?
- [ ] Should enquiry conversion auto-create a registration draft (pending) or immediately submit it?
- [ ] Online parent self-registration portal — Phase 1 or Phase 2?
