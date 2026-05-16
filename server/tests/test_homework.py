import pytest
from datetime import date, timedelta
from httpx import AsyncClient


async def _setup_for_homework(client: AsyncClient, auth_headers: dict) -> dict:
    from tests.conftest import TEST_SCHOOL_ID
    ay_resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "HW-AY",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = ay_resp.json()["data"]["id"]
    cs_resp = await client.post("/api/v1/class-sections", json={
        "school_id": TEST_SCHOOL_ID,
        "academic_year_id": ay_id,
        "class_name": "Grade 4",
        "section": "D",
    }, headers=auth_headers)
    cs_id = cs_resp.json()["data"]["id"]
    return {"ay_id": ay_id, "cs_id": cs_id}


@pytest.mark.asyncio
async def test_create_homework(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_homework(client, auth_headers)
    today = date.today()
    resp = await client.post("/api/v1/homework", json={
        "academic_year_id": ctx["ay_id"],
        "class_section_id": ctx["cs_id"],
        "subject": "English",
        "title": "Chapter 5 Reading",
        "description": "Read and summarize chapter 5",
        "assigned_date": str(today),
        "due_date": str(today + timedelta(days=3)),
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["title"] == "Chapter 5 Reading"
    assert data["data"]["status"] == "active"


@pytest.mark.asyncio
async def test_list_homework(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_homework(client, auth_headers)
    today = date.today()
    await client.post("/api/v1/homework", json={
        "academic_year_id": ctx["ay_id"],
        "class_section_id": ctx["cs_id"],
        "subject": "Math",
        "title": "Problem Set 1",
        "assigned_date": str(today),
        "due_date": str(today + timedelta(days=2)),
    }, headers=auth_headers)
    resp = await client.get(f"/api/v1/homework?class_section_id={ctx['cs_id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1


@pytest.mark.asyncio
async def test_get_homework(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_homework(client, auth_headers)
    today = date.today()
    create_resp = await client.post("/api/v1/homework", json={
        "academic_year_id": ctx["ay_id"],
        "class_section_id": ctx["cs_id"],
        "subject": "Science",
        "title": "Lab Report",
        "assigned_date": str(today),
        "due_date": str(today + timedelta(days=5)),
    }, headers=auth_headers)
    hw_id = create_resp.json()["data"]["id"]
    resp = await client.get(f"/api/v1/homework/{hw_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == hw_id


@pytest.mark.asyncio
async def test_cancel_homework(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_homework(client, auth_headers)
    today = date.today()
    create_resp = await client.post("/api/v1/homework", json={
        "academic_year_id": ctx["ay_id"],
        "class_section_id": ctx["cs_id"],
        "subject": "History",
        "title": "Essay Assignment",
        "assigned_date": str(today),
        "due_date": str(today + timedelta(days=7)),
    }, headers=auth_headers)
    hw_id = create_resp.json()["data"]["id"]
    resp = await client.patch(f"/api/v1/homework/{hw_id}/cancel", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "cancelled"


@pytest.mark.asyncio
async def test_delete_homework(client: AsyncClient, auth_headers: dict):
    ctx = await _setup_for_homework(client, auth_headers)
    today = date.today()
    create_resp = await client.post("/api/v1/homework", json={
        "academic_year_id": ctx["ay_id"],
        "class_section_id": ctx["cs_id"],
        "subject": "Art",
        "title": "Drawing Assignment",
        "assigned_date": str(today),
        "due_date": str(today + timedelta(days=4)),
    }, headers=auth_headers)
    hw_id = create_resp.json()["data"]["id"]
    del_resp = await client.delete(f"/api/v1/homework/{hw_id}", headers=auth_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["data"]["deleted"] == hw_id
    # Confirm gone
    get_resp = await client.get(f"/api/v1/homework/{hw_id}", headers=auth_headers)
    assert get_resp.status_code == 404
