import { Page, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ── Auth helpers ──────────────────────────────────────────────────

export async function registerTestUser(page: Page, phone: string, password = 'Test@1234') {
  await page.goto('/auth/register');
  await page.getByPlaceholder('محمد أحمد').fill('مستخدم تجربة');
  await page.locator('input[type="tel"]').fill(phone);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('input[type="password"]').nth(1).fill(password);
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

export async function loginTestUser(page: Page, phone: string, password = 'Test@1234') {
  await page.goto('/auth/login');
  await page.locator('input[type="tel"]').fill(phone);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

export async function apiCreateUser(phone: string, password = 'Test@1234', role = 'STUDENT') {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `User ${phone}`, phone, password }),
  });
  const data = await res.json();
  return data.data;
}

export async function apiLogin(phone: string, password = 'Test@1234') {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  return data.data?.accessToken as string;
}

export async function setAuthCookie(page: Page, phone: string, password = 'Test@1234') {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json();
  const token = data.data?.accessToken;
  if (!token) throw new Error('Login failed: ' + JSON.stringify(data));

  // Inject token into localStorage via page evaluation
  await page.addInitScript((t) => {
    const stored = JSON.parse(localStorage.getItem('academy-auth') || '{}');
    stored.state = { ...stored.state, accessToken: t, isAuthenticated: true };
    localStorage.setItem('academy-auth', JSON.stringify(stored));
  }, token);

  return token;
}

// ── Assertion helpers ─────────────────────────────────────────────

export async function expectToastSuccess(page: Page) {
  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 5_000 });
}

export async function expectToastError(page: Page) {
  const toast = page.locator('[role="alert"]').first();
  await expect(toast).toBeVisible({ timeout: 5_000 });
}

export async function waitForApiIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}
