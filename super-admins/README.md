# Super-Admin Operations Guide

This directory contains scripts and documentation for platform-level administration of the Better-SMS multi-tenant system. These operations are only available to the **superadmin** role.

---

## How superadmin authentication works

Superadmin authentication uses a **static API key** set in the server environment. Every request must include it as a Bearer token:

```http
Authorization: Bearer <SUPERADMIN_API_KEY>
```

`deps.py` short-circuits the normal session lookup when this key is matched and returns a synthetic user with `role=superadmin` and `school_id=null`. No session row is written to the database.

There are **two ways** to use this key:

| Method | When to use |
|---|---|
| **Web dashboard** (`/login` → "Superadmin? Sign in with API key") | Day-to-day admin work via browser |
| **Direct API / scripts** (`Authorization: Bearer <key>` in curl) | Automation, CI, bulk operations |

---

## Generating an API key

### Development

The default key `dev-superadmin-key` is pre-configured in `config.py` and is only active when no `.env` override is set. Use it as-is locally — no setup needed.

```bash
# server/.env  (leave unset to use the dev default, or override explicitly)
SUPERADMIN_API_KEY=dev-superadmin-key
```

**Never use the dev default in staging or production.**

---

### Staging / Production

Generate a cryptographically random key. Either of these works:

```bash
# Option 1 — openssl (available everywhere)
openssl rand -hex 32

# Option 2 — Python (if you have a Python env handy)
python -c "import secrets; print(secrets.token_hex(32))"
```

Both produce a 64-character hex string. Copy the output and set it:

```bash
# server/.env  (never commit this file)
SUPERADMIN_API_KEY=<paste-output-here>
```

Or inject it as an environment variable in your deployment platform (Docker, Railway, Render, etc.):

```
SUPERADMIN_API_KEY=<paste-output-here>
```

Store the key in a secrets manager (1Password, AWS Secrets Manager, Doppler, etc.) immediately. Treat it like a root password — if it leaks, rotate it instantly by regenerating and redeploying.

---

### Rotating the key

1. Generate a new key using one of the commands above.
2. Update the secret in your secrets manager.
3. Set the new value in the server environment and redeploy.
4. Old key stops working immediately on restart — no DB cleanup needed (there are no session rows for superadmin).

---

## Adding a new school

Onboarding a school requires a **School record** and at least one **admin user**. Use whichever method suits you:

### Via the web dashboard (preferred)

1. Log in at `/login` → "Superadmin? Sign in with API key"
2. Go to **Schools** → **New School**
3. Fill in school details + the first admin's phone number
4. Hit **Create School** — both records are written atomically
5. The success toast shows the school ID and admin phone to share

### Via `seed_school.py` (CLI / direct DB)

Creates both records in one atomic DB transaction — useful for CI seeding or when the web UI isn't reachable.

```bash
cd /proj/panda/better-sms/server
python ../super-admins/scripts/seed_school.py
```

You will be prompted for:

| Field | Required | Notes |
|---|---|---|
| School name | Yes | e.g. `St. Mary's School` |
| Branch name | No | e.g. `Main Campus` |
| Address | No | |
| Contact phone | No | School's public contact number |
| Contact email | No | |
| Attendance mode | No | Default: `period` |
| Uses Saturday | No | Default: `n` |
| Admin phone | Yes | The admin's mobile — used for OTP login |

On success it prints the **school ID** and the admin user's phone.

### Via the API directly

Creates the school record only (no admin user). Useful if the admin user already exists or you'll create them separately.

```bash
./scripts/create_school.sh
```

Requires: `curl`, `jq`

---

## Other scripts

All scripts live in `super-admins/scripts/`. Copy `.env.example` to `.env` there and fill in your values before running anything.

```bash
cd super-admins/scripts
cp .env.example .env
# edit .env
```

### `list_schools.sh` — List all registered schools

```bash
./scripts/list_schools.sh
./scripts/list_schools.sh --page 2 --limit 10
```

### `toggle_school_status.sh` — Activate or deactivate a school

Deactivating sets `is_active=false` — no data is deleted. Users from that school can no longer log in.

```bash
./scripts/toggle_school_status.sh <school_id> activate
./scripts/toggle_school_status.sh <school_id> deactivate
```

### Updating a school's details

```bash
curl -X PUT "$API_BASE_URL/api/v1/schools/<school_id>" \
  -H "Authorization: Bearer $SUPERADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated School Name",
    "address": "New Address",
    "phone": "+919876543210"
  }'
```

---

## What happens after onboarding

```
Superadmin creates school + admin user
          │
          ▼
Admin receives: school_id + their phone number
          │
          ▼
POST /api/v1/auth/otp/request
  { "phone": "+91XXXXXXXXXX", "school_id": "<school_id>" }
          │
          ▼
OTP sent via SMS (or printed to console in dev mode)
          │
          ▼
POST /api/v1/auth/otp/verify
  { "phone": "+91XXXXXXXXXX", "school_id": "<school_id>", "otp": "123456" }
          │
          ▼
Server returns { "token": "..." }  ← admin uses this as Bearer token
          │
          ▼
Admin can now:
  - Create academic years    POST /api/v1/academic-years
  - Create class sections    POST /api/v1/class-sections
  - Create teacher/staff     POST /api/v1/users  (role: teacher | staff)
  - Admit students           POST /api/v1/students
  - Configure subjects       POST /api/v1/subjects
```

---

## Role hierarchy

| Role | `school_id` | Can do |
|---|---|---|
| `superadmin` | `null` | Create/deactivate schools, update school config |
| `admin` | school's ID | Everything within their school |
| `teacher` | school's ID | Attendance, homework, timetable, results |
| `staff` | school's ID | Limited to their own records |
| `student` | school's ID | Read-only own data |
| `parent` | school's ID | Read-only child's data |

---

## Environment variables reference

| Variable | Default | Purpose |
|---|---|---|
| `SUPERADMIN_API_KEY` | `dev-superadmin-key` | Static key for superadmin authentication |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/sms` | Async DB URL for `seed_school.py` |
| `API_BASE_URL` | `http://localhost:8000` | Base URL for shell script API calls |

> **Never commit a real `SUPERADMIN_API_KEY` to git.** The `server/.env` and `super-admins/scripts/.env` files are both in `.gitignore`.
