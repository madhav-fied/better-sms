# SKEducations SMS — Server

FastAPI + PostgreSQL backend for the SKEducations School Management System.

## Stack

- **FastAPI 0.115** — REST API, JWT Bearer auth (HS256)
- **SQLAlchemy 2.x async** — ORM via asyncpg (prod) / aiosqlite (tests)
- **Alembic** — database migrations
- **Pydantic v2** — request/response validation
- **pytest + httpx** — async tests against SQLite in-memory (no Postgres needed)

## Structure

```
app/
  config.py        # env-based settings
  database.py      # async engine + get_db dependency
  deps.py          # JWT auth dependency (CurrentUser)
  main.py          # FastAPI app + router wiring
  models/          # SQLAlchemy ORM models (12 files)
  schemas/         # Pydantic schemas (14 files)
  routers/         # Route handlers (14 files)
migrations/        # Alembic migration files
tests/             # pytest test suite (30 tests)
docker-compose.yml
```

### Modules

| Router | Endpoints |
|--------|-----------|
| core | schools, academic years, class sections |
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

## Development

**Prerequisites:** Python 3.11+, Docker (for Postgres)

```bash
cd server

# Start Postgres
docker-compose up -d db

# Install dependencies
pip install -r requirements.txt

# Apply migrations
alembic upgrade head

# Run dev server (hot reload)
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

**Environment variables** (override via `.env` or shell):

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/sms
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**Run tests** (no Postgres needed):

```bash
pytest tests/ -v
```

---

## Production Deployment

1. Set a strong `SECRET_KEY` env var — never use the default.
2. Set `DATABASE_URL` pointing to your production Postgres instance.
3. Run migrations before deploying: `alembic upgrade head`

**Docker:**

```bash
docker-compose up --build
```

This starts both Postgres and the app on port `8000`. Put a reverse proxy (nginx / Caddy) in front for TLS.

**Health check:** `GET /health`
