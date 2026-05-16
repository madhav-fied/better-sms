# RFC-014: Syllabus

**Status:** Active  
**Scope:** Per-class-section subject syllabus; teacher/admin create and edit; parent/student read  
**Base path:** `/communications/syllabus`  
**Actors:** Teacher (own class+subject), Admin (all), Parent / Student (read-only)

---

## 1. Summary

A syllabus is the academic plan for a specific subject in a specific class section for an academic year. Teachers publish the syllabus for the subjects they teach; parents and students can view it for their class. There is exactly **one active syllabus per class_section + subject + AY** — publishing a new one supersedes the old one rather than creating duplicates.

---

## 2. Syllabus Structure

A syllabus has two content layers:

```
Overview (always)
  title        – e.g. "Mathematics Syllabus · Grade 5 · 2026-27"
  description  – free text summary / introduction

Topics (optional structured list)
  Each topic: { title, description?, expected_completion_date? }
  Ordered list; teacher can reorder

Attachments (optional)
  PDF or image files — e.g. a scanned official syllabus document
  Max 3 attachments, 5 MB each
```

Either `description` or at least one topic or attachment must be present — a syllabus cannot be a title-only record.

---

## 3. User Flows

### 3.1 Teacher Creates / Updates Syllabus

```
Teacher Portal → Academics → Syllabus → "+ Add Syllabus"
  → Form:
      Class Section*  (dropdown — own assigned sections only)
      Subject*        (dropdown — filtered by teacher's TeacherSubject for that section)
      Title*          (pre-filled suggestion: "{Subject} Syllabus · {Class} · {AY}")
      Description     (text — overview, objectives, reference books)
      Topics          (ordered list — "+ Add Topic")
        Each topic: Title*, Description (optional), Expected Completion Date (optional)
        Drag-to-reorder
      Attachments     (PDF/image, max 3)
  → [Save Draft]  [Publish]

If a syllabus already exists for this class+subject+AY:
  → Form pre-fills with existing content
  → Banner: "A syllabus already exists for this class and subject. Saving will update it."
  → On publish → existing record updated in place (version bump), not duplicated
```

**Edit existing syllabus:**
```
Syllabus list → Row → "Edit"
  → Same form, pre-filled
  → Teacher can edit topics, description, add/remove attachments
  → Save → published_at not changed; updated_at stamped
  → Draft edits invisible to parents until published
```

---

### 3.2 Admin Manages All Syllabi

```
Admin Portal → Academics → Syllabus
  → Filters: Class Section, Subject, Teacher, Status (draft/published/archived), AY
  → Table: Class, Subject, Teacher, Topics Count, Attachments, Status, Last Updated
  → Row actions: View, Edit, Archive
  → Admin can edit any syllabus regardless of teacher assignment
  → Admin can archive a syllabus (hidden from parent/student view)
```

---

### 3.3 Parent / Student Views Syllabus

```
Parent App → Academics → Syllabus
  → List: Subject cards for their child's class
      Math | Science | English | Hindi | ...
  → Each card: Subject, Title, Last Updated, "View" button
  → Tap → Syllabus Detail:
      ┌─────────────────────────────────────────┐
      │ Mathematics Syllabus · Grade 5 · 2026-27│
      │ By: Priya Sharma  ·  Updated 10 May     │
      ├─────────────────────────────────────────┤
      │ [Description / Overview text]           │
      ├─────────────────────────────────────────┤
      │ Topics                                  │
      │  1. Numbers & Operations       (Apr)    │
      │  2. Fractions                  (May)    │
      │  3. Geometry                   (Jun)    │
      │     ...                                 │
      ├─────────────────────────────────────────┤
      │ 📎 Official_Syllabus_2026.pdf  [Download]│
      └─────────────────────────────────────────┘
  → Only published syllabi are shown
  → If no syllabus published for a subject → that subject card shows "Not yet uploaded"
```

---

## 4. Data Models

```python
from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class SyllabusStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"

class SyllabusTopic(BaseModel):
    title: str
    description: Optional[str] = None
    expected_completion_date: Optional[date] = None
    order: int                               # 1-based; determines display order

class SyllabusAttachmentResponse(BaseModel):
    id: int
    filename: str
    file_url: str                            # pre-signed S3 URL
    url_expires_at: datetime
    mime_type: str
    size_bytes: int
    uploaded_at: datetime

class SyllabusCreate(BaseModel):
    class_section_id: int
    subject: str
    title: str
    description: Optional[str] = None
    topics: Optional[List[SyllabusTopic]] = None
    academic_year_id: Optional[int] = None  # defaults to active AY

    @model_validator(mode="after")
    def require_content(self):
        has_content = bool(self.description) or bool(self.topics)
        if not has_content:
            raise ValueError("Provide a description or at least one topic. Attachments can be added after creation.")
        return self

class SyllabusUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topics: Optional[List[SyllabusTopic]] = None  # full replacement of topic list

class SyllabusResponse(BaseModel):
    id: int
    school_id: int
    academic_year_id: int
    class_section_id: int
    class_name: str                          # joined
    section: str                             # joined
    subject: str
    title: str
    description: Optional[str]
    topics: List[SyllabusTopic]
    version: int                             # increments on each publish
    created_by: int                          # staff_id
    created_by_name: str
    status: SyllabusStatus
    published_at: Optional[datetime]
    attachments: List[SyllabusAttachmentResponse]
    created_at: datetime
    updated_at: Optional[datetime]
```

---

## 5. S3 Key Structure

```
{school_id}/syllabus/{syllabus_id}/attachments/{timestamp}_{filename}

Example:
  42/syllabus/15/attachments/20260512T090000_official_syllabus.pdf
```

---

## 6. Endpoints

### 6.1 Create Syllabus

```python
POST /communications/syllabus
```

```
Request:  SyllabusCreate
Response: 201 {
  success: true,
  data: { syllabus_id: int, status: "draft", version: 1 }
}
Errors:
  403 if teacher has no TeacherSubject mapping for (class_section_id, subject)
  409 if a syllabus already exists for this class_section + subject + AY
      → client should use PUT /communications/syllabus/{id} to update it
  422 if neither description nor topics provided
  404 if class_section_id not found
```

---

### 6.2 Publish Syllabus

```python
POST /communications/syllabus/{id}/publish
```

```
Request:  (empty)
Response: 200 {
  success: true,
  data: { syllabus_id: int, status: "published", published_at: datetime, version: int }
}
Errors:
  403 if teacher is not the creator and caller is not admin
  409 if already published or archived
```

---

### 6.3 List Syllabi

```python
GET /communications/syllabus
```

```
Query params:
  class_section_id?: int
  subject?: str
  created_by?: int                  # staff_id
  status?: SyllabusStatus           # admin default: all; parent/student: published only
  academic_year_id?: int
  page: int = 1
  limit: int = 20

Scoping:
  teacher  → class sections with their TeacherSubject mappings (all statuses for own; published for others)
  parent   → published only; child's class_section_id
  student  → published only; own class_section_id
  admin    → all

Response: 200 {
  success: true,
  data: SyllabusResponse[],
  meta: PaginationMeta
}
```

---

### 6.4 Get Syllabus Detail

```python
GET /communications/syllabus/{id}
```

```
Response: 200 { success: true, data: SyllabusResponse }
Errors:
  404 not found
  403 if parent/student accessing a syllabus outside their class or not published
```

---

### 6.5 Update Syllabus

```python
PUT /communications/syllabus/{id}
```

```
Request:  SyllabusUpdate
Response: 200 { success: true, data: SyllabusResponse }
Errors:
  403 if teacher is not the creator and caller is not admin
  409 if status = archived

Note: topics list in the request is a full replacement — send all topics, not a delta.
      Order field on each topic determines display order.
      If syllabus is published, update is visible immediately to parents.
      version increments on each update to a published syllabus.
```

---

### 6.6 Archive Syllabus

```python
PATCH /communications/syllabus/{id}/archive
```

```
Request:  (empty)
Response: 200 { success: true, data: { id, status: "archived" } }
Errors:
  403 if teacher is not the creator and caller is not admin
  409 if already archived

Note: Archived syllabi are hidden from parent/student view.
      Use case: end of AY or when syllabus is replaced by a new one.
```

---

### 6.7 Upload Attachment

```python
POST /communications/syllabus/{id}/attachments
```

```
Content-Type: multipart/form-data
Body:  file: UploadFile

Response: 201 { success: true, data: SyllabusAttachmentResponse }
Errors:
  403 if not creator or admin
  409 if status = archived
  413 if file > 5 MB
  415 if MIME type not in (image/jpeg, image/png, application/pdf)
  422 if attachment count already at max (3)
```

---

### 6.8 Delete Attachment

```python
DELETE /communications/syllabus/{id}/attachments/{attachment_id}
```

```
Response: 200 { success: true }
Errors:   403 if not creator or admin, 404 if not found
Side effects: removes S3 object + DB record
```

---

## 7. Access Control Matrix

| Action | Admin | Teacher (own class+subject) | Teacher (other) | Parent | Student |
|--------|-------|-----------------------------|-----------------|--------|---------|
| Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| Publish | ✓ | ✓ | ✗ | ✗ | ✗ |
| List | All | Own (all status) + others (published) | Published only | Published, own class | Published, own class |
| View detail | ✓ | ✓ | Published only | Published, own class | Published, own class |
| Edit | ✓ | ✓ | ✗ | ✗ | ✗ |
| Archive | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| Upload / delete attachment | ✓ | ✓ (own) | ✗ | ✗ | ✗ |

---

## 8. One-Syllabus-Per-Class-Subject Constraint

The uniqueness constraint is: `(school_id, class_section_id, subject, academic_year_id)` — enforced at the DB level with a unique index.

- `POST /communications/syllabus` → 409 if record already exists; client should `PUT` instead
- The UI handles this transparently: when a teacher opens "+ Add Syllabus" and selects a class+subject that already has a record, the form pre-fills with existing data and the action becomes an edit, not a new creation

---

## 9. Open Questions

- [x] Subject field — free text or subject master list? Decision: subject master list; validated against `subjects` table.
- [x] Should archived syllabi be accessible to parents (as history)? Decision: hidden from parents (no history view).
- [x] Topic completion dates — should there be a way to mark a topic as "completed"? Decision: Phase 2.
- [x] Version history — should parents see previous versions? Decision: Phase 2.
