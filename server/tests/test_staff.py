import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_staff(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/staff", json={
        "emp_code": "EMP001",
        "name": "Alice Teacher",
        "gender": "female",
        "category": "teacher",
        "mobile": "9876543210",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Alice Teacher"
    assert data["data"]["emp_code"] == "EMP001"


@pytest.mark.asyncio
async def test_list_staff(client: AsyncClient, auth_headers: dict):
    await client.post("/api/v1/staff", json={
        "emp_code": "EMP002",
        "name": "Bob Peon",
        "gender": "male",
        "category": "peon",
    }, headers=auth_headers)
    resp = await client.get("/api/v1/staff", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_get_staff(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/staff", json={
        "emp_code": "EMP003",
        "name": "Carol Staff",
        "gender": "female",
        "category": "clerk",
    }, headers=auth_headers)
    staff_id = create_resp.json()["data"]["id"]
    resp = await client.get(f"/api/v1/staff/{staff_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == staff_id


@pytest.mark.asyncio
async def test_update_staff(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/staff", json={
        "emp_code": "EMP004",
        "name": "Dave Update",
        "gender": "male",
        "category": "teacher",
    }, headers=auth_headers)
    staff_id = create_resp.json()["data"]["id"]
    resp = await client.put(f"/api/v1/staff/{staff_id}", json={"name": "Dave Updated", "grade": "Senior"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "Dave Updated"
    assert resp.json()["data"]["grade"] == "Senior"


@pytest.mark.asyncio
async def test_teacher_subject_assignment(client: AsyncClient, auth_headers: dict):
    from tests.conftest import TEST_SCHOOL_ID
    # Create staff, AY, class section
    staff_resp = await client.post("/api/v1/staff", json={
        "emp_code": "EMP005",
        "name": "Eve Subject",
        "gender": "female",
        "category": "teacher",
    }, headers=auth_headers)
    staff_id = staff_resp.json()["data"]["id"]

    ay_resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "TS-AY",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = ay_resp.json()["data"]["id"]

    cs_resp = await client.post("/api/v1/class-sections", json={
        "school_id": TEST_SCHOOL_ID,
        "academic_year_id": ay_id,
        "class_name": "Grade 3",
        "section": "C",
    }, headers=auth_headers)
    cs_id = cs_resp.json()["data"]["id"]

    ts_resp = await client.post("/api/v1/teacher-subjects", json={
        "staff_id": staff_id,
        "subject": "Mathematics",
        "class_section_id": cs_id,
        "academic_year_id": ay_id,
    }, headers=auth_headers)
    assert ts_resp.status_code == 200
    data = ts_resp.json()
    assert data["success"] is True
    assert data["data"]["subject"] == "Mathematics"

    list_resp = await client.get(f"/api/v1/teacher-subjects?staff_id={staff_id}", headers=auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) >= 1
