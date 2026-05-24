# Edulink SMS — Server

FastAPI + PostgreSQL backend for the Edulink School Management System.

## Stack

- **FastAPI 0.115** — REST API, password + session token auth
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
  models/          # SQLAlchemy ORM models
  schemas/         # Pydantic schemas
  routers/         # Route handlers
  services/        # Business logic (password, email, parent auth, etc.)
migrations/        # Alembic migration files
tests/             # pytest test suite
docker-compose.yml
```

### Auth endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/login` | Email or phone + password |
| `POST /auth/forgot-password` | Send reset link to email |
| `POST /auth/reset-password` | Set new password from token |
| `POST /auth/logout` | End session |
| `GET /auth/me` | Current user |

All user accounts (admin, staff, teacher, parent) are created by school admins — there is no public self-registration.

---

## Local development

**Prerequisites:** Python 3.11+, Docker (for Postgres)

### Backend

```bash
cd server

# Start Postgres
docker compose up -d db

# Virtualenv + dependencies
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure env
cp .env.example .env

# Apply migrations
alembic upgrade head

# Run API with hot reload
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
# Health: http://localhost:8000/health
```

### Frontend (Next.js)

```bash
cd client/web
cp .env.example .env.local
npm ci
npm run dev
# App: http://localhost:3000
```

`NEXT_PUBLIC_API_URL` in `.env.local` should point to `http://localhost:8000/api/v1`.

### Docker (API + Postgres)

```bash
cd server
docker compose up --build
```

Runs migrations on startup via `scripts/start.sh`, then serves on port `8000`.

### Tests (no Postgres required)

```bash
cd server
pytest tests/ -v
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | local Postgres URL | Async Postgres connection string |
| `SUPERADMIN_API_KEY` | `dev-superadmin-key` | Bearer token for superadmin — change in production |
| `SESSION_TTL_DAYS` | `37` | Session expiry in days |
| `FRONTEND_URL` | `http://localhost:3000` | Base URL for password-reset links |
| `PASSWORD_RESET_TTL_HOURS` | `24` | Reset link validity |
| `EMAIL_DEV_MODE` | `true` | Log reset emails to console instead of SMTP |
| `SMTP_*` | empty | SMTP settings when `EMAIL_DEV_MODE=false` |

---

## Production

1. Set `SUPERADMIN_API_KEY` to a strong random value.
2. Set `DATABASE_URL` (Railway provides `postgresql://…`; the app normalizes to asyncpg).
3. Set `FRONTEND_URL` to your Vercel app URL.
4. Configure SMTP or keep `EMAIL_DEV_MODE=true` only for staging.
5. Run `alembic upgrade head` before or on deploy.

**Health check:** `GET /health`
