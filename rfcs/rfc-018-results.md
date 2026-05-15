# RFC-018: Results & Marksheets

**Status:** Active  
**Scope:** Teacher enters marks, publishes results per subject; parent views and acknowledges; marksheet PDF generation  
**Base path:** `/results`  
**Actors:** Admin (all), Teacher (enter/publish, own class+subject), Parent (view own child + acknowledge), Student (view own)

---

## 1. Summary

Results are entered per `(exam, class_section, subject)` by the subject teacher. Entry is bulk (whole class at once). When ready, the teacher publishes results for that group — only then are marks visible to parents and students. Parents acknowledge receipt. Admins can view any result. A marksheet PDF (all subjects for one student, one exam) is generated on demand.

---

## 2. Subject Discretion

Not every student takes every subject (optional languages, vocational subjects, etc.). The exam schedule (RFC-017) defines which `(class_section, subject)` pairs have an exam. Results are entered only for pairs that exist in the schedule. A student with no schedule entry for a subject simply has no result for it — it is omitted from their marksheet.

```
Absent      → is_absent = true; marks_obtained = null; included in marksheet as "AB"
Exempt       → is_exempt = true (medical, etc.); marks_obtained = null; shown as "EX"
No entry     → student doesn't take the subject; entry does not exist; omitted entirely
```

---

## 3. Result Lifecycle

```
Teacher enters marks   →   draft results (admin visible, parent invisible)
Teacher publishes      →   published results (parent + student visible)
Parent views           →   sees all published subjects for the exam
Parent acknowledges    →   acknowledgement recorded; teacher / admin can track
```

Publish is per `(exam_id, class_section_id, subject)` — teacher publishes one subject at a time. Parents see partial results as subjects are published; the marksheet generates once all subjects are published (or on demand with whatever is available).

---

## 4. Data Models

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ── Individual Result ──────────────────────────────────────────────

class ResultInput(BaseModel):
    student_id: int
    marks_obtained: Optional[float] = None   # null if absent or exempt
    is_absent: bool = False
    is_exempt: bool = False                  # medical exemption or similar
    grade: Optional[str] = None              # "A1", "B2", "Pass", "Fail" — teacher-entered
    remarks: Optional[str] = None

class ResultBulkCreate(BaseModel):
    exam_id: int
    class_section_id: int
    subject: str                             # must match an ExamScheduleEntry
    results: List[ResultInput]               # one entry per student in the class

class ResultUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    is_absent: Optional[bool] = None
    is_exempt: Optional[bool] = None
    grade: Optional[str] = None
    remarks: Optional[str] = None

class ResultResponse(BaseModel):
    id: int
    exam_id: int
    exam_name: str
    class_section_id: int
    class_name: str
    section: str
    subject: str
    student_id: int
    student_name: str
    admission_no: str
    marks_obtained: Optional[float]
    max_marks: float                         # from ExamScheduleEntry
    passing_marks: Optional[float]
    is_absent: bool
    is_exempt: bool
    grade: Optional[str]
    remarks: Optional[str]
    is_published: bool
    published_at: Optional[datetime]
    published_by_name: Optional[str]
    entered_by: int
    entered_by_name: str
    entered_at: datetime
    updated_at: Optional[datetime]

# ── Class Summary ─────────────────────────────────────────────────

class SubjectSummary(BaseModel):
    subject: str
    total_students: int
    appeared: int          # not absent, not exempt
    passed: int
    failed: int
    highest_marks: Optional[float]
    average_marks: Optional[float]
    is_published: bool

class ClassResultSummary(BaseModel):
    exam_id: int
    class_section_id: int
    class_name: str
    section: str
    subjects: List[SubjectSummary]

# ── Acknowledgement ───────────────────────────────────────────────

class AcknowledgeRequest(BaseModel):
    exam_id: int
    student_id: int           # parent's child; validated server-side

class AcknowledgementResponse(BaseModel):
    exam_id: int
    student_id: int
    student_name: str
    acknowledged_by: int      # parent user_id
    acknowledged_by_name: str
    acknowledged_at: datetime

# ── Marksheet ────────────────────────────────────────────────────

class MarksheetResponse(BaseModel):
    student_id: int
    student_name: str
    admission_no: str
    class_name: str
    section: str
    exam_id: int
    exam_name: str
    academic_year: str
    url: str                  # pre-signed S3 URL to generated PDF
    url_expires_at: datetime
    generated_at: datetime
    subjects_included: List[str]   # subjects with published results
    all_subjects_published: bool   # false = partial marksheet
```

---

## 5. S3 Key Structure

```
{school_id}/marksheets/{exam_id}/{student_id}_{generated_timestamp}.pdf

Example:
  42/marksheets/3/101_20260525T143000.pdf
```

Latest generated PDF is always at a stable prefix; old versions can be overwritten.

---

## 6. User Flows

### 6.1 Teacher Enters Results

```
Teacher Portal → Academics → Results → Select Exam → Select Class → Select Subject
  → Marks Entry Table:
      Adm No | Student Name | Marks (/100) | Grade | Remarks | Absent | Exempt
      20260001 | Aarav Sharma  | [87.5 ]     | [A1 ] | [     ] | [ ]    | [ ]
      20260002 | Priya Nair    | [      ]    | [    ] | [     ] | [✓]    | [ ]  ← Absent
      20260003 | Rajan Kumar   | [      ]    | [    ] | [     ] | [ ]    | [✓]  ← Exempt
      ...
  → Absent checkbox: clears marks field
  → Exempt checkbox: clears marks field, different display ("EX" vs "AB")
  → [Save] → saved as draft; admin can see, parents cannot
  → [Publish Results] → dialog: "Publishing makes results visible to parents. Confirm?"
    → results for this (exam + class + subject) become visible to parents/students

Edit after publish:
  → Teacher edits individual result → marks updated immediately (no re-publish)
  → Admin sees edited_at timestamp
```

---

### 6.2 Admin Views Results

```
Admin → Academics → Results
  → Filters: Exam, Class Section, Subject, Published Status
  → Table: Student | Marks | Max | Grade | Absent | Published | Acknowledged
  → Can edit any result (same form as teacher)
  → Class Summary tab: per-subject stats (highest, average, pass count)
```

---

### 6.3 Parent Views & Acknowledges Results

```
Parent App → Academics → Results → Select Child (if multiple)
  → List of exams with published results for child's class
  → Tap exam → Result Detail:

    ┌──────────────────────────────────────────────────────────┐
    │ Half Yearly Examination 2026                             │
    │ Aarav Sharma  ·  Grade 5-A  ·  Adm No: 20260001         │
    ├──────────────┬───────────┬──────────┬────────┬───────────┤
    │ Subject      │ Marks     │ Max      │ Grade  │ Status    │
    ├──────────────┼───────────┼──────────┼────────┼───────────┤
    │ Mathematics  │ 87.5      │ 100      │ A1     │ Pass      │
    │ English      │ 72.0      │ 100      │ B2     │ Pass      │
    │ Science      │ AB        │ 100      │ —      │ Absent    │
    │ Hindi        │ —         │ 100      │ —      │ Pending   │  ← not yet published
    └──────────────┴───────────┴──────────┴────────┴───────────┘
    Total (published subjects): 159.5 / 200  |  Avg: 79.75%

    [📥 Download Marksheet]  (enabled once at least one subject published)

    [✓ Acknowledge Results]
      → "I have reviewed the results for the Half Yearly Exam."
      → Button disabled if already acknowledged
      → After acknowledgement: "Acknowledged on 25 May 2026 at 3:42 PM"

  → Subject with no published result shown as "Pending" (not hidden)
  → If no subjects published yet: "Results not yet published."
```

---

### 6.4 Marksheet Generation

```
Parent taps [Download Marksheet]
  → GET /results/marksheet?student_id=&exam_id=
  → Server generates PDF (or serves cached version)
  → PDF opens in app viewer / downloads

Marksheet layout (per school branding — simplified here):
  ┌───────────────────────────────────────────────────────────┐
  │  SKEducations  ·  Marks Statement                         │
  │  Half Yearly Examination 2026                             │
  │  Name: Aarav Sharma  ·  Class: Grade 5-A  ·  Roll No: 01 │
  │  Admission No: 20260001                                   │
  ├──────────────────┬──────────┬────────┬────────┬───────────┤
  │ Subject          │ Max Marks│ Marks  │ Grade  │ Remarks   │
  ├──────────────────┼──────────┼────────┼────────┼───────────┤
  │ Mathematics      │ 100      │ 87.5   │ A1     │           │
  │ English          │ 100      │ 72.0   │ B2     │ Good work │
  │ Science          │ 100      │ AB     │ —      │ Absent    │
  │ Hindi            │ 100      │ 65.0   │ B1     │           │
  ├──────────────────┼──────────┼────────┼────────┼───────────┤
  │ Total            │ 400      │ 224.5  │        │           │
  │ Percentage       │          │ 56.1%  │        │           │
  └───────────────────────────────────────────────────────────┘
  Note: Subjects with pending results not included in this marksheet.

  PDF cached in S3; regenerated if any result changes after last generation.
  `all_subjects_published: false` → watermark "Partial Marksheet — Results Pending"
```

---

## 7. Endpoints

> **FastAPI router note:** Register `GET /results/marksheet` and `GET /results/class-summary` **before** `GET /results/{id}`.

### 7.1 Bulk Enter / Update Results

```python
POST /results/bulk
```

```
Request:  ResultBulkCreate
Response: 201 {
  success: true,
  data: {
    saved: int,           # count of records saved
    results: ResultResponse[]
  }
}
Errors:
  403 if teacher has no TeacherSubject mapping for (class_section_id, subject)
  404 if exam not found or exam status != completed
  404 if ExamScheduleEntry not found for (exam_id, class_section_id, subject)
  422 if a student_id is not enrolled in this class_section
  422 if both is_absent and marks_obtained are provided for the same entry

Note: Upsert — existing results for (exam, class, subject, student) are updated.
      is_published flag is not changed by this endpoint; use POST /results/publish.
```

---

### 7.2 Publish Results for a Subject

```python
POST /results/publish
```

```
Request: { exam_id: int, class_section_id: int, subject: str }
Response: 200 {
  success: true,
  data: { published_count: int, subject: str, published_at: datetime }
}
Errors:
  403 if teacher has no TeacherSubject mapping
  403 if caller is not admin or the subject's teacher
  404 if no results entered yet for this group
  409 if already published

Side effects:
  → All results for (exam + class + subject) marked is_published = true
  → Push/SMS notification to parents: "Results for {subject} — {exam_name} are now available."
```

---

### 7.3 List Results

```python
GET /results
```

```
Query params:
  exam_id?: int
  class_section_id?: int
  subject?: str
  student_id?: int
  is_published?: bool
  is_absent?: bool
  page: int = 1
  limit: int = 20

Scoping:
  admin    → all
  teacher  → own class sections and subjects
  parent   → published only; own children
  student  → published only; own results

Response: 200 { success: true, data: ResultResponse[], meta: PaginationMeta }
```

---

### 7.4 Get Single Result

```python
GET /results/{id}
```

```
Response: 200 { success: true, data: ResultResponse }
Errors:
  404 not found
  403 if parent/student accessing unpublished result or a result not theirs
```

---

### 7.5 Update Single Result

```python
PUT /results/{id}
```

```
Request:  ResultUpdate
Response: 200 { success: true, data: ResultResponse }
Errors:
  403 if teacher has no TeacherSubject mapping for this result's subject+class
  403 if caller is not admin or the subject's teacher
Note: Updates are live immediately even if is_published = true.
      Cached marksheet is invalidated — next request regenerates it.
```

---

### 7.6 Class Result Summary

```python
GET /results/class-summary
```

```
Query params (required):
  exam_id: int
  class_section_id: int

Response: 200 { success: true, data: ClassResultSummary }
Errors:
  403 if teacher has no mapping for this class, 404 if not found
Note: Stats computed only over published results for each subject.
```

---

### 7.7 Acknowledge Results (parent)

```python
POST /results/acknowledge
```

```
Request:  AcknowledgeRequest  { exam_id: int, student_id: int }
Response: 201 { success: true, data: AcknowledgementResponse }
Errors:
  403 if student_id is not a child of the calling parent
  404 if no published results found for (exam + student)
  409 if already acknowledged

Note: Acknowledges all currently published results for (exam + student) in one action.
      If more subjects are published later, parent may acknowledge again (409 is lifted,
      acknowledged_at is updated — re-acknowledgement is allowed, not blocked).
```

---

### 7.8 Get Marksheet

```python
GET /results/marksheet
```

```
Query params:
  student_id: int
  exam_id: int

Response: 200 { success: true, data: MarksheetResponse }
Errors:
  403 if parent accessing a student not their child
  403 if student accessing another student's marksheet
  404 if no published results available for this (student + exam)

Side effects:
  → PDF generated and stored at S3 key (or served from cache if unchanged)
  → If any result changed since last generation → PDF regenerated
  → all_subjects_published: false → PDF carries "Partial — Results Pending" watermark
```

---

## 8. Access Control Matrix

| Action | Admin | Teacher (own class+subject) | Teacher (other) | Parent (own child) | Student (own) |
|--------|-------|-----------------------------|-----------------|--------------------|---------------|
| Bulk enter results | ✓ | ✓ | ✗ | ✗ | ✗ |
| Publish results | ✓ | ✓ | ✗ | ✗ | ✗ |
| List results | All | Own class+subject | ✗ | Published, own child | Published, own |
| View single result | ✓ | ✓ | ✗ | Published, own child | Published, own |
| Update result | ✓ | ✓ (own) | ✗ | ✗ | ✗ |
| Class summary | ✓ | ✓ (own class) | ✗ | ✗ | ✗ |
| Acknowledge | ✗ | ✗ | ✗ | ✓ | ✗ |
| Generate marksheet | ✓ | ✓ (own class) | ✗ | ✓ (own child) | ✓ (own) |

---

## 9. Open Questions

- [x] Grade scale — auto-compute grade from marks? Decision: Phase 2.
- [x] Total and percentage — exclude absent and exempt from denominator, or count as 0? Decision: excluded from denominator.
- [x] Re-acknowledgement — current design allows it. Decision: allowed (updates acknowledged_at).
- [x] Can a teacher un-publish results? Decision: `POST /results/unpublish` added.
- [x] Pass / fail override — manual override of system-computed status? Decision: Phase 2.
- [x] Co-scholastic / activities marks — same model or separate resource? Decision: Phase 2.
- [x] School branding on marksheet PDF — in scope? Decision: Phase 2; WeasyPrint chosen.
- [x] Should student be able to generate their own marksheet, or parent-only? Decision: confirmed; students can generate own marksheet.
