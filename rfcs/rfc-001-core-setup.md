# RFC-001: Core Setup & Multi-Tenancy

**Status:** Active  
**Scope:** School provisioning, Academic Years, Class Sections  
**Actors:** Superadmin, School Admin

---

## 1. Summary

Establishes the foundational tenant model. Every entity in the system belongs to a `school_id`. This RFC covers school creation, academic year lifecycle, and class section configuration — the three structures everything else hangs from.

---

## 2. User Flows

### 2.1 Superadmin Creates a School

```
Superadmin Portal → Schools → "+ New School"
  → Form: name, branch_name (optional), address, phone, email
  → Submit → school created, school_id assigned
  → Superadmin sees school in list with status: active
  → Superadmin can deactivate school (soft delete, cascades to login block)
```

**Edge cases:**
- Duplicate school name + branch_name pair → 409 error shown inline
- Deactivating a school with active students → confirmation modal: "X active students exist. Deactivation will block all logins. Proceed?"

---

### 2.2 School Admin Manages Academic Years

```
Admin Panel → Settings → Academic Years
  → List shows all AYs for the school, one marked "Active"
  → "+ New AY" → Form: label (e.g. "2026-27"), start_date, end_date
  → On save: new AY created as inactive
  → Admin clicks "Set Active" → modal: "This will deactivate current AY 2025-26. Confirm?"
  → Confirm → AY activated; old one deactivated
```

**Edge cases:**
- Only one AY can be active at a time — enforced server-side
- Date overlap with existing AY → validation error: "Dates overlap with AY 2025-26"
- Cannot delete an AY that has students or fees attached → error message
- **Not a hard prerequisite:** students and registrations can be created without an active AY.
  If none exists, `academic_year_id` is stored as null and `admission_no` uses the current
  calendar year. The AY can be assigned later via edit.

---

### 2.3 Admin Sets Up Class Sections

```
Admin Panel → Settings → Classes & Sections
  → Table: class_name | section | academic_year | class_teacher | actions
  → "+ Add Class Section" → inline modal:
      Academic Year (dropdown, defaults to active AY)
      Class Name (text, e.g. "Grade 5")
      Section (text, e.g. "A")
      Class Teacher (optional, dropdown of active teachers)
  → Save → row appears in table
  → Row → "Edit" → same modal pre-filled
  → Row → "Delete" → confirm: blocked if students enrolled
```

**Quick-create from point of need (anti-deadlock pattern):**
```
Any dropdown that lists class sections shows a "+ New" inline button.
Clicking it opens a compact creation popover without leaving the current
form. On save the new section is auto-selected in the dropdown.
Same pattern applies to Academic Year pickers.
```

**Not a hard prerequisite:** `class_section_id` is optional when creating a student.
A student can be created without a class assignment and placed into a section later
via edit. The Class column shows "—" until assigned.

**Onboarding wizard (first-time setup):**
```
If school has 0 academic years → dashboard shows setup banner:
  "Set up your school  →  1. Create Academic Year  →  2. Add Class Sections"
  Each step links to the relevant settings page.
```

**Edge cases:**
- Same class_name + section in same AY → 409
- Assigning a teacher already set as class teacher for another section → warning (allowed, not blocked)
- Deleting an AY that has class sections → blocked unless all sections are empty

---

## 3. Data Models

```python
from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional
from enum import Enum

class SchoolCreate(BaseModel):
    name: str
    branch_name: Optional[str] = None
    address: str
    phone: str
    email: EmailStr

class SchoolResponse(SchoolCreate):
    id: int
    is_active: bool
    created_at: datetime

class AcademicYearCreate(BaseModel):
    label: str                  # "2026-27"
    start_date: date
    end_date: date

class AcademicYearResponse(AcademicYearCreate):
    id: int
    school_id: int
    is_active: bool

class ClassSectionCreate(BaseModel):
    class_name: str
    section: str
    class_teacher_id: Optional[int] = None
    academic_year_id: Optional[int] = None   # defaults to active AY

class ClassSectionResponse(ClassSectionCreate):
    id: int
    school_id: int
    academic_year_id: int
```

---

## 4. Endpoints

### 4.1 Schools

```python
# Superadmin only
POST   /schools                     # create school
GET    /schools                     # list all schools (superadmin); paginated
GET    /schools/{school_id}         # get single school
PUT    /schools/{school_id}         # update school info
PATCH  /schools/{school_id}/status  # Body: { is_active: bool }
```

**POST /schools**
```
Request:  SchoolCreate
Response: 201 { success: true, data: SchoolResponse }
Errors:   409 if name+branch_name already exists
```

**PATCH /schools/{school_id}/status**
```
Request:  { is_active: bool }
Response: 200 { success: true, data: { id, is_active } }
Errors:   409 if deactivating a school with active_students > 0
          (unless force: true is passed — admin accepts risk)
```

---

### 4.2 Academic Years

```python
# Scoped to school_id via JWT
POST  /academic-years                        # create
GET   /academic-years                        # list
GET   /academic-years/{id}                   # detail
PUT   /academic-years/{id}                   # update label/dates (only if not active)
POST  /academic-years/{id}/activate          # set as active AY
DELETE /academic-years/{id}                  # only if no entities reference it
```

**POST /academic-years**
```
Request:  AcademicYearCreate
Response: 201 { success: true, data: AcademicYearResponse }
Errors:   409 if label already exists for this school
          422 if date range overlaps an existing AY
```

**POST /academic-years/{id}/activate**
```
Request:  (empty)
Response: 200 { success: true, data: { id, label, is_active: true, deactivated_id: int } }
Errors:   404 if AY not found
```

---

### 4.3 Class Sections

```python
POST   /class-sections                   # create
GET    /class-sections                   # list; query: academic_year_id?, class_name?
GET    /class-sections/{id}              # detail with teacher info
PUT    /class-sections/{id}              # update
DELETE /class-sections/{id}             # only if no students enrolled
```

**POST /class-sections**
```
Request:  ClassSectionCreate
Response: 201 { success: true, data: ClassSectionResponse }
Errors:   409 if class_name+section already exists in this AY
          422 if academic_year_id not found or not active
```

**GET /class-sections**
```
Query:    academic_year_id? (defaults to active), class_name?
Response: 200 { success: true, data: ClassSectionResponse[], meta: PaginationMeta }
```

**DELETE /class-sections/{id}**
```
Response: 200 { success: true }
Errors:   409 "Cannot delete: 23 students enrolled in this section"
```

---

## 5. Error Reference

| Code | Meaning |
|------|---------|
| 409 | Conflict — duplicate or blocked delete |
| 422 | Validation failure (date overlap, invalid ref) |
| 403 | Role not permitted for this action |
| 404 | Entity not found |

---

## 6. Open Questions

- [x] Should branch schools share staff/fee config or be fully independent? Decision: fully independent (current model). No change needed.
- [x] Who can create schools — only a hardcoded superadmin role, or a separate provisioning API? Decision: superadmin API key only.
- [x] Class name format — free text or from a predefined list? Decision: free text.
