# RFC-017: Exam Management

**Status:** Active  
**Scope:** Exam creation with type and ordering, per-class subject schedules with TBD date support, publish + parent notifications  
**Base path:** `/exams`  
**Actors:** Admin (all), Teacher (own class schedule entries), Parent / Student (read-only)

---

## 1. Summary

An exam is a school-level examination event (e.g., "Half Yearly Exam 2026") applicable to all classes or a subset. Below it sits a schedule: per `(class_section, subject)` entries with exam date, time, max marks, and passing marks. Dates can be TBD and confirmed later without re-publishing the exam. Status flow: `draft → scheduled → completed`. Completed exams unlock result entry (RFC-018).

---

## 2. Exam Types & Display Order

```
exam_type (enum):
  unit_test | monthly | quarterly | half_yearly | annual | pre_board | other

display_order (int):
  Sequence on report cards — 1 = first assessment, 2 = second, etc.
  Two exams in the same AY must not share the same display_order.
```

---

## 3. Data Models

```python
from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import date, time, datetime
from enum import Enum

class ExamType(str, Enum):
    unit_test   = "unit_test"
    monthly     = "monthly"
    quarterly   = "quarterly"
    half_yearly = "half_yearly"
    annual      = "annual"
    pre_board   = "pre_board"
    other       = "other"

class ExamStatus(str, Enum):
    draft     = "draft"
    scheduled = "scheduled"    # visible to parents/students; notified
    completed = "completed"    # result entry enabled

class ExamApplicableTo(str, Enum):
    all_classes       = "all_classes"
    specific_classes  = "specific_classes"

# ── Exam Header ────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    name: str                                       # "Half Yearly Examination 2026"
    exam_type: ExamType
    display_order: int                              # must be unique within school + AY
    academic_year_id: Optional[int] = None          # defaults to active AY
    applicable_to: ExamApplicableTo = ExamApplicableTo.all_classes
    applicable_class_section_ids: Optional[List[int]] = None

    @model_validator(mode="after")
    def validate_class_sections(self):
        if self.applicable_to == ExamApplicableTo.specific_classes:
            if not self.applicable_class_section_ids:
                raise ValueError("applicable_class_section_ids required when applicable_to = specific_classes")
        return self

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    exam_type: Optional[ExamType] = None
    display_order: Optional[int] = None
    applicable_to: Optional[ExamApplicableTo] = None
    applicable_class_section_ids: Optional[List[int]] = None

class ExamResponse(BaseModel):
    id: int
    school_id: int
    academic_year_id: int
    name: str
    exam_type: ExamType
    display_order: int
    applicable_to: ExamApplicableTo
    applicable_class_section_ids: Optional[List[int]]
    status: ExamStatus
    scheduled_at: Optional[datetime]    # when published
    completed_at: Optional[datetime]
    created_by: int
    created_by_name: str
    created_at: datetime
    updated_at: Optional[datetime]

# ── Exam Schedule ──────────────────────────────────────────────────

class ExamScheduleEntryInput(BaseModel):
    class_section_id: int
    subject: str
    exam_date: Optional[date] = None    # null = TBD
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_marks: float = 100.0
    passing_marks: Optional[float] = None   # null = school default

class ExamScheduleUpdate(BaseModel):
    exam_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_marks: Optional[float] = None
    passing_marks: Optional[float] = None

class ExamScheduleEntryResponse(BaseModel):
    id: int
    exam_id: int
    class_section_id: int
    class_name: str
    section: str
    subject: str
    exam_date: Optional[date]           # None shown as "TBD" to clients
    start_time: Optional[time]
    end_time: Optional[time]
    max_marks: float
    passing_marks: Optional[float]
    results_published: bool             # true when RFC-018 results published for this entry
```

---

## 4. User Flows

### 4.1 Admin Creates Exam

```
Admin → Academics → Exams → "+ New Exam"
  → Form:
      Exam Name*         e.g. "Half Yearly Examination 2026"
      Exam Type*         Unit Test | Monthly | Quarterly | Half Yearly | Annual | ...
      Academic Year*     (defaults to active AY)
      Display Order*     (1, 2, 3 — for report card sequence; duplicate order blocked)
      Applies To:
        ○ All Classes
        ● Specific Classes → multi-select class section dropdown
  → [Save Draft]  [Publish & Notify]

  Draft:
    → Exam saved; no notification sent; not visible to parents/students
    → Admin can add schedule entries and review before publishing

  Publish & Notify:
    → status = scheduled
    → Push/SMS notification to parents and students of applicable classes:
      "Half Yearly Exam has been scheduled. View the exam timetable in the app."
    → Schedule entries can be added / updated after publishing (dates may be TBD at this point)
```

---

### 4.2 Admin / Teacher Fills Exam Schedule

```
Admin → Exams → [Exam Row] → "Schedule" tab
  → Grid: rows = class sections × subjects; columns = Date, Time, Max Marks, Passing Marks
  → [Edit row] → inline form:
      Date          ○ Set Date [date picker]  ○ TBD
      Start Time, End Time  (optional)
      Max Marks     (default 100)
      Passing Marks (optional — leave blank to use school default)
  → Save row
  → No re-publish needed; updated schedule is immediately live

Teacher view:
  → Same grid but filtered to their class sections and subjects
  → Can only edit rows where they have TeacherSubject mapping for (class_section, subject)
  → Date/time/marks fields editable; class_section and subject are read-only

Edge case — TBD date confirmed later:
  → Teacher or admin edits the schedule entry, sets the date
  → Parent/student app refreshes on next load and shows the confirmed date
  → No new notification (date-confirmed notification is a Phase 2 feature)
```

---

### 4.3 Admin Marks Exam Completed

```
Admin → Exams → [Exam] → [Mark Complete]
  → Confirmation: "Marking as completed enables result entry. Proceed?"
  → status = completed
  → Exam card in parent/student app shows "Completed"
  → Teachers can now enter results for this exam (RFC-018)
```

---

### 4.4 Parent / Student Views Exam Schedule

```
Parent App → Academics → Exams
  → List: Exam Name | Type | Status | Date Range
  → Only scheduled and completed exams shown (drafts hidden)
  → Filter: AY, Status

  Tap exam → Exam Schedule Detail:
    ┌──────────────────────────────────────────────────────┐
    │ Half Yearly Examination 2026                         │
    │ Grade 5-A  ·  Status: Scheduled                     │
    ├──────────────┬────────────────┬──────────────────────┤
    │ Subject      │ Date           │ Time                 │
    ├──────────────┼────────────────┼──────────────────────┤
    │ Mathematics  │ 20 May 2026    │ 09:00 – 11:00        │
    │ English      │ 21 May 2026    │ 09:00 – 11:00        │
    │ Science      │ TBD            │ —                    │
    │ Hindi        │ 23 May 2026    │ 09:00 – 11:00        │
    │ Social Sci   │ 24 May 2026    │ 09:00 – 11:00        │
    └──────────────┴────────────────┴──────────────────────┘

  → Parent sees only their child's class section schedule
  → Student sees own class section schedule
  → TBD dates shown explicitly as "TBD" (not hidden)
```

---

## 5. Endpoints

### 5.1 Create Exam

```python
POST /exams
```

```
Request:  ExamCreate
Response: 201 { success: true, data: { exam_id: int, status: "draft" } }
Errors:
  403 if caller is not admin
  409 if display_order already used by another exam in the same school + AY
  404 if any applicable_class_section_id not found
```

---

### 5.2 Publish Exam

```python
POST /exams/{id}/publish
```

```
Request:  (empty)
Response: 200 { success: true, data: { exam_id: int, status: "scheduled", scheduled_at: datetime } }
Errors:
  403 if caller is not admin
  409 if status is not draft

Side effects:
  → Push/SMS notification to parents and students of applicable class sections
```

---

### 5.3 Complete Exam

```python
POST /exams/{id}/complete
```

```
Request:  (empty)
Response: 200 { success: true, data: { exam_id: int, status: "completed", completed_at: datetime } }
Errors:
  403 if caller is not admin
  409 if status is not scheduled
```

---

### 5.4 List Exams

```python
GET /exams
```

```
Query params:
  academic_year_id?: int
  exam_type?: ExamType
  status?: ExamStatus
  class_section_id?: int   # filter to exams that apply to this class section
  page: int = 1
  limit: int = 20

Scoping:
  admin    → all, all statuses
  teacher  → all statuses, filtered to their class sections
  parent   → scheduled + completed only, their child's class sections
  student  → scheduled + completed only, own class section

Response: 200 {
  success: true,
  data: ExamResponse[],   # sorted by display_order asc
  meta: PaginationMeta
}
```

---

### 5.5 Get Exam Detail

```python
GET /exams/{id}
```

```
Response: 200 { success: true, data: ExamResponse }
Errors:
  404 not found
  403 if parent/student accessing a draft exam or one not applicable to their class
```

---

### 5.6 Update Exam

```python
PUT /exams/{id}
```

```
Request:  ExamUpdate
Response: 200 { success: true, data: ExamResponse }
Errors:
  403 if caller is not admin
  409 if status = completed (cannot change a completed exam's header)
  409 if new display_order conflicts with another exam in the same AY
```

---

### 5.7 Delete Exam (admin, draft only)

```python
DELETE /exams/{id}
```

```
Response: 200 { success: true }
Errors:
  403 if caller is not admin
  409 if status != draft ("Cannot delete a published or completed exam.")
  404 if not found
Side effects: deletes all schedule entries for this exam
```

---

### 5.8 Get Exam Schedule

```python
GET /exams/{id}/schedule
```

```
Query params:
  class_section_id?: int   # filter to one class section

Scoping:
  admin    → all class sections
  teacher  → class sections they have TeacherSubject mappings for
  parent   → child's class section only
  student  → own class section only

Response: 200 {
  success: true,
  data: ExamScheduleEntryResponse[]   # sorted: class_section, then subject
}
```

---

### 5.9 Replace Exam Schedule (admin)

```python
PUT /exams/{id}/schedule
```

```
Request:  { entries: List[ExamScheduleEntryInput] }
Response: 200 { success: true, data: ExamScheduleEntryResponse[] }
Errors:
  403 if caller is not admin
  422 if duplicate (class_section_id + subject) pairs in request
  404 if any class_section_id not found or not in exam's applicable_class_section_ids

Note: Full replacement of all schedule entries for this exam.
      Use PATCH /exams/{id}/schedule/{entry_id} for single-entry updates.
```

---

### 5.10 Update Schedule Entry

```python
PATCH /exams/{id}/schedule/{entry_id}
```

```
Request:  ExamScheduleUpdate
Response: 200 { success: true, data: ExamScheduleEntryResponse }
Errors:
  403 if teacher has no TeacherSubject mapping for (entry.class_section_id, entry.subject)
  403 if caller is not admin and not a teacher with mapping
  404 if entry not found
```

---

## 6. Access Control Matrix

| Action | Admin | Teacher (own class+subject) | Teacher (other) | Parent | Student |
|--------|-------|-----------------------------|-----------------|--------|---------|
| Create exam | ✓ | ✗ | ✗ | ✗ | ✗ |
| Publish | ✓ | ✗ | ✗ | ✗ | ✗ |
| Complete | ✓ | ✗ | ✗ | ✗ | ✗ |
| List | All statuses | All, own classes | Scheduled+Completed | Scheduled+Completed, own class | Scheduled+Completed, own class |
| View detail | ✓ | ✓ | ✓ | Own class only | Own class only |
| Update exam header | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete | ✓ (draft only) | ✗ | ✗ | ✗ | ✗ |
| View schedule | ✓ | Own classes | ✗ | Own class | Own class |
| Replace schedule (PUT) | ✓ | ✗ | ✗ | ✗ | ✗ |
| Update entry (PATCH) | ✓ | ✓ (own subject) | ✗ | ✗ | ✗ |

---

## 7. Open Questions

- [x] Should changing `applicable_class_section_ids` on a scheduled exam notify newly added / removed classes? Decision: Phase 2.
- [x] Date-confirmed notification — when a TBD date is set, notify parents? Decision: Phase 2.
- [x] Passing marks — school-level default or 35% implicit? Decision: `ExamScheduleEntry.passing_marks` defaults to 35 (already in server).
- [x] Can two exams have the same `display_order` if different types? Decision: blocked; unique per AY.
- [x] Should admin be able to revert a `completed` exam back to `scheduled`? Decision: admin can revert completed → scheduled.
- [x] Venue / room per schedule entry — in scope or Phase 2? Decision: Phase 2.
