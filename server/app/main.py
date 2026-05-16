from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    users,
    subject,
    core,
    admission,
    student,
    staff,
    document,
    dashboard,
    attendance,
    leave,
    homework,
    communications,
    timetable,
    exam,
    result,
)

app = FastAPI(
    title="SKEducations SMS API",
    version="1.0.0",
    description="School Management System API for SKEducations",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX, tags=["Auth"])
app.include_router(users.router, prefix=PREFIX, tags=["Users"])
app.include_router(subject.router, prefix=PREFIX, tags=["Subjects"])
app.include_router(core.router, prefix=PREFIX, tags=["Core"])
app.include_router(admission.router, prefix=PREFIX, tags=["Admission"])
app.include_router(student.router, prefix=PREFIX, tags=["Student"])
app.include_router(staff.router, prefix=PREFIX, tags=["Staff"])
app.include_router(document.router, prefix=PREFIX, tags=["Documents"])
app.include_router(dashboard.router, prefix=PREFIX, tags=["Dashboard"])
app.include_router(attendance.router, prefix=PREFIX, tags=["Attendance"])
app.include_router(leave.router, prefix=PREFIX, tags=["Leave"])
app.include_router(homework.router, prefix=PREFIX, tags=["Homework"])
app.include_router(communications.router, prefix=PREFIX, tags=["Communications"])
app.include_router(timetable.router, prefix=PREFIX, tags=["Timetable"])
app.include_router(exam.router, prefix=PREFIX, tags=["Exams"])
app.include_router(result.router, prefix=PREFIX, tags=["Results"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SKEducations SMS"}
