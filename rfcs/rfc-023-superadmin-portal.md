# RFC-023: Super Admin Portal — Login & School Onboarding

**Status:** Active  
**Scope:** Superadmin web login (API key), school creation + first admin user via UI  
**Actors:** Superadmin  
**Replaces scripts:** `super-admins/scripts/seed_school.py`, `create_school.sh`

---

## 1. Problem

Two operations require a superadmin:

1. **Logging into the web dashboard** — The current login page only supports OTP flow (phone → SMS code). Superadmins authenticate with a static API key (`SUPERADMIN_API_KEY`), so there is no web UI path for them.

2. **Onboarding a new school** — `seed_school.py` creates a school + first admin user atomically, but requires direct database access. `create_school.sh` uses the API but can only create the school record, not the first admin user, because `POST /api/v1/users` scopes new users to the caller's own `school_id`, and the superadmin has `school_id = null`.

**Goal:** Let the superadmin do both entirely through the web dashboard — no terminal, no script, no DB access.

---

## 2. Authentication Design

### 2.1 How superadmin auth works today

`deps.py:28` short-circuits the normal session lookup:

```python
if token == settings.superadmin_api_key:
    return {"user_id": "superadmin", "school_id": None, "role": "superadmin", "entity_id": None}
```

The static API key acts as a self-contained bearer token. No session record is created.

`GET /auth/me` already handles this:

```python
if user["user_id"] == "superadmin":
    return ok({"user_id": "superadmin", "school_id": None, "role": "superadmin", "entity_id": None})
```

So the API key can be stored directly in `localStorage` (key: `sms_token`) and the existing `AuthGuard` → `getMe()` flow will restore the session on page refresh without any changes to the guard.

### 2.2 Web login flow (superadmin)

```
/login
  → "Superadmin? Sign in with API key" toggle link
  → API key input (type="password")
  → "Sign in" button
  → GET /auth/me  (Authorization: Bearer <key>)
      → 200: store key as localStorage token, set Zustand session, redirect to /dashboard
      → 401: "Invalid API key" inline error
```

The login page keeps its existing OTP flow for normal users. The toggle is a link below the form — no visual disruption for non-superadmins.

### 2.3 Session shape for superadmin

```ts
{
  token: "<api-key>",
  role: "superadmin",
  schoolId: null,
  userId: "superadmin",
  entityId: null,
  expiresAt: null,   // API key has no expiry
}
```

---

## 3. School Onboarding Endpoint

### 3.1 Why a new endpoint?

`POST /api/v1/users` (line 45 of `users.py`) sets:

```python
school_id = user["school_id"]   # null for superadmin
```

So the created user gets `school_id = null` — it becomes another superadmin-level user, not a school admin. There is no way to work around this through the existing API.

A dedicated endpoint runs the same logic as `seed_school.py`: write both records in one atomic transaction, with an explicit `school_id` linkage.

### 3.2 Endpoint

```
POST /api/v1/superadmin/onboard-school
Authorization: Bearer <SUPERADMIN_API_KEY>
Content-Type: application/json
```

**Request body**

| Field | Type | Required | Default |
|---|---|---|---|
| `name` | string | Yes | — |
| `branch_name` | string? | No | null |
| `address` | string? | No | null |
| `phone` | string? | No | null |
| `email` | string? | No | null |
| `attendance_mode` | string | No | `"period"` |
| `uses_saturday` | bool | No | `false` |
| `admin_phone` | string | Yes | — |

**Response 200**

```json
{
  "success": true,
  "data": {
    "school": {
      "id": "uuid",
      "name": "St. Mary's School",
      "branch_name": "Main Campus",
      "address": null,
      "phone": null,
      "email": null,
      "is_active": true,
      "attendance_mode": "period",
      "uses_saturday": false,
      "created_at": "2026-05-16T10:00:00Z"
    },
    "admin_user": {
      "id": "uuid",
      "phone": "+91XXXXXXXXXX",
      "role": "admin",
      "school_id": "uuid"
    }
  }
}
```

**Errors**

| Status | Condition |
|---|---|
| 403 | Caller is not superadmin |
| 409 | `admin_phone` already registered for another user in this school |

Both records are written in a single SQLAlchemy transaction — if either insert fails, neither is committed.

---

## 4. Web UI

### 4.1 Login page changes

- Below the existing form: `"Superadmin? Sign in with API key"` link
- Clicking it reveals a second form (hides the phone/OTP form)
- Single field: API key (type=password, placeholder="API key")
- Button: "Sign in as Superadmin"
- On success: same redirect as OTP verify (`/dashboard`)
- "Back to normal login" link returns to OTP form

### 4.2 Schools page changes

The existing schools list page (`/schools`) gets:

- **"New School" button** — top-right, visible only when `role === 'superadmin'`
- **Dialog** — opens inline, no separate route needed

**Dialog fields** (maps 1:1 to endpoint body):

| Label | Field | Required | Notes |
|---|---|---|---|
| School Name | `name` | Yes | |
| Branch Name | `branch_name` | No | e.g. "Main Campus" |
| Address | `address` | No | |
| Contact Phone | `phone` | No | School's public number |
| Contact Email | `email` | No | |
| Attendance Mode | `attendance_mode` | No | Select: Period / Session (default: Period) |
| Uses Saturday | `uses_saturday` | No | Checkbox |
| Admin Phone | `admin_phone` | Yes | The first admin's mobile for OTP login |

On success: dialog closes, schools list refetches, a toast shows:
```
School created. Share with admin:
  School ID: <id>
  Their login phone: <admin_phone>
```

---

## 5. File Changes

### Server

| File | Change |
|---|---|
| `server/app/routers/superadmin.py` | New router: `POST /superadmin/onboard-school` |
| `server/app/main.py` | Import and register `superadmin` router |

### Client

| File | Change |
|---|---|
| `client/web/app/login/page.tsx` | Add superadmin API key login mode (toggle) |
| `client/web/lib/api/schools.ts` | New: `onboardSchool(payload)` |
| `client/web/app/(dashboard)/schools/page.tsx` | "New School" button + dialog form |

---

## 6. Security Notes

- The API key is stored in `localStorage` with the same key (`sms_token`) as regular session tokens. The axios interceptor and `AuthGuard` require no changes.
- The `POST /superadmin/onboard-school` endpoint is gated by `require_superadmin` — only the static key can reach it.
- `admin_phone` in the onboard response is only shown to the logged-in superadmin, not stored server-side beyond the `SchoolUser` record.
- Superadmin has no session TTL (no session row created). Logging out just clears `localStorage`.

---

## 7. What stays unchanged

- `seed_school.py` remains for CLI use (direct DB access, CI seeding, etc.)
- The existing `POST /api/v1/schools` endpoint (API-only school creation, no admin user)
- `GET /auth/me` superadmin handling in `auth.py`
- `deps.py` superadmin shortcut — no migration needed
