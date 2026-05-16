import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_school(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/schools", json={
        "name": "Test School",
        "branch_name": "Main Branch",
        "phone": "1234567890",
        "email": "school@test.com",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Test School"
    assert "id" in data["data"]


@pytest.mark.asyncio
async def test_list_schools(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/schools", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert data["meta"]["page"] == 1


@pytest.mark.asyncio
async def test_create_and_get_school(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/schools", json={"name": "Fetch School"}, headers=auth_headers)
    school_id = create_resp.json()["data"]["id"]
    get_resp = await client.get(f"/api/v1/schools/{school_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == school_id


@pytest.mark.asyncio
async def test_create_academic_year(client: AsyncClient, auth_headers: dict):
    from tests.conftest import TEST_SCHOOL_ID
    resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "2025-2026",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["label"] == "2025-2026"


@pytest.mark.asyncio
async def test_activate_academic_year(client: AsyncClient, auth_headers: dict):
    from tests.conftest import TEST_SCHOOL_ID
    # Create two academic years
    r1 = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "AY-A",
        "start_date": "2024-04-01",
        "end_date": "2025-03-31",
    }, headers=auth_headers)
    r2 = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "AY-B",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = r2.json()["data"]["id"]
    act = await client.post(f"/api/v1/academic-years/{ay_id}/activate", headers=auth_headers)
    assert act.status_code == 200
    assert act.json()["data"]["is_active"] is True


@pytest.mark.asyncio
async def test_create_class_section(client: AsyncClient, auth_headers: dict):
    from tests.conftest import TEST_SCHOOL_ID
    ay_resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "CS-AY",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = ay_resp.json()["data"]["id"]
    resp = await client.post("/api/v1/class-sections", json={
        "school_id": TEST_SCHOOL_ID,
        "academic_year_id": ay_id,
        "class_name": "Grade 1",
        "section": "A",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["class_name"] == "Grade 1"
    assert data["data"]["section"] == "A"
