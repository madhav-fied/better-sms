import pytest
from httpx import AsyncClient


async def _setup_student(client: AsyncClient, auth_headers: dict) -> dict:
    """Helper: create school, AY, class section, registration, accept it, then admit student."""
    from tests.conftest import TEST_SCHOOL_ID
    ay_resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "STU-AY",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = ay_resp.json()["data"]["id"]

    cs_resp = await client.post("/api/v1/class-sections", json={
        "school_id": TEST_SCHOOL_ID,
        "academic_year_id": ay_id,
        "class_name": "Grade 5",
        "section": "B",
    }, headers=auth_headers)
    cs_id = cs_resp.json()["data"]["id"]

    reg_resp = await client.post("/api/v1/registrations", json={
        "academic_year_id": ay_id,
        "student_fields": {"first_name": "Bob", "last_name": "Builder", "gender": "male"},
    }, headers=auth_headers)
    reg_id = reg_resp.json()["data"]["id"]

    await client.post(f"/api/v1/registrations/{reg_id}/accept", headers=auth_headers)

    admit_resp = await client.post("/api/v1/students/admit", json={
        "registration_id": reg_id,
        "class_section_id": cs_id,
        "student_type": "new",
        "hosteller": False,
        "admission_type": "regular",
    }, headers=auth_headers)
    return admit_resp.json()["data"]


@pytest.mark.asyncio
async def test_admit_and_get_student(client: AsyncClient, auth_headers: dict):
    student = await _setup_student(client, auth_headers)
    assert student["first_name"] == "Bob"
    assert student["admission_no"] is not None

    resp = await client.get(f"/api/v1/students/{student['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == student["id"]


@pytest.mark.asyncio
async def test_list_students(client: AsyncClient, auth_headers: dict):
    await _setup_student(client, auth_headers)
    resp = await client.get("/api/v1/students", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_update_student(client: AsyncClient, auth_headers: dict):
    student = await _setup_student(client, auth_headers)
    resp = await client.put(f"/api/v1/students/{student['id']}", json={
        "first_name": "Robert",
        "blood_group": "O+",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["first_name"] == "Robert"
    assert resp.json()["data"]["blood_group"] == "O+"


@pytest.mark.asyncio
async def test_toggle_student_status(client: AsyncClient, auth_headers: dict):
    student = await _setup_student(client, auth_headers)
    assert student["status"] == "active"
    resp = await client.patch(f"/api/v1/students/{student['id']}/status", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "inactive"
