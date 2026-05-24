#!/usr/bin/env node
/**
 * Production API QA + seed test data
 */
const API = process.env.API_URL || 'https://better-sms-api-production.up.railway.app/api/v1';
const SCHOOL = process.env.SCHOOL_ID || 'f2201288-4827-4e2f-9660-554d45910690';
const PHONE = '8871352717';
const PASSWORD = 'Welcome1';

const issues = [];

async function login(userId) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: PHONE, password: PASSWORD, user_id: userId }),
  });
  const j = await res.json();
  if (!j.data?.token) throw new Error(`Login failed ${userId}: ${JSON.stringify(j)}`);
  return j.data.token;
}

async function req(method, path, token, body, schoolHeader = true) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (schoolHeader) headers['X-School-Id'] = SCHOOL;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

function record(name, status, detail) {
  const ok = status >= 200 && status < 300;
  if (!ok) issues.push({ name, status, detail });
  console.log(`${ok ? '✓' : '✗'} ${name} (${status})${detail ? ' ' + String(detail).slice(0, 80) : ''}`);
  return ok;
}

async function main() {
  const ADMIN_ID = '0ef32a56-e1b4-4608-8a09-d81fa86550b9';
  const SUPER_ID = '47fa9c30-45b2-4639-a11a-cc9d94cf6701';

  const adminToken = await login(ADMIN_ID);
  const superToken = await login(SUPER_ID);

  // Routes smoke
  const routes = [
    'dashboard/header-summary', 'dashboard/birthdays', 'students', 'staff', 'exams',
    'enquiries', 'registrations', 'homework', 'leaves', 'users', 'subjects',
    'class-sections', 'academic-years/active', 'communications/notices', 'timetable/period-config',
  ];
  console.log('\n--- Admin API smoke ---');
  for (const r of routes) {
    const { status, json } = await req('GET', `/${r}`, adminToken);
    record(r, status, json.error || json.detail);
  }

  // Create enquiry
  console.log('\n--- Create test data ---');
  const today = new Date().toISOString().slice(0, 10);
  let { status, json } = await req('POST', '/enquiries', adminToken, {
    parent_name: 'QA Parent',
    student_name: 'QA Student',
    mobile: '9888777666',
    date: today,
    purpose: 'new_admission',
    notes: 'E2E test enquiry',
  });
  const enquiryId = json.data?.id;
  record('POST /enquiries', status, json.detail || json.error);

  ({ status, json } = await req('POST', '/staff', adminToken, {
    emp_code: 'TQA002',
    name: 'QA Teacher Two',
    gender: 'female',
    category: 'teacher',
    mobile: '9777766665',
  }));
  const staffId = json.data?.id;
  record('POST /staff', status, json.detail);

  ({ status, json } = await req('GET', '/academic-years/active', adminToken));
  const ayId = json.data?.id;
  record('GET active AY', status);

  ({ status, json } = await req('GET', '/class-sections', adminToken));
  let csId = json.data?.[0]?.id;
  if (!csId && ayId) {
    ({ status, json } = await req('POST', '/class-sections', adminToken, {
      school_id: SCHOOL,
      academic_year_id: ayId,
      class_name: 'Grade 2',
      section: 'B',
    }));
    csId = json.data?.id;
    record('POST /class-sections', status, json.detail);
  }

  if (enquiryId && ayId) {
    ({ status, json } = await req('POST', `/enquiries/${enquiryId}/convert`, adminToken, {
      academic_year_id: ayId,
    }));
    record('POST convert enquiry', status, json.detail);
    const regId = json.data?.id;
    if (regId) {
      ({ status, json } = await req('POST', `/registrations/${regId}/accept`, adminToken));
      record('POST accept registration', status, json.detail);
      if (csId) {
        ({ status, json } = await req('POST', '/students/admit', adminToken, {
          registration_id: regId,
          class_section_id: csId,
          student_type: 'new',
          hosteller: false,
          admission_type: 'regular',
        }));
        record('POST admit student', status, json.detail);
      }
    }
  }

  if (ayId && csId) {
    ({ status, json } = await req('POST', '/homework', adminToken, {
      academic_year_id: ayId,
      class_section_id: csId,
      subject: 'Math',
      title: 'QA Homework',
      description: 'Test',
      assigned_date: today,
      due_date: today,
    }));
    record('POST /homework', status, json.detail);

    ({ status, json } = await req('POST', '/exams', adminToken, {
      academic_year_id: ayId,
      name: 'QA Unit Test',
      exam_type: 'unit_test',
    }));
    record('POST /exams', status, json.detail);
  }

  // Create parent/teacher users (skip if already present; 409 after backend fix)
  ({ status, json } = await req('GET', '/users?limit=100', adminToken));
  const existingPhones = new Set((json.data ?? []).map((u) => u.phone));

  if (!existingPhones.has('9111222333')) {
    ({ status, json } = await req('POST', '/users', adminToken, {
      phone: '9111222333',
      email: 'qa.parent@test.local',
      password: PASSWORD,
      role: 'parent',
    }));
    record('POST parent user', status === 409 ? 200 : status, status === 409 ? 'already exists' : json.detail);
  } else {
    record('POST parent user', 200, 'already exists');
  }

  if (!existingPhones.has('9222333444')) {
    ({ status, json } = await req('POST', '/users', adminToken, {
      phone: '9222333444',
      email: 'qa.teacher@test.local',
      password: PASSWORD,
      role: 'teacher',
      entity_id: staffId,
    }));
    record('POST teacher user', status === 409 ? 200 : status, status === 409 ? 'already exists' : json.detail);
  } else {
    record('POST teacher user', 200, 'already exists');
  }

  // Parent login
  console.log('\n--- Parent login ---');
  const parentLogin = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-School-Id': SCHOOL },
    body: JSON.stringify({ identifier: '9111222333', password: PASSWORD }),
  });
  const pj = await parentLogin.json();
  record('parent login', parentLogin.status, pj.detail || (pj.data?.token ? 'ok' : pj.meta));

  console.log('\n--- Issues ---');
  if (issues.length === 0) console.log('None');
  else issues.forEach((i) => console.log(JSON.stringify(i)));
}

main().catch((e) => { console.error(e); process.exit(1); });
