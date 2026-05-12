# RFC-015: Newsletter

**Status:** Draft  
**Scope:** School-wide periodic newsletter; teacher/admin create and edit; all parents/students read  
**Base path:** `/communications/newsletters`  
**Actors:** Admin / Teacher (create, edit), Parent / Student (read-only)

---

## 1. Summary

Newsletters are school-wide publications — periodic dispatches covering school events, achievements, announcements, and general news. Unlike notices (which are urgent and targeted), newsletters are curated, non-urgent, and always school-wide. Any teacher or admin can create one. Parents and students across all classes can read published newsletters.

---

## 2. How It Differs From Notices

| | Notice | Newsletter |
|-|--------|-----------|
| Target | School-wide or specific classes | Always school-wide |
| Tone | Urgent / operational | Editorial / periodic |
| Frequency | As needed | Weekly / monthly |
| Issue numbering | No | Optional (Vol/Issue) |
| Expiry / archive | Admin-managed | Admin-managed |

---

## 3. Newsletter Structure

```
title           – e.g. "SKEducations Monthly Newsletter – May 2026"
issue_label     – optional freeform label, e.g. "Vol. 2, Issue 5" or "May 2026 Edition"
body            – rich text / multiline (the full newsletter content)
attachments     – optional images and PDFs (max 5, 5 MB each)
                  images can be embedded in the visual layout on the client side
published_date  – date shown on the newsletter (can differ from published_at)
```

---

## 4. User Flows

### 4.1 Admin / Teacher Creates a Newsletter

```
Communications → Newsletter → "+ New Newsletter"
  → Form:
      Title*
      Issue Label       (optional: "Vol. 2, Issue 5", "May 2026 Edition")
      Published Date*   (shown on newsletter; defaults to today)
      Body*             (rich text editor — paragraphs, headings, bold/italic)
      Attachments       (images or PDFs, max 5)
  → [Save Draft]  [Publish]

  Draft: saved, not visible to parents/students
  Publish: visible immediately to all parents and students school-wide
```

---

### 4.2 Admin Manages Newsletters

```
Communications → Newsletter
  → Filters: Status (draft/published/archived), Date From, Date To, Title search, Created By
  → Table: Title, Issue Label, Published Date, Created By, Status, Attachments
  → Sorted: published_date desc
  → Row actions: View, Edit, Archive, Delete

  Edit:
    → Admin or original creator can edit any status except archived
    → Editing a published newsletter stamps edited_at
    → Content change is immediately live

  Archive:
    → Hidden from parent/student feed
    → Preserved in admin list for records

  Delete (admin only):
    → Hard delete with confirm
    → Removes S3 attachments
```

---

### 4.3 Parent / Student Views Newsletters

```
Parent App → Communications → Newsletter
  → Feed: newsletter cards, newest first
      Card: Title, Issue Label, Published Date, Thumbnail (first image if any)
  → Filter: Month / Year picker
  → Tap → Newsletter Detail:
      ┌──────────────────────────────────────────────┐
      │ SKEducations Newsletter – May 2026           │
      │ Vol. 2, Issue 5  ·  Published: 12 May 2026  │
      │ By: Admin                                    │
      ├──────────────────────────────────────────────┤
      │ [Body content — text, headings]              │
      │                                              │
      │ [Image gallery if images attached]           │
      │                                              │
      │ 📎 May_Newsletter.pdf        [Download]      │
      └──────────────────────────────────────────────┘
  → Only published newsletters shown; archived hidden
  → All parents/students see the same feed — no class scoping
```

---

## 5. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class NewsletterStatus(str, Enum):
    draft = "draft"
    published = "published"
    archived = "archived"

class NewsletterAttachmentResponse(BaseModel):
    id: int
    newsletter_id: int
    filename: str
    file_url: str                # pre-signed S3 URL
    url_expires_at: datetime
    mime_type: str
    size_bytes: int
    uploaded_at: datetime

class NewsletterCreate(BaseModel):
    title: str
    issue_label: Optional[str] = None
    body: str
    published_date: date         # display date; defaults to today

class NewsletterUpdate(BaseModel):
    title: Optional[str] = None
    issue_label: Optional[str] = None
    body: Optional[str] = None
    published_date: Optional[date] = None

class NewsletterResponse(BaseModel):
    id: int
    school_id: int
    title: str
    issue_label: Optional[str]
    body: str
    published_date: date
    created_by: int              # staff_id
    created_by_name: str
    status: NewsletterStatus
    published_at: Optional[datetime]
    edited_at: Optional[datetime]
    attachments: List[NewsletterAttachmentResponse]
    created_at: datetime
    updated_at: Optional[datetime]
```

---

## 6. S3 Key Structure

```
{school_id}/newsletters/{newsletter_id}/attachments/{timestamp}_{filename}

Example:
  42/newsletters/7/attachments/20260512T080000_may_newsletter.pdf
  42/newsletters/7/attachments/20260512T080010_sports_day_photo.jpg
```

---

## 7. Endpoints

### 7.1 Create Newsletter

```python
POST /communications/newsletters
```

```
Request:  NewsletterCreate
Response: 201 {
  success: true,
  data: { newsletter_id: int, status: "draft" }
}
Errors:   403 if caller is not staff (admin or teacher)
```

---

### 7.2 Publish Newsletter

```python
POST /communications/newsletters/{id}/publish
```

```
Request:  (empty)
Response: 200 {
  success: true,
  data: { newsletter_id: int, status: "published", published_at: datetime }
}
Errors:
  403 if teacher is not the creator and caller is not admin
  409 if already published or archived
```

---

### 7.3 List Newsletters

```python
GET /communications/newsletters
```

```
Query params:
  status?: NewsletterStatus       # admin default: all; parent/student default: published
  created_by?: int                # staff_id
  date_from?: date                # filters on published_date
  date_to?: date
  title?: str
  page: int = 1
  limit: int = 20

Scoping:
  admin / teacher  → all statuses
  parent / student → published only (school-wide, no class scoping)

Response: 200 {
  success: true,
  data: NewsletterResponse[],     # sorted by published_date desc
  meta: PaginationMeta
}
```

---

### 7.4 Get Newsletter Detail

```python
GET /communications/newsletters/{id}
```

```
Response: 200 { success: true, data: NewsletterResponse }
          Attachment file_urls freshly generated.
Errors:
  404 not found
  403 if parent/student accessing a draft or archived newsletter
```

---

### 7.5 Update Newsletter

```python
PUT /communications/newsletters/{id}
```

```
Request:  NewsletterUpdate
Response: 200 { success: true, data: NewsletterResponse }
Errors:
  403 if teacher is not creator and caller is not admin
  409 if status = archived

Note: Editing a published newsletter stamps edited_at and is live immediately.
```

---

### 7.6 Archive Newsletter

```python
PATCH /communications/newsletters/{id}/archive
```

```
Request:  (empty)
Response: 200 { success: true, data: { id, status: "archived" } }
Errors:
  403 if teacher is not creator and caller is not admin
  409 if already archived
```

---

### 7.7 Delete Newsletter (admin only)

```python
DELETE /communications/newsletters/{id}
```

```
Response: 200 { success: true }
Errors:   403 if caller is not admin, 404 if not found
Side effects: deletes all S3 attachment objects + DB records
```

---

### 7.8 Upload Attachment

```python
POST /communications/newsletters/{id}/attachments
```

```
Content-Type: multipart/form-data
Body:  file: UploadFile

Response: 201 { success: true, data: NewsletterAttachmentResponse }
Errors:
  403 if not creator or admin
  409 if archived
  413 if file > 5 MB
  415 if MIME type not in (image/jpeg, image/png, application/pdf)
  422 if attachment count already at max (5)
```

---

### 7.9 Delete Attachment

```python
DELETE /communications/newsletters/{id}/attachments/{attachment_id}
```

```
Response: 200 { success: true }
Errors:   403 if not creator or admin, 404 if not found
Side effects: removes S3 object + DB record
```

---

## 8. Access Control Matrix

| Action | Admin | Teacher (own) | Teacher (other) | Parent | Student |
|--------|-------|--------------|-----------------|--------|---------|
| Create | ✓ | ✓ | — | ✗ | ✗ |
| Publish | ✓ | ✓ | ✗ | ✗ | ✗ |
| List | All statuses | All statuses | Published only | Published only | Published only |
| View detail | ✓ | ✓ | Published only | Published only | Published only |
| Edit | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| Archive | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ | ✗ |
| Upload / delete attachment | ✓ | ✓ (own) | ✗ | ✗ | ✗ |

---

## 9. Open Questions

- [ ] Should teachers be able to create newsletters at all, or is this admin-only? The user confirmed "teachers and admin can create and edit" — but in practice newsletters are usually a principal/admin communication. Confirm with the school.
- [ ] Issue label format — free text is flexible but can be inconsistent. Consider a structured `volume: int, issue: int` pair instead if the school publishes on a fixed schedule.
- [ ] Should there be a newsletter archive page on the parent app showing all past newsletters (including archived from previous AYs)? Currently archived ones are hidden.
- [ ] Notification on publish — SMS or push to all parents when a new newsletter is published?
