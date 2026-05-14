import pytest
from datetime import date
from httpx import AsyncClient


async def _setup_for_attendance(client: AsyncClient, auth_headers: dict) -> dict:
    """Set up school, AY, class section, and an admitted student."""
    from tests.conftest import TEST_SCHOOL_ID
    ay_resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "ATT-AY",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = ay_resp.json()["data"]["id"]

    cs_resp = await client.post("/api/v1/class-sections", json={
        "school_id": TEST_SCHOOL_ID,
        "academic_year_id": ay_id,
        "class_name": "Grade 2",
        "section": "A",
    }, headers=auth_headers)
    cs_id = cs_resp.json()["data"]["id"]

    reg_resp = await client.post("/api/v1/registrations", json={
        "academic_year_id": ay_id,
        "student_fields": {"first_name": "Attend", "last_name": "Student", "gender": "male"},
    }, headers=auth_headers)
    reg_id = reg_resp.json()["data"]["id"]
    await client.post(f"/api/v1/registrations/{reg_id}/accept", headers=auth_headers)
    admit_resp = await client.post("/api/v1/students/admit", json={
        "registration_id": reg_id,
        "class_section_id": cs_id,
    }, headers=auth_headers)
    student_id = admit_resp.json()["data"]["id"]
    return {"ay_id": ay_id, "cs_id": cs_id, "student_id": student_id}


@pytest.mark.asyncio
async def test_mark_student_attendance(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_attendance(client, auth_headers)
    resp = await client.post("/api/v1/attendance/students/mark", json={
        "class_section_id": ctx["cs_id"],
        "academic_year_id": ctx["ay_id"],
        "date": str(date.today()),
        "records": [{"student_id": ctx["student_id"], "status": "present"}],
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) == 1
    assert data["data"][0]["status"] == "present"


@pytest.mark.asyncio
async def test_list_student_attendance(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_attendance(client, auth_headers)
    await client.post("/api/v1/attendance/students/mark", json={
        "class_section_id": ctx["cs_id"],
        "academic_year_id": ctx["ay_id"],
        "date": str(date.today()),
        "records": [{"student_id": ctx["student_id"], "status": "absent"}],
    }, headers=auth_headers)
    resp = await client.get(f"/api/v1/attendance/students?student_id={ctx['student_id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1


@pytest.mark.asyncio
async def test_student_attendance_summary(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_attendance(client, auth_headers)
    await client.post("/api/v1/attendance/students/mark", json={
        "class_section_id": ctx["cs_id"],
        "academic_year_id": ctx["ay_id"],
        "date": "2025-06-01",
        "records": [{"student_id": ctx["student_id"], "status": "present"}],
    }, headers=auth_headers)
    await client.post("/api/v1/attendance/students/mark", json={
        "class_section_id": ctx["cs_id"],
        "academic_year_id": ctx["ay_id"],
        "date": "2025-06-02",
        "records": [{"student_id": ctx["student_id"], "status": "absent"}],
    }, headers=auth_headers)
    resp = await client.get(f"/api/v1/attendance/students/{ctx['student_id']}/summary", headers=auth_headers)
    assert resp.status_code == 200
    summary = resp.json()["data"]
    assert summary["student_id"] == ctx["student_id"]
    assert "total" in summary
    assert "present" in summary
    assert "attendance_percentage" in summary


@pytest.mark.asyncio
async def test_update_student_attendance(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_attendance(client, auth_headers)
    mark_resp = await client.post("/api/v1/attendance/students/mark", json={
        "class_section_id": ctx["cs_id"],
        "academic_year_id": ctx["ay_id"],
        "date": "2025-07-01",
        "records": [{"student_id": ctx["student_id"], "status": "present"}],
    }, headers=auth_headers)
    record_id = mark_resp.json()["data"][0]["id"]
    update_resp = await client.put(f"/api/v1/attendance/students/{record_id}", json={"status": "late"}, headers=auth_headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["status"] == "late"
    assert update_resp.json()["data"]["previous_status"] == "present"
