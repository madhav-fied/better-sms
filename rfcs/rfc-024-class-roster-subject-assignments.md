# RFC-024 — Class Roster & Subject Assignments

**Status:** Active  
**Authors:** madhav-fied  
**Created:** 2026-05-20  
**Scope:** Class-student enrollment, subject-staff assignments per class, bulk student operations (promote, transfer).  
**Actors affected:** Admin (web), Teacher (mobile + web), Parent (mobile), Student (mobile)

---

## 1. Problem Statement

`ClassSection` is a shell — it stores class name, section, and class teacher, but has no API surface for:
- Seeing which students are enrolled
- Assigning / removing students in bulk
- Knowing which subjects the class offers and who teaches each

Meanwhile:
- `TeacherSubject` (staff → subject → class) exists but is **teacher-centric** (query by staff) with no class-centric view and **no unique constraint** (duplicates are possible)
- `POST /students/migrate` and `POST /students/change-class-section` (RFC-003 §4.3) were designed but never implemented
- No end-of-year bulk-promotion flow exists

This RFC completes RFC-003 §4.3, adds class-centric subject management, and defines what each actor can see and do.

---

## 2. Actor Impact

### 2.1 Admin (web dashboard — full write access)

The admin is the only actor that can mutate class roster and subject assignments.

| Task | How |
|------|-----|
| See all students in a class | Class detail page → Roster tab |
| Add / remove students from a class | Assign dialog + remove button on roster |
| Bulk-assign many students to a class at once | Multi-select on student list → "Assign to Class" |
| Move student(s) to a different class (same AY) | `POST /students/change-class-section` |
| End-of-year promotion to next AY's class | Year Migration wizard → `POST /students/migrate` |
| See subjects offered in a class and who teaches each | Class detail → Subjects tab |
| Add / edit / remove subject-teacher assignment | Subjects tab actions |

### 2.2 Teacher (mobile app — scoped read; create for own classes)

Teachers cannot modify rosters or subject assignments. They *see* the students they teach.

| Task | How | Scoping rule |
|------|-----|--------------|
| See students in their assigned class | `GET /class-sections/{id}/students` | Only classes where teacher has a TeacherSubject entry OR is the class teacher |
| See subject list for their assigned class | `GET /class-sections/{id}/subjects` | Same — own classes only |
| Mark attendance for a class | Existing attendance flow — but now `class_section_id` is the source of the student list | Own classes only |
| Send notice to a class | Notice creation form → class picker | Own classes only |
| Create homework for a class | Homework form — class + subject picker | Own classes only |
| Enter exam results | Results entry — exam + subject + class | Own assigned subject+class |

**Mobile screen addition:** "My Classes" tab (or section on Dashboard) — list of classes from `/class-sections` filtered to teacher's assigned ones. Tapping a class → student roster list.

### 2.3 Parent (mobile app — read-only, child-scoped)

Parents cannot see other students. Their visibility is strictly limited to their child's class.

| Task | How |
|------|-----|
| See child's class name, section, class teacher name | Embedded in `GET /students/{child_id}` response (already works) |
| See which subjects are offered in child's class | `GET /class-sections/{cs_id}/subjects` — returns subject name + teacher name only (no student data) |
| Does NOT see class roster (other students) | Privacy: endpoint returns 403 for parent role |

### 2.4 Student (mobile app — read-only, own class)

| Task | How |
|------|-----|
| See own class info (name, section) | Embedded in student profile |
| See subject list for own class (who teaches what) | `GET /class-sections/{cs_id}/subjects` — same as parent |
| Does NOT see class roster | 403 for student role |

---

## 3. Data Model

### 3.1 Existing — Student.class_section_id

`Student` carries:
- `class_section_id` (nullable FK → `class_sections.id`) — current enrollment
- `academic_year_id` (nullable FK → `academic_years.id`) — current AY
- `student_type` (`new` / `old`) — `old` after first promotion
- `class_promoted_date` — stamped at promotion time

Enrollment = setting these fields. No new join table needed; enrollment is a property of the student record.

### 3.2 Existing — TeacherSubject

```
teacher_subjects
  id               PK
  school_id        FK → schools
  staff_id         FK → staff         # the teacher
  subject          VARCHAR(100)       # matches Subject.name in school catalog
  class_section_id FK → class_sections
  academic_year_id FK → academic_years
```

**Current gap:** No unique constraint → duplicate (same teacher, same subject, same class, same AY) possible.

### 3.3 Migration 007 — Unique constraint

```sql
-- Remove existing duplicates (keep oldest per group), then:
ALTER TABLE teacher_subjects
  ADD CONSTRAINT uq_teacher_subjects_class_subject_ay
  UNIQUE (school_id, class_section_id, subject, academic_year_id);
```

This enforces **one staff per subject per class per year**. Changing the teacher = `PUT` (replace staff_id on the existing row).

> **Why not a separate ClassSubjectOffering table?** The `TeacherSubject` model already captures class + subject + teacher. A separate offering table would add a join without new information for Phase 1. Can be introduced in Phase 2 if "unassigned subject" tracking is needed.

### 3.4 ClassSection ORM relationships (add)

```python
class ClassSection(Base):
    ...
    # Add these:
    students: Mapped[list["Student"]] = relationship(
        "Student", foreign_keys="[Student.class_section_id]",
        primaryjoin="ClassSection.id == Student.class_section_id",
        lazy="noload",
    )
    subject_assignments: Mapped[list["TeacherSubject"]] = relationship(
        "TeacherSubject", foreign_keys="[TeacherSubject.class_section_id]",
        primaryjoin="ClassSection.id == TeacherSubject.class_section_id",
        lazy="noload",
    )
    class_teacher: Mapped[Optional["Staff"]] = relationship(
        "Staff", foreign_keys="[ClassSection.class_teacher_id]",
        lazy="noload",
    )
```

---

## 4. Promotion / Migration Semantics

RFC-003 §6 resolved: **update-in-place**, not clone.

| Field | After promote / migrate |
|-------|------------------------|
| `class_section_id` | → target class in new AY |
| `academic_year_id` | → target AY |
| `student_type` | → `"old"` |
| `class_promoted_date` | → promote_date (today if omitted) |

All historical attendance, results, homework records remain linked to the same `student_id` — they are not disturbed. Querying "who was in Class 5 last year" requires filtering by the old class + AY before promotion; a full audit log is Phase 2.

**Idempotency:** if a student is already in the target class+AY, they are counted as skipped (no error, no change).

---

## 5. API Endpoints

All endpoints are under `/api/v1`. School is always inferred from the JWT.

---

### 5.1 Class Roster — Students

#### GET /class-sections/{cs_id}/students

List students enrolled in a class section.

**Auth:** admin ✓ · teacher (own classes only) ✓ · staff ✗ · student ✗ · parent ✗

*Teacher scoping:* teacher may call this only if they have at least one `TeacherSubject` row for `cs_id` OR `ClassSection.class_teacher_id == staff_id`.

**Query params:** `page` (default 1), `limit` (default 50, max 200), `status` (active/inactive), `search` (name / admission_no)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "admission_no": "20250001",
      "first_name": "Riya",
      "last_name": "Sharma",
      "gender": "female",
      "roll_number": "01",
      "photo_url": null,
      "status": "active"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 42 }
}
```

---

#### POST /class-sections/{cs_id}/students

Assign one or more students to this class section. Sets `student.class_section_id` and `student.academic_year_id` (derived from the class section's AY).

**Auth:** admin only

**Body:**
```json
{ "student_ids": ["uuid1", "uuid2"] }
```
- Max 500 IDs per request.
- Students already in this class: counted as `skipped` (no error).
- Students not found in the school: counted as `skipped`.

**Response:**
```json
{ "success": true, "data": { "assigned": 2, "skipped": 0 } }
```

---

#### DELETE /class-sections/{cs_id}/students/{student_id}

Remove a student from the class — sets `class_section_id = null`. Does **not** change `academic_year_id`.

**Auth:** admin only

**Response:** `{ "success": true, "data": { "unassigned": "student_id" } }`

---

### 5.2 Class Roster — Subject Assignments

#### GET /class-sections/{cs_id}/subjects

List all subject-staff assignments for a class section. Enriches with staff name.

**Auth:** admin ✓ · teacher (own classes — see scoping above) ✓ · student (own class only) R · parent (child's class only) R

*Student/Parent scoping:* validated server-side: student.class_section_id must equal cs_id; parent.children must include a student with that class_section_id.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ts-uuid",
      "subject": "Mathematics",
      "staff_id": "staff-uuid",
      "staff_name": "Priya Nair",
      "class_section_id": "cs-uuid",
      "academic_year_id": "ay-uuid"
    }
  ]
}
```

---

#### POST /class-sections/{cs_id}/subjects

Assign a subject with its teacher to the class.

**Auth:** admin only

**Body:**
```json
{
  "subject": "Mathematics",
  "staff_id": "uuid",
  "academic_year_id": "uuid"
}
```

**Validation:**
- `subject` must match an active `Subject.name` in the school's catalog (case-insensitive).
- `staff_id` must belong to the school.
- Duplicate (same subject + class + AY) → 409 `"Subject already assigned to this class for this academic year"`.
- `academic_year_id` defaults to the class section's own AY if omitted.

**Response:** `TeacherSubjectEnrichedOut` (includes `staff_name`)

---

#### PUT /class-sections/{cs_id}/subjects/{ts_id}

Update an existing class-subject assignment. Typically used to change the assigned teacher, or rename the subject.

**Auth:** admin only

**Body:** (at least one field required)
```json
{ "staff_id": "new-staff-uuid", "subject": "Advanced Mathematics" }
```

- If `subject` changes, uniqueness is re-validated against the new name.
- `staff_id` must belong to the school.

**Response:** `TeacherSubjectEnrichedOut`

---

#### DELETE /class-sections/{cs_id}/subjects/{ts_id}

Remove a subject-staff assignment from the class.

**Auth:** admin only

**Response:** `{ "success": true, "data": { "deleted": "ts-uuid" } }`

---

### 5.3 Student Bulk Operations (implementing RFC-003 §4.3)

#### POST /students/change-class-section

Move one or more students to a different class section **within the same academic year**.

**Auth:** admin only

**Body:**
```json
{
  "student_ids": ["uuid1", "uuid2"],
  "to_class_section_id": "uuid"
}
```

**Validation:**
- `to_class_section_id` must belong to the school.
- All students must already have the same `academic_year_id` as the target class section's AY. If any student is in a different AY → 422.
- Max 500 IDs.

**Response:**
```json
{ "success": true, "data": { "updated": 2 } }
```

---

#### POST /students/migrate

End-of-year promotion: move students from a source AY to a target class in a new AY. Implements RFC-003 §2.4 "Year Migration".

**Auth:** admin only

**Body:**
```json
{
  "student_ids": ["uuid1", "uuid2"],
  "from_academic_year_id": "ay-2024-25-uuid",
  "to_academic_year_id":   "ay-2025-26-uuid",
  "to_class_section_id":   "class-6a-uuid",
  "promote_date": "2026-05-20"
}
```

- `promote_date` defaults to today.
- `from_academic_year_id`: used only to validate students belong to the source AY. Students not in this AY are counted in `errors`.
- Sets on each student: `class_section_id`, `academic_year_id`, `student_type = "old"`, `class_promoted_date`.
- Already in target class+AY → counted as `skipped` (idempotent).
- TC-generated students → included with a warning in response (not blocked).

**Response:**
```json
{
  "success": true,
  "data": {
    "migrated": 40,
    "skipped": 2,
    "errors": [
      { "student_id": "uuid", "reason": "student_not_found" },
      { "student_id": "uuid", "reason": "not_in_source_ay" }
    ],
    "warnings": [
      { "student_id": "uuid", "warning": "tc_generated" }
    ]
  }
}
```

HTTP always 200 (partial success is allowed, consistent with RFC-003).

---

### 5.4 ClassSectionOut Enrichment

The detail endpoint (`GET /class-sections/{cs_id}`) is extended to include computed fields:

```json
{
  "id": "uuid",
  "school_id": "uuid",
  "academic_year_id": "uuid",
  "class_name": "5",
  "section": "A",
  "class_teacher_id": "uuid",
  "class_teacher_name": "Priya Nair",
  "student_count": 42,
  "subject_count": 8
}
```

- `class_teacher_name`: joined from staff table.
- `student_count` / `subject_count`: counts only, not full lists (for list endpoint too).
- Full lists are fetched via the dedicated `/students` and `/subjects` sub-endpoints.
- **List endpoint** (`GET /class-sections`) also returns `class_teacher_name` and counts — useful for the admin's class overview table.

---

## 6. Permission Matrix (additions to RFC-019 §5)

| Endpoint | admin | teacher | staff | student | parent |
|----------|:-----:|:-------:|:-----:|:-------:|:------:|
| GET /class-sections/{id}/students | ✓ | own classes | ✗ | ✗ | ✗ |
| POST /class-sections/{id}/students | ✓ | ✗ | ✗ | ✗ | ✗ |
| DELETE /class-sections/{id}/students/{sid} | ✓ | ✗ | ✗ | ✗ | ✗ |
| GET /class-sections/{id}/subjects | ✓ | own classes | ✗ | own class | child's class |
| POST /class-sections/{id}/subjects | ✓ | ✗ | ✗ | ✗ | ✗ |
| PUT /class-sections/{id}/subjects/{ts_id} | ✓ | ✗ | ✗ | ✗ | ✗ |
| DELETE /class-sections/{id}/subjects/{ts_id} | ✓ | ✗ | ✗ | ✗ | ✗ |
| POST /students/change-class-section | ✓ | ✗ | ✗ | ✗ | ✗ |
| POST /students/migrate | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## 7. Validation Rules

| Rule | Enforcement |
|------|------------|
| `student_ids` belong to caller's school | All bulk endpoints |
| Max 500 student IDs per request | All bulk endpoints, 422 if exceeded |
| Empty `student_ids` → 422 | All bulk endpoints |
| Subject name matches an active Subject in school catalog | POST /class-sections/{id}/subjects |
| Staff belongs to school | POST + PUT /class-sections/{id}/subjects |
| Duplicate subject in same class+AY → 409 | DB unique constraint + application check |
| `to_class_section_id` belongs to school | change-class-section, migrate |
| `to_academic_year_id` belongs to school | migrate |
| Students not in source AY → counted as errors (not hard fail) | migrate |
| Teacher accessing non-assigned class → 403 | GET roster + GET subjects |
| Student/parent accessing non-enrolled class → 403 | GET subjects |

---

## 8. Teacher App — "My Classes" Screen

Add to mobile app (`/app/(app)/my-classes/`):

```
My Classes screen (teacher role only)
  → GET /class-sections?school_id=... + filter by teacher's TeacherSubject entries
  → List: "Class 5 - A · 42 students · 3 subjects assigned to me"
  → Tap → Class Roster
       → Search bar + student list (name, roll, status dot)
       → Tap student → student detail (attendance, results — existing screens)
  → Subjects tab on same screen
       → List of subjects for this class I'm assigned to
```

**Data flow:**
```
1. GET /teacher-subjects?staff_id={my_entity_id}  →  get list of class_section_ids
2. GET /class-sections/{cs_id}                    →  get name + counts (per class)
3. GET /class-sections/{cs_id}/students           →  roster (on tap)
4. GET /class-sections/{cs_id}/subjects           →  subject list (subjects tab)
```

---

## 9. Parent & Student App — Subject List

In the child's profile / class info screen:

```
Class Info card (existing):
  Class 5 - A · AY 2025-26
  Class Teacher: Priya Nair    ← from enriched ClassSectionOut

  [ Subjects ] tab (new):
    Mathematics — Ms. Priya Nair
    Science     — Mr. Arjun Mehta
    English     — Ms. Kavitha Rao
    ...
```

**Data flow:**
```
1. GET /students/{child_id}  → student.class_section_id
2. GET /class-sections/{cs_id}/subjects  → subject list (server validates parent/student owns this class)
```

The class section detail endpoint (`GET /class-sections/{cs_id}`) is also accessible for the parent/student to get `class_teacher_name` — the server validates class ownership.

---

## 10. Web Dashboard — Class Sections Page

**Existing:** `/settings/class-sections` — list + create/edit dialog.

**Additions:**
- Table columns: Class, Section, AY, Class Teacher, Students, Subjects, Actions
- "Students" and "Subjects" counts come from enriched `ClassSectionOut`
- Row → "Manage" → new page `/settings/class-sections/[id]`

**New page `/settings/class-sections/[id]`:**

```
Class 5 - A  |  AY 2025-26  |  Class Teacher: Priya Nair  [Edit]

[Roster]  [Subjects]  (tabs)

Roster tab:
  Search students  [+ Add Students]  [Year Migration]  [Change Class]
  Table: Roll | Name | Gender | Admission No | Status | [Remove]

Subjects tab:
  [+ Assign Subject]
  Table: Subject | Assigned Teacher | [Edit]  [Remove]
```

**"+ Add Students" dialog:**
- Multi-select from students NOT yet in this class (same school, same AY filter default)
- Search by name / admission no
- "Assign X students" → POST /class-sections/{id}/students

**"+ Assign Subject" dialog:**
- Subject picker (from active subjects catalog)
- Staff picker (from active teaching staff)
- Validates no duplicate

**Year Migration wizard** (same as RFC-003 §2.4):
- Step 1: Source AY (auto-filled = this class's AY)
- Step 2: Target AY + Target Class Section
- Step 3: Select students from this class (checkbox list, "Select all" option)
- Step 4: Review summary
- Step 5: Confirm → POST /students/migrate

---

## 11. Migration (DB)

**007_class_roster_constraints.py**

```python
def upgrade():
    # Deduplicate before adding constraint
    op.execute("""
        DELETE FROM teacher_subjects
        WHERE id NOT IN (
            SELECT MIN(id) FROM teacher_subjects
            GROUP BY school_id, class_section_id, subject, academic_year_id
        )
    """)
    op.create_unique_constraint(
        "uq_teacher_subjects_class_subject_ay",
        "teacher_subjects",
        ["school_id", "class_section_id", "subject", "academic_year_id"],
    )

def downgrade():
    op.drop_constraint(
        "uq_teacher_subjects_class_subject_ay", "teacher_subjects", type_="unique"
    )
```

---

## 12. Endpoint Quick Reference

```
# Class Roster — Students
GET    /class-sections/{cs_id}/students
POST   /class-sections/{cs_id}/students
DELETE /class-sections/{cs_id}/students/{student_id}

# Class Roster — Subjects  
GET    /class-sections/{cs_id}/subjects
POST   /class-sections/{cs_id}/subjects
PUT    /class-sections/{cs_id}/subjects/{ts_id}
DELETE /class-sections/{cs_id}/subjects/{ts_id}

# Student Bulk Operations (completes RFC-003 §4.3)
POST   /students/change-class-section
POST   /students/migrate
```

---

## 13. Open Questions

- [ ] Should the class roster be accessible to non-teaching staff (e.g., receptionist)? Current decision: no — receptionist uses the student list with class_section_id filter instead.
- [ ] Should `DELETE /class-sections/{cs_id}/students/{sid}` cascade to unassign attendance records? Decision: no — attendance is date-scoped; only the class_section_id field on Student is updated.
- [ ] Cap on subjects per class? Decision: none in Phase 1.
- [ ] Should TC-generated students be blocked from migration? Decision: warning only, not blocked — admin decides.
- [ ] Can a student be in multiple classes simultaneously? Decision: no — `class_section_id` is a single FK. Assigning to a new class replaces the old assignment.
