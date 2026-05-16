# RFC-004: Staff Management

**Status:** Active  
**Scope:** Staff registration, CRUD, teacher-subject assignments, specialization dashboard  
**Actors:** Admin, HR

---

## 1. Summary

Staff covers all school employees — teachers, admin, support, and operations staff. Teachers get an additional layer: subject-class assignments (`TeacherSubject`). The specialization dashboard gives a cross-class view of who teaches what.

---

## 2. User Flows

### 2.1 Register New Staff

```
Staff → "+ Register Staff"
  → Form:
      Name*, Date of Birth*, Gender*
      Mobile*, Email
      Aadhar No, Emp Code*
      Category* (dropdown: teacher | peon | accounts | clerk |
                           electrician | receptionist | security | other)
      Grade
      Permanent Address*
  → Submit → staff_id returned, emp_code confirmed
  → Redirect to staff detail page
  → Option to upload documents immediately or later
```

**Edge cases:**
- Duplicate emp_code within school → 409 inline error
- Duplicate aadhar_no within school → 409 inline error
- Email optional but unique if provided

---

### 2.2 Staff List & Search

```
Staff → All Staff
  → Table: Name, Emp Code, Mobile, Category, Designation, Status
  → Record count shown below heading
  → Filter bar (always visible, 2 rows):
      Row 1: Search (name / emp code / mobile / email), Category, Status
      Row 2: Gender, Teaching Type, Grade, Designation
  → Active filter chips with × dismiss; "Search" applies, "Clear all" resets
  → Row: click name → staff detail page
  → Row actions: View, Edit, Deactivate/Reactivate
```

**Filter params sent to GET /staff:**
`search`, `category`, `status`, `gender`, `teaching_type`, `grade`, `designation`

---

### 2.3 Edit & Deactivate Staff

```
Staff list → Row → "Edit"
  → Same form as registration, pre-filled
  → Save → PUT /staff/:id

Staff list → Row → "Deactivate"
  → Confirm modal: "Deactivate {name}? They will lose system access."
  → Confirm → PATCH /staff/:id/status { status: "inactive" }
  → Row grayed out in list, badge shows "Inactive"
  → Can reactivate: same flow, PATCH with status: "active"
```

**Edge cases:**
- Deactivating a class teacher → warning: "This staff is class teacher for Grade 5 - A. Deactivating will unassign them. Continue?"
- Server removes `class_teacher_id` from ClassSection if staff is deactivated

---

### 2.4 Teacher Subject Assignment

```
Staff → Teacher detail page → "Subjects & Classes" tab
  → Table: Subject, Class Section, AY
  → "+ Assign Subject"
      → Form: Subject (text), Class Section (dropdown)
      → Save → POST /teacher-subjects
  → Row action: Remove → DELETE /teacher-subjects/:id
```

Alternatively from Class Sections view:
```
Settings → Classes → Class detail → "Assigned Teachers" section
  → Shows all teacher-subject pairs for this section
  → "+ Add Teacher" → Staff picker + subject field
```

---

### 2.5 Teacher Specialization Dashboard

```
Staff → Teacher Specializations
  → Table view:
      Teacher Name | Category | Classes Assigned | Subjects
      ─────────────────────────────────────────────────────
      Priya Sharma  | Teacher  | Grade 5-A, 5-B   | Math, Science
      Rajan Kumar   | Teacher  | Grade 3-A         | English
  → Filters: Class Section, Teacher Name
  → Click row → expand to show full assignment detail
```

---

## 3. Data Models

```python
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class StaffCategory(str, Enum):
    teacher = "teacher"
    peon = "peon"
    accounts = "accounts"
    clerk = "clerk"
    electrician = "electrician"
    receptionist = "receptionist"
    security = "security"
    other = "other"

class StaffStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class MaritalStatus(str, Enum):
    single = "single"
    married = "married"
    divorced = "divorced"
    widowed = "widowed"

class TeachingType(str, Enum):
    regular = "regular"
    contract = "contract"
    guest = "guest"
    part_time = "part_time"

class JobType(str, Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    probation = "probation"

class JobStatus(str, Enum):
    active = "active"
    on_leave = "on_leave"
    resigned = "resigned"
    terminated = "terminated"

class StaffCreate(BaseModel):
    # Core identity — only first_name, gender, category required
    first_name: str
    last_name: Optional[str] = None
    short_name: Optional[str] = None
    gender: str                             # male|female|other
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    dob: Optional[date] = None
    religion: Optional[str] = None
    aadhar_no: Optional[str] = None
    blood_group: Optional[str] = None
    caste_category: Optional[str] = None

    # Address
    contact_address: Optional[str] = None
    pincode: Optional[str] = None
    permanent_address: Optional[str] = None
    city_state: Optional[str] = None

    # Employment
    emp_code: Optional[str] = None          # auto-generated as EMP{seq:04d} if omitted
    category: StaffCategory
    designation: Optional[str] = None
    qualification: Optional[str] = None
    teaching_type: Optional[TeachingType] = None  # only when category=teacher
    grade: Optional[str] = None
    basic_salary: Optional[float] = None
    total_experience: Optional[int] = None  # in months
    card_number: Optional[str] = None
    relieving_date: Optional[date] = None
    licensee_number: Optional[str] = None
    passport_number: Optional[str] = None

    # Emergency
    emergency_mobile: Optional[str] = None

    # Family
    father_first_name: Optional[str] = None
    father_last_name: Optional[str] = None
    mother_first_name: Optional[str] = None
    mother_last_name: Optional[str] = None
    marital_status: Optional[MaritalStatus] = None
    spouse_name: Optional[str] = None

    # Media
    photo_url: Optional[str] = None

class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    short_name: Optional[str] = None
    gender: Optional[str] = None
    email: Optional[EmailStr] = None
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

class StaffResponse(BaseModel):
    id: str
    school_id: str
    emp_code: str
    first_name: str
    last_name: Optional[str]
    short_name: Optional[str]
    gender: str
    email: Optional[str]
    mobile: Optional[str]
    dob: Optional[date]
    religion: Optional[str]
    aadhar_no: Optional[str]
    blood_group: Optional[str]
    caste_category: Optional[str]
    contact_address: Optional[str]
    pincode: Optional[str]
    permanent_address: Optional[str]
    city_state: Optional[str]
    category: StaffCategory
    designation: Optional[str]
    qualification: Optional[str]
    teaching_type: Optional[TeachingType]
    grade: Optional[str]
    basic_salary: Optional[float]
    total_experience: Optional[int]
    card_number: Optional[str]
    relieving_date: Optional[date]
    licensee_number: Optional[str]
    passport_number: Optional[str]
    emergency_mobile: Optional[str]
    father_first_name: Optional[str]
    father_last_name: Optional[str]
    mother_first_name: Optional[str]
    mother_last_name: Optional[str]
    marital_status: Optional[MaritalStatus]
    spouse_name: Optional[str]
    photo_url: Optional[str]
    status: StaffStatus
    created_at: datetime
    job_detail: Optional["StaffJobDetailResponse"] = None

# Job details — separate record, one-to-one with Staff
class StaffJobDetailCreate(BaseModel):
    joined_date: Optional[date] = None
    end_of_probation: Optional[date] = None
    position: Optional[str] = None
    effective_date: Optional[date] = None
    superior: Optional[str] = None         # free-text name or staff_id reference
    department: Optional[str] = None
    branch: Optional[str] = None
    job_type: Optional[JobType] = None
    job_status: Optional[JobStatus] = None
    workdays: Optional[int] = None         # working days per week/cycle
    holidays: Optional[int] = None         # holidays per year

class StaffJobDetailResponse(StaffJobDetailCreate):
    id: str
    staff_id: str

class TeacherSubjectCreate(BaseModel):
    staff_id: str
    subject: str
    class_section_id: str
    academic_year_id: Optional[str] = None   # defaults to active AY

class TeacherSubjectResponse(TeacherSubjectCreate):
    id: str
    school_id: str
    academic_year_id: str

class TeacherSpecializationEntry(BaseModel):
    staff: StaffResponse
    subjects: List[TeacherSubjectResponse]
    classes: List[dict]                       # ClassSectionResponse (lightweight)
```

---

## 4. Endpoints

### 4.1 Staff CRUD

```python
POST   /staff                          # register staff
GET    /staff                          # list with filters
GET    /staff/{id}                     # detail (includes job_detail)
PUT    /staff/{id}                     # edit personal info
PATCH  /staff/{id}/status              # activate / deactivate
PUT    /staff/{id}/job-detail          # create or update job detail record
POST   /staff/{id}/documents           # upload docs (see RFC-005)
```

**POST /staff**
```
Request:  StaffCreate
Response: 201 { success: true, data: { staff_id: str, emp_code: str } }
Errors:
  409 if emp_code already exists in this school
  409 if aadhar_no already exists in this school
  409 if email already exists in this school
```

**GET /staff**
```
Query params:
  search?: str                     # searches first_name + last_name + emp_code + mobile + email
  name?: str                       # backward-compat alias for search
  category?: StaffCategory
  status?: StaffStatus
  gender?: str
  grade?: str                      # partial match (ilike)
  designation?: str                # partial match (ilike)
  teaching_type?: TeachingType
  page: int = 1
  limit: int = 20

Response: 200 { success: true, data: StaffResponse[], meta: PaginationMeta }
```

**PUT /staff/{id}**
```
Request:  StaffUpdate
Response: 200 { success: true, data: StaffResponse }
Errors:
  404 not found
  409 emp_code/aadhar_no/email collision with another staff record
```

**PATCH /staff/{id}/status**
```
Request:  { status: StaffStatus }
Response: 200 { success: true, data: { id, status } }

Side effects when status → inactive:
  - Unassigns staff as class_teacher from any ClassSection
  - Does NOT remove TeacherSubject records (preserved for history)

Response includes: {
  id, status,
  unassigned_class_sections: str[]   # IDs of sections where class_teacher was cleared
}
```

**PUT /staff/{id}/job-detail**
```
Request:  StaffJobDetailCreate
Response: 200 { success: true, data: StaffJobDetailResponse }
Note:     Upsert — creates if not exists, updates if exists.
Errors:
  404 if staff not found
```

---

### 4.2 Teacher Subjects

```python
POST   /teacher-subjects               # assign subject to teacher
GET    /teacher-subjects               # list; filter by staff_id or class_section_id
DELETE /teacher-subjects/{id}          # remove assignment
```

**POST /teacher-subjects**
```
Request:  TeacherSubjectCreate
Response: 201 { success: true, data: TeacherSubjectResponse }
Errors:
  404 if staff_id not found
  404 if class_section_id not found
  409 if same staff + subject + class_section already exists in this AY
  422 if staff.category != "teacher"
```

**GET /teacher-subjects**
```
Query:
  staff_id?: int
  class_section_id?: int
  academic_year_id?: int       # defaults to active

Response: 200 { success: true, data: TeacherSubjectResponse[] }
```

**DELETE /teacher-subjects/{id}**
```
Response: 200 { success: true }
Errors:   404 if not found
```

---

### 4.3 Teacher Specialization Dashboard

```python
GET /staff/teacher-specializations
```

```
Query:
  class_section_id?: int
  staff_id?: int
  academic_year_id?: int       # defaults to active

Response: 200 {
  success: true,
  data: TeacherSpecializationEntry[]
}

Note: Only returns staff where category = "teacher" and status = "active".
      Each entry includes the teacher's full subject list and all assigned class sections.
```

---

## 5. Validation Rules

| Field | Rule |
|-------|------|
| `emp_code` | Unique per school; auto-generated if omitted |
| `aadhar_no` | Required; unique per school |
| `email` | Required; unique per school |
| `category` | Must be from StaffCategory enum |
| `teaching_type` | Only relevant when `category = teacher`; ignored otherwise |
| `basic_salary` | Non-negative float |
| `total_experience` | Non-negative integer (months) |
| TeacherSubject | Only staff with `category = teacher` can be assigned subjects |
| Class Teacher | Only staff with `category = teacher` can be set as `class_teacher_id` on ClassSection |

---

## 6. Open Questions

- [x] Can a staff member be assigned as class teacher for multiple sections? Decision: allowed with warning (not blocked).
- [x] When a teacher is deactivated, should their TeacherSubject assignments be soft-deleted or preserved? Decision: preserved (not deleted).
- [x] Is `emp_code` auto-generated or always manually entered by admin? Decision: manually entered by admin.
- [x] Staff login — is there a portal for teachers to view their timetable/homework assignments? Decision: Phase 2.
- [x] Grade field — what does it represent? Decision: pay/designation grade; free text for now.
