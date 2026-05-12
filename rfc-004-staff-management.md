# RFC-004: Staff Management

**Status:** Draft  
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
  → Table: Emp Code, Name, Category, Grade, Gender, Mobile, Status, Actions
  → Filters: Category, Status (active/inactive), Gender, Grade, Name search
  → Row actions: View/Edit, Upload Docs, Deactivate
  → Filter by class_section_id → shows teachers assigned to that section
```

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

class StaffCreate(BaseModel):
    emp_code: str
    name: str
    dob: date
    gender: str                            # male|female|other
    mobile: str
    email: Optional[EmailStr] = None
    aadhar_no: Optional[str] = None
    permanent_address: str
    category: StaffCategory
    grade: Optional[str] = None

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    aadhar_no: Optional[str] = None
    permanent_address: Optional[str] = None
    category: Optional[StaffCategory] = None
    grade: Optional[str] = None

class StaffResponse(StaffCreate):
    id: int
    school_id: int
    status: StaffStatus
    created_at: datetime

class TeacherSubjectCreate(BaseModel):
    staff_id: int
    subject: str
    class_section_id: int
    academic_year_id: Optional[int] = None   # defaults to active AY

class TeacherSubjectResponse(TeacherSubjectCreate):
    id: int
    school_id: int
    academic_year_id: int

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
GET    /staff/{id}                     # detail
PUT    /staff/{id}                     # edit
PATCH  /staff/{id}/status              # activate / deactivate
POST   /staff/{id}/documents           # upload docs (see RFC-005)
```

**POST /staff**
```
Request:  StaffCreate
Response: 201 { success: true, data: { staff_id: int, emp_code: str } }
Errors:
  409 if emp_code already exists in this school
  409 if aadhar_no already exists in this school
  409 if email already exists in this school (if provided)
```

**GET /staff**
```
Query params:
  category?: StaffCategory
  name?: str
  status?: StaffStatus
  gender?: str
  grade?: str
  class_section_id?: int           # returns teachers assigned to this section
  academic_year_id?: int           # scopes class_section_id filter
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
  unassigned_class_sections: int[]   # IDs of sections where class_teacher was cleared
}
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
| `emp_code` | Unique per school |
| `aadhar_no` | Unique per school (if provided) |
| `email` | Unique per school (if provided) |
| `category` | Must be from StaffCategory enum |
| TeacherSubject | Only staff with `category = teacher` can be assigned subjects |
| Class Teacher | Only staff with `category = teacher` can be set as `class_teacher_id` on ClassSection |

---

## 6. Open Questions

- [ ] Can a staff member be assigned as class teacher for multiple sections? Currently allowed with a warning — confirm if it should be blocked.
- [ ] When a teacher is deactivated, should their TeacherSubject assignments be soft-deleted or preserved?
- [ ] Is `emp_code` auto-generated or always manually entered by admin?
- [ ] Staff login — is there a portal for teachers to view their timetable/homework assignments? (Phase 2 likely)
- [ ] Grade field — what does it represent? Pay grade, designation grade? Needs clarification.
