#!/usr/bin/env node
import { chromium } from 'playwright';

const BASE = process.env.QA_URL || 'https://edulink-sms-app.vercel.app';
const PHONE = '8871352717';
const PASSWORD = 'Welcome1';
const issues = [];

const ROUTES = {
  superadmin: ['/schools', '/dashboard', '/students', '/staff', '/settings/users'],
  admin: [
    '/dashboard', '/students', '/staff', '/homework', '/homework/new',
    '/admissions/enquiries', '/admissions/registrations',
    '/attendance/students', '/leaves', '/exams', '/exams/new',
    '/communications/notices', '/settings/academic-years', '/settings/class-sections',
    '/settings/subjects', '/settings/users', '/staff/new',
  ],
};

async function login(page, { role }) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByPlaceholder(/10-digit phone/i).fill(PHONE);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForTimeout(2000);
  if (await page.locator('select').count()) {
    const options = await page.locator('select option').allTextContents();
    const pick = options.findIndex((t) => {
      if (!t || t.includes('select account')) return false;
      if (role === 'superadmin') return /\(superadmin\)/i.test(t);
      if (role === 'admin') return /\(admin\)/i.test(t);
      return false;
    });
    if (pick < 0) throw new Error(`No ${role} account in: ${options.join(', ')}`);
    await page.locator('select').selectOption({ index: pick });
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.waitForTimeout(2500);
  }
}

async function visitRoutes(page, routes, role) {
  for (const route of routes) {
    const fails = [];
    const handler = (res) => {
      const u = res.url();
      if (u.includes('railway.app') && res.status() >= 400) {
        fails.push(`${res.status()} ${res.request().method()} ${u.split('/api/v1')[1] || u}`);
      }
    };
    page.on('response', handler);
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => {
      fails.push(`nav: ${e.message}`);
      return null;
    });
    await page.waitForTimeout(500);
    page.off('response', handler);
    const is404 = resp?.status() === 404 || (await page.locator('text=404').count()) > 0;
    if (is404) fails.push('page 404');
    if (fails.length) issues.push({ role, route, fails });
    console.log(`${fails.length ? '✗' : '✓'} [${role}] ${route}${fails.length ? ' → ' + fails.join('; ') : ''}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== Superadmin ===');
  await login(page, { role: 'superadmin' });
  if (await page.getByRole('button', { name: /^select$/i }).count()) {
    await page.getByRole('button', { name: /^select$/i }).first().click();
    await page.waitForTimeout(1000);
  }
  await visitRoutes(page, ROUTES.superadmin, 'superadmin');

  console.log('\n=== Admin ===');
  await page.goto(`${BASE}/login`);
  await login(page, { role: 'admin' });
  await visitRoutes(page, ROUTES.admin, 'admin');

  console.log('\n=== Parent ===');
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder(/10-digit phone/i).fill('9111222333');
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForTimeout(2500);
  await visitRoutes(page, ['/dashboard', '/communications/notices', '/communications/concerns'], 'parent');

  console.log('\n=== Teacher ===');
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder(/10-digit phone/i).fill('9222333444');
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForTimeout(2500);
  await visitRoutes(page, ['/dashboard', '/homework', '/leaves', '/attendance/students'], 'teacher');

  console.log('\n=== Issues ===');
  console.log(JSON.stringify(issues, null, 2));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
