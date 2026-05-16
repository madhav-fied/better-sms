# RFC-022: Mobile App — Expo React Native (Android)

**Status:** Active  
**Scope:** Expo Android app — structure, navigation, actor-scoped screens, auth wiring  
**Actors:** Teacher, Staff, Student, Parent (Admin: read-only mobile access)  
**Platform:** RFC-020 client architecture applies

---

## 1. Summary

The Android app serves actors in the field — teachers marking attendance, parents checking results, students viewing homework. It is not a mirror of the web dashboard. Complex admin operations (bulk data entry, configuration, reports) are web-only. The app uses Expo SDK 52 managed workflow with expo-router for file-based routing. One binary serves all roles; tab bars and screens are gated by the role returned at login.

---

## 2. Stack

| Concern | Library |
|---------|---------|
| Runtime | Expo SDK 52 (managed workflow) |
| Framework | React Native 0.76 |
| Language | TypeScript 5.x (strict) |
| Routing | expo-router v4 (file-based) |
| Data fetching | TanStack Query v5 |
| Auth state | Zustand v5 |
| Token storage | expo-secure-store |
| HTTP | axios 1.x (interceptors — see RFC-020 §2.4) |
| Styling | NativeWind v4 (Tailwind CSS for RN) |
| Forms | react-hook-form + zod |
| Icons | @expo/vector-icons (Ionicons subset) |
| Dates | date-fns |
| Build | EAS Build (Android APK / AAB) |

---

## 3. Folder Structure

```
app/
├── app/
│   ├── (auth)/
│   │   └── login.tsx              # OTP login
│   └── (app)/
│       ├── _layout.tsx            # auth guard + role-based bottom tab navigator
│       ├── dashboard/
│       │   └── index.tsx          # role-aware widget layout
│       ├── attendance/
│       │   ├── index.tsx          # mark (teacher/admin) or view own (student/parent)
│       │   └── history.tsx        # monthly summary
│       ├── homework/
│       │   ├── index.tsx
│       │   └── [id].tsx
│       ├── notices/
│       │   ├── index.tsx
│       │   └── [id].tsx
│       ├── concerns/
│       │   ├── index.tsx          # parent: submit + view; teacher/admin: manage
│       │   └── [id].tsx           # thread view + reply
│       ├── timetable/
│       │   └── index.tsx          # own class (student/parent) or assigned (teacher)
│       ├── exams/
│       │   ├── index.tsx
│       │   └── [id].tsx
│       ├── results/
│       │   ├── index.tsx          # teacher: entry; student/parent: view
│       │   └── marksheet.tsx
│       ├── leaves/
│       │   ├── index.tsx          # apply + view own; admin/teacher: approve
│       │   └── [id].tsx
│       └── settings/
│           └── index.tsx          # profile info + logout
├── components/
│   ├── ui/                        # Button, Card, Badge, Input, Spinner, EmptyState, Toast
│   ├── forms/                     # OtpInput, PhoneInput, DatePicker
│   └── shared/
│       ├── AttendanceDot.tsx
│       ├── RoleBadge.tsx
│       ├── ChildSelector.tsx      # parent multi-child switcher
│       └── HomeworkCard.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── attendance.ts
│   │   ├── homework.ts
│   │   ├── notices.ts
│   │   ├── concerns.ts
│   │   ├── timetable.ts
│   │   ├── exams.ts
│   │   ├── results.ts
│   │   └── leaves.ts
│   ├── storage.ts                 # expo-secure-store wrappers
│   └── queryClient.ts
├── store/
│   ├── auth.ts                    # token, role, schoolId, userId, entityId
│   └── parentChild.ts            # selected child_id for parent role
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   └── useActiveAY.ts
├── types/                         # mirrors server schemas
│   ├── api.ts
│   ├── auth.ts
│   ├── attendance.ts
│   ├── homework.ts
│   ├── notice.ts
│   ├── concern.ts
│   ├── timetable.ts
│   ├── exam.ts
│   └── result.ts
└── constants/
    ├── roles.ts
    └── colors.ts
```

---

## 4. Auth Flow

```
App launch
  → Hydrate auth store from expo-secure-store
  → If token present → GET /auth/me
      → 200: restore session → render (app) layout
      → 401: clear token → login screen
  → No token → login screen

Login screen
  → Phone input → "Send OTP"
  → POST /auth/otp/request { phone }
      → 409 multi-school: bottom sheet school picker
      → 200: OTP field appears, 10-min countdown
      → 429: disabled button + countdown timer
  → 6-digit OTP (auto-advances on 6th digit) → "Verify"
  → POST /auth/otp/verify { phone, school_id, otp }
      → 200: save token to secure-store, push to (app)
      → 422: inline error + attempts-remaining count
      → 403: full-screen deactivated message

Interceptor on 401 from any request:
  → clearSession() (wipes store + secure-store + queryClient cache)
  → router.replace('/(auth)/login')
```

**UX details:**
- "Resend OTP" button appears after 30 s; disabled during rate-limit cooldown
- Back press on OTP entry → returns to phone input (clears OTP state, not phone)

---

## 5. Role-Based Bottom Tab Navigator

Tabs are defined as a constant array filtered by role at render time. Only accessible tabs are mounted.

| Tab | admin | teacher | staff | student | parent |
|-----|:-----:|:-------:|:-----:|:-------:|:------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Attendance | ✓ (view) | ✓ (mark) | ✓ (own) | ✓ (own) | ✓ (child) |
| Homework | - | ✓ | - | ✓ | ✓ (child) |
| Notices | ✓ | ✓ | ✓ | ✓ | ✓ |
| Concerns | ✓ (R) | ✓ | - | - | ✓ |
| Timetable | - | ✓ | - | ✓ | ✓ (child) |
| Exams | - | ✓ | - | ✓ | ✓ (child) |
| Results | - | ✓ (enter) | - | ✓ (view) | ✓ (child) |
| Leaves | ✓ (approve) | ✓ | ✓ | ✓ | - |
| Settings | ✓ | ✓ | ✓ | ✓ | ✓ |

Max 5 tabs visible at once. If a role has more than 5, overflow items go into a "More" tab (hamburger drawer).

---

## 6. Dashboard — Role-Aware Widgets

Same route (`/dashboard`), different component tree per role.

### Admin (mobile — read-only summary)
- Header: school name, AY label
- Today's student attendance % (single number, not per-class chart)
- Staff present / absent count
- Upcoming birthdays (today)
- Unresolved concerns count with link

### Teacher
- Own timetable for today (period list)
- Attendance marking status (which periods done / pending)
- Homework due today or overdue (own classes)
- Upcoming exams for assigned classes (next 7 days)

### Staff (non-teaching)
- Today's attendance status (present / absent / on-leave)
- Leave balance (available days)
- Recent notices (last 3)

### Student
- Attendance % this month
- Today's homework (due today list)
- Upcoming exams (next 7 days)
- Latest result (most recent published)
- Today's timetable

### Parent
- Child selector (top bar chip — see §7)
- Selected child's attendance % this month
- Pending homework (child's class)
- Upcoming exams (child's class)
- Latest result
- Unread concerns (submitted by this parent)

---

## 7. Parent Child Selector

Parents linked to multiple students (siblings) need a persistent child switcher.

```
store/parentChild.ts
  selectedChildId: string | null
  setSelectedChild(id: string): void

ChildSelector.tsx  — rendered in dashboard header and as a sheet on other screens
  → GET /students?parent_id={userId}   (all children)
  → Renders as a horizontal chip row (≤ 4 children) or dropdown (5+)
  → Selection persists in Zustand; all parent queries use selectedChildId
```

On first login as parent, `selectedChildId` defaults to the first child returned by the API.

---

## 8. Key Screen Flows

### 8.1 Teacher Marks Attendance

```
/attendance
  → Class selector (teacher's assigned classes from /teacher-subjects)
  → Date picker (defaults to today)
  → Mode from school.attendance_mode:
      period: horizontal period tabs → student list with present/absent toggle per period
      session: student list with single present/absent toggle
  → "Bulk mark all present" → toggle all → individual overrides allowed
  → "Submit" → POST /attendance/students/mark
  → Already submitted → cells show saved values, tap to edit → PUT /attendance/students/{id}
```

### 8.2 Student / Parent Views Attendance

```
/attendance
  → Monthly calendar grid with colored dots:
      green = present, red = absent, amber = leave, grey = holiday/weekend
  → Tap a day → day detail sheet (period breakdown in period mode)
  → GET /attendance/history/students/{student_id}/daily
  → Summary bar: present / absent / leave counts for the month
```

### 8.3 Teacher Enters Results

```
/results
  → Exam selector → Subject selector (own assigned subjects only)
  → Scrollable student list
  → Each row: student name + numeric input (marks_obtained)
  → max_marks shown as label on input
  → Validation: ≤ max_marks, non-negative
  → "Save" → POST /results/bulk
  → "Publish" → confirmation sheet → POST /results/publish
```

### 8.4 Parent Submits Concern

```
/concerns
  → List of own submitted concerns (status chips: open, acknowledged, resolved)
  → "+" FAB → new concern form
       → Subject input + message textarea
       → POST /communications/concerns
  → Tap concern → thread view
       → Messages list (parent + teacher/admin replies)
       → Reply input at bottom
       → POST /communications/concerns/{id}/messages
```

### 8.5 Leave Application

```
/leaves
  → Own leave list + status chips
  → "Apply" button
       → Form: leave_type, start_date, end_date, reason
       → POST /leaves
  → Tap a leave → detail (dates, reason, status, rejection reason if rejected)

Teacher / Admin view:
  → "Pending" tab shows leaves awaiting approval
  → Tap → approve/reject buttons → POST /leaves/{id}/approve or /reject
```

---

## 9. Offline & Error Handling

- TanStack Query `staleTime: 2 min` — stale data shown while revalidating
- No write queue; offline writes (mark attendance, submit concern) show "No internet connection" toast and block submission
- `isError` from queries → empty state with "Retry" button
- 401 interceptor handles session expiry globally
- 403 "deactivated" → full-screen message with logout button

---

## 10. Bootstrap

```bash
npx create-expo-app@latest app --template blank-typescript
cd app

npx expo install expo-router expo-secure-store expo-font expo-status-bar \
  react-native-safe-area-context react-native-screens react-native-gesture-handler \
  @tanstack/react-query axios zustand \
  react-hook-form zod \
  nativewind tailwindcss \
  @expo/vector-icons date-fns

# app.json
{
  "expo": {
    "scheme": "sms",
    "android": { "package": "com.skeducations.sms" },
    "plugins": ["expo-router", "expo-secure-store"]
  }
}
```

```env
# app/.env
EXPO_PUBLIC_API_URL=https://bp3150.skeducations.com
```

---

## 11. Open Questions

- [ ] Biometric unlock: skip re-OTP for returning users if session valid + device has biometrics? Needs decision before auth implementation.
- [ ] Admin mobile write access: should admin be able to approve leaves and reply to concerns from mobile (not just view)? Recommendation: yes — low-friction actions that don't need a table view.
- [ ] Push notifications (Phase 2): requires `expo-notifications` + FCM token registration. No-op in Phase 1; stub the permission request on first launch.
- [ ] iOS: out of scope Phase 1. EAS build profile for iOS to be added when needed — managed workflow keeps the path open.
