# RFC-011: Homework Management

**Status:** Draft  
**Scope:** Homework creation by teachers, student view, admin oversight  
**Actors:** Teacher (creates), Student (views), Parent (views), Admin (manages)

---

## 1. Summary

Teachers assign homework to a class section for a specific subject. Homework has a text description and optional image/PDF attachments. Students see only homework for their own class. Admin has a full filtered view. Homework submission by students is **out of scope for Phase 1** — this RFC covers assign-and-view only.

---

## 2. Constraints & Rules

- Only staff with `category = teacher` can create homework
- A teacher can only assign homework to a class section where they have a `TeacherSubject` mapping for that subject (RFC-004)
- A teacher can only edit or cancel their own homework (admin can act on any)
- `due_date` must be ≥ `assigned_date`
- Editing is allowed only while `due_date` has not passed; admin can always edit
- Max attachments per homework: 5 (configurable)
- Allowed attachment types: `image/jpeg`, `image/png`, `application/pdf`; max 5 MB each

---

## 3. User Flows

### 3.1 Teacher Creates Homework

```
Teacher App / Portal → Homework → "+ Assign Homework"
  → Form:
      Class Section*  (dropdown — only sections where teacher has TeacherSubject mapping)
      Subject*        (dropdown — filtered by teacher's subjects in selected section)
      Title*          (short label, e.g. "Chapter 5 Exercise")
      Description*    (rich text / multiline — the actual homework instructions)
      Assigned Date*  (defaults to today)
      Due Date*       (date picker — must be >= assigned date)
      Attachments     (multi-file picker: jpg/png/pdf, max 5, each ≤ 5 MB)
  → Preview pane shows how students will see it
  → Submit → POST /homework
  → Success: "Homework assigned to Grade 5-A · Math · Due 15 May"
  → Appears in teacher's homework list
```

**Edge cases:**
- Teacher selects a class section for which they have no TeacherSubject mapping → subject dropdown is empty, save blocked: "You are not assigned to teach any subject in this section."
- Due date in the past → 422 inline error: "Due date cannot be in the past."
- No description and no attachments → 422: "Provide a description or at least one attachment."

---

### 3.2 Teacher Views & Edits Their Homework

```
Homework → My Assigned
  → Filters: Class Section, Subject, Due Date (from/to), Status (active/cancelled)
  → Table: Title, Class, Subject, Assigned Date, Due Date, Attachments (count), Status
  → Row actions:
      View    → detail modal
      Edit    → only if due_date >= today AND status = active
      Cancel  → PATCH /homework/{id}/cancel (sets status = cancelled)

Edit flow:
  → Same form as create, pre-filled
  → Can change: title, description, due_date, attachments
  → Cannot change: class_section_id, subject, assigned_date (these define what was given)
  → Save → PUT /homework/{id}
```

---

### 3.3 Student Views Homework

```
Student App / Portal → Homework
  → Defaults to: class = student's class, status = active, due_date >= today
  → List: Title, Subject, Assigned Date, Due Date, "overdue" badge if past due
  → Filters: Subject, Date Range (due date)
  → Tap / Click row → Homework Detail:
      ┌───────────────────────────────┐
      │ Chapter 5 Exercise            │
      │ Subject: Math  |  Due: 15 May │
      │ Assigned by: Priya Sharma     │
      ├───────────────────────────────┤
      │ [Description text]            │
      │                               │
      │ [Image thumbnail 1]           │
      │ [Image thumbnail 2]           │
      │ [PDF download link]           │
      └───────────────────────────────┘
  → Image tap → full-screen viewer
  → PDF → opens in browser or downloads
  → Overdue homework still visible (not removed) but tagged "Overdue"
```

**Scoping:** Student can only see homework where `class_section_id` matches their current enrollment. Cancelled homework is hidden from students.

---

### 3.4 Parent Views Child's Homework

```
Parent App → My Child → Homework
  → Identical to student view, scoped to the child's class
  → Can see today's pending homework and upcoming
  → Past homework accessible via date filter
```

---

### 3.5 Admin Views All Homework

```
Admin Portal → Academics → Homework
  → Filters:
      Class Section, Subject, Teacher (staff picker)
      Assigned Date (from/to), Due Date (from/to)
      Status (active | cancelled | all)
      Title search
  → Table: Title, Class, Subject, Teacher, Assigned Date, Due Date, Attachments, Status
  → Row actions:
      View   → detail modal (read-only)
      Edit   → same form as teacher (admin can always edit)
      Cancel → PATCH /homework/{id}/cancel
      Delete → DELETE /homework/{id} (hard delete, admin only, with confirm)

Stats strip at top:
  Today's Assigned: 4   |   Due Today: 7   |   Overdue (active): 2
  (Overdue = active homework with due_date < today)
```

---

### 3.6 Attachment Upload Flow

Attachments can be uploaded at creation time (inline) or added later:

**At creation:** Client sends `POST /homework` first without attachments → gets `homework_id` → uploads attachments via `POST /homework/{id}/attachments`.  
Alternatively, client can use a two-step draft flow (create → upload → no explicit publish needed).

**Post-creation add/remove:**
```
Homework Detail (teacher edit mode) → Attachments section
  → "+ Add Attachment" → file picker → POST /homework/{id}/attachments
  → Existing attachment → "Remove" → DELETE /homework/{id}/attachments/{attachment_id}
  → Attachment count shown on list: 📎 3
```

---

## 4. Data Models

```python
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class HomeworkStatus(str, Enum):
    active = "active"
    cancelled = "cancelled"

class HomeworkCreate(BaseModel):
    class_section_id: int
    subject: str
    title: str
    description: Optional[str] = None    # text body; at least one of description or
                                         # attachments must be present — enforced post-upload
    assigned_date: date                  # defaults to today server-side if omitted
    due_date: date
    academic_year_id: Optional[int] = None  # defaults to active AY

    @field_validator("due_date")
    def due_after_assigned(cls, v, info):
        assigned = info.data.get("assigned_date")
        if assigned and v < assigned:
            raise ValueError("due_date must be >= assigned_date")
        return v

class HomeworkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None      # cannot be set to a past date

class HomeworkAttachmentResponse(BaseModel):
    id: int
    homework_id: int
    filename: str
    file_url: str                        # pre-signed S3 URL
    url_expires_at: datetime
    mime_type: str
    size_bytes: int
    uploaded_at: datetime

class HomeworkResponse(BaseModel):
    id: int
    school_id: int
    academic_year_id: int
    class_section_id: int
    class_name: str                      # joined
    section: str                         # joined
    subject: str
    title: str
    description: Optional[str]
    assigned_by: int                     # staff_id
    assigned_by_name: str                # joined
    assigned_date: date
    due_date: date
    status: HomeworkStatus
    is_overdue: bool                     # computed: status=active AND due_date < today
    attachments: List[HomeworkAttachmentResponse]
    created_at: datetime
    updated_at: Optional[datetime]
```

---

## 5. S3 Key Structure

```
{school_id}/homework/{homework_id}/attachments/{timestamp}_{filename}

Example:
  42/homework/301/attachments/20260512T143000_exercise_sheet.pdf
  42/homework/301/attachments/20260512T143010_diagram.jpg
```

---

## 6. Endpoints

### 6.1 Create Homework

```python
POST /homework
```

```
Request:  HomeworkCreate
Response: 201 {
  success: true,
  data: { homework_id: int, title: str, due_date: date }
}
Errors:
  403 if caller's staff category != "teacher"
  403 if teacher has no TeacherSubject mapping for (class_section_id, subject) in active AY
  422 if due_date < assigned_date
  422 if due_date < today
  404 if class_section_id not found
```

---

### 6.2 List Homework

```python
GET /homework
```

```
Query params:
  class_section_id?: int
  subject?: str
  assigned_by?: int              # staff_id; admin/teacher filter
  assigned_date_from?: date
  assigned_date_to?: date
  due_date_from?: date
  due_date_to?: date
  status?: HomeworkStatus        # default: active
  overdue?: bool                 # true = active homework with due_date < today
  title?: str                    # substr search
  academic_year_id?: int         # defaults to active
  page: int = 1
  limit: int = 20

Scoping (server-enforced, not a query param):
  teacher  → class_section_id restricted to their TeacherSubject mappings
  student  → class_section_id = student's current enrollment only
  parent   → class_section_id = child's class only
  admin    → unrestricted

Response: 200 {
  success: true,
  data: HomeworkResponse[],      # attachments included in each record
  meta: PaginationMeta
}
```

---

### 6.3 Get Homework Detail

```python
GET /homework/{id}
```

```
Response: 200 { success: true, data: HomeworkResponse }
          Includes fresh pre-signed URLs for all attachments.
Errors:   404 not found
          403 if student/parent accessing homework outside their class
```

---

### 6.4 Update Homework

```python
PUT /homework/{id}
```

```
Request:  HomeworkUpdate
Response: 200 { success: true, data: HomeworkResponse }
Errors:
  403 if teacher is not the original assignee (admin bypasses this)
  403 if caller is a student or parent
  422 if due_date < today (cannot extend to past)
  409 if status = cancelled
  409 if due_date has already passed AND caller is not admin
        ("Cannot edit homework past its due date. Contact admin.")
```

---

### 6.5 Cancel Homework

```python
PATCH /homework/{id}/cancel
```

```
Request:  (empty — reason optional)  { reason?: str }
Response: 200 { success: true, data: { id, status: "cancelled" } }
Errors:
  403 if teacher is not the original assignee
  409 if already cancelled
Note: Cancelled homework is hidden from student/parent views but preserved
      for admin audit.
```

---

### 6.6 Delete Homework (admin only)

```python
DELETE /homework/{id}
```

```
Response: 200 { success: true }
Errors:   403 if caller is not admin
          404 if not found
Side effects: deletes all attachment records and S3 objects for this homework
```

---

### 6.7 Upload Attachment

```python
POST /homework/{id}/attachments
```

```
Content-Type: multipart/form-data
Body:  file: UploadFile

Response: 201 {
  success: true,
  data: HomeworkAttachmentResponse
}
Errors:
  403 if caller is not the assigning teacher or admin
  409 if status = cancelled
  413 if file > 5 MB
  415 if MIME type not in (image/jpeg, image/png, application/pdf)
  422 if attachment count for this homework is already at max (5)
  404 if homework not found
```

---

### 6.8 Delete Attachment

```python
DELETE /homework/{id}/attachments/{attachment_id}
```

```
Response: 200 { success: true }
Errors:
  403 if caller is not the assigning teacher or admin
  409 if due_date has passed AND caller is not admin
  404 if attachment not found
Side effects: removes S3 object + DB record
```

---

### 6.9 Dashboard Stats (admin)

```python
GET /homework/stats
```

```
Query:  academic_year_id?: int, class_section_id?: int

Response: 200 {
  success: true,
  data: {
    assigned_today: int,
    due_today: int,
    overdue_active: int,       # active homeworks with due_date < today
    total_this_week: int
  }
}
Used by the admin stats strip at the top of the homework list page.
```

---

## 7. Access Control Matrix

| Action | Admin | Teacher (own) | Teacher (other) | Student | Parent |
|--------|-------|--------------|-----------------|---------|--------|
| Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| List | All | Own classes | ✗ | Own class | Child's class |
| View detail | ✓ | ✓ | ✗ | Own class | Child's class |
| Edit | ✓ | ✓ (before due) | ✗ | ✗ | ✗ |
| Cancel | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ | ✗ |
| Upload attachment | ✓ | ✓ (before due) | ✗ | ✗ | ✗ |
| Remove attachment | ✓ | ✓ (before due) | ✗ | ✗ | ✗ |
| View attachment | ✓ | ✓ | ✗ | Own class | Child's class |

---

## 8. Validation Summary

| Rule | Where enforced |
|------|---------------|
| `due_date` ≥ `assigned_date` | Pydantic validator + DB check |
| `due_date` ≥ today on create | Service layer |
| Teacher must have TeacherSubject mapping for class+subject | Service layer |
| At least description OR ≥ 1 attachment | Service layer (post-upload check on GET) |
| Max 5 attachments per homework | Service layer |
| Attachment MIME: jpeg/png/pdf | Service layer before S3 upload |
| Attachment size ≤ 5 MB | Service layer before S3 upload |
| Cannot edit/add attachments after due_date (non-admin) | Service layer |

---

## 9. Open Questions

- [ ] Should a teacher be allowed to assign homework to a class section they're not mapped to in TeacherSubject? (e.g. a substitute) — strict block or admin-override?
- [ ] Homework submission by students (upload completed work) — confirm Phase 2.
- [ ] Acknowledgement tracking — should parents/students mark homework as "seen"? Useful for read receipts.
- [ ] Push/SMS notification to parents when homework is assigned — Phase 1 or 2?
- [ ] Can the same homework be assigned to multiple class sections at once (e.g. Grade 5-A and 5-B)? Currently one section per record — would need a bulk create or a homework group model.
- [ ] Is the subject field free text, or does it come from a subject master list? Free text currently risks inconsistency ("Maths" vs "Math").
