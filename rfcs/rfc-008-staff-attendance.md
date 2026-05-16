# RFC-008: Staff Attendance

**Status:** Active  
**Scope:** Daily staff attendance marking, filtering, admin override  
**Actors:** HR / Admin (marks), Superadmin (cross-school view)

---

## 1. Summary

Staff attendance is marked once per day (not per period). Supports present / absent / late / half-day / on-leave. Admin marks on behalf of staff or bulk-imports from a biometric/device feed. Admin dashboard shows real-time daily status with override capability.

---

## 2. User Flows

### 2.1 Admin Marks Staff Attendance

```
Attendance → Staff Attendance → Mark Today
  → Date defaults to today (can select past dates, not future)
  → Filter staff list by: Category, Name
  → Table: [Checkbox] Emp Code, Name, Category, Status, Check-in, Check-out, Notes
  → Each row has inline status selector: Present | Absent | Late | Half Day | On Leave
  → "Mark All Present" quick action fills all unmarked as Present
  → Save row-by-row (inline save on change) or "Save All" at bottom
  → POST /attendance/staff/mark (bulk)
```

**Already-marked day:**
```
Admin navigates to a past date → existing records load in edit state
  → Changes saved via PUT /attendance/staff/{id}
  → All changes logged with previous_status
```

---

### 2.2 Admin Views Daily Staff Attendance (Dashboard)

```
Attendance → Staff Attendance → Daily View
  → Date picker (defaults to today)
  → Summary strip: Present: 18 | Absent: 2 | Leave: 1 | Half Day: 1 | Not Marked: 0
  → Table: Emp Code, Name, Category, Status, Check-in, Check-out, Marked By, Marked At
  → Filters: Category, Status, Name/Emp Code search
  → Row actions: Edit Status (inline), View Profile
```

---

### 2.3 Admin Views Staff Attendance History

```
Attendance → Staff Attendance → History
  → Date range picker
  → Filters: Staff Name / Emp Code, Category, Status
  → Table view: one row per staff per day
  → "Export" → CSV download (future)
```

---

## 3. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, time
from enum import Enum

class StaffAttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"
    late = "late"
    half_day = "half_day"
    on_leave = "on_leave"
    not_marked = "not_marked"

class StaffAttendanceMark(BaseModel):
    staff_id: int
    status: StaffAttendanceStatus
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    notes: Optional[str] = None

class MarkStaffAttendanceRequest(BaseModel):
    date: date
    records: List[StaffAttendanceMark]

class StaffAttendanceRecord(BaseModel):
    id: int
    school_id: int
    staff_id: int
    date: date
    status: StaffAttendanceStatus
    check_in_time: Optional[time]
    check_out_time: Optional[time]
    notes: Optional[str]
    marked_by: int                         # staff_id of the admin who marked
    marked_at: datetime
    updated_by: Optional[int]
    updated_at: Optional[datetime]
    previous_status: Optional[StaffAttendanceStatus]
    # Joined
    staff_name: Optional[str] = None
    emp_code: Optional[str] = None
    category: Optional[str] = None

class StaffAttendanceUpdate(BaseModel):
    status: StaffAttendanceStatus
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    notes: Optional[str] = None
```

---

## 4. Endpoints

### 4.1 Mark Attendance (bulk)

```python
POST /attendance/staff/mark
```

```
Request:  MarkStaffAttendanceRequest
Response: 201 {
  success: true,
  data: {
    saved: int,
    updated: int,
    date: date
  }
}
Errors:
  422 if date is in the future
  404 if any staff_id not found in this school
  403 if caller is not admin/HR role
```

---

### 4.2 Get Staff Attendance

```python
GET /attendance/staff
```

```
Query params:
  staff_id?: int
  category?: StaffCategory
  date?: date                        # exact date
  date_from?: date
  date_to?: date
  status?: StaffAttendanceStatus
  name?: str
  emp_code?: str
  page: int = 1
  limit: int = 20

Response: 200 {
  success: true,
  data: StaffAttendanceRecord[],     # includes joined name, emp_code, category
  meta: PaginationMeta
}
```

---

### 4.3 Daily Summary (for dashboard strip)

```python
GET /attendance/staff/daily-summary
```

```
Query:  date?: date    # defaults to today

Response: 200 {
  success: true,
  data: {
    date: date,
    present: int,
    absent: int,
    late: int,
    half_day: int,
    on_leave: int,
    not_marked: int,
    total: int
  }
}
```

---

### 4.4 Update Single Record

```python
PUT /attendance/staff/{id}
```

```
Request:  StaffAttendanceUpdate
Response: 200 {
  success: true,
  data: StaffAttendanceRecord     # includes previous_status, updated_by
}
Errors:   403 if not admin, 404 if not found
```

---

### 4.5 Staff Attendance Summary (per staff member)

```python
GET /attendance/staff/{staff_id}/summary
```

```
Query:
  month?: int
  year?: int
  academic_year_id?: int

Response: 200 {
  success: true,
  data: {
    present: int,
    absent: int,
    late: int,
    half_day: int,
    on_leave: int,
    total_working_days: int,
    attendance_percentage: float
  }
}
```

---

## 5. Open Questions

- [x] Biometric/device integration — auto-import? Decision: Phase 2 (manual only in Phase 1).
- [x] Half-day — does it count as 0.5 or 1? Decision: counts as 0.5 in percentage.
- [x] Who can mark staff attendance? Decision: Admin/HR only in Phase 1.
- [x] Is there a cutoff time after which attendance cannot be marked? Decision: no cutoff in Phase 1.
