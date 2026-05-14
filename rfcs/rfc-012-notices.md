# RFC-012: Notices

**Status:** Draft  
**Scope:** Notice creation, targeting, publishing; parent/student view; admin oversight  
**Actors:** Admin (create, manage all), Teacher (create for own classes), Parent / Student (read-only)  
**Base path:** `/communications/notices`

---

## 1. Summary

Notices are school communications with a title, text body, and optional image attachments. They are targeted at either the entire school or one or more specific class sections. Admin can send school-wide notices; teachers can only send to their assigned class sections. Parents and students see notices relevant to their class plus all school-wide notices. Admins have a full filterable view over all notices.

---

## 2. Targeting Model

```
NoticeTarget:
  school_wide         → visible to all parents/students/staff in the school
  class_sections      → visible only to parents/students of the listed class_section_ids

A notice always has exactly one target_type.
For class_sections, one or more class_section_ids must be provided.
```

**Teacher targeting restriction:** Teachers can only target class sections they have a `TeacherSubject` mapping for (RFC-004). They cannot send school-wide notices. Admin enforces no such restriction.

---

## 3. Notice Lifecycle

```
draft ──publish──→ published ──archive──→ archived
  ↑                    │
  └──── edit ──────────┘ (admin only on published; teacher can edit own drafts)
```

- **Draft:** visible only to the creator; not shown to parents/students
- **Published:** visible to the target audience immediately
- **Archived:** hidden from parent/student view; preserved for admin audit
- Published notices can be edited by admin (body/title/attachments); an `edited_at` timestamp is recorded
- Teachers can only edit their own drafts; they cannot edit a published notice

---

## 4. User Flows

### 4.1 Admin Creates & Publishes a Notice

```
Communications → Notices → "+ New Notice"
  → Form:
      Title*              (short, e.g. "School Closed on 16 May")
      Body*               (rich text / multiline)
      Target*:
        ○ School-wide (all classes)
        ● Specific Classes → multi-select class section dropdown
      Attachments         (images or PDFs, up to 5, each ≤ 5 MB)
  → Actions: [Save Draft]  [Publish]

  Publish flow:
    → Notice status = published, published_at = now
    → Toast: "Notice published · Visible to [School-wide / Grade 5-A, 5-B]"

  Draft flow:
    → Saved, not visible to parents/students
    → Appears in notices list with "Draft" badge
    → Admin can edit and publish later
```

---

### 4.2 Teacher Creates a Notice

```
Teacher Portal → Notices → "+ New Notice"
  → Same form, but:
      Target dropdown: only shows class sections the teacher is assigned to
      "School-wide" option is hidden / disabled
  → Can save as draft or publish
  → Published notice appears in parent/student feeds for the targeted classes
```

---

### 4.3 Admin Manages Notices (List View)

```
Communications → Notices
  ┌──────────────────────────────────────────────────────────────┐
  │ Filters:                                                     │
  │  Status [All▼]   Target Type [All▼]   Class Section [__]   │
  │  Sent By [staff picker]   Date From [__]  Date To [__]      │
  │  Title search [text]   [Search]  [Reset]                    │
  ├──────────┬──────────────────────┬────────┬──────┬───────────┤
  │ Title    │ Target               │ Sender │ Date │ Status    │
  ├──────────┼──────────────────────┼────────┼──────┼───────────┤
  │ Closed   │ School-wide          │ Admin  │12May │ Published │
  │ HW Rem.  │ Grade 5-A, 5-B       │ Priya  │11May │ Published │
  │ Picnic   │ Grade 3-A            │ Admin  │10May │ Draft     │
  └──────────┴──────────────────────┴────────┴──────┴───────────┘
  → Row actions: View, Edit, Archive, Delete
  → "Edit" on a published notice → admin only; edits body/title/attachments
  → "Archive" → notice hidden from parents/students, stays in admin list
  → "Delete" → hard delete with confirm; removes S3 attachments
```

---

### 4.4 Parent Views Notices

```
Parent App → Notices
  → Feed: sorted by published_at desc
  → Each card: Title, Sender name, Class or "School-wide", Date, thumbnail if image
  → Unread badge on cards not yet opened (Phase 2 — read tracking)
  → Tap card → Notice Detail:
      ┌────────────────────────────────┐
      │ School Closed on 16 May        │
      │ By: Admin  ·  12 May 2026      │
      │ To: School-wide                │
      ├────────────────────────────────┤
      │ [Body text]                    │
      │                                │
      │ [Image 1]  [Image 2]           │
      │ [PDF attachment link]          │
      └────────────────────────────────┘
  → Image tap → full-screen viewer
  → Parent sees: school-wide notices + notices for their child's class
  → If parent has multiple children in different classes → sees notices for all their children's classes (deduplicated)
```

---

### 4.5 Student Views Notices

```
Student App / Portal → Notices
  → Identical feed to parent, scoped to own class + school-wide
  → No send capability
```

---

## 5. Data Models

```python
from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class NoticeTargetType(str, Enum):
    school_wide = "school_wide"
    class_sections = "class_sections"

class NoticeStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"

class NoticeCreate(BaseModel):
    title: str
    body: str
    target_type: NoticeTargetType
    target_class_section_ids: Optional[List[int]] = None  # required if target_type=class_sections
    academic_year_id: Optional[int] = None                # defaults to active AY

    @field_validator("target_class_section_ids")
    def validate_targets(cls, v, info):
        if info.data.get("target_type") == NoticeTargetType.class_sections:
            if not v or len(v) == 0:
                raise ValueError("target_class_section_ids required for class_sections target")
        return v

class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    target_type: Optional[NoticeTargetType] = None
    target_class_section_ids: Optional[List[int]] = None

class NoticeAttachmentResponse(BaseModel):
    id: int
    notice_id: int
    filename: str
    file_url: str           # pre-signed S3 URL
    url_expires_at: datetime
    mime_type: str
    size_bytes: int
    uploaded_at: datetime

class NoticeResponse(BaseModel):
    id: int
    school_id: int
    academic_year_id: int
    title: str
    body: str
    target_type: NoticeTargetType
    target_class_section_ids: Optional[List[int]]
    target_label: str                    # e.g. "School-wide" or "Grade 5-A, Grade 5-B"
    sent_by: int                         # staff_id
    sent_by_name: str                    # joined
    status: NoticeStatus
    published_at: Optional[datetime]
    edited_at: Optional[datetime]        # set when admin edits a published notice
    attachments: List[NoticeAttachmentResponse]
    created_at: datetime
```

---

## 6. S3 Key Structure

```
{school_id}/notices/{notice_id}/attachments/{timestamp}_{filename}

Example:
  42/notices/88/attachments/20260512T090000_circular.pdf
  42/notices/88/attachments/20260512T090010_flyer.jpg
```

---

## 7. Endpoints

### 7.1 Create Notice

```python
POST /communications/notices
```

```
Request:  NoticeCreate
Response: 201 {
  success: true,
  data: { notice_id: int, status: "draft" }
}
Errors:
  403 if teacher targets school_wide
  403 if teacher targets a class_section_id they have no TeacherSubject mapping for
  422 if target_type=class_sections and target_class_section_ids is empty
  404 if any class_section_id not found

Note: Notice is always created as draft. Use POST /communications/notices/{id}/publish to make it visible.
```

---

### 7.2 Publish Notice

```python
POST /communications/notices/{id}/publish
```

```
Request:  (empty)
Response: 200 {
  success: true,
  data: { notice_id: int, status: "published", published_at: datetime }
}
Errors:
  403 if teacher is not the original creator
  409 if status is already published or archived
  404 if not found
```

---

### 7.3 List Notices

```python
GET /communications/notices
```

```
Query params:
  status?: NoticeStatus           # default for admin: all; for parent/student: published
  target_type?: NoticeTargetType
  class_section_id?: int          # notices targeting this section (exact match in array)
  sent_by?: int                   # staff_id
  date_from?: datetime            # filters on published_at
  date_to?: datetime
  title?: str                     # substr search
  academic_year_id?: int
  page: int = 1
  limit: int = 20

Scoping (server-enforced):
  admin      → all notices, all statuses
  teacher    → own notices (all statuses) + all published notices for their classes
  parent     → published only; class_section_ids = child's class + school_wide
  student    → published only; class_section_id = own class + school_wide

Response: 200 {
  success: true,
  data: NoticeResponse[],         # sorted by published_at desc (drafts by created_at desc)
  meta: PaginationMeta
}
```

---

### 7.4 Get Notice Detail

```python
GET /communications/notices/{id}
```

```
Response: 200 { success: true, data: NoticeResponse }
          Attachment file_urls are freshly generated pre-signed URLs.
Errors:
  404 not found
  403 if parent/student accessing a notice not targeted at their class
  403 if parent/student accessing a draft or archived notice
```

---

### 7.5 Update Notice

```python
PUT /communications/notices/{id}
```

```
Request:  NoticeUpdate
Response: 200 { success: true, data: NoticeResponse }
Errors:
  403 if teacher is not the original creator
  403 if notice is published and caller is not admin
  409 if notice is archived
  403 if teacher tries to change target to school_wide or an unassigned class

Behaviour on published notice (admin only):
  → body/title/attachments may be updated
  → edited_at timestamp set to now
  → target cannot be changed after publishing (create a new notice instead)
```

---

### 7.6 Archive Notice

```python
PATCH /communications/notices/{id}/archive
```

```
Request:  (empty)
Response: 200 { success: true, data: { id, status: "archived" } }
Errors:
  403 if teacher is not the original creator
  409 if already archived
Note: Archived notices are hidden from parent/student feed but preserved in admin list.
```

---

### 7.7 Delete Notice (admin only)

```python
DELETE /communications/notices/{id}
```

```
Response: 200 { success: true }
Errors:   403 if caller is not admin
          404 if not found
Side effects: deletes all attachment S3 objects + DB records for this notice
```

---

### 7.8 Upload Attachment

```python
POST /communications/notices/{id}/attachments
```

```
Content-Type: multipart/form-data
Body:  file: UploadFile

Response: 201 { success: true, data: NoticeAttachmentResponse }
Errors:
  403 if caller is not creator or admin
  409 if notice is archived
  413 if file > 5 MB
  415 if MIME type not in (image/jpeg, image/png, application/pdf)
  422 if attachment count already at max (5)
  404 if notice not found
```

---

### 7.9 Delete Attachment

```python
DELETE /communications/notices/{id}/attachments/{attachment_id}
```

```
Response: 200 { success: true }
Errors:
  403 if caller is not creator or admin
  403 if notice is published and caller is not admin
  404 if attachment not found
Side effects: removes S3 object + DB record
```

---

## 8. Access Control Matrix

| Action | Admin | Teacher (own) | Teacher (other) | Parent | Student |
|--------|-------|--------------|-----------------|--------|---------|
| Create | ✓ | ✓ (own classes) | ✗ | ✗ | ✗ |
| Publish | ✓ | ✓ (own draft) | ✗ | ✗ | ✗ |
| List | All statuses | Own + published for their classes | Published (their classes only) | Published (own class + school-wide) | Published (own class + school-wide) |
| View detail | ✓ | ✓ | Published only | Published, own class | Published, own class |
| Edit (draft) | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit (published) | ✓ | ✗ | ✗ | ✗ | ✗ |
| Archive | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ | ✗ |
| Upload attachment | ✓ | ✓ (own, non-archived) | ✗ | ✗ | ✗ |
| Remove attachment | ✓ | ✓ (own draft) | ✗ | ✗ | ✗ |

---

## 9. Validation Summary

| Rule | Enforcement |
|------|------------|
| Teacher cannot target school_wide | Service layer, 403 |
| Teacher can only target assigned class sections | TeacherSubject join check, 403 |
| target_class_section_ids required when target_type = class_sections | Pydantic validator |
| Publish only from draft state | State machine check, 409 |
| Cannot edit a published notice (non-admin) | Service layer, 403 |
| Cannot edit or delete attachments on a published notice (non-admin) | Service layer, 403 |
| Max 5 attachments | Service layer, 422 |
| MIME: jpeg / png / pdf only | Service layer before S3 upload |
| File size ≤ 5 MB | Service layer before S3 upload |

---

## 10. Open Questions

- [ ] Can a teacher send a notice to a class section they're assigned to but don't personally teach (e.g. they're the class teacher but teach a different subject)? Currently gated on TeacherSubject mapping — should the `class_teacher_id` on ClassSection also grant notice access?
- [ ] Read receipts — track which parents have opened a notice? Phase 2 confirmed, but flag now if the DB schema needs a `notice_reads` table from day one.
- [ ] Push / SMS notification on publish — notify parents when a new notice is published? Phase 1 or 2?
- [ ] Can the target of a published notice be changed (e.g. add a class to an existing notice)? Currently blocked — admin must create a new notice. Confirm this is acceptable.
- [ ] Notice expiry — should notices auto-archive after N days? Or remain until manually archived?
- [ ] Parent with children in multiple classes — confirmed deduplicated in the feed. Verify this is acceptable and not confusing (e.g. the same school-wide notice shown once, not twice).
