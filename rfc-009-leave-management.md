# RFC-009: Leave Management

**Status:** Draft  
**Scope:** Leave application for students and staff, admin approval workflow  
**Actors:** Staff (self-apply), Parent (applies for student), Admin/HR (reviews)

---

## 1. Summary

Unified leave model for both students and staff. Entity type (`student` | `staff`) distinguishes them. Admin sees a consolidated leave queue with filters. Approved leaves are linked back to attendance records — if a student/staff is on approved leave, their attendance status is auto-set to `on_leave` for the covered dates.

---

## 2. User Flows

### 2.1 Staff Applies for Leave

```
Staff App / Portal → Leave → Apply Leave
  → Form:
      Leave Type*: sick | casual | earned | other
      From Date* | To Date* (date range picker)
      Days calculated automatically (excludes weekends/holidays if configured)
      Reason* (text)
      Attach document (optional — medical cert for sick leave)
  → Submit → POST /leaves
  → Status: pending
  → Toast: "Leave application submitted. Awaiting approval."
  → Appears in "My Leaves" list with status badge
```

**My Leaves view:**
```
Leave → My Applications
  → Table: Type, From, To, Days, Reason, Status, Applied On, Reviewed By
  → Status filter: pending | approved | rejected
  → Can cancel a pending leave: PATCH /leaves/{id}/cancel
  → Cannot cancel approved leaves (must ask admin)
```

---

### 2.2 Parent Applies Leave for Student

```
Parent App → My Child → Apply Leave
  → Same form as staff
  → Submit → POST /leaves (entity_type: student, entity_id: student_id)
  → Parent sees status in their app
```

Admin can also apply on behalf:
```
Students → Student Detail → Leaves tab → "+ Apply Leave"
  → Same form, submitted as admin
```

---

### 2.3 Admin Reviews Leave Queue

```
Attendance → Leaves → Pending Approvals
  → Filters:
      Entity Type: All | Students | Staff
      Leave Type, Date Range (from/to covers the leave period)
      Class Section (for student leaves), Staff Category (for staff leaves)
      Status: pending | approved | rejected | cancelled
      Name / Emp Code / Adm No search
  → Table:
      Applicant, Type (student/staff), Leave Type, From, To, Days, Reason, Applied On, Status
  → Row actions:
      Approve → POST /leaves/{id}/approve  (with optional note)
      Reject  → POST /leaves/{id}/reject   (with required reason)
      View    → leave detail modal

Upcoming Leaves view:
  → Same as above but pre-filtered: date_from = today, status = approved
  → Shows who is on leave today and upcoming 30 days
  → Useful for planning substitutions
```

**Approve flow:**
```
Admin clicks "Approve"
  → Optional note field: "Approved. Get well soon."
  → Confirm → leave status = approved
  → Side effect: attendance records for covered dates (where not already marked)
                 auto-created as status = on_leave
  → Notification sent to applicant (if SMS/app notifications configured)
```

**Reject flow:**
```
Admin clicks "Reject"
  → Required: rejection reason (text)
  → Confirm → leave status = rejected
  → No attendance side effect
```

---

### 2.4 Leave Balance (Staff — future)

> Out of scope for Phase 1. Placeholder: each leave type has a configured annual quota per staff category. Balance tracked as `(quota - approved_days_this_AY)`. Endpoint stub: `GET /leaves/balance`.

---

## 3. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import date, datetime
from enum import Enum

class LeaveEntityType(str, Enum):
    student = "student"
    staff = "staff"

class LeaveType(str, Enum):
    sick = "sick"
    casual = "casual"
    earned = "earned"
    other = "other"

class LeaveStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"

class LeaveCreate(BaseModel):
    entity_type: LeaveEntityType
    entity_id: int                        # student_id or staff_id
    leave_type: LeaveType
    from_date: date
    to_date: date
    reason: str
    # document uploaded separately via POST /leaves/{id}/documents

class LeaveResponse(BaseModel):
    id: int
    school_id: int
    entity_type: LeaveEntityType
    entity_id: int
    leave_type: LeaveType
    from_date: date
    to_date: date
    days: int                             # server-calculated
    reason: str
    status: LeaveStatus
    applied_by: int                       # staff_id or parent user_id
    applied_at: datetime
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    review_note: Optional[str]
    # Joined for display
    applicant_name: Optional[str] = None
    emp_code_or_adm_no: Optional[str] = None
    class_or_category: Optional[str] = None

class LeaveReviewRequest(BaseModel):
    note: Optional[str] = None            # optional for approve, required for reject

class LeaveRejectRequest(BaseModel):
    reason: str                           # always required
```

---

## 4. Endpoints

### 4.1 Apply Leave

```python
POST /leaves
```

```
Request:  LeaveCreate
Response: 201 {
  success: true,
  data: { leave_id: int, status: "pending", days: int }
}
Errors:
  422 if from_date > to_date
  422 if from_date is in the past beyond allowed window (configurable)
  404 if entity_id not found
  409 if overlapping leave already exists for same entity with status pending|approved
```

---

### 4.2 List Leaves

```python
GET /leaves
```

```
Query params:
  entity_type?: LeaveEntityType
  entity_id?: int
  leave_type?: LeaveType
  status?: LeaveStatus
  date_from?: date             # filters where leave period overlaps this range
  date_to?: date
  class_section_id?: int       # for student leaves
  category?: StaffCategory     # for staff leaves
  name?: str
  academic_year_id?: int
  upcoming?: bool              # if true: from_date >= today AND status = approved
  page: int = 1
  limit: int = 20

Response: 200 {
  success: true,
  data: LeaveResponse[],
  meta: PaginationMeta
}

Scoping:
  - Staff see only their own leaves (entity_type=staff, entity_id=self)
  - Parents see only their child's leaves
  - Admin/HR see all
```

---

### 4.3 Leave Detail

```python
GET /leaves/{id}
```

```
Response: 200 { success: true, data: LeaveResponse }
```

---

### 4.4 Approve Leave

```python
POST /leaves/{id}/approve
```

```
Request:  LeaveReviewRequest   (note optional)
Response: 200 {
  success: true,
  data: {
    leave_id: int,
    status: "approved",
    attendance_records_created: int   # dates auto-filled as on_leave
  }
}
Errors:
  409 if status != pending
  403 if not admin/HR

Side effects:
  For each date in [from_date, to_date] (excluding weekends/holidays if configured):
    - If no attendance record exists → create with status=on_leave
    - If existing record has status=not_marked → update to on_leave
    - If existing record has a final status (present/absent/late) → leave unchanged
      (manual mark takes precedence)
```

---

### 4.5 Reject Leave

```python
POST /leaves/{id}/reject
```

```
Request:  LeaveRejectRequest   (reason required)
Response: 200 { success: true, data: { leave_id: int, status: "rejected" } }
Errors:   409 if status != pending, 403 if not admin/HR
```

---

### 4.6 Cancel Leave (by applicant)

```python
PATCH /leaves/{id}/cancel
```

```
Response: 200 { success: true, data: { leave_id: int, status: "cancelled" } }
Errors:
  409 if status != pending   ("Cannot cancel an already reviewed leave")
  403 if caller is not the original applicant or an admin
```

---

### 4.7 Upcoming Leaves (admin dashboard widget)

```python
GET /leaves/upcoming
```

```
Query:
  days_ahead: int = 30         # how far forward to look
  entity_type?: LeaveEntityType
  class_section_id?: int

Response: 200 {
  success: true,
  data: LeaveResponse[]        # status=approved, date range covers next N days
}

Used by: admin dashboard "Pending / Upcoming Leaves" header widget
         and substitution planning.
```

---

## 5. Leave ↔ Attendance Link

```
Leave approved
  └─→ for each working day in leave range
        ├─ no attendance record → INSERT status=on_leave, source=leave, leave_id=...
        └─ record exists with not_marked → UPDATE status=on_leave

Leave cancelled/rejected AFTER approval:
  └─→ revert auto-created on_leave records back to not_marked
      (only those with source=leave; manually marked records untouched)
```

The `source` field on attendance records distinguishes auto-created leave entries from manually marked ones.

---

## 6. Open Questions

- [ ] Leave balance quota per staff — Phase 1 or later?
- [ ] Weekend/holiday exclusion in day count — does the system know working days? Requires `HolidayCalendar` (RFC Masters) to be set up first.
- [ ] Can a parent cancel a student leave after approval? Or only admin?
- [ ] Overlap policy — block overlapping applications, or allow with warning?
- [ ] Carry-forward of unused leave days — out of scope for Phase 1?
