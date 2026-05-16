# RFC-003: Student Management

**Status:** Active  
**Scope:** Student CRUD, 360° Profile, Class Migration, Section Transfer  
**Actors:** Admin, Class Teacher, Receptionist

---

## 1. Summary

Post-admission student lifecycle — viewing, editing, searching, migrating across academic years, and moving between sections within an AY. Also covers the 360° aggregated profile view.

---

## 2. User Flows

### 2.1 Student List & Search

```
Students → All Students
  → Table columns: Name, Adm No, Class, Gender, Mobile, Type, Status
  → Filter bar (primary row):
      Search (name / admission no), Class Section (dropdown + inline add),
      Status (active/inactive)
  → Filter bar (secondary row — expandable "More filters"):
      Admission No, Mobile, Gender, Student Type, Admission Type,
      Fee Type, Hosteller (yes/no), TC Generated (yes/no),
      DOB From, DOB To
  → Active filter chips with × dismiss; "Search" applies, "Clear all" resets
  → Record count shown below heading
  → Row: click name → student detail page
```

**Filter params sent to GET /students:**
`search`, `admission_no`, `mobile`, `class_section_id`, `gender`, `status`,
`student_type`, `admission_type`, `fee_type`, `hosteller` (bool str),
`tc_generated` (bool str), `dob_from` (date), `dob_to` (date)

**Class section quick-add (anti-deadlock):**
Class Section filter and form field use `ClassSectionPicker` component.
A `+` button opens an inline dialog (AY → class_name → section) without leaving
the current view. New section is auto-selected on create.

**Edge cases:**
- Search by father_name / mother_name → searches ParentGuardian table with relation filter
- No results → empty state with "No students match your filters"
- Exporting the list → "Export CSV" button triggers `GET /students?format=csv` (future)

---

### 2.2 Student Detail & Edit

```
Students → Row → "View" (or click name)
  → Profile header: photo, name, admission_no, class, status badge
  → Tabs: Personal Info | Parents | Documents | History

  Personal Info tab:
    → All student fields displayed
    → "Edit" button → inline form edit
    → Save → PUT /students/:id
    → TC Generated toggle → confirm modal

  Parents tab:
    → Cards for each parent/guardian
    → "Edit" on each card → inline edit
    → "+ Add Guardian" (max 3 total)

  Documents tab:
    → Grid of uploaded docs with type, uploaded_at, download link
    → "+ Upload" → file picker with doc_type selector

  History tab:
    → AY migration log, class section changes, status changes
```

---

### 2.3 360° Student View

```
Students → Row → "360° View"
  → Single page aggregation:
      ┌─────────────────────────────────┐
      │ PROFILE                         │
      │ [Photo] Name, Class, Adm No     │
      ├──────────┬──────────────────────┤
      │ATTENDANCE│ Present 87 / 100     │
      │          │ Absent 8, Leave 5    │
      │          │ ████████░░ 87%       │
      ├──────────┼──────────────────────┤
      │FEES      │ Due: ₹12,000         │
      │          │ Paid: ₹8,000         │
      │          │ Pending: ₹4,000      │
      ├──────────┼──────────────────────┤
      │EXAM      │ Latest results table │
      ├──────────┼──────────────────────┤
      │HOMEWORK  │ Recent 5 entries     │
      ├──────────┼──────────────────────┤
      │TRANSPORT │ Route, Stop, Vehicle │
      └──────────┴──────────────────────┘
  → Each section has a "→ Details" link to the respective module
```

---

### 2.4 Migrate Students to New Academic Year

```
Students → Actions → "Year Migration"
  → Step 1: Select Source AY (current), Target AY
  → Step 2: Select Target Class Section
  → Step 3: Select students (checkbox list with search, or "Select All in Class")
  → Step 4: Review — table shows: name, current class → new class
  → Step 5: Confirm → POST /students/migrate
  → Results screen:
      "✓ 42 students migrated successfully"
      "✗ 3 failed:" [list with reasons]
  → Option to retry failed ones
```

**Edge cases:**
- Student already exists in target AY → counted as failed, reason shown
- Target class section not in target AY → 422 error shown before submission
- Migrating a TC-generated student → warning: "3 selected students have TC generated. Include them?"

---

### 2.5 Change Class Section (Within AY)

```
Students → Select students → Bulk Action → "Change Class Section"
  → Modal: Select new class_section (only sections in current AY)
  → "Move X students to [Grade 5 - B]"
  → Confirm → POST /students/change-class-section
  → Toast: "X students moved"
```

Single student flow:
```
Student Detail → Edit → Change Class Section dropdown → Save
```

---

### 2.6 TC (Transfer Certificate) Generation

```
Student Detail → "Generate TC" button
  → Confirm modal: "This will mark the student's TC as generated and set status to inactive."
  → On confirm → PATCH /students/:id → { tc_generated: true, status: inactive }
  → TC PDF download link appears
  → TC Generated badge shown on student list
```

---

## 3. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"

class StudentStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class StudentType(str, Enum):
    new = "new"
    old = "old"

class AdmissionType(str, Enum):
    regular = "regular"
    daycare = "daycare"
    boarding = "boarding"
    both = "both"

class FeeType(str, Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    half_yearly = "half_yearly"
    annually = "annually"

class StudentUpdate(BaseModel):
    # Core identity
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[Gender] = None
    dob: Optional[date] = None
    email: Optional[str] = None
    sms_mobile: Optional[str] = None
    whatsapp_mobile: Optional[str] = None

    # IDs and numbers
    reg_no: Optional[str] = None
    aadhar_no: Optional[str] = None
    saral_id: Optional[str] = None
    roll_number: Optional[str] = None
    card_number: Optional[str] = None
    cbse_reg_no: Optional[str] = None
    ledger_no: Optional[str] = None           # also used as CBSE Enrollment No
    pen: Optional[str] = None                 # Permanent Education Number
    apaar_id: Optional[str] = None

    # Classification
    blood_group: Optional[str] = None
    caste_category: Optional[str] = None
    student_category: Optional[str] = None
    house_category: Optional[str] = None
    fee_type: Optional[FeeType] = None
    student_type: Optional[StudentType] = None
    admission_type: Optional[AdmissionType] = None
    hosteller: Optional[bool] = None
    status: Optional[StudentStatus] = None
    tc_generated: Optional[bool] = None

    # Academic placement
    class_section_id: Optional[str] = None
    papers: Optional[List[str]] = None
    additional_papers: Optional[List[str]] = None

    # Address
    contact_address: Optional[str] = None
    pin_code: Optional[str] = None
    permanent_address: Optional[str] = None
    country: Optional[str] = None
    city_state: Optional[str] = None

    # Dates
    registration_date: Optional[date] = None
    joining_date: Optional[date] = None
    relieving_date: Optional[date] = None
    class_promoted_date: Optional[date] = None

    # Previous school
    last_school_name: Optional[str] = None
    last_school_class: Optional[str] = None
    last_school_subjects: Optional[str] = None   # comma-separated
    last_school_attendance: Optional[int] = None  # number of days
    transfer_certificate_no: Optional[str] = None

    # Financials
    fee_concession: Optional[str] = None

    # Media
    photo_url: Optional[str] = None

    # Sibling
    has_sibling: Optional[bool] = None
    sibling_student_id: Optional[str] = None

class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    gender: Gender
    # Both optional — can be assigned later via edit
    class_section_id: Optional[str] = None
    academic_year_id: Optional[str] = None   # falls back to active AY; null if none exists
    dob: Optional[date] = None
    # … (all other fields optional, same as StudentUpdate)

class StudentResponse(BaseModel):
    id: str
    school_id: str
    academic_year_id: Optional[str]    # null when created before any AY exists
    admission_no: str
    first_name: str
    last_name: str
    gender: Gender
    dob: Optional[date]
    email: Optional[str]
    sms_mobile: Optional[str]
    whatsapp_mobile: Optional[str]
    blood_group: Optional[str]
    aadhar_no: Optional[str]
    saral_id: Optional[str]
    reg_no: Optional[str]
    roll_number: Optional[str]
    card_number: Optional[str]
    cbse_reg_no: Optional[str]
    ledger_no: Optional[str]
    pen: Optional[str]
    apaar_id: Optional[str]
    caste_category: Optional[str]
    student_category: Optional[str]
    house_category: Optional[str]
    fee_type: Optional[FeeType]
    class_section_id: Optional[str]    # null when not yet assigned
    papers: Optional[List[str]]
    additional_papers: Optional[List[str]]
    contact_address: Optional[str]
    pin_code: Optional[str]
    permanent_address: Optional[str]
    country: Optional[str]
    city_state: Optional[str]
    registration_date: Optional[date]
    joining_date: Optional[date]
    relieving_date: Optional[date]
    class_promoted_date: Optional[date]
    last_school_name: Optional[str]
    last_school_class: Optional[str]
    last_school_subjects: Optional[str]
    last_school_attendance: Optional[int]
    transfer_certificate_no: Optional[str]
    fee_concession: Optional[str]
    photo_url: Optional[str]
    has_sibling: bool
    sibling_student_id: Optional[str]
    student_type: StudentType
    hosteller: bool
    admission_type: AdmissionType
    status: StudentStatus
    tc_generated: bool
    registration_id: Optional[str]
    created_at: datetime
    # Joined fields for list view
    class_name: Optional[str] = None
    section: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None

class StudentMigrateRequest(BaseModel):
    student_ids: List[str]
    from_academic_year_id: str
    to_academic_year_id: str
    to_class_section_id: str

class MigrateError(BaseModel):
    student_id: str
    reason: str

class StudentMigrateResponse(BaseModel):
    migrated: int
    failed: int
    errors: Optional[List[MigrateError]] = None

class ChangeSectionRequest(BaseModel):
    student_ids: List[str]
    to_class_section_id: str

class Student360Response(BaseModel):
    student: StudentResponse
    parents: List[dict]           # ParentGuardianResponse
    attendance: dict              # { present, absent, on_leave, percentage }
    fees: dict                    # { total_due, paid, pending }
    exam_results: List[dict]      # ExamResult stubs
    homework: List[dict]
    notices: List[dict]
    transport: Optional[dict]
    documents: List[dict]
```

---

## 4. Endpoints

### 4.1 Student CRUD

```python
GET    /students                         # list with filters
GET    /students/summary                 # lightweight list for pickers
GET    /students/{id}                    # detail
PUT    /students/{id}                    # partial update
PATCH  /students/{id}/status             # activate / deactivate
GET    /students/{id}/registration-form  # PDF
```

**GET /students**
```
Query params:
  search?: str                 # searches first_name + last_name + admission_no
  admission_no?: str           # exact match
  mobile?: str                 # matches sms_mobile
  class_section_id?: str
  academic_year_id?: str       # defaults to active
  gender?: Gender
  status?: StudentStatus
  student_type?: StudentType
  admission_type?: AdmissionType
  fee_type?: FeeType
  caste_category?: str
  house_category?: str
  hosteller?: str              # "true" / "false" (FastAPI Query string)
  tc_generated?: str           # "true" / "false"
  has_sibling?: str            # "true" / "false"
  dob_from?: date
  dob_to?: date
  page: int = 1
  limit: int = 20

Response: 200 {
  success: true,
  data: StudentResponse[],     # includes joined class_name, section, father_name
  meta: PaginationMeta
}
```

**GET /students/summary**
```
Query:    same as GET /students
Response: 200 {
  success: true,
  data: [{ id, admission_no, first_name, last_name, class_name, section }]
}
Note: no pagination metadata; limit defaults to 50 for picker UIs
```

**PUT /students/{id}**
```
Request:  StudentUpdate (partial)
Response: 200 { success: true, data: StudentResponse }
Errors:
  404 not found
  409 if reg_no or aadhar_no collides with another student in same school
  422 if class_section_id not in same AY as student
```

**PATCH /students/{id}/status**
```
Request:  { status: StudentStatus }
Response: 200 { success: true, data: { id, status } }
```

**GET /students/{id}/registration-form**
```
Response: 200  Content-Type: application/pdf
```

---

### 4.2 360° Profile

```python
GET /students/{id}/360
```

```
Response: 200 { success: true, data: Student360Response }

Note: Attendance, fees, exam data are fetched from their respective modules.
      If a module is not yet active (Phase 2), return null for that field.
      Never fail the whole response due to a single module being unavailable.
```

---

### 4.3 Migration & Section Change

```python
POST /students/migrate              # AY migration
POST /students/change-class-section # within-AY section move
```

**POST /students/migrate**
```
Request:  StudentMigrateRequest
Response: 200 { success: true, data: StudentMigrateResponse }

Failure modes per student (counted in errors[]):
  - already_exists_in_target_ay
  - target_class_section_invalid
  - student_not_found
  - student_inactive

HTTP always 200 (partial success allowed).
Use errors[] to report per-student failures.
```

**POST /students/change-class-section**
```
Request:  ChangeSectionRequest
Response: 200 { success: true, data: { updated: int } }
Errors:
  422 if to_class_section_id is in a different AY than students' current AY
  404 if any student_id not found
```

---

## 5. TC Generation

TC is not a separate endpoint — it's a field update with a side effect:

```
PUT /students/{id}
Body: { tc_generated: true, status: "inactive" }
```

When `tc_generated` transitions from `false` → `true`, server:
1. Sets `status = inactive`
2. Logs a history entry
3. Returns a `tc_pdf_url` in the response (pre-signed S3 URL or generated PDF endpoint)

```
Response includes: { ..., tc_pdf_url: str }
```

---

## 6. Open Questions

- [x] Is there a maximum number of students per class section (capacity limit)? Decision: not implemented (no capacity field).
- [x] Migration: should old-year student record be marked inactive, or just cloned into new AY? Decision: old record stays active; new AY creates a new record.
- [x] 360° view: should it always reflect the current AY, or let the user select the AY? Decision: defaults to active AY; optional AY selector supported.
- [x] TC PDF template — who owns the template? Can it be customized per school? Decision: WeasyPrint; per-school branding in Phase 2.
- [x] History/audit log tab — is this in scope for Phase 1? Decision: Phase 2.
