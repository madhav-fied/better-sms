# RFC-010: Attendance History & Reports

**Status:** Draft  
**Scope:** Filterable attendance history table for students; aggregate views for admin  
**Actors:** Admin, Principal, Class Teacher

---

## 1. Summary

Attendance History is a unified read endpoint over all past student attendance records. It powers the admin dashboard table, monthly reports, and the per-student attendance page. Staff history is covered by `GET /attendance/staff` (RFC-008) with the same filter model.

---

## 2. User Flows

### 2.1 Admin Attendance History Table

```
Attendance → History → Student Attendance
  ┌─────────────────────────────────────────────────────────────┐
  │ Filters:                                                    │
  │  Class Section [dropdown]  Date From [__] Date To [__]     │
  │  Status [All▼]  Student Name / Adm No [text]               │
  │  Period/Session [All▼]  Month [__]  Year [__]              │
  │  [Search]  [Reset]  [Export CSV]                            │
  ├──────┬──────────────┬───────┬──────┬──────────┬────────────┤
  │AdmNo │ Name         │ Class │ Date │ Period   │ Status     │
  ├──────┼──────────────┼───────┼──────┼──────────┼────────────┤
  │20260 │ Rajan Kumar  │ 5-A   │12May │ Period 2 │ ● Present  │
  │20260 │ Priya Singh  │ 5-A   │12May │ Period 2 │ ● Absent   │
  │20261 │ Aryan Patel  │ 5-B   │11May │ Morning  │ ● On Leave │
  └──────┴──────────────┴───────┴──────┴──────────┴────────────┘
  → Paginated. Sorted by date desc by default.
  → Click a row → student 360° view (filtered to that date)
  → "Export CSV" → streams filtered result as CSV
```

---

### 2.2 Class-wise Monthly Summary Table

```
Attendance → History → Monthly Summary
  → Select: Month, Year, Class Section (or "All")
  → Table: one row per student
      Name | Adm No | Class | Working Days | Present | Absent | Late | Leave | %
  → Sorted by attendance % ascending (worst first) for admin action
  → Highlight rows where % < threshold (configurable, e.g. 75%)
  → Click name → per-day breakdown for that student in that month
```

---

### 2.3 Per-Student Attendance Page

```
Students → Student Detail → Attendance tab (OR)
Students → Row → "View Attendance"
  → Calendar view: colour-coded months
  → Below calendar: filter by period/session, date range
  → Detail table: Date | Period | Status | Marked By
  → Summary: present X / total Y = Z%
  → Month selector to navigate
```

---

### 2.4 Low Attendance Alert View

```
Attendance → History → Low Attendance
  → Pre-filtered: attendance_percentage < 75% (configurable threshold)
  → Filters: Class Section, AY
  → Table: Name, Adm No, Class, Days Present, Total Days, %
  → Admin can click to open student detail or send SMS alert (future)
```

---

## 3. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from enum import Enum

class AttendanceHistoryRecord(BaseModel):
    """Flat record for the history table — one row per student per period/session per day."""
    id: int
    student_id: int
    admission_no: str
    student_name: str
    class_section_id: int
    class_name: str
    section: str
    date: date
    period_no: Optional[int]
    session: Optional[str]
    status: str                            # AttendanceStatus
    marked_by_name: Optional[str]
    marked_at: Optional[str]

class StudentMonthlySummaryRow(BaseModel):
    student_id: int
    admission_no: str
    student_name: str
    class_name: str
    section: str
    working_days: int
    present: int
    absent: int
    late: int
    on_leave: int
    not_marked: int
    attendance_percentage: float

class StudentDailyBreakdown(BaseModel):
    date: date
    periods: List[dict]                    # [{ period_no|session, status, marked_by }]
    day_status: str                        # "fully_present" | "partially_absent" | "absent" | "on_leave"
```

---

## 4. Endpoints

### 4.1 Attendance History (flat table)

```python
GET /attendance/history/students
```

```
Query params:
  student_id?: int
  admission_no?: str
  name?: str                             # substr search on student name
  class_section_id?: int
  date?: date                            # exact date
  date_from?: date
  date_to?: date
  month?: int                            # 1-12; shorthand for date_from/to within month
  year?: int
  period_no?: int
  session?: SessionType                  # morning | afternoon
  status?: AttendanceStatus
  academic_year_id?: int                 # defaults to active
  marked_by?: int                        # filter by staff_id who marked
  sort_by?: Literal["date","name","status"]   # default: date
  sort_order?: Literal["asc","desc"]          # default: desc
  page: int = 1
  limit: int = 20

Response: 200 {
  success: true,
  data: AttendanceHistoryRecord[],
  meta: PaginationMeta
}
```

---

### 4.2 Monthly Class Summary

```python
GET /attendance/history/students/monthly-summary
```

```
Query:
  month: int                             # required
  year: int                              # required
  class_section_id?: int                 # "all" behaviour: omit param
  academic_year_id?: int
  min_percentage?: float                 # e.g. pass 75 to get below-75% only
  page: int = 1
  limit: int = 20

Response: 200 {
  success: true,
  data: StudentMonthlySummaryRow[],
  meta: PaginationMeta
}
```

---

### 4.3 Per-Student Daily Breakdown

```python
GET /attendance/history/students/{student_id}/daily
```

```
Query:
  date_from: date
  date_to: date
  period_no?: int
  session?: SessionType

Response: 200 {
  success: true,
  data: StudentDailyBreakdown[]     # one entry per unique date
}
```

---

### 4.4 Low Attendance List

```python
GET /attendance/history/students/low-attendance
```

```
Query:
  threshold?: float = 75.0             # percentage below which to flag
  class_section_id?: int
  academic_year_id?: int
  month?: int                          # scope to specific month; omit for full AY
  year?: int
  page: int = 1
  limit: int = 20

Response: 200 {
  success: true,
  data: StudentMonthlySummaryRow[],   # sorted by attendance_percentage asc
  meta: PaginationMeta
}
```

---

### 4.5 Export (CSV)

```python
GET /attendance/history/students/export
```

```
Query:  Same as GET /attendance/history/students (no pagination params)

Response: 200
  Content-Type: text/csv
  Content-Disposition: attachment; filename="attendance_export_{date}.csv"

Columns: Admission No, Name, Class, Section, Date, Period/Session, Status, Marked By, Marked At

Note: Export is capped at 10,000 rows. If result exceeds this, return 422 with
      "Narrow your filters. Result set too large to export."
```

---

### 4.6 Dashboard Action — Update Status from History Table

```python
PUT /attendance/students/{id}          # same as RFC-007 §5.3
```

The history table row includes the `id` of the attendance record. Admin clicks "Edit Status" inline on any row in the history table → calls this endpoint. No separate "history update" endpoint needed.

```
Inline edit flow:
  History table row → "Edit" icon → status dropdown appears
  → Select new status → auto-save on change
  → PUT /attendance/students/{id} { status, notes? }
  → Row updates in place; previous_status logged
```

---

## 5. Filter Reference Summary

| Filter | History Table | Monthly Summary | Low Attendance |
|--------|--------------|-----------------|----------------|
| student_id | ✓ | — | — |
| admission_no | ✓ | — | — |
| name | ✓ | ✓ | ✓ |
| class_section_id | ✓ | ✓ | ✓ |
| date / date range | ✓ | — | — |
| month + year | ✓ | ✓ (required) | ✓ |
| period_no / session | ✓ | — | — |
| status | ✓ | — | — |
| academic_year_id | ✓ | ✓ | ✓ |
| marked_by | ✓ | — | — |
| threshold | — | — | ✓ |

---

## 6. Open Questions

- [ ] Working days calculation — does it use the HolidayCalendar from Masters module? Needs to be set up before percentage calculations are meaningful.
- [ ] Low attendance threshold — school-level config or fixed at 75%?
- [ ] Export row cap — 10,000 rows acceptable? Or should large exports be async (background job + download link)?
- [ ] Staff attendance history — is a separate history page needed, or does `GET /attendance/staff` with date range cover it?
