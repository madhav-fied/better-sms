# RFC-020: Client Architecture

**Status:** Active  
**Scope:** Two-client strategy, platform split, shared conventions, monorepo layout, deployment  
**Actors:** All

---

## 1. Summary

The SKEducations SMS client is two separate applications sharing a single backend:

| Client | Technology | Primary users | Location |
|--------|-----------|---------------|----------|
| **Web dashboard** (RFC-021) | Next.js 15 | Admin, Superadmin | `client/web/` |
| **Android app** (RFC-022) | Expo React Native | Teacher, Staff, Student, Parent | `client/app/` |

**Why split?** Admin operations (admit students, set up timetables, enter results, manage staff) are complex, table-heavy workflows best served by a full browser UI. Actors in the field (teachers marking attendance, parents checking results) need a fast, glanceable mobile experience. Building one app that does both well leads to a bloated nav and compromised UX on both platforms.

**Admin on mobile:** Admins can log in on mobile and reach a read-only dashboard + notices + concerns. All write operations (CRUD, bulk actions, configuration) are web-only.

---

## 2. Monorepo Layout

No monorepo tooling (Turborepo / nx). Two sibling directories under `client/`. Shared TypeScript types are co-located in each project — small enough that duplication beats the overhead of a shared package setup.

```
client/
├── web/        # Next.js 15 admin dashboard (RFC-021)
└── app/        # Expo React Native actor app (RFC-022)
```

Both projects share these conventions (documented here, implemented per-project):

### 2.1 API Base URL

```
NEXT_PUBLIC_API_URL / EXPO_PUBLIC_API_URL = https://bp3150.skeducations.com
```

### 2.2 Response Envelope

All endpoints return:
```typescript
{ success: boolean; data: T; error?: string; meta?: PaginationMeta }
```
Both clients unwrap `data` inside API helper functions before returning to hooks.

### 2.3 Auth Token

OTP verify returns an opaque Bearer token.  
- **Web:** stored in `localStorage` (key: `sms_token`)
- **App:** stored in `expo-secure-store` (key: `sms_token`)

Attached on every request: `Authorization: Bearer <token>`

On 401: clear token → redirect to login.

### 2.4 Axios Instance Pattern

Both clients create an `apiClient` axios instance with:
- `baseURL` from env
- request interceptor: attach Bearer token
- response interceptor: catch 401 → clear session → redirect login

### 2.5 State Management

Both use **Zustand** for auth store:
```
{ token, role, schoolId, userId, entityId, expiresAt, setSession(), clearSession() }
```
Auth store is hydrated from storage before first render.

### 2.6 Data Fetching

Both use **TanStack Query v5** with `staleTime: 2 min`, `retry: 1`.

### 2.7 Role Type

```typescript
type Role = 'superadmin' | 'admin' | 'teacher' | 'staff' | 'student' | 'parent';
```

---

## 3. Deployment Targets

| Client | Host | Method |
|--------|------|--------|
| Web dashboard | Vercel (or self-hosted nginx) | `next build` → static/SSR |
| Android app | Google Play / direct APK | EAS Build (`eas build --platform android`) |

No iOS target in Phase 1.

---

## 4. Open Questions

- [ ] Should admin also have a limited mobile write path (e.g. approve a leave on mobile)? Recommendation: yes for leave approvals and concern replies; document in RFC-022.
- [ ] Single domain for web (`sms.skeducations.com`) or path prefix on existing domain? Decision needed before Vercel config.
