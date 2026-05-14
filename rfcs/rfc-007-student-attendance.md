# RFC-007: Student Attendance

**Status:** Draft  
**Scope:** Marking, viewing, updating student attendance per period/session  
**Actors:** Class Teacher (marks), Admin (views/overrides), Parent (views own child)

---

## 1. Summary

Attendance can be marked **per period** (1–N periods/day) or **per session** (morning / afternoon) — configured per school. Teachers mark via mobile app; records flow immediately to the admin dashboard. Parents can view their child's daily status. Admins can override any record.

---

## 2. Attendance Modes

```
school.attendance_mode = "period" | "session"

period mode:  one record per student per period per day
              period_no: 1, 2, 3 ... (up to school config)

session mode: one record per student per session per day
              session: "morning" | "afternoon"
```

---

## 3. User Flows

### 3.1 Teacher Marks Attendance (App)

```
Teacher App → Attendance → Mark Attendance
  → Step 1: Select Class Section (defaults to teacher's assigned section)
  → Step 2: Select Date (defaults to today; cannot select future)
  → Step 3: Select Period / Session
      period mode:  Period 1, Period 2 ... (only shows periods ≤ current time)
      session mode: Morning | Afternoon
  → Step 4: Student list loads
      → Each row: [Photo] Name, Admission No, current status chip
      → Status options: Present (✓) | Absent (✗) | Late (⏱) | On Leave (📋)
      → Default: all unmarked
      → Quick action: "Mark All Present" fills all as Present
  → Step 5: Submit → POST /attendance/students/mark
  → Success: "Attendance saved for Grade 5-A, Period 2"
  → Dashboard and parent view update in real-time
```

**Re-opening attendance (editing):**
```
Teacher opens same class + date + period → already-marked records load
  → Can change status per student
  → Submit → PUT /attendance/students/mark (upsert behavior)
  → Any change is logged with previous_status and changed_by
```

**Edge cases:**
- Submitting for a future date → 422
- Submitting duplicate period for same class+date — upsert (overwrite, keep audit log)
- Student added to class after attendance was marked → appears with status "not_marked"
- Teacher tries to mark a class not assigned to them → 403

---

### 3.2 Admin Views & Overrides (Dashboard)

```
Attendance → Student Attendance
  → Filters: Class Section, Date, Period/Session, Status
  → Table: Name, Adm No, Class, Date, Period/Session, Status, Marked By, Marked At
  → Row actions:
      "Edit Status" → inline dropdown: Present | Absent | Late | On Leave
      Save → PUT /attendance/students/{id}
      → Change logged: { by: admin, prev_status, new_status, at }

Bulk action:
  → Select rows → "Update Status" → apply to all selected
```

---

### 3.3 Parent Views Child Attendance

```
Parent App → My Child → Attendance
  → Monthly calendar view: colour-coded dates
      Green = Present, Red = Absent, Yellow = Late, Blue = On Leave, Grey = Holiday/Weekend
  → Tap a date → detail: each period/session status
  → Summary strip: Present 18 | Absent 2 | Leave 1 | % 90%
  → Filter by month
```

---

## 4. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import date, datetime
from enum import Enum

class AttendanceMode(str, Enum):
    period = "period"
    session = "session"

class SessionType(str, Enum):
    morning = "morning"
    afternoon = "afternoon"

class AttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"
    late = "late"
    on_leave = "on_leave"
    not_marked = "not_marked"

class StudentAttendanceMark(BaseModel):
    student_id: int
    status: AttendanceStatus
    notes: Optional[str] = None

class MarkStudentAttendanceRequest(BaseModel):
    class_section_id: int
    date: date
    # Exactly one of period_no or session must be set
    period_no: Optional[int] = None       # for mode=period
    session: Optional[SessionType] = None # for mode=session
    records: List[StudentAttendanceMark]

class StudentAttendanceRecord(BaseModel):
    id: int
    school_id: int
    academic_year_id: int
    class_section_id: int
    student_id: int
    date: date
    period_no: Optional[int]
    session: Optional[SessionType]
    status: AttendanceStatus
    notes: Optional[str]
    marked_by: int                        # staff_id
    marked_at: datetime
    updated_by: Optional[int]
    updated_at: Optional[datetime]
    previous_status: Optional[AttendanceStatus]  # set on override

class StudentAttendanceUpdate(BaseModel):
    status: AttendanceStatus
    notes: Optional[str] = None
```

---

## 5. Endpoints

### 5.1 Mark Attendance (bulk, teacher)

```python
POST /attendance/students/mark
```

```
Request:  MarkStudentAttendanceRequest
Response: 201 {
  success: true,
  data: {
    saved: int,
    updated: int,       # records that already existed and were overwritten
    class_section_id: int,
    date: date,
    period_no | session: ...
  }
}
Errors:
  422 if date is in the future
  422 if both period_no and session are set (or neither)
  422 if period_no out of range for school config
  403 if teacher not assigned to class_section_id
  404 if class_section_id not found
```

---

### 5.2 Get Student Attendance

```python
GET /attendance/students
```

```
Query params:
  class_section_id?: int
  student_id?: int
  date?: date                        # exact date
  date_from?: date
  date_to?: date
  period_no?: int
  session?: SessionType
  status?: AttendanceStatus
  academic_year_id?: int             # defaults to active
  marked_by?: int                    # filter by teacher who marked
  page: int = 1
  limit: int = 20

Response: 200 {
  success: true,
  data: StudentAttendanceRecord[],
  meta: PaginationMeta
}

Note: Parents are scoped server-side to their own children.
      Teachers are scoped to their assigned class sections.
      Admins see all.
```

---

### 5.3 Update Single Record (admin override)

```python
PUT /attendance/students/{id}
```

```
Request:  StudentAttendanceUpdate
Response: 200 {
  success: true,
  data: StudentAttendanceRecord     # includes previous_status and updated_by
}
Errors:
  404 not found
  403 if caller is a teacher (only admin can override)
```

---

### 5.4 Bulk Update (admin)

```python
POST /attendance/students/bulk-update
```

```
Request: {
  ids: List[int],
  status: AttendanceStatus,
  notes?: str
}
Response: 200 { success: true, data: { updated: int } }
Errors:   403 if not admin
```

---

### 5.5 Daily Attendance Status (teacher check — is this period marked?)

```python
GET /attendance/students/marking-status
```

```
Query:
  class_section_id: int
  date: date                         # defaults to today
  academic_year_id?: int

Response: 200 {
  success: true,
  data: [
    {
      period_no | session: ...,
      is_marked: bool,
      marked_at: datetime | null,
      marked_by: str | null,         # teacher name
      total_students: int,
      present: int,
      absent: int
    }
  ]
}

Use case: Teacher opens app → sees which periods are already marked today.
```

---

### 5.6 Student Attendance Summary (for 360° view / parent)

```python
GET /attendance/students/{student_id}/summary
```

```
Query:
  academic_year_id?: int
  month?: int                        # 1-12, optional
  year?: int

Response: 200 {
  success: true,
  data: {
    present: int,
    absent: int,
    late: int,
    on_leave: int,
    total_working_days: int,
    attendance_percentage: float,
    monthly_breakdown: [{ month, present, absent, on_leave, late }]
  }
}
```

---

## 6. Open Questions

- [ ] Attendance mode (period vs session) — is it per school, or can different classes use different modes?
- [ ] Max periods per day — school config or fixed?
- [ ] Can a teacher mark attendance for a past date, or is there a cutoff (e.g. same day only)?
- [ ] Push notification to parent when child marked absent — Phase 1 or 2?
- [ ] Late threshold — is "late" set by arrival time or manually selected by teacher?
