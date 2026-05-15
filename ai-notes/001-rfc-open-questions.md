# RFC Open Questions — Grouped & Analysed

**Date:** 2026-05-15  
**Source:** RFC-001 through RFC-019  
**Status:** All groups resolved 2026-05-15  
**Note:** Questions tagged `[CONFLICT]` indicate a decision that will require a server-side change.

---

## Decisions Summary

| Group | Decision |
|-------|----------|
| A — Subject field | **Subject master list** per school, FK everywhere. Requires migration. |
| B — Notifications | **All Phase 2.** No push/SMS in Phase 1 (OTP infra for login only). |
| C — Holiday calendar | **Raw calendar days.** No HolidayCalendar. Document as known limitation. |
| D — Section capacity | **No capacity field.** Schools manage manually. |
| E — Auth design | **Implement RFC-019 fully.** Replace JWT with opaque sessions + OTP via Fast2SMS. |
| F — Year-end migration | Old record stays active (historical). 360° defaults to active AY, optional AY selector. |
| G — Teacher notices | **class_teacher_id grants notice access** (additive to TeacherSubject mapping). |
| H — PDF generation | **WeasyPrint** (HTML → PDF). |
| I — Attendance mode | **Per school** — add `attendance_mode` to `School` model. |
| J — Un-publish results | **Allow** — add `POST /results/unpublish` (teacher-only). |
| K — Documents | Documents are permanent across AYs. Max 10 per entity. TTL 1hr. No virus scan in Phase 1. |
| L — Dashboard/SMS balance | Internal ledger. Financial charts return empty `[]`. Saturday = school flag. Birthday = 7 days ahead. Principal = Admin scope in Phase 1. |
| M — Admin concerns | **Admin can submit on behalf of parent.** |
| N — Superadmin auth | **Static API key in env.** No OTP for superadmin. DLT template for prod; Quick SMS for dev. |

---

## Group A: Subject Field — Free Text vs Master List
**Affects:** RFC-011 (Q6), RFC-014 (Q1), RFC-016 (Q1), RFC-017, RFC-018

All three modules — Homework, Syllabus, and Timetable — store `subject` as a free-text string. All three independently ask whether this should come from a subject master list instead.

**Why it matters:**  
- Free text allows "Maths" and "Math" to coexist as different subjects — breaking per-subject card views in the parent app and cross-module reports.
- The per-class-subject uniqueness constraint on Syllabus (`UNIQUE(school_id, class_section_id, subject, academic_year_id)`) is undermined by case/spelling variations.
- Exam schedules and results both key off `subject` as a string — mismatches silently create duplicate entries.

**`[CONFLICT]`** The server currently stores `subject` as `VARCHAR` across all three tables. Introducing a subject master would require a schema migration and FK references in homework, timetable, exam_schedule_entries, and results tables.

**Options:**
1. **Keep free text** — cheapest; tolerate inconsistency; normalise in reporting layer only.
2. **Subject master per school** — one table `(school_id, name)`, FK everywhere. Best long-term but requires migration.
3. **Subject master per class section** — more granular but probably over-engineered.

---

## Group B: Phase 1 vs Phase 2 Feature Scope
**Affects:** RFC-002 (Q4), RFC-003 (Q5), RFC-004 (Q4), RFC-009 (Q1, Q5), RFC-011 (Q2, Q3, Q4), RFC-012 (Q3), RFC-013 (Q3, Q6), RFC-015 (Q4), RFC-016 (Q5), RFC-017 (Q2, Q6), RFC-018 (Q1, Q6)

The following features are explicitly marked tentative or "Phase 2 likely." Each needs a confirm/deny:

| Feature | RFC | My recommendation |
|---------|-----|-------------------|
| Parent self-registration portal | RFC-002 Q4 | Phase 2 — staff-driven admission covers Phase 1 |
| History/audit log tab on student profile | RFC-003 Q5 | Phase 2 — useful but not blocking |
| Staff portal (timetable/homework view) | RFC-004 Q4 | Phase 2 — teacher portal is secondary to admin ops |
| Leave balance quota tracking | RFC-009 Q1 | Phase 2 — needs quota config per staff category |
| Leave carry-forward | RFC-009 Q5 | Phase 2 |
| Homework submission by students | RFC-011 Q2 | Phase 2 confirmed |
| Homework "seen" acknowledgement | RFC-011 Q3 | Phase 2 |
| Push/SMS on homework assigned | RFC-011 Q4 | Phase 2 — notification infra not built yet |
| Push/SMS on notice published | RFC-012 Q3 | Phase 2 |
| Notification to teacher on new concern | RFC-013 Q3 | Phase 2 |
| File attachments on concern messages | RFC-013 Q6 | Phase 2 |
| SMS/push on newsletter published | RFC-015 Q4 | Phase 2 |
| Substitute teacher in timetable | RFC-016 Q5 | Phase 2 |
| Date-confirmed notification for exams | RFC-017 Q2 | Phase 2 |
| Exam venue/room per schedule entry | RFC-017 Q6 | Phase 2 |
| Auto-compute grade from marks | RFC-018 Q1 | Phase 2 — teacher enters grade manually for now |
| Co-scholastic/activities marks | RFC-018 Q6 | Phase 2 |

---

## Group C: Holiday Calendar / Working Days
**Affects:** RFC-009 (Q2), RFC-010 (Q1)

Both leave day-count and attendance percentage calculations reference a `HolidayCalendar` from a "Masters" module that **does not exist** in the current RFC set or server.

**`[CONFLICT]`** The Leave model stores `days: int` computed on creation. Currently, the server would compute `(to_date - from_date).days + 1` — raw calendar days, no weekends excluded. RFC-010's `working_days` in monthly summaries has the same problem.

**Options:**
1. **No holiday calendar in Phase 1** — raw calendar days everywhere, document it as a known limitation. Simple.
2. **Basic weekday exclusion only** (Mon–Fri) — server skips Sat/Sun in day counts. No school-specific holidays.
3. **Full HolidayCalendar master** — a new table with school-specific holidays. Significant scope.

**Note:** RFC-007 Q1 (attendance mode per school vs per class) and RFC-008 Q4 (cutoff time for marking) are also related — the school likely needs a `settings` table or extended `School` model for these configs.

---

## Group D: Class Section Capacity
**Affects:** RFC-002 (Q2), RFC-003 (Q1)

Both RFCs ask whether there is a maximum student capacity per class section. RFC-002 mentions a "warning shown" when admitting to a full section; RFC-003 asks the same.

**`[CONFLICT]`** The `ClassSection` model has no `capacity` field. If capacity is added, admission and migration endpoints must check it.

**Options:**
1. **No capacity** — no limit enforced; school manages manually.
2. **Capacity field on ClassSection, soft warning only** — server allows over-capacity with a warning flag in the response.
3. **Capacity field with hard block** — 422 if admission would exceed capacity.

---

## Group E: Authentication Design (Major)
**Affects:** RFC-019 (all)

**`[CONFLICT — MAJOR]`** The server currently implements JWT-based auth (via `python-jose`, 24-hour tokens, `HS256`). RFC-019 specifies a completely different design:

| Aspect | Server (current) | RFC-019 spec |
|--------|-----------------|--------------|
| Auth mechanism | JWT | Opaque session token (sha256 stored in DB) |
| Token lifetime | 24 hours | 37 days (configurable via `SESSION_TTL_DAYS`) |
| Login flow | Not implemented (no auth router) | SMS OTP via Fast2SMS |
| Session renewal | No | Sliding window (last 7 days of TTL) |
| Multi-device | N/A | Supported (multiple sessions per user) |
| OTP model | None | `OtpRequest` table with hashed OTP, TTL, attempt count |
| User model | None | `SchoolUser` table linking phone → role → entity |
| Rate limiting | None | 3 OTP requests/15min, 5 failed verifies/OTP |

**Missing from server entirely:**
- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/logout`
- `GET /auth/me`
- `SchoolUser` model/table
- `Session` model/table
- `OtpRequest` model/table
- Fast2SMS integration
- `POST /users` and `/users` management endpoints

**Also:** No role enforcement exists in any router. Any authenticated user (with a valid JWT) can call any endpoint. The permission matrix from RFC-019 §5 is not implemented anywhere.

**Decision needed:**
1. **Rewrite auth to OTP** — implement RFC-019 fully; replace JWT with opaque tokens.
2. **Keep JWT for dev/internal use, implement OTP as the public-facing login** — hybrid approach; JWT for machine-to-machine, OTP for user-facing apps.
3. **Implement OTP layer on top** — JWT stays, but add an OTP-to-JWT exchange flow.

---

## Group F: Student Year-End Operations
**Affects:** RFC-003 (Q2, Q3)

- **Migration semantics**: When a student is migrated to a new AY, should the old-AY student record be marked `inactive`, or does it just remain in the DB as-is and the new AY creates a new record? The current server `POST /students/migrate` clones the record into the new AY, but the old record's status behaviour is unspecified.
- **360° view AY scope**: Should the 360° profile always show the current (active) AY, or should the user be able to pick a historical AY?

**My recommendation:** Old record stays active (not auto-deactivated) — it's historical data. 360° defaults to active AY with an optional AY selector.

---

## Group G: Access Control Ambiguities
**Affects:** RFC-012 (Q1), RFC-013 (Q2), RFC-016 (Q6)

Three edge cases in teacher access that are inconsistent across RFCs:

1. **RFC-012 Q1 — Notice targeting**: A teacher who is `class_teacher_id` for a section but has no `TeacherSubject` mapping for it — can they send notices to that class? Currently blocked (only TeacherSubject grants access). The class teacher role arguably should also grant notice access to their own class.

2. **RFC-013 Q2 — Concerns**: Should teachers see concerns directed to "admin" that involve their class students? Currently no — admin-directed concerns are invisible to teachers. This seems limiting for classroom teachers.

3. **RFC-016 Q6 — Timetable**: Should non-class-teacher teachers (those with a `TeacherSubject` mapping) be able to view the full published timetable for their assigned class? The RFC says yes (confirmed in access matrix), but Q6 asks to confirm.

**My recommendation:**
- RFC-012: Allow class_teacher_id to send notices to own class (additive to TeacherSubject check).
- RFC-013: Keep admin concerns private to admin; teachers handle what's directed at them.
- RFC-016: Confirm yes — published timetable is read-only, teachers with assignments should see it.

---

## Group H: PDF Templates & Branding
**Affects:** RFC-003 (Q4), RFC-018 (Q7, Q8)

- **TC PDF** (RFC-003 Q4): Can the Transfer Certificate template be customised per school? Server has no PDF generation infrastructure yet.
- **Marksheet PDF** (RFC-018 Q7): School branding (logo, header, principal signature) on the marksheet PDF. RFC-018 §6 describes an S3-cached generated PDF — no PDF library chosen yet.
- **Student marksheet access** (RFC-018 Q8): RFC-018 access matrix says students *can* generate their own marksheet (`✓ own`), but Q8 asks to confirm parent-only vs student-also.

**`[CONFLICT]`** No PDF generation library or S3 infrastructure exists in the server. Both TC and marksheet require picking a library (e.g. `WeasyPrint`, `reportlab`, `pdfkit`) and a PDF generation service pattern.

---

## Group I: Attendance & Leave Policy Configuration
**Affects:** RFC-007 (Q1, Q2, Q3, Q5), RFC-008 (Q1, Q2, Q3, Q4), RFC-009 (Q3, Q4)

These are **school-level configuration** questions — they define how the school operates:

| Question | RFC | Options |
|----------|-----|---------|
| Attendance mode (period vs session) | RFC-007 Q1 | Per school (simpler) or per class section (flexible) |
| Max periods per day | RFC-007 Q2 | School config (e.g. 8 periods) |
| Past-date attendance cutoff | RFC-007 Q3 | Same day only / within N days / no cutoff |
| "Late" threshold | RFC-007 Q5 | Manual selection (teacher picks Late) vs time-based (configurable cutoff time) |
| Biometric import for staff attendance | RFC-008 Q1 | Manual only for Phase 1; biometric API Phase 2 |
| Half-day = 0.5 or 1 in % calculation | RFC-008 Q2 | Decision needed; suggest 0.5 |
| Who marks staff attendance | RFC-008 Q3 | Admin/HR only; department head marking is Phase 2 |
| Staff attendance cutoff time | RFC-008 Q4 | Configurable or none for Phase 1 |
| Parent cancelling student leave post-approval | RFC-009 Q3 | Suggest only admin can cancel approved leaves |
| Overlapping leave applications | RFC-009 Q4 | Block (simpler) or warn-and-allow |

**`[CONFLICT]`** The `School` model has no config fields for any of the above. An `attendance_mode` field at minimum is needed to drive the `period_no` vs `session` validation in attendance marking. Suggest adding a `School.attendance_mode` column with a default of `"period"`.

---

## Group J: Exam & Results Specifics
**Affects:** RFC-017 (Q3, Q4, Q5), RFC-018 (Q2, Q3, Q4, Q5)

| Question | RFC | My recommendation |
|----------|-----|-------------------|
| Passing marks default | RFC-017 Q3 | Add a school-level `default_passing_marks_percentage` (e.g. 35%); fallback if not set |
| Same display_order for different exam types | RFC-017 Q4 | Enforce unique `display_order` per AY globally — avoid ambiguity on report cards |
| Revert `completed` exam to `scheduled` | RFC-017 Q5 | Allow it (admin-only) — results entry mistakes happen |
| Marksheet absent/exempt denominator | RFC-018 Q2 | Exclude from denominator (AB/EX subjects don't count as 0) |
| Re-acknowledgement allowed | RFC-018 Q3 | Allow re-acknowledgement (updates `acknowledged_at`) — less friction |
| Teacher un-publish results | RFC-018 Q4 | Allow it (teacher-only, for data entry correction); add `POST /results/unpublish` |
| Pass/fail manual override | RFC-018 Q5 | Phase 2 — auto pass/fail based on passing_marks is enough for Phase 1 |

---

## Group K: Documents (RFC-005)
**Affects:** RFC-005 (Q1–Q5)

| Question | Decision needed |
|----------|----------------|
| Max file size (5 MB) | Confirm with school — aadhar PDFs can be 3–4 MB so 5 MB should be fine |
| Pre-signed URL TTL | Keep 1 hour; no need to shorten per doc type in Phase 1 |
| Document count limit per entity | 10 docs per entity seems reasonable; adds a guard against runaway uploads |
| Virus scanning | Phase 2 — S3 event trigger approach; not Phase 1 |
| Documents tied to AY? | **Decision needed** |

**`[CONFLICT]`** The `Document` model has no `academic_year_id`. If documents should be AY-scoped (e.g. student documents reset each year), a migration is needed. My recommendation: documents are **permanent across AYs** (photos, aadhar, TC are lifelong), so no AY linkage needed.

---

## Group L: Dashboard & Financials
**Affects:** RFC-006 (Q1, Q2, Q3, Q4, Q5)

| Question | My recommendation |
|----------|-------------------|
| SMS Balance source | Internal ledger (a `sms_credits` field on School or a separate balance table); live Fast2SMS query in Phase 2 |
| Financial charts before Phase 2 | Return empty datasets with `data: []` — not 404; avoids frontend errors |
| Timetable widget Saturday | Should be a flag — `school.uses_saturday: bool` defaults to `false` |
| Birthday widget upcoming days | Add `days_ahead` param, default 7 (show today + next 7 days) |
| Principal role scope | Same as Admin for Phase 1 — separate scoping is Phase 2 complexity |

---

## Group M: Concerns & Communication Edge Cases
**Affects:** RFC-013 (Q1, Q4, Q5), RFC-012 (Q4, Q5, Q6), RFC-015 (Q1, Q2, Q3)

| Question | My recommendation |
|----------|-------------------|
| Admin submit concern on behalf of parent | Allow it — verbal complaints need to be logged |
| Max reopens for concern | 1 is fine for Phase 1; make it configurable (Phase 2) |
| Complaints escalation/SLA | Phase 2 — out of scope now |
| Notice target change after publishing | Block it (create a new notice) — simpler, less error-prone |
| Notice expiry/auto-archive | No auto-archive in Phase 1 — admin-managed |
| Teacher newsletters | Allow teachers to create newsletters — confirmed by user |
| Newsletter issue label | Free text for now; structured Vol/Issue in Phase 2 |
| Newsletter archive on parent app | Show all-time published newsletters; archived ones hidden |

---

## Group N: Core Setup & Auth Provisioning
**Affects:** RFC-001 (Q1, Q2, Q3), RFC-019 (Q1, Q2, Q3, Q4)

| Question | My recommendation |
|----------|-------------------|
| Branch schools — shared or independent | Fully independent tenants (current model). Shared config is a much harder problem. |
| Who creates schools (superadmin provisioning) | Hardcoded superadmin via env seed for Phase 1 |
| Class name format — free text or predefined | Free text — schools vary too much (Nursery, KG, Grade 1, Class I, etc.) |
| Parents with multiple children | Unified child-selector in the app; one session can see all linked children |
| Staff transferring between schools | Multiple `SchoolUser` records for the same phone (one per school) — already supported by the multi-school login flow |
| Superadmin OTP vs API key | Static API key in env for superadmin — OTP for everyone else |
| DLT template for dev/staging | Use Fast2SMS Quick SMS (non-DLT) for dev; switch to DLT template for prod |

---

## Server Implementation Conflicts — Summary

| # | Conflict | RFC | Severity | Schema change? |
|---|----------|-----|----------|----------------|
| 1 | JWT auth instead of OTP sessions; no auth router | RFC-019 | **Critical** | Yes — new tables needed |
| 2 | No role enforcement in any router | RFC-019 | **Critical** | No (code only) |
| 3 | No `attendance_mode` on `School` model | RFC-007 | High | Yes |
| 4 | No `source` / `leave_id` on `StudentAttendanceRecord` | RFC-009 | High | Yes |
| 5 | No `SchoolUser`, `Session`, `OtpRequest` models | RFC-019 | **Critical** | Yes |
| 6 | `PATCH /schools/{id}/status` toggles instead of accepting body | RFC-001 | Medium | No (code only) |
| 7 | No HolidayCalendar for working-day calculations | RFC-009, RFC-010 | Medium | Yes (if implemented) |
| 8 | No `capacity` field on `ClassSection` | RFC-002, RFC-003 | Low | Yes (if implemented) |
| 9 | `Document` model has no `academic_year_id` | RFC-005 | Low | N/A — recommend not adding |
| 10 | No school-level config for periods, cutoff times, passing marks | RFC-007, RFC-008, RFC-017 | Medium | Yes |
| 11 | No PDF generation infrastructure | RFC-003, RFC-018 | Medium | No (new service) |
| 12 | No `school_id` check on school CRUD (superadmin-only) | RFC-001, RFC-019 | Medium | No (code only) |
