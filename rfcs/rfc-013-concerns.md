# RFC-013: Concern Management

**Status:** Active  
**Scope:** Parent-submitted concerns/suggestions, threaded responses, status workflow  
**Actors:** Parent (submits, replies), Teacher (responds, resolves own), Admin (manages all)  
**Base path:** `/communications/concerns`

---

## 1. Summary

Parents submit concerns or suggestions about their child — directed at their class teacher, a specific staff member, or the school generally. Concerns have a linear message thread: parent opens, staff responds, parent can reply, and so on. Status moves from open through to resolved. Teachers see concerns directed at them or their class. Admins see everything and can intervene at any point.

---

## 2. Concern Lifecycle

```
open ──acknowledge──→ acknowledged ──respond──→ in_progress ──resolve──→ resolved
  │                                                                           │
  └───────────────────────────────── close (admin) ───────────────────────→ closed

Notes:
  - "acknowledged"  : staff has seen it but not yet responded
  - "in_progress"   : at least one staff response exists
  - "resolved"      : staff marked it resolved; parent can reopen once if unsatisfied
  - "closed"        : admin closed it; cannot be reopened
  - Transition to acknowledged is automatic on first staff view (or explicit PATCH)
  - Parent reopen: resolved → open (once only; tracked via reopened_at)
```

---

## 3. Concern Categories

```
suggestion   – parent offering an idea or improvement
complaint    – a formal complaint about staff, facilities, or policy
concern      – general worry about the child's welfare, academic progress, etc.
query        – a question needing clarification
```

---

## 4. User Flows

### 4.1 Parent Submits a Concern

```
Parent App → Concerns → "+ New Concern"
  → Step 1: Select Child  (if parent has multiple children)
  → Step 2: Fill form:
      Category*   (Suggestion | Complaint | Concern | Query)
      Subject*    (short label, e.g. "Bullying incident on 10 May")
      Message*    (text body)
      Directed To*:
        ○ Class Teacher       (auto-resolves to child's class teacher)
        ○ Specific Staff      → staff picker (shows active staff)
        ○ School / Admin      (goes to admin inbox, not a specific teacher)
  → Submit → concern created, status = open
  → Toast: "Your concern has been submitted."
  → Parent sees it in "My Concerns" list with status badge
```

**Edge cases:**
- Parent selects "Class Teacher" but the class has no class teacher assigned → 422: "No class teacher is assigned to your child's class. Please direct this to School / Admin."
- Parent with no enrolled children → cannot submit (guard at route level)

---

### 4.2 Parent Views & Follows Up

```
Parent App → Concerns → My Concerns
  → List: Subject, Category, Directed To, Date, Status badge
  → Filters: Category, Status
  → Tap concern → Detail / Thread view:

      ┌──────────────────────────────────────────┐
      │ Bullying incident on 10 May              │
      │ Category: Concern  ·  Directed to: Priya │
      │ Status: In Progress                      │
      ├──────────────────────────────────────────┤
      │ [Parent]  10 May, 9:14 AM                │
      │ My son mentioned that a classmate has    │
      │ been bothering him during lunch break... │
      ├──────────────────────────────────────────┤
      │ [Priya Sharma · Teacher]  10 May, 2:30 PM│
      │ Thank you for bringing this to my notice.│
      │ I will speak to both students tomorrow.  │
      ├──────────────────────────────────────────┤
      │ [Reply box]  "Type your reply..."  [Send]│
      └──────────────────────────────────────────┘

  → If status = resolved:
      "This concern has been marked as resolved."
      [Reopen] button → available once; sets status back to open with note
```

---

### 4.3 Teacher Views Their Concern Inbox

```
Teacher Portal → Concerns
  → Defaults to: status = open | acknowledged | in_progress (unresolved)
  → Filters: Category, Status, Date Range, Student Name / Class
  → Table: Subject, Category, Parent Name, Student, Date, Status, Last Activity
  → Sorted by: last_activity_at desc (most recent action first)
  → Row actions: View Thread, Acknowledge, Respond, Mark Resolved

  Acknowledge (without responding):
    → PATCH /concerns/{id}/acknowledge
    → Status: open → acknowledged
    → Useful when teacher has seen it but needs time to respond

  Respond:
    → Thread opens → teacher types reply → POST /concerns/{id}/messages
    → Status auto-transitions: acknowledged/open → in_progress

  Mark Resolved:
    → PATCH /concerns/{id}/resolve
    → Optional resolution note
    → Status → resolved
    → Parent notified (if notifications configured)

Scoping for teacher:
  → Sees concerns where directed_to_staff_id = their staff_id
  → OR directed_to = "class_teacher" AND they are class_teacher_id for that class section
  → Does NOT see concerns directed to admin/school unless admin reassigns
```

---

### 4.4 Admin Views All Concerns

```
Admin Portal → Communications → Concerns
  ┌──────────────────────────────────────────────────────────────────┐
  │ Filters:                                                         │
  │  Status [All▼]  Category [All▼]  Class Section [__]            │
  │  Directed To [staff picker]  Date From [__]  Date To [__]       │
  │  Student Name / Adm No [text]  Parent Name [text]  [Search]     │
  ├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
  │ Subject  │ Category │ Student  │ Directed │ Date     │ Status   │
  ├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
  │ Bullying │ Concern  │ Rajan 5A │ Priya S. │ 10 May   │ In Prog  │
  │ Fee query│ Query    │ Anya 3B  │ Admin    │ 09 May   │ Open     │
  │ Canteen  │ Complaint│ —        │ Admin    │ 08 May   │ Resolved │
  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
  → Row actions: View Thread, Respond, Reassign, Close

  Reassign:
    → Change directed_to_staff_id to a different teacher or admin
    → PATCH /concerns/{id}/reassign { to_staff_id: int | null }
    → Reassigned teacher now sees it in their inbox
    → Thread shows: "[Admin] Reassigned to Rajan Kumar on 11 May"

  Close (admin only):
    → PATCH /concerns/{id}/close  { reason?: str }
    → Status → closed; parent cannot reopen
    → Used for spam, duplicate, or out-of-scope submissions

  Summary strip at top:
    Open: 4  |  In Progress: 7  |  Resolved Today: 2  |  Avg Response Time: 6h
```

---

## 5. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum

class ConcernCategory(str, Enum):
    suggestion = "suggestion"
    complaint = "complaint"
    concern = "concern"
    query = "query"

class ConcernDirectedTo(str, Enum):
    class_teacher = "class_teacher"
    specific_staff = "specific_staff"
    admin = "admin"

class ConcernStatus(str, Enum):
    open = "open"
    acknowledged = "acknowledged"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"

class MessageSenderType(str, Enum):
    parent = "parent"
    staff = "staff"

# ── Concern ──────────────────────────────────────────

class ConcernCreate(BaseModel):
    student_id: int                            # the child this concern is about
    category: ConcernCategory
    subject: str
    message: str                               # opening message body
    directed_to: ConcernDirectedTo
    directed_to_staff_id: Optional[int] = None # required if directed_to = specific_staff

class ConcernResponse(BaseModel):
    id: int
    school_id: int
    student_id: int
    student_name: str                          # joined
    class_section: str                         # joined: "Grade 5-A"
    submitted_by: int                          # parent user_id
    submitted_by_name: str
    category: ConcernCategory
    subject: str
    directed_to: ConcernDirectedTo
    directed_to_staff_id: Optional[int]
    directed_to_name: Optional[str]            # joined staff name
    status: ConcernStatus
    reopened_at: Optional[datetime]            # set if parent reopened
    resolved_at: Optional[datetime]
    resolved_by: Optional[int]
    closed_at: Optional[datetime]
    closed_by: Optional[int]
    last_activity_at: datetime                 # updated on any message or status change
    message_count: int
    created_at: datetime

# ── Message Thread ────────────────────────────────────

class ConcernMessageCreate(BaseModel):
    body: str

class ConcernMessageResponse(BaseModel):
    id: int
    concern_id: int
    sender_type: MessageSenderType
    sender_id: int
    sender_name: str
    body: str
    created_at: datetime

class ConcernThreadResponse(ConcernResponse):
    messages: List[ConcernMessageResponse]     # ordered by created_at asc

# ── Actions ───────────────────────────────────────────

class ResolveRequest(BaseModel):
    note: Optional[str] = None

class CloseRequest(BaseModel):
    reason: Optional[str] = None

class ReassignRequest(BaseModel):
    to_staff_id: Optional[int] = None         # null → reassign to admin inbox
    note: Optional[str] = None
```

---

## 6. Endpoints

### 6.1 Submit Concern

```python
POST /communications/concerns
```

```
Request:  ConcernCreate
Response: 201 {
  success: true,
  data: { concern_id: int, status: "open" }
}
Errors:
  422 if directed_to = specific_staff and directed_to_staff_id is missing
  422 if directed_to = class_teacher and child's class has no class_teacher assigned
  404 if student_id not found or not a child of this parent
  403 if caller is not a parent role
```

---

### 6.2 List Concerns

```python
GET /communications/concerns
```

```
Query params:
  status?: ConcernStatus
  category?: ConcernCategory
  directed_to?: ConcernDirectedTo
  directed_to_staff_id?: int
  class_section_id?: int
  student_id?: int
  student_name?: str
  parent_name?: str
  date_from?: datetime
  date_to?: datetime
  page: int = 1
  limit: int = 20

Scoping (server-enforced):
  parent   → own submissions only (submitted_by = self)
  teacher  → concerns where directed_to_staff_id = self
              OR directed_to = class_teacher AND self is class_teacher for that section
  admin    → all concerns

Response: 200 {
  success: true,
  data: ConcernResponse[],      # no messages in list view; use GET /{id} for thread
  meta: PaginationMeta
}
```

---

### 6.3 Get Concern Thread

```python
GET /communications/concerns/{id}
```

```
Response: 200 { success: true, data: ConcernThreadResponse }
          Includes full message thread ordered chronologically.
Errors:
  404 not found
  403 if parent accessing a concern not submitted by them
  403 if teacher accessing a concern not directed at them
```

---

### 6.4 Post Message to Thread

```python
POST /communications/concerns/{id}/messages
```

```
Request:  ConcernMessageCreate
Response: 201 {
  success: true,
  data: ConcernMessageResponse
}
Side effects:
  - Updates concern.last_activity_at
  - If sender is staff AND current status is open or acknowledged
    → status auto-transitions to in_progress

Errors:
  403 if parent posting to a concern not submitted by them
  403 if teacher posting to a concern not directed at them
  403 if status = closed
  404 if concern not found
```

---

### 6.5 Acknowledge Concern

```python
PATCH /communications/concerns/{id}/acknowledge
```

```
Request:  (empty)
Response: 200 { success: true, data: { id, status: "acknowledged" } }
Errors:
  403 if caller is not the assigned teacher or admin
  409 if status is not open
```

---

### 6.6 Resolve Concern

```python
PATCH /communications/concerns/{id}/resolve
```

```
Request:  ResolveRequest  { note?: str }
Response: 200 {
  success: true,
  data: { id, status: "resolved", resolved_at: datetime }
}
Errors:
  403 if teacher is not the assigned staff or admin
  409 if status is already resolved or closed

Side effects:
  - If note is provided, a system message is appended to thread:
    "[Resolved by {name}] {note}"
```

---

### 6.7 Reopen Concern (parent)

```python
PATCH /communications/concerns/{id}/reopen
```

```
Request:  { reason: str }           # required — parent must state why it's not resolved
Response: 200 { success: true, data: { id, status: "open", reopened_at: datetime } }
Errors:
  403 if caller is not the submitting parent
  409 if status != resolved
  409 if concern has already been reopened once ("Can only reopen a concern once.")
  409 if status = closed
```

---

### 6.8 Reassign Concern (admin)

```python
PATCH /communications/concerns/{id}/reassign
```

```
Request:  ReassignRequest  { to_staff_id?: int, note?: str }
Response: 200 { success: true, data: ConcernResponse }
Errors:   403 if caller is not admin, 404 if to_staff_id not found

Side effects:
  - directed_to_staff_id updated
  - directed_to set to specific_staff (or admin if to_staff_id = null)
  - System message appended to thread: "[Reassigned to {name} by Admin]"
  - New assignee now sees it in their inbox
```

---

### 6.9 Close Concern (admin)

```python
PATCH /communications/concerns/{id}/close
```

```
Request:  CloseRequest  { reason?: str }
Response: 200 { success: true, data: { id, status: "closed" } }
Errors:   403 if caller is not admin, 409 if already closed

Note: Closed concerns are visible to parent in read-only mode with
      "This concern has been closed." shown in the thread.
      No further messages or reopening allowed.
```

---

### 6.10 Admin Summary Widget

```python
GET /communications/concerns/summary
```

```
Response: 200 {
  success: true,
  data: {
    open: int,
    acknowledged: int,
    in_progress: int,
    resolved_today: int,
    closed_today: int,
    avg_first_response_hours: float   # avg time from created_at to first staff message
  }
}
Used by: admin dashboard communications widget
```

---

## 7. Access Control Matrix

| Action | Admin | Teacher (assigned) | Teacher (other) | Parent (own) | Parent (other) |
|--------|-------|--------------------|-----------------|--------------|----------------|
| Submit | ✗ | ✗ | ✗ | ✓ | ✗ |
| List | All | Own inbox | ✗ | Own only | ✗ |
| View thread | ✓ | ✓ | ✗ | ✓ | ✗ |
| Post message | ✓ | ✓ | ✗ | ✓ | ✗ |
| Acknowledge | ✓ | ✓ | ✗ | ✗ | ✗ |
| Resolve | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reopen | ✗ | ✗ | ✗ | ✓ (once) | ✗ |
| Reassign | ✓ | ✗ | ✗ | ✗ | ✗ |
| Close | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## 8. System Messages in Thread

Certain status transitions append an automatic system message to the thread, visible to all parties:

| Trigger | System message |
|---------|---------------|
| Acknowledge | `[Acknowledged by {name}]` |
| Resolve | `[Resolved by {name}] {note if provided}` |
| Reopen | `[Reopened by parent: {reason}]` |
| Reassign | `[Reassigned to {name} by Admin] {note if provided}` |
| Close | `[Closed by Admin] {reason if provided}` |

These are stored as `ConcernMessage` records with `sender_type = "system"`.

---

## 9. Open Questions

- [x] Can admin submit a concern on behalf of a parent? Decision: allowed; `submitted_by` records admin's user_id.
- [x] Should teachers see concerns directed to "admin" that involve their class? Decision: no; admin inbox is admin-only.
- [x] Notification to teacher when a new concern is directed at them — Phase 1 or 2? Decision: Phase 2.
- [x] Is one reopen enough, or configurable? Decision: 1; Phase 2 for configurability.
- [x] Should complaints have a different escalation path or SLA timer vs general concerns? Decision: Phase 2.
- [x] File attachments on messages — in scope or Phase 2? Decision: Phase 2.
