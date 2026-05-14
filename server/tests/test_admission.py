import pytest
from datetime import date
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_enquiry(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/enquiries", json={
        "parent_name": "John Doe",
        "student_name": "Jane Doe",
        "mobile": "9876543210",
        "purpose": "new_admission",
        "date": str(date.today()),
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["data"]["parent_name"] == "John Doe"
    assert data["data"]["enq_no"].startswith("ENQ-")


@pytest.mark.asyncio
async def test_list_enquiries(client: AsyncClient, auth_headers: dict):
    await client.post("/api/v1/enquiries", json={
        "parent_name": "List Test",
        "student_name": "Student",
        "mobile": "1111111111",
        "purpose": "new_admission",
        "date": str(date.today()),
    }, headers=auth_headers)
    resp = await client.get("/api/v1/enquiries", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_get_enquiry(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/enquiries", json={
        "parent_name": "Get Test",
        "student_name": "Get Student",
        "mobile": "2222222222",
        "purpose": "new_admission",
        "date": str(date.today()),
    }, headers=auth_headers)
    enq_id = create_resp.json()["data"]["id"]
    resp = await client.get(f"/api/v1/enquiries/{enq_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == enq_id


@pytest.mark.asyncio
async def test_reject_enquiry(client: AsyncClient, auth_headers: dict):
    create_resp = await client.post("/api/v1/enquiries", json={
        "parent_name": "Reject Test",
        "student_name": "Reject Student",
        "mobile": "3333333333",
        "purpose": "new_admission",
        "date": str(date.today()),
    }, headers=auth_headers)
    enq_id = create_resp.json()["data"]["id"]
    resp = await client.patch(f"/api/v1/enquiries/{enq_id}/reject", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "rejected"


@pytest.mark.asyncio
async def test_create_registration(client: AsyncClient, auth_headers: dict):
    from tests.conftest import TEST_SCHOOL_ID
    ay_resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "REG-AY",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = ay_resp.json()["data"]["id"]
    resp = await client.post("/api/v1/registrations", json={
        "academic_year_id": ay_id,
        "student_fields": {"first_name": "Alice", "last_name": "Smith", "gender": "female"},
        "parent_guardians": [{"relation": "mother", "name": "Mary Smith", "mobile": "5555555555"}],
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert len(data["data"]["parent_guardians"]) == 1


@pytest.mark.asyncio
async def test_convert_enquiry_to_registration(client: AsyncClient, auth_headers: dict):
    from tests.conftest import TEST_SCHOOL_ID
    ay_resp = await client.post("/api/v1/academic-years", json={
        "school_id": TEST_SCHOOL_ID,
        "label": "CONV-AY",
        "start_date": "2025-04-01",
        "end_date": "2026-03-31",
    }, headers=auth_headers)
    ay_id = ay_resp.json()["data"]["id"]
    enq_resp = await client.post("/api/v1/enquiries", json={
        "parent_name": "Convert Parent",
        "student_name": "Convert Student",
        "mobile": "4444444444",
        "purpose": "new_admission",
        "date": str(date.today()),
    }, headers=auth_headers)
    enq_id = enq_resp.json()["data"]["id"]
    convert_resp = await client.post(f"/api/v1/enquiries/{enq_id}/convert", json={
        "academic_year_id": ay_id,
        "student_fields": {"first_name": "Convert", "last_name": "Student", "gender": "male"},
    }, headers=auth_headers)
    assert convert_resp.status_code == 200
    assert convert_resp.json()["data"]["enquiry_id"] == enq_id
    # Check enquiry status updated
    enq_check = await client.get(f"/api/v1/enquiries/{enq_id}", headers=auth_headers)
    assert enq_check.json()["data"]["status"] == "converted"
