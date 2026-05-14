# RFC-016: Timetable Management

**Status:** Draft  
**Scope:** School-level period structure configuration + per-class weekly schedule  
**Base paths:** `/timetable/period-config`, `/timetable`  
**Actors:** Admin (all), Class Teacher (own class), Teacher (read, assigned classes), Parent / Student (read-only)

---

## 1. Summary

Timetable management has two levels:

1. **Period Config (school-wide):** Admin defines the school's period structure — period numbers, times, labels, and types (regular / break / assembly). All class timetables reference this structure.
2. **Class Timetable:** Per class section and academic year. Class teacher or admin maps each `(day, period)` cell to a subject and teacher.

---

## 2. Period Config Structure

```
period_number  – 1-based ordering
label          – "Period 1", "Recess", "Lunch", "Assembly"
start_time     – HH:MM
end_time       – HH:MM
period_type    – regular | break | assembly
```

One config per school. Shared across all class sections. Break and assembly cells in class timetables carry no subject or teacher assignment.

---

## 3. Class Timetable Structure

Weekly grid: `(day × period_number)` → `(subject, teacher)`

```
         Mon          Tue          Wed          Thu          Fri
08:00    Math / Priya Sci / Rajan  Math / Priya Eng / Anil   Math / Priya
08:45    Recess       Recess       Recess       Recess        Recess
09:00    Eng / Anil   Math / Priya Hindi / Sita Sci / Rajan  Eng / Anil
...
```

One timetable record per `(school_id, class_section_id, academic_year_id)`. Unique constraint enforced at DB level.

---

## 4. User Flows

### 4.1 Admin Configures Period Structure

```
Admin → Settings → Timetable → Period Structure
  → Table: No. | Label | Start | End | Type
      1  | Period 1  | 08:00 | 08:45 | regular
      2  | Period 2  | 08:45 | 09:30 | regular
      3  | Recess    | 09:30 | 09:45 | break
      4  | Period 3  | 09:45 | 10:30 | regular
      5  | Lunch     | 12:30 | 13:00 | break
      ...
  → [Edit Structure] → inline list editor (add, remove, reorder, change times)
  → [Save]
  Warning shown if existing class timetables reference a period being removed.
```

---

### 4.2 Admin Views All Class Timetables

```
Admin → Academics → Timetable
  → Filters: Class Section, AY, Status (draft / published)
  → Table: Class | Section | Status | Last Updated | Updated By
  → Row actions: View, Edit, Publish / Unpublish
  → Click row → Timetable Grid (read/edit mode)
```

---

### 4.3 Class Teacher Creates / Updates Timetable

```
Teacher Portal → My Class → Timetable
  → No timetable yet: [+ Create Timetable]
  → Existing draft:   [Edit Draft]
  → Published:        [Edit] → edits live immediately (no re-publish needed)

  Timetable Grid Editor:
    Rows: periods from period config (break rows locked, no input)
    Cols: Mon | Tue | Wed | Thu | Fri  (+ Sat if school uses 6-day week)
    Each regular cell: Subject (text) + Teacher (staff picker)
    Clear button → empties cell

  [Save Draft]  → not visible to parents/students
  [Publish]     → visible immediately to parents/students of this class

Edge cases:
  → Teacher who is class_teacher of a section but has no TeacherSubject for it:
    still allowed to manage timetable (class teacher role grants timetable access)
  → Trying to create when one exists → UI silently converts to edit; API returns 409
```

---

### 4.4 Parent / Student Views Timetable

```
Parent App → Academics → Timetable
  → Child's class timetable (published only)
  → Weekly grid:

      Period         | Mon        | Tue        | Wed
      08:00 – 08:45  | Math       | Sci        | Math
                     | Priya      | Rajan      | Priya
      Recess         | —          | —          | —
      09:00 – 09:30  | English    | Math       | Hindi
      ...

  → Today's current / next period highlighted
  → "Timetable not yet published" if none available
  → Parent with multiple children → selector to switch between children's classes
```

---

## 5. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import time, datetime
from enum import Enum

class DayOfWeek(str, Enum):
    monday    = "monday"
    tuesday   = "tuesday"
    wednesday = "wednesday"
    thursday  = "thursday"
    friday    = "friday"
    saturday  = "saturday"

class PeriodType(str, Enum):
    regular  = "regular"
    break_   = "break"
    assembly = "assembly"

class TimetableStatus(str, Enum):
    draft     = "draft"
    published = "published"

# ── Period Config ──────────────────────────────────────────────────

class PeriodConfigItem(BaseModel):
    period_number: int          # 1-based; used as reference key in timetable slots
    label: str                  # "Period 1", "Recess", "Lunch"
    start_time: time
    end_time: time
    period_type: PeriodType

class PeriodConfigUpdate(BaseModel):
    periods: List[PeriodConfigItem]   # full replacement; sorted by period_number

class PeriodConfigResponse(BaseModel):
    school_id: int
    periods: List[PeriodConfigItem]
    updated_at: Optional[datetime]
    updated_by_name: Optional[str]

# ── Timetable ──────────────────────────────────────────────────────

class TimetableSlotInput(BaseModel):
    day: DayOfWeek
    period_number: int                   # must exist in school's PeriodConfig
    subject: Optional[str] = None        # ignored for break/assembly periods
    teacher_staff_id: Optional[int] = None

class TimetableCreate(BaseModel):
    class_section_id: int
    academic_year_id: Optional[int] = None   # defaults to active AY
    slots: List[TimetableSlotInput]

class TimetableUpdate(BaseModel):
    slots: List[TimetableSlotInput]          # full replacement

class TimetableSlotResponse(BaseModel):
    day: DayOfWeek
    period_number: int
    period_label: str                        # from period config
    start_time: time                         # from period config
    end_time: time                           # from period config
    period_type: PeriodType
    subject: Optional[str]
    teacher_staff_id: Optional[int]
    teacher_name: Optional[str]

class TimetableResponse(BaseModel):
    id: int
    school_id: int
    class_section_id: int
    class_name: str
    section: str
    academic_year_id: int
    status: TimetableStatus
    slots: List[TimetableSlotResponse]       # sorted: day asc, period_number asc
    created_by: int
    created_by_name: str
    published_at: Optional[datetime]
    published_by_name: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
```

---

## 6. Endpoints

> **FastAPI router note:** Register `GET /timetable/period-config` **before** `GET /timetable/{id}` — otherwise FastAPI matches `"period-config"` as an ID.

### 6.1 Get Period Config

```python
GET /timetable/period-config
```

```
Response: 200 { success: true, data: PeriodConfigResponse }
Note: Returns empty periods list if not yet configured.
Accessible to all authenticated roles.
```

---

### 6.2 Update Period Config

```python
PUT /timetable/period-config
```

```
Request:  PeriodConfigUpdate
Response: 200 { success: true, data: PeriodConfigResponse }
Errors:
  403 if caller is not admin
  422 if period_numbers are not unique
  422 if any start_time >= end_time
  422 if periods list is empty

Note: Full replacement. period_number values are the stable keys referenced by
      timetable slots — removing a period_number that existing slots reference
      will leave those slots with a dangling period_number (warn in response).
```

---

### 6.3 Create Timetable

```python
POST /timetable
```

```
Request:  TimetableCreate
Response: 201 {
  success: true,
  data: { timetable_id: int, status: "draft" }
}
Errors:
  403 if teacher and not class_teacher_id for this class_section
  404 if class_section_id not found
  409 if a timetable already exists for this class_section + AY
      → client should use PUT /timetable/{id}
  422 if any slot.period_number not in school's period config
```

---

### 6.4 List Timetables

```python
GET /timetable
```

```
Query params:
  class_section_id?: int
  academic_year_id?: int
  status?: TimetableStatus
  page: int = 1
  limit: int = 20

Scoping:
  admin    → all class sections in school
  teacher  → own class section (class_teacher_id) + sections with TeacherSubject mapping
  parent   → child's class section, published only
  student  → own class section, published only

Response: 200 {
  success: true,
  data: TimetableResponse[],   # slots omitted in list view; use GET /{id} for the full grid
  meta: PaginationMeta
}
```

---

### 6.5 Get Timetable Detail

```python
GET /timetable/{id}
```

```
Response: 200 { success: true, data: TimetableResponse }   # full slot grid included
Errors:
  404 not found
  403 if parent/student accessing a timetable not for their class
  403 if parent/student accessing a draft timetable
```

---

### 6.6 Update Timetable

```python
PUT /timetable/{id}
```

```
Request:  TimetableUpdate
Response: 200 { success: true, data: TimetableResponse }
Errors:
  403 if teacher is not class_teacher_id and caller is not admin
  422 if any slot.period_number not in school's period config

Note: Full slot replacement. Subject and teacher_staff_id are silently ignored
      for break/assembly period_numbers.
      If timetable is published, the update is live immediately.
```

---

### 6.7 Publish Timetable

```python
POST /timetable/{id}/publish
```

```
Request:  (empty)
Response: 200 {
  success: true,
  data: { timetable_id: int, status: "published", published_at: datetime }
}
Errors:
  403 if teacher is not class_teacher_id and caller is not admin
  409 if already published
```

---

### 6.8 Unpublish Timetable (admin only)

```python
POST /timetable/{id}/unpublish
```

```
Request:  (empty)
Response: 200 { success: true, data: { timetable_id: int, status: "draft" } }
Errors:   403 if caller is not admin, 409 if already draft
Note: Reverts to draft — parents/students can no longer see it.
```

---

### 6.9 Delete Timetable (admin only)

```python
DELETE /timetable/{id}
```

```
Response: 200 { success: true }
Errors:   403 if caller is not admin, 404 if not found
```

---

## 7. Access Control Matrix

| Action | Admin | Class Teacher (own) | Teacher (assigned, other) | Parent | Student |
|--------|-------|---------------------|---------------------------|--------|---------|
| Get period config | ✓ | ✓ | ✓ | ✓ | ✓ |
| Update period config | ✓ | ✗ | ✗ | ✗ | ✗ |
| Create timetable | ✓ | ✓ | ✗ | ✗ | ✗ |
| List | All | Own + assigned | Published, assigned | Published, own class | Published, own class |
| View detail | ✓ | ✓ | Published only | Published, own class | Published, own class |
| Update | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| Publish | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| Unpublish | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## 8. One-Timetable-Per-Class Constraint

DB unique index: `(school_id, class_section_id, academic_year_id)`

- `POST /timetable` → 409 if already exists; client should `PUT /timetable/{id}`
- UI converts "+ Create Timetable" into an edit form when a record already exists for that class + AY

---

## 9. Relationship to Other Modules

- **RFC-006 Dashboard** — `GET /dashboard/timetable` reads from this module; returns today's slots for the current user's class.
- **RFC-007 Student Attendance** — period numbers in attendance records should align with the school's period config.
- **RFC-004 Staff** — `teacher_staff_id` in slots references `staff.id`; only active staff are assignable.

---

## 10. Open Questions

- [ ] Subject field — free text or subject master? Same open question in RFC-011, RFC-014. Inconsistent names make cross-module reports unreliable.
- [ ] 6-day week (Mon–Sat) vs 5-day — is this a school-level config flag or inferred from which days have slots?
- [ ] Updating period config that would leave existing slots with dangling period_numbers — block the save, or warn and allow?
- [ ] Copy timetable to a new AY — convenience operation, or manual re-entry?
- [ ] Substitute teacher — when a teacher is absent, display a substitute in the timetable. Phase 2 likely.
- [ ] Should teachers (non-class-teacher) be able to view full timetables for their assigned classes? Currently yes (published only) — confirm.
