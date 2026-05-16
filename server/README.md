# SKEducations SMS — Server

FastAPI + PostgreSQL backend for the SKEducations School Management System.

## Stack

- **FastAPI 0.115** — REST API, OTP-based session token auth
- **SQLAlchemy 2.x async** — ORM via asyncpg (prod) / aiosqlite (tests)
- **Alembic** — database migrations
- **Pydantic v2** — request/response validation
- **pytest + httpx** — async tests against SQLite in-memory (no Postgres needed)

## Structure

```
app/
  config.py        # env-based settings
  database.py      # async engine + get_db dependency
  deps.py          # session token auth dependency (CurrentUser, role guards)
  main.py          # FastAPI app + router wiring
  models/          # SQLAlchemy ORM models (14 files)
  schemas/         # Pydantic schemas (15 files)
  routers/         # Route handlers (17 files)
  services/        # Business logic services (otp.py)
migrations/        # Alembic migration files
tests/             # pytest test suite
docker-compose.yml
```

### Modules

| Router | Endpoints |
|--------|-----------|
| auth | OTP request/verify, logout, me |
| users | user management (admin) |
| core | schools, academic years, class sections |
| subject | subject master per school |
| admission | enquiries, registrations, parent/guardians |
| student | student profiles |
| staff | staff profiles, subject assignments |
| document | file uploads (S3-stubbed) |
| dashboard | aggregated stats |
| attendance | student & staff daily attendance |
| leave | leave requests & approvals |
| homework | homework + attachments |
| communications | notices, concerns, syllabus, newsletters |
| timetable | period config, weekly timetable |
| exam | exams + schedule entries |
| result | results, bulk upload, marksheets |

All endpoints return `{ success, data, error, meta }`. List endpoints support `?page=1&limit=20`.

---

## Authentication

Authentication uses OTP-based session tokens — no JWTs.

**Login flow:**

1. `POST /auth/otp/request` with `{ phone, school_id? }` — sends OTP via SMS (or logs to console in dev mode)
2. `POST /auth/otp/verify` with `{ phone, school_id, otp }` — returns a `token`
3. Pass the token as `Authorization: Bearer <token>` on all subsequent requests

**Session:** tokens are valid for 37 days with sliding renewal (TTL resets if within the last 7 days of expiry).

**Superadmin:** set `SUPERADMIN_API_KEY` in env and pass it as the Bearer token — bypasses OTP entirely.

**Role hierarchy:** `superadmin > admin > teacher > staff > parent`

---

## Development

**Prerequisites:** Python 3.11+, Docker (for Postgres)

```bash
cd server

# Start Postgres
docker-compose up -d db

# Install dependencies
pip install -r requirements.txt

# Copy and configure env
cp .env.example .env
# Edit .env — DATABASE_URL is the only required change for local dev

# Apply migrations
alembic upgrade head

# Run dev server (hot reload)
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**OTP in development:** `OTP_DEV_MODE=true` (the default) prints OTPs to the server log instead of sending SMS. Look for a log line like:

```
WARNING  DEV OTP for +919999999999: 482910
```

**Run tests** (no Postgres needed):

```bash
pytest tests/ -v
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/sms` | Postgres connection string |
| `SUPERADMIN_API_KEY` | `dev-superadmin-key` | Static API key for superadmin access — **change in production** |
| `SESSION_TTL_DAYS` | `37` | Session expiry in days (sliding renewal applies) |
| `OTP_DEV_MODE` | `true` | If `true`, OTPs are logged to console; set `false` in production |
| `OTP_TTL_MINUTES` | `10` | OTP validity window |
| `OTP_MAX_ATTEMPTS` | `5` | Max failed verify attempts before OTP is invalidated |
| `OTP_RATE_LIMIT_COUNT` | `3` | Max OTP requests per phone per rate window |
| `OTP_RATE_LIMIT_MINUTES` | `15` | Rate limit window in minutes |
| `FAST2SMS_API_KEY` | *(empty)* | Fast2SMS API key — required when `OTP_DEV_MODE=false` |
| `FAST2SMS_SENDER_ID` | `SKEDUC` | Fast2SMS sender ID |
| `FAST2SMS_TEMPLATE_ID` | *(empty)* | Fast2SMS DLT template ID |

---

## Production Deployment

1. Set `SUPERADMIN_API_KEY` to a strong random value — never use the default.
2. Set `DATABASE_URL` pointing to your production Postgres instance.
3. Set `OTP_DEV_MODE=false` and configure `FAST2SMS_API_KEY` + `FAST2SMS_TEMPLATE_ID`.
4. Run migrations before deploying: `alembic upgrade head`

**Docker:**

```bash
docker-compose up --build
```

This starts both Postgres and the app on port `8000`. Put a reverse proxy (nginx / Caddy) in front for TLS.

**Health check:** `GET /health`
