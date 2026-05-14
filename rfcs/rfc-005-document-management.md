# RFC-005: Document Management

**Status:** Draft  
**Scope:** File uploads for students, staff, and registrations; S3 storage; pre-signed URL access  
**Actors:** Admin, Receptionist

---

## 1. Summary

Documents are stored in S3 under a structured key. The server handles upload (via presigned PUT or direct multipart) and generates time-limited pre-signed GET URLs for download. No public URLs are ever exposed.

---

## 2. User Flows

### 2.1 Upload Document (Admin / Receptionist)

```
Student Detail → Documents tab → "+ Upload"
  → Modal:
      Doc Type* (dropdown: photo | tc | character_cert | medical |
                            dob | aadhar | other)
      File* (drag-and-drop or browse; accepts: jpg, png, pdf; max 5MB)
  → "Upload" → file sent to POST /students/:id/documents
  → Success: new row appears in docs table with:
      Type, Filename, Uploaded At, "Download" link, "Delete" action
  → Download link = pre-signed S3 URL (valid 1 hour, refreshed on each page load)
```

**Same pattern for:**
- Staff → Documents tab → `POST /staff/:id/documents`
- Registrations → Documents tab → `POST /registrations/:id/documents`

---

### 2.2 View & Download Documents

```
Document row → "Download" / "View"
  → Click → GET /documents/:id/url
  → Server returns fresh pre-signed URL (valid 1 hour)
  → Browser opens/downloads the file directly from S3
```

**Note:** Document links in the UI should never be stored as static hrefs — always fetch a fresh URL on demand via the API.

---

### 2.3 Delete Document

```
Document row → "Delete"
  → Confirm modal: "Delete this document? This cannot be undone."
  → Confirm → DELETE /documents/:id
  → Server deletes S3 object + DB record
  → Row removed from table
```

---

### 2.4 Student Photo Upload

Photo is a special case of `doc_type = photo`. UI shows a profile photo slot:

```
Student Detail → Photo avatar → "Change Photo"
  → File picker: jpg/png only, max 2MB
  → Preview shown before upload
  → Confirm → POST /students/:id/documents { doc_type: "photo" }
  → If a photo already exists for this student, the old one is replaced
    (server deletes old S3 key and DB record)
  → New photo appears in profile header
```

---

## 3. Data Models

```python
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

class EntityType(str, Enum):
    student = "student"
    staff = "staff"
    registration = "registration"

class DocType(str, Enum):
    photo = "photo"
    tc = "tc"
    character_cert = "character_cert"
    medical = "medical"
    dob = "dob"
    aadhar = "aadhar"
    other = "other"

class DocumentResponse(BaseModel):
    id: int
    school_id: int
    entity_type: EntityType
    entity_id: int
    doc_type: DocType
    filename: str
    s3_key: str
    file_url: str           # pre-signed GET URL, valid for configured TTL
    url_expires_at: datetime
    uploaded_at: datetime

class DocumentURLResponse(BaseModel):
    id: int
    file_url: str
    url_expires_at: datetime
```

---

## 4. S3 Key Structure

```
{school_id}/{entity_type}/{entity_id}/{doc_type}/{timestamp}_{filename}

Examples:
  42/student/1001/photo/20260512T103045_profile.jpg
  42/student/1001/aadhar/20260512T103100_aadhar_scan.pdf
  42/staff/55/medical/20260512T110000_health_cert.pdf
  42/registration/210/dob/20260512T112000_birth_cert.pdf
```

---

## 5. Endpoints

### 5.1 Upload

```python
POST /students/{id}/documents
POST /staff/{id}/documents
POST /registrations/{id}/documents
```

All three share identical behavior:

```
Content-Type: multipart/form-data
Body:
  doc_type: DocType             (form field)
  file:     UploadFile          (file field)

Response: 201 {
  success: true,
  data: DocumentResponse
}

Errors:
  404 if entity not found
  413 if file exceeds max size (5MB default — TBD)
  415 if MIME type not allowed (allowed: image/jpeg, image/png, application/pdf)
  409 for doc_type=photo: old photo is replaced, not rejected
```

**Server-side upload flow:**
1. Validate entity exists and belongs to school (from JWT)
2. Validate file size + MIME type
3. Generate S3 key using the structure above
4. Upload to S3 using server-side SDK (not client-side presigned PUT)
5. Insert Document record into DB
6. Generate pre-signed GET URL for response
7. Return DocumentResponse

---

### 5.2 List Documents

```python
GET /students/{id}/documents
GET /staff/{id}/documents
GET /registrations/{id}/documents
```

```
Query:  doc_type?: DocType

Response: 200 {
  success: true,
  data: DocumentResponse[]     # each includes a fresh pre-signed URL
}

Note: Pre-signed URLs are generated at response time, not stored. TTL is configurable (default 1 hour).
```

---

### 5.3 Refresh URL (on-demand)

```python
GET /documents/{id}/url
```

```
Response: 200 { success: true, data: DocumentURLResponse }

Use case: UI fetches this when user clicks "Download" rather than storing
          a static URL from the list response.
```

---

### 5.4 Delete Document

```python
DELETE /documents/{id}
```

```
Response: 200 { success: true }

Server actions:
  1. Fetch document record, verify school ownership
  2. Delete object from S3
  3. Delete DB record

Errors:
  404 if document not found
  403 if document belongs to a different school
```

---

## 6. Constraints & Configuration

| Parameter | Default | Configurable? |
|-----------|---------|---------------|
| Max file size | 5 MB | Yes — per school via env/config |
| Allowed MIME types | image/jpeg, image/png, application/pdf | Fixed |
| Pre-signed URL TTL | 1 hour | Yes — server env var |
| Photo max size | 2 MB | Yes |

---

## 7. Security Notes

- S3 bucket is **private** — no public access
- All file access goes through pre-signed URLs generated by the server
- Pre-signed URLs are scoped to the specific S3 key — no wildcards
- `school_id` is always verified from JWT before generating any URL
- S3 keys include `school_id` prefix — defense in depth against path traversal

---

## 8. Open Questions

- [ ] Max file size — confirm 5MB with client (some aadhar PDFs can be large)
- [ ] Pre-signed URL TTL — 1 hour default, or shorter for sensitive docs like aadhar?
- [ ] Should there be a document count limit per entity (e.g. max 10 docs per student)?
- [ ] Virus scanning (e.g. ClamAV or S3 event trigger) — required for Phase 1 or later?
- [ ] Are documents tied to an academic year, or are they permanent across AYs?
