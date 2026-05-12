# SKEducations SMS — RFC Index

**Base URL:** `https://bp3150.skeducations.com`  
**Version:** 1.1 Draft  
**Last Updated:** 2026-05-12

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

## Phase 2 Modules (Stub — not in these RFCs)

Attendance, Fees, Exam, Timetable, Transport, Communications, Homework, Events, Visitors, Income/Expense, Reports, Masters
