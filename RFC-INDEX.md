# SKEducations SMS — RFC Index

**Base URL:** `https://bp3150.skeducations.com`  
**Version:** 1.1 Draft  
**Last Updated:** 2026-05-12 (Communications module added; /communications/ prefix applied)

---

## RFCs

| # | Title | Status | Scope |
|---|-------|--------|-------|
| [RFC-001](rfc-001-core-setup.md) | Core Setup & Multi-Tenancy | Draft | Schools, Academic Years, Class Sections |
| [RFC-002](rfc-002-admission-pipeline.md) | Admission Pipeline | Draft | Enquiry → Registration → Admission |
| [RFC-003](rfc-003-student-management.md) | Student Management | Draft | Student CRUD, 360° View, Migration |
| [RFC-004](rfc-004-staff-management.md) | Staff Management | Draft | Staff CRUD, Teacher Subjects |
| [RFC-005](rfc-005-document-management.md) | Document Management | Draft | S3 Uploads, Pre-signed URLs |
| [RFC-006](rfc-006-dashboard.md) | Dashboard | Draft | All Dashboard Widgets |
| [RFC-007](rfc-007-student-attendance.md) | Student Attendance | Draft | Mark, view, override per period/session |
| [RFC-008](rfc-008-staff-attendance.md) | Staff Attendance | Draft | Daily marking, filtering, summaries |
| [RFC-009](rfc-009-leave-management.md) | Leave Management | Draft | Apply, approve, reject leaves (students & staff) |
| [RFC-010](rfc-010-attendance-history.md) | Attendance History | Draft | History table, monthly summary, low-attendance report |
| [RFC-011](rfc-011-homework.md) | Homework Management | Draft | Assign, view, attach images; teacher/student/admin scoping |
| [RFC-012](rfc-012-notices.md) | Notices | Draft | Create, publish, target by class or school-wide; parent/student read |
| [RFC-013](rfc-013-concerns.md) | Concern Management | Draft | Parent-submitted concerns, threaded replies, status workflow |
| [RFC-014](rfc-014-syllabus.md) | Syllabus | Draft | Per class+subject syllabus with topics; teacher/admin create, parent read |
| [RFC-015](rfc-015-newsletter.md) | Newsletter | Draft | School-wide periodic newsletter; teacher/admin create, all read |

---

## Endpoint Quick Reference

### Core Setup (RFC-001)
```
POST   /schools
GET    /schools
GET    /schools/{id}
PUT    /schools/{id}
PATCH  /schools/{id}/status

POST   /academic-years
GET    /academic-years
GET    /academic-years/{id}
PUT    /academic-years/{id}
POST   /academic-years/{id}/activate
DELETE /academic-years/{id}

POST   /class-sections
GET    /class-sections
GET    /class-sections/{id}
PUT    /class-sections/{id}
DELETE /class-sections/{id}
```

### Admission Pipeline (RFC-002)
```
POST   /enquiries
GET    /enquiries
GET    /enquiries/{id}
PUT    /enquiries/{id}
POST   /enquiries/{id}/convert
PATCH  /enquiries/{id}/reject

POST   /registrations
GET    /registrations
GET    /registrations/{id}
PUT    /registrations/{id}
POST   /registrations/{id}/accept
POST   /registrations/{id}/reject
GET    /registrations/{id}/admission-form

POST   /students/admit
```

### Student Management (RFC-003)
```
GET    /students
GET    /students/summary
GET    /students/{id}
PUT    /students/{id}
PATCH  /students/{id}/status
GET    /students/{id}/360
GET    /students/{id}/registration-form

POST   /students/migrate
POST   /students/change-class-section
```

### Staff Management (RFC-004)
```
POST   /staff
GET    /staff
GET    /staff/{id}
PUT    /staff/{id}
PATCH  /staff/{id}/status
POST   /staff/{id}/documents

GET    /staff/teacher-specializations

POST   /teacher-subjects
GET    /teacher-subjects
DELETE /teacher-subjects/{id}
```

### Documents (RFC-005)
```
POST   /students/{id}/documents
POST   /staff/{id}/documents
POST   /registrations/{id}/documents

GET    /students/{id}/documents
GET    /staff/{id}/documents
GET    /registrations/{id}/documents

GET    /documents/{id}/url
DELETE /documents/{id}
```

### Dashboard (RFC-006)
```
GET    /dashboard/header-summary
POST   /dashboard/student-attendance-summary
POST   /dashboard/teacher-attendance-summary
POST   /dashboard/student-gender-distribution
POST   /dashboard/class-attendance
POST   /dashboard/class-strength
GET    /dashboard/timetable
GET    /dashboard/birthdays

GET    /dashboard/revenue-chart
GET    /dashboard/fees-chart
GET    /dashboard/expense-chart
GET    /dashboard/admission-chart
GET    /dashboard/enquiry-chart
```

---

## Global Conventions

- **Auth:** JWT — `school_id` extracted from token. Superadmin may pass `?school_id=` override.
- **Response envelope:** `{ success: bool, data: any, error?: str, meta?: PaginationMeta }`
- **Dates:** ISO 8601 — `YYYY-MM-DD`
- **Pagination:** `?page=1&limit=20` on all list endpoints
- **academic_year_id:** defaults to active AY if omitted
- **File uploads:** `multipart/form-data`; all others `application/json`

### Student Attendance (RFC-007)
```
POST   /attendance/students/mark
GET    /attendance/students
POST   /attendance/students/bulk-update
GET    /attendance/students/marking-status
PUT    /attendance/students/{id}
GET    /attendance/students/{student_id}/summary
```

### Staff Attendance (RFC-008)
```
POST   /attendance/staff/mark
GET    /attendance/staff
GET    /attendance/staff/daily-summary
PUT    /attendance/staff/{id}
GET    /attendance/staff/{staff_id}/summary
```

### Leave Management (RFC-009)
```
POST   /leaves
GET    /leaves
GET    /leaves/{id}
POST   /leaves/{id}/approve
POST   /leaves/{id}/reject
PATCH  /leaves/{id}/cancel
GET    /leaves/upcoming
```

### Attendance History (RFC-010)
```
GET    /attendance/history/students
GET    /attendance/history/students/monthly-summary
GET    /attendance/history/students/{student_id}/daily
GET    /attendance/history/students/low-attendance
GET    /attendance/history/students/export
```

### Homework (RFC-011)
```
POST   /homework
GET    /homework
GET    /homework/{id}
PUT    /homework/{id}
PATCH  /homework/{id}/cancel
DELETE /homework/{id}
GET    /homework/stats

POST   /homework/{id}/attachments
DELETE /homework/{id}/attachments/{attachment_id}
```

### Communications (RFC-012, 013, 014, 015)
```
# Notices
POST   /communications/notices
POST   /communications/notices/{id}/publish
GET    /communications/notices
GET    /communications/notices/{id}
PUT    /communications/notices/{id}
PATCH  /communications/notices/{id}/archive
DELETE /communications/notices/{id}
POST   /communications/notices/{id}/attachments
DELETE /communications/notices/{id}/attachments/{attachment_id}

# Concerns
POST   /communications/concerns
GET    /communications/concerns
GET    /communications/concerns/{id}
POST   /communications/concerns/{id}/messages
PATCH  /communications/concerns/{id}/acknowledge
PATCH  /communications/concerns/{id}/resolve
PATCH  /communications/concerns/{id}/reopen
PATCH  /communications/concerns/{id}/reassign
PATCH  /communications/concerns/{id}/close
GET    /communications/concerns/summary

# Syllabus
POST   /communications/syllabus
POST   /communications/syllabus/{id}/publish
GET    /communications/syllabus
GET    /communications/syllabus/{id}
PUT    /communications/syllabus/{id}
PATCH  /communications/syllabus/{id}/archive
POST   /communications/syllabus/{id}/attachments
DELETE /communications/syllabus/{id}/attachments/{attachment_id}

# Newsletter
POST   /communications/newsletters
POST   /communications/newsletters/{id}/publish
GET    /communications/newsletters
GET    /communications/newsletters/{id}
PUT    /communications/newsletters/{id}
PATCH  /communications/newsletters/{id}/archive
DELETE /communications/newsletters/{id}
POST   /communications/newsletters/{id}/attachments
DELETE /communications/newsletters/{id}/attachments/{attachment_id}
```

> **FastAPI router note:** Within `/communications/concerns`, register `GET /concerns/summary` **before** `GET /concerns/{id}` — otherwise FastAPI matches `"summary"` as a concern ID. Same applies to `/notices`, `/syllabus`, and `/newsletters` if stats endpoints are added.

---

## Phase 2 Modules (Stub — not in these RFCs)

Fees, Exam, Timetable, Transport, Events, Visitors, Income/Expense, Reports, Masters
