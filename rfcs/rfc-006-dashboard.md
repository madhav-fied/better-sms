# RFC-006: Dashboard

**Status:** Draft  
**Scope:** All dashboard widgets — attendance, strength, birthdays, financials, timetable  
**Actors:** Admin, Principal, Class Teacher

---

## 1. Summary

The dashboard is a role-aware landing page. Admins see school-wide metrics; class teachers see their class. All widgets are independent API calls — the UI assembles them in parallel. No single "dashboard" endpoint; each widget has its own route so they can load and fail independently.

---

## 2. User Flows

### 2.1 Admin Dashboard

```
Login → Dashboard
  ┌─────────────────────────────────────────────────────────┐
  │ Header: Welcome, {user_name}  |  SMS Balance: 1,240     │
  │         Pending Leaves: 3     |  [Today: May 12, 2026]  │
  ├──────────────┬──────────────┬──────────────┬────────────┤
  │ STUDENT      │ TEACHER      │ GENDER       │ BIRTHDAYS  │
  │ ATTENDANCE   │ ATTENDANCE   │ DISTRIB.     │ TODAY      │
  │ Today        │ Today        │              │            │
  │ Present: 342 │ Present: 18  │ Boys:  210   │ Students:  │
  │ Absent: 12   │ Absent: 2    │ Girls: 180   │ Rajan (5A) │
  │ Leave: 5     │ Leave: 1     │ Other: 2     │ Staff:     │
  │ N/M: 3       │              │ Total: 392   │ Priya (T)  │
  ├──────────────┴──────────────┴──────────────┴────────────┤
  │ CLASS-WISE ATTENDANCE (table, date=today)               │
  │ Class   | Present | Absent | Leave | Not Marked | Total │
  │ Grade 1A|  28     |   2    |   0   |     0      |  30   │
  │ Grade 1B|  25     |   3    |   1   |     1      |  30   │
  │ ...     |  ...    |  ...   |  ...  |  ...       | ...   │
  ├─────────────────────────────────────────────────────────┤
  │ CLASS STRENGTH                                          │
  │ Class   | Boys | Girls | Total                          │
  ├─────────────────────────────────────────────────────────┤
  │ REVENUE CHART  | FEES CHART    | ADMISSION TREND        │
  │ [bar chart]    | [donut chart] | [line chart]           │
  └─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Class-wise attendance table: each row is clickable → navigates to Attendance > Class Detail
- Birthday names are clickable → opens Student/Staff profile
- Chart widgets have AY selector (defaults to active AY)
- All attendance widgets have a date picker (defaults to today)

---

### 2.2 Class Teacher Dashboard

Same layout but scoped:
- Student Attendance Summary → only their class section
- Class-wise Attendance → only their section
- Timetable Widget → their class, today
- Birthdays → only their class's students + all staff

```
Dashboard → Timetable Widget (right sidebar or bottom panel)
  → Shows today's periods for class_section_id = teacher's assigned section
  → Tabs: Mon | Tue | Wed | Thu | Fri | Sat
  → Each slot: Period no., Subject, Teacher, Time
  → If timetable not configured → "Timetable not set up yet"
```

---

### 2.3 Date Navigation on Attendance Widgets

```
Attendance Summary widget → date picker (calendar icon)
  → Select past date → widget re-fetches with new date
  → Future date → error state: "Attendance not available for future dates"
  → Default: today
```

---

## 3. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import date

class AttendanceSummary(BaseModel):
    present: int
    absent: int
    on_leave: int
    not_marked: int
    total: int

class GenderDistribution(BaseModel):
    male: int
    female: int
    other: int
    not_marked: int
    total: int

class BirthdayPerson(BaseModel):
    id: int
    name: str
    dob: date
    entity_type: str              # "student" or "staff"
    class_section: Optional[str]  # for students

class BirthdaySummary(BaseModel):
    students: List[BirthdayPerson]
    staff: List[BirthdayPerson]

class ClassAttendanceRow(BaseModel):
    class_section_id: int
    class_name: str
    section: str
    present: int
    absent: int
    on_leave: int
    not_marked: int
    total: int

class ClassStrengthRow(BaseModel):
    class_section_id: int
    class_name: str
    section: str
    boys: int
    girls: int
    total: int

class TimetableEntry(BaseModel):
    period_no: int
    time_slot: str               # "08:00-08:45"
    subject: str
    teacher_name: str
    teacher_id: int

class HeaderSummary(BaseModel):
    sms_balance: int
    pending_leaves: int
    user_name: str
```

---

## 4. Endpoints

All dashboard endpoints are GET or POST as specified. POST is used where the body carries filter parameters (avoids long query strings for complex filters).

### 4.1 Header Summary

```python
GET /dashboard/header-summary
```

```
Response: 200 {
  success: true,
  data: HeaderSummary
}

Note: sms_balance source TBD (see Open Questions).
      pending_leaves = leave requests with status=pending scoped to current user's role.
      Admin sees all; teacher sees only their own submitted leaves.
```

---

### 4.2 Student Attendance Summary

```python
POST /dashboard/student-attendance-summary
```

```
Request:  {
  date: date,                       # ISO 8601
  academic_year_id?: int,           # defaults to active
  class_section_id?: int            # if set, scoped to one section (for teachers)
}

Response: 200 { success: true, data: AttendanceSummary }

Errors:
  422 if date is in the future
  422 if date < AY start_date
```

---

### 4.3 Teacher Attendance Summary

```python
POST /dashboard/teacher-attendance-summary
```

```
Request:  { date: date }

Response: 200 { success: true, data: AttendanceSummary }
```

---

### 4.4 Student Gender Distribution

```python
POST /dashboard/student-gender-distribution
```

```
Request:  {
  academic_year_id?: int,
  class_section_id?: int
}

Response: 200 { success: true, data: GenderDistribution }
```

---

### 4.5 Class-wise Attendance

```python
POST /dashboard/class-attendance
```

```
Request:  {
  class_section_id: int | "all",
  date: date
}

Response: 200 {
  success: true,
  data: ClassAttendanceRow[]
}

Note: When class_section_id = "all", returns one row per section.
      When scoped to a single section, returns one row.
```

---

### 4.6 Class Strength

```python
POST /dashboard/class-strength
```

```
Request:  {
  class_section_id: int | "all",
  academic_year_id?: int
}

Response: 200 {
  success: true,
  data: ClassStrengthRow[]
}
```

---

### 4.7 Timetable Widget

```python
GET /dashboard/timetable
```

```
Query:
  class_section_id: int             # required
  day?: str                         # "Mon" | "Tue" | ... | "Sun" — defaults to today

Response: 200 {
  success: true,
  data: TimetableEntry[]
}

Errors:
  404 if class_section_id not found
  200 with data: [] if timetable not configured (not a 404)
```

---

### 4.8 Upcoming Birthdays

```python
GET /dashboard/birthdays
```

```
Query:
  date?: date                       # defaults to today
  class_section_id?: int            # scope to a class (for teacher role)

Response: 200 { success: true, data: BirthdaySummary }

Note: Includes students with status=active only.
      Staff with status=active only.
      Returns both today's birthdays AND upcoming 7 days (UI can render both tabs).
      Add days_ahead?: int (default 0 = today only, max 30).
```

---

### 4.9 Financial & Chart Endpoints

All accept the same optional filters:

```python
GET /dashboard/revenue-chart
GET /dashboard/fees-chart
GET /dashboard/expense-chart
GET /dashboard/admission-chart
GET /dashboard/enquiry-chart
```

```
Query:
  academic_year_id?: int             # defaults to active
  class_section_id?: int             # scopes fees/admission/enquiry charts

Response shape (TBD — confirm with finance team):
  200 {
    success: true,
    data: {
      labels: str[],                 # e.g. ["Apr", "May", "Jun", ...]
      values: number[]
    }
  }

Note: These are stub endpoints until Phase 2 finance module ships.
      Return mock/empty data if finance module not active rather than 404.
```

---

## 5. Role Scoping Rules

| Widget | Admin | Principal | Class Teacher |
|--------|-------|-----------|---------------|
| Student Attendance Summary | All sections | All sections | Own section |
| Teacher Attendance Summary | All | All | Own record only |
| Class-wise Attendance | All | All | Own section |
| Class Strength | All | All | Own section |
| Timetable | Any section | Any section | Own section |
| Birthdays | All | All | Own section + all staff |
| Financial Charts | Full | Read-only | Hidden |
| Header SMS Balance | Shown | Hidden | Hidden |

Role scoping is enforced server-side — the client does not pass a role filter. The JWT role determines what data is returned.

---

## 6. Open Questions

- [ ] **SMS Balance** — is this fetched from a third-party gateway API (live) or an internal ledger? If third-party, what's the fallback when the gateway is unreachable?
- [ ] Should financial chart endpoints return empty datasets or 404 before Phase 2 ships?
- [ ] Timetable widget `day` param — does Saturday/Sunday apply (some schools have 6-day weeks)?
- [ ] Birthday widget — should it include upcoming birthdays (e.g. next 7 days)? How many days ahead?
- [ ] Dashboard for Principal role — same as Admin or different scoping?
