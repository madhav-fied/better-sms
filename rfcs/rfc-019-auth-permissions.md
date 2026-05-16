# RFC-019: Authentication & Permissions

**Status:** Active  
**Scope:** SMS OTP login, role-based access control, session management, school provisioning flow  
**Actors:** Developer (Superadmin), School Admin, Teacher, Staff, Student, Parent

---

## 1. Summary

Defines how every actor in the system proves identity and what they are permitted to do once authenticated. Identity is established exclusively via SMS OTP — there are no passwords. A 6-digit code is sent via Fast2SMS to the user's registered phone number; on verification a long-lived session token (30–45 days) is issued. Developers provision schools (and their first admin) directly via a superadmin API; all other users are registered by the school admin from within the app.

---

## 2. Roles

| Role | Who | Registered by |
|------|-----|---------------|
| `superadmin` | Developer / ops team | Hardcoded seed or env credential |
| `admin` | School administrator | Developer (at school provisioning time) |
| `teacher` | Teaching staff member | School admin |
| `staff` | Non-teaching staff member | School admin |
| `student` | Enrolled student | School admin (via admission flow) |
| `parent` | Parent / guardian | School admin (linked to student record) |

> Teachers and non-teaching staff both come from the `staff` table; their `category` field (`teacher` vs `non_teaching`) determines which sub-role they carry in the session token.

---

## 3. User Flows

### 3.1 Developer Provisions a School

```
Developer (superadmin token) → POST /schools
  → body: name, branch_name?, address, phone, email, admin_phone
  → server creates School record + SchoolUser(role=admin, phone=admin_phone)
  → 201 { school_id, admin_phone }
  → Developer shares the admin's phone number with the school admin
  → Admin logs in via OTP (Section 3.3)
```

`admin_phone` is the single field that bootstraps admin access. No password is ever set.

**Edge cases:**
- Duplicate `name + branch_name` → 409
- `admin_phone` already linked to another school as admin → 409 "Phone already registered as admin elsewhere"
- Invalid Indian mobile format (must be 10 digits, start with 6–9) → 422

---

### 3.2 Admin Registers Users

```
Admin Panel → People → Staff / Students / Parents → "+ Add"
  → Form requires: name, phone (mandatory), role-specific fields
  → Server creates record + SchoolUser(role, phone, school_id)
  → User is now able to log in via OTP
```

Phone number is the login credential for every user type. Admin cannot register two users with the same phone in the same school.

**Edge cases:**
- Phone already registered for the same school → 409 "Phone already in use within this school"
- Phone registered in a different school → allowed (users can belong to multiple schools; login resolves school by context — see Section 3.3)
- Student admitted via RFC-002 admission pipeline → `SchoolUser` is auto-created on `/registrations/{id}/accept`; admin does not need to re-register

---

### 3.3 OTP Login Flow

```
App (any role) → "Login" screen
  → User enters 10-digit phone number
  → POST /auth/otp/request  { phone }
  → Server: lookup SchoolUser(s) by phone
      → If 0 matches: 404 "Phone not registered"
      → If 1 match: proceed
      → If multiple matches (multi-school user): client shows school picker
          → User selects school → POST /auth/otp/request { phone, school_id }
  → Server generates 6-digit OTP, stores hashed in otp_requests, TTL = 10 min
  → Server calls Fast2SMS API to deliver OTP
  → 200 { expires_in: 600, masked_phone: "XXXXXX1234" }

User receives SMS → enters 6-digit code
  → POST /auth/otp/verify { phone, school_id, otp }
  → Server: validate OTP (hash match, not expired, not used)
      → Mark OTP used
      → Create or refresh Session record
      → Return session token (opaque random token, 256-bit)
  → 200 { token, expires_at, role, school_id, user_id }

App stores token in secure storage, attaches as:
  Authorization: Bearer <token>
```

**Rate limiting:**
- Max 3 OTP requests per phone per 15 minutes → 429 "Too many OTP requests. Try again in X minutes."
- Max 5 failed verify attempts per OTP → OTP invalidated, new request required

**Edge cases:**
- Expired OTP → 422 "OTP expired. Request a new one."
- Already-used OTP → 422 "OTP already used."
- School deactivated → 403 "School account is inactive."
- User deactivated → 403 "Your account has been deactivated. Contact your school admin."

---

### 3.4 Session Expiry & Renewal

Sessions live for **37 days** (midpoint of the 30–45 day range; configurable via `SESSION_TTL_DAYS` env var).

```
Every authenticated request:
  → Server checks session.expires_at
  → If token valid and within last 7 days of TTL: sliding renewal (reset expires_at)
  → If expired: 401 { error: "session_expired" } → client redirects to login screen
```

There is no refresh token. When a session expires the user simply re-authenticates via OTP.

---

### 3.5 Logout

```
POST /auth/logout
  → Deletes session record server-side
  → Client drops token from storage
  → 200 { success: true }
```

---

## 4. Fast2SMS Integration

**Provider:** Fast2SMS (`https://www.fast2sms.com/dev/bulkV2`)  
**SMS type:** Transactional (DLT-registered template required for production)

### 4.1 OTP SMS Template (DLT)

```
Your OTP for SKEducations login is {#var#}. Valid for 10 minutes. Do not share this code.
```

### 4.2 Server-side call

```python
async def send_otp_sms(phone: str, otp: str) -> None:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": settings.FAST2SMS_API_KEY},
            json={
                "route": "dlt",
                "sender_id": settings.FAST2SMS_SENDER_ID,  # e.g. "SKEDUC"
                "message": settings.FAST2SMS_TEMPLATE_ID,
                "variables_values": otp,
                "flash": 0,
                "numbers": phone,
            },
            timeout=10,
        )
    resp.raise_for_status()
```

**Environment variables required:**
```
FAST2SMS_API_KEY=<key from fast2sms dashboard>
FAST2SMS_SENDER_ID=SKEDUC
FAST2SMS_TEMPLATE_ID=<DLT template ID>
SESSION_TTL_DAYS=37
```

**Failure handling:**
- Fast2SMS unreachable or returns error → 502 "SMS delivery failed. Try again."
- Log the raw Fast2SMS response for ops debugging; never log OTP value.

---

## 5. Permission Matrix

A `role` claim in the session token gates every endpoint. The table below shows which roles can call each module.

### Legend
`✓` = full access · `R` = read only · `own` = only own record · `child` = only linked student(s) · `-` = no access

| Module | superadmin | admin | teacher | staff | student | parent |
|--------|-----------|-------|---------|-------|---------|--------|
| **Schools** (RFC-001) | ✓ | - | - | - | - | - |
| **Academic Years** | ✓ | ✓ | - | - | - | - |
| **Class Sections** | ✓ | ✓ | R | - | - | - |
| **Admissions** (RFC-002) | ✓ | ✓ | - | - | - | - |
| **Student CRUD** (RFC-003) | ✓ | ✓ | R | - | own | - |
| **Staff CRUD** (RFC-004) | ✓ | ✓ | own | own | - | - |
| **Documents** (RFC-005) | ✓ | ✓ | R | - | own | child |
| **Dashboard** (RFC-006) | ✓ | ✓ | teacher-view | staff-view | student-view | parent-view |
| **Student Attendance** (RFC-007) | ✓ | ✓ | ✓ (own classes) | - | own | child |
| **Staff Attendance** (RFC-008) | ✓ | ✓ | own | own | - | - |
| **Leave Management** (RFC-009) | ✓ | ✓ | ✓ | ✓ | ✓ | child |
| **Attendance History** (RFC-010) | ✓ | ✓ | own classes | - | own | child |
| **Homework** (RFC-011) | ✓ | ✓ | ✓ (create/edit own) | - | R (own class) | R (child's class) |
| **Notices** (RFC-012) | ✓ | ✓ | ✓ (create) | R | R | R |
| **Concerns** (RFC-013) | ✓ | ✓ | ✓ (manage) | - | - | ✓ (submit/view own) |
| **Syllabus** (RFC-014) | ✓ | ✓ | ✓ (own subjects) | - | R (own class) | R (child's class) |
| **Newsletter** (RFC-015) | ✓ | ✓ | ✓ (create) | R | R | R |
| **Timetable** (RFC-016) | ✓ | ✓ | R | - | R (own class) | R (child's class) |
| **Exams** (RFC-017) | ✓ | ✓ | ✓ (own classes) | - | R (own class) | R (child's class) |
| **Results** (RFC-018) | ✓ | ✓ | ✓ (enter own subject) | - | own | child |
| **User Management** (this RFC) | ✓ | ✓ (own school) | - | - | - | - |

### Dashboard views by role

| Role | Dashboard shows |
|------|----------------|
| `admin` | Full dashboard: all RFC-006 widgets, financials, analytics |
| `teacher` | Own timetable, class attendance, homework due, assigned exam schedules |
| `staff` | Own attendance, leave balance, notices |
| `student` | Own attendance %, homework, upcoming exams, results, timetable, notices |
| `parent` | Child's attendance %, homework, results, upcoming exams, notices, concerns inbox |

---

## 6. Data Models

```python
class SchoolUser(BaseModel):
    id: UUID
    school_id: UUID
    role: Literal["admin", "teacher", "staff", "student", "parent"]
    phone: str                      # 10-digit Indian mobile
    entity_id: Optional[UUID]       # FK → staff.id / students.id / parents.id / None for admin
    is_active: bool
    created_at: datetime

class OtpRequest(BaseModel):
    id: UUID
    phone: str
    school_id: UUID
    otp_hash: str                   # bcrypt hash of the 6-digit code
    expires_at: datetime            # now + 10 min
    used: bool
    attempt_count: int              # incremented on each failed verify
    created_at: datetime

class Session(BaseModel):
    id: UUID
    school_user_id: UUID
    token_hash: str                 # sha256 of the opaque token
    role: str
    school_id: UUID
    expires_at: datetime
    created_at: datetime
    last_seen_at: datetime
```

**SQLAlchemy notes (consistent with project conventions):**
- `id` → `sa.String(36)` (UUID stored as string)
- `role` → `sa.Enum(..., native_enum=False)`
- `expires_at`, `created_at` → `sa.DateTime(timezone=True)`
- `otp_hash` → never log, never return to client

---

## 7. Endpoints

### 7.1 Auth

```python
POST  /auth/otp/request     # send OTP to phone
POST  /auth/otp/verify      # verify OTP, issue session token
POST  /auth/logout          # invalidate session
GET   /auth/me              # current user info from session token
```

**POST /auth/otp/request**
```
Request:  { phone: str, school_id?: UUID }
Response: 200 { expires_in: 600, masked_phone: str }
Errors:
  404 — phone not registered
  409 — phone belongs to multiple schools, school_id required
        { schools: [{ school_id, school_name }] }
  429 — rate limit exceeded { retry_after_seconds: int }
  403 — school or user deactivated
```

**POST /auth/otp/verify**
```
Request:  { phone: str, school_id: UUID, otp: str }
Response: 200 {
  token: str,
  expires_at: datetime,
  role: str,
  school_id: UUID,
  user_id: UUID,
  entity_id: UUID | null
}
Errors:
  422 — otp_expired | otp_invalid | otp_used
  403 — school or user deactivated
  429 — max attempts exceeded for this OTP
```

**GET /auth/me**
```
Response: 200 {
  user_id: UUID,
  school_id: UUID,
  role: str,
  phone: str (masked),
  entity_id: UUID | null,
  session_expires_at: datetime
}
Errors:
  401 — missing or expired token
```

---

### 7.2 User Management (Admin only)

```python
POST   /users                    # register staff/student/parent phone
GET    /users                    # list users for this school; query: role?, is_active?
GET    /users/{id}               # get single user
PATCH  /users/{id}/status        # { is_active: bool } — deactivate/reactivate
DELETE /users/{id}/sessions      # force-logout (invalidate all sessions for user)
```

**POST /users**
```
Request:  { phone: str, role: "teacher"|"staff"|"student"|"parent", entity_id: UUID }
Response: 201 { success: true, data: SchoolUserResponse }
Errors:
  409 — phone already registered in this school
  422 — entity_id not found or role mismatch
```

> `entity_id` links the `SchoolUser` back to the corresponding row in `staff`, `students`, or `parents`. For `admin` role, `entity_id` is null (admin is not an entity in those tables).

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| OTP brute force | 5 attempt limit per OTP; 3 OTP requests per 15 min per phone |
| Token theft | Opaque token stored as sha256 hash; not reconstructible from DB |
| Session fixation | New token issued on every fresh OTP verify; old sessions untouched (multi-device support) |
| Phone spoofing | Fast2SMS DLT template ensures SMS reaches only the registered SIM |
| Superadmin exposure | Superadmin token never flows through normal login; issued via env/seed only |
| HTTPS | All traffic over TLS; token must never appear in URL query params |
| School isolation | Every query filters by `school_id` extracted from session; no cross-school leakage |

---

## 9. Error Reference

| Code | Meaning |
|------|---------|
| 401 | Missing, invalid, or expired session token |
| 403 | Valid token but role not permitted for this action, or account deactivated |
| 404 | Phone not registered |
| 409 | Phone already in use, or multi-school conflict |
| 422 | OTP invalid/expired/used, or validation failure |
| 429 | Rate limit exceeded |
| 502 | Fast2SMS delivery failure |

---

## 10. Open Questions

- [x] Should parents linked to multiple students (siblings) see a unified child-selector? Decision: unified child-selector; one session sees all children.
- [x] Staff who transfer between schools — new `SchoolUser` or one phone spanning multiple tenants? Decision: multiple SchoolUser records (one per school).
- [x] Should superadmin login go through OTP or remain a static API key? Decision: static API key in env.
- [x] DLT template approval timeline — Quick SMS for dev/staging, DLT for prod? Decision: Quick SMS for dev/staging (`otp_dev_mode = True`), DLT for prod.
