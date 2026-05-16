# RFC-021: Web Admin Dashboard

**Status:** Active  
**Scope:** Next.js admin dashboard — stack, folder structure, page inventory, key user flows  
**Actors:** Superadmin, Admin  
**Platform:** RFC-020 client architecture applies

---

## 1. Summary

A server-side-rendered Next.js 15 dashboard that gives admins full CRUD access to every module. Designed for desktop use (1280px+ primary, tablet secondary). Auth is OTP-based (same as mobile); token stored in `localStorage`. The superadmin sees all schools; admins see only their school.

---

## 2. Stack

| Concern | Library |
|---------|---------|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Styling | TailwindCSS + shadcn/ui (Radix primitives) |
| Data fetching | TanStack Query v5 (client components) |
| Auth state | Zustand v5 |
| Token storage | `localStorage` (`sms_token`) |
| HTTP | axios 1.x (shared interceptor pattern — see RFC-020 §2.4) |
| Tables | TanStack Table v8 |
| Charts | Recharts 2.x |
| Forms | react-hook-form + zod |
| Date handling | date-fns |
| Icons | lucide-react |

All pages using real-time data are client components (`"use client"`). Static shell (nav, layout) is server components.

---

## 3. Folder Structure

```
web/
├── app/
│   ├── layout.tsx                  # root layout: font, QueryProvider, AuthGuard
│   ├── login/
│   │   └── page.tsx                # OTP login
│   ├── (dashboard)/                # auth-guarded group
│   │   ├── layout.tsx              # sidebar nav + top bar
│   │   ├── page.tsx                # /  → redirect to /dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── schools/                # superadmin only
│   │   │   ├── page.tsx            # list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # detail + edit
│   │   ├── admissions/
│   │   │   ├── enquiries/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── registrations/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── students/
│   │   │   ├── page.tsx            # list + search + filter
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # 360 view
│   │   │       └── edit/page.tsx
│   │   ├── staff/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   ├── attendance/
│   │   │   ├── students/
│   │   │   │   ├── page.tsx        # mark / view
│   │   │   │   └── history/page.tsx
│   │   │   └── staff/
│   │   │       └── page.tsx
│   │   ├── homework/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── communications/
│   │   │   ├── notices/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── syllabus/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── newsletters/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── concerns/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── timetable/
│   │   │   └── page.tsx            # period config + weekly grid per class
│   │   ├── exams/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # exam detail + schedule
│   │   │       └── schedule/page.tsx
│   │   ├── results/
│   │   │   ├── page.tsx            # mark entry table per class+subject
│   │   │   └── marksheet/page.tsx
│   │   ├── leaves/
│   │   │   └── page.tsx            # leave list + approve/reject
│   │   └── settings/
│   │       ├── academic-years/page.tsx
│   │       ├── class-sections/page.tsx
│   │       ├── subjects/page.tsx
│   │       └── users/page.tsx      # school user management
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── AuthGuard.tsx
│   ├── ui/                         # shadcn generated + custom wrappers
│   ├── tables/
│   │   ├── StudentTable.tsx
│   │   ├── StaffTable.tsx
│   │   ├── AttendanceGrid.tsx      # period × student matrix
│   │   └── ResultsEntryTable.tsx   # inline-editable marks grid
│   ├── forms/
│   │   ├── StudentForm.tsx
│   │   ├── StaffForm.tsx
│   │   ├── HomeworkForm.tsx
│   │   └── ExamScheduleForm.tsx
│   └── charts/
│       ├── AttendanceBarChart.tsx
│       └── AdmissionTrendChart.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts               # axios instance + interceptors
│   │   ├── auth.ts
│   │   ├── students.ts
│   │   ├── staff.ts
│   │   ├── admissions.ts
│   │   ├── attendance.ts
│   │   ├── homework.ts
│   │   ├── communications.ts
│   │   ├── timetable.ts
│   │   ├── exams.ts
│   │   ├── results.ts
│   │   └── leaves.ts
│   ├── storage.ts                  # localStorage wrappers
│   └── queryClient.ts
├── store/
│   └── auth.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   └── useActiveAY.ts
├── types/                          # mirrors server schemas
│   ├── api.ts
│   ├── auth.ts
│   ├── student.ts
│   ├── staff.ts
│   ├── attendance.ts
│   ├── homework.ts
│   ├── communications.ts
│   ├── timetable.ts
│   ├── exam.ts
│   └── result.ts
└── constants/
    ├── nav.ts                      # sidebar nav items per role
    └── roles.ts
```

---

## 4. User Flows

### 4.1 OTP Login

```
/login
  → Phone input → "Send OTP"
  → POST /auth/otp/request { phone }
      → 409 multi-school: inline school picker dropdown appears
      → 200: OTP input appears, countdown timer starts
  → 6-digit OTP input → "Verify"
  → POST /auth/otp/verify { phone, school_id, otp }
      → 200: save token to localStorage, populate Zustand store
           → redirect to /dashboard
      → 422: inline error under OTP field
      → 403 deactivated: full-page error with support contact
```

---

### 4.2 Dashboard

```
/dashboard
  → GET /dashboard/header-summary         → counts: students, staff, AY label
  → POST /dashboard/class-attendance      → today's attendance bar chart
  → POST /dashboard/teacher-attendance-summary → staff present/absent today
  → GET /dashboard/birthdays              → today + next 7 days list
  → GET /communications/concerns          → unresolved count badge
```

Superadmin dashboard replaces school widgets with a school list summary (total schools, active/inactive counts).

---

### 4.3 Admission Pipeline

```
/admissions/enquiries
  → Table: name, phone, class_interested, date, status chip
  → Filters: status (new/contacted/visited/rejected), class, date range
  → Row click → /admissions/enquiries/[id]
       → Full enquiry detail + edit form
       → "Convert to Registration" button (if status=visited)
            → POST /enquiries/{id}/convert → redirects to /admissions/registrations/[new_id]

/admissions/registrations
  → Table: student name, class, submitted date, status chip
  → Row click → /admissions/registrations/[id]
       → Registration detail + document upload section
       → "Accept" button → modal: "Confirm admission? This creates the student record."
            → POST /registrations/{id}/accept → success toast → links to /students/[new_student_id]
       → "Reject" button → modal with reason textarea
            → POST /registrations/{id}/reject
       → "Download Admission Form" → GET /registrations/{id}/admission-form (PDF download)
```

---

### 4.4 Student Attendance Marking

```
/attendance/students
  → Class + Section selector (dropdown, defaults to first class)
  → Date picker (defaults to today)
  → Mode derived from school.attendance_mode:
      period mode: column per period, row per student
        → POST /attendance/students/mark { class_section_id, date, period, records[] }
      session mode: single present/absent toggle per student
        → POST /attendance/students/mark { class_section_id, date, records[] }
  → "Bulk Mark All Present" → fills all cells → user can override individually
  → Submit → POST /attendance/students/mark
  → Already-marked days: cells show saved values, edit inline → PUT /attendance/students/{id}
  → "Marking status" indicator: shows which periods are submitted vs pending
```

---

### 4.5 Results Entry

```
/results
  → Exam selector → Class selector → Subject selector (teacher-filtered for teacher role)
  → Table: one row per student, columns: student name, marks_obtained, max_marks, grade (computed)
  → Inline editable cells (click to edit, Tab to next)
  → Validation: marks_obtained ≤ max_marks; non-negative
  → "Save Draft" → POST /results/bulk { records[] }
  → "Publish" → POST /results/publish { exam_id, class_section_id, subject_id }
       → Confirmation modal: "Published results are visible to students and parents."
  → "Unpublish" → POST /results/unpublish (teacher-only for own subject)
  → "Download Marksheet" → GET /results/marksheet?... → PDF download via WeasyPrint
```

---

### 4.6 Timetable Setup

```
/timetable
  → Left panel: Period Config
       → GET /timetable/period-config
       → Edit: periods per day, period names, start/end times
       → PUT /timetable/period-config
  → Right panel: Weekly Grid
       → Class + Section selector
       → 6-column grid (Mon–Sat) × N-period rows
       → Each cell: subject + teacher dropdown
       → "Save" → POST /timetable / PUT /timetable/{id}
       → "Publish" → POST /timetable/{id}/publish (makes visible to students/parents)
```

---

### 4.7 Settings

**Academic Years** (`/settings/academic-years`)
- List with active badge
- "+ New AY" → form modal
- "Set Active" → confirmation modal (warns about deactivating current)

**Class Sections** (`/settings/class-sections`)
- Grid: rows = class names, columns = sections
- Click cell → edit class teacher, rename
- "+ Add" → form modal
- Delete → blocked if students enrolled

**Subjects** (`/settings/subjects`)
- Simple list: subject name + edit/delete
- "+ Add Subject" → inline row

**Users** (`/settings/users`)
- Table of all SchoolUsers: name (via entity), phone, role, status
- Toggle active/inactive → `PATCH /users/{id}/status`
- "Force Logout" → `DELETE /users/{id}/sessions`

---

## 5. Sidebar Navigation

```
Dashboard
──────────────
Students
  ↳ Admissions (Enquiries, Registrations)
Staff
──────────────
Attendance
  ↳ Students
  ↳ Staff
  ↳ History
Homework
Leaves
──────────────
Communications
  ↳ Notices
  ↳ Syllabus
  ↳ Newsletters
  ↳ Concerns
──────────────
Timetable
Exams
Results
──────────────
Settings
  ↳ Academic Years
  ↳ Class Sections
  ↳ Subjects
  ↳ Users
```

Superadmin sees a "Schools" item above Dashboard.  
Role enforcement: sidebar items are filtered client-side by role, and all server calls enforce role server-side.

---

## 6. Auth Guard

`components/layout/AuthGuard.tsx` wraps the `(dashboard)` layout:

```typescript
// On mount: read token from localStorage, call GET /auth/me
// 200: hydrate store, render children
// 401 or no token: router.replace('/login')
// 401 from any subsequent API call (axios interceptor): same redirect
```

---

## 7. Key UI Patterns

- **Data tables:** TanStack Table with server-side pagination (`?page=&limit=20`). Filters send query params to API, not client-side filtering.
- **Forms:** react-hook-form + zod schema validation. Errors shown inline below each field. Submit button disabled while `isSubmitting`.
- **Modals:** shadcn `Dialog` for confirmations and short create forms. Full pages for complex forms (admit student, add staff).
- **Toasts:** shadcn `Sonner` toast for success/error after mutations.
- **Loading states:** shadcn `Skeleton` loaders on initial fetch. Buttons show spinner on mutation.
- **Empty states:** illustrated placeholder + CTA on empty tables.
- **Pagination:** page number buttons + total count label below tables.

---

## 8. Bootstrap

```bash
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
cd web
npx shadcn@latest init

# Core deps
npm install axios zustand @tanstack/react-query @tanstack/react-table \
  react-hook-form zod recharts lucide-react date-fns

# shadcn components (add as needed)
npx shadcn@latest add button input label dialog table badge toast card select
```

```env
# web/.env.local
NEXT_PUBLIC_API_URL=https://bp3150.skeducations.com
```

---

## 9. Open Questions

- [ ] Should PDF downloads (marksheet, TC, admission form) open in a new tab or trigger direct download? Recommendation: new tab for preview + browser download button.
- [ ] Teacher role in web dashboard: teachers can log in on web to enter results and mark attendance — is the full sidebar shown or a minimal teacher view? Recommendation: minimal sidebar (Attendance, Homework, Timetable, Results, Communications only).
- [ ] Superadmin dashboard: does it need per-school drill-down (click school → see that school's dashboard)? Decision needed before building.
