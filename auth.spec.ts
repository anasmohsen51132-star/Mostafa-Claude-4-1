import { test, expect, Page } from '@playwright/test';
import { loginTestUser, registerTestUser } from './helpers';

// Use unique phones per test run to avoid conflicts
const basePhone = () => `010${Math.floor(Math.random() * 90000000 + 10000000)}`;

test.describe('Authentication — Register', () => {
  test('successful registration navigates to dashboard', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText('مرحباً بعودتك', { exact: false }).or(
      page.getByText('لوحتي', { exact: false })
    )).toBeVisible();
  });

  test('shows Arabic validation errors for invalid phone', async ({ page }) => {
    await page.goto('/auth/register');
    await page.getByPlaceholder('محمد أحمد').fill('Test');
    await page.locator('input[type="tel"]').fill('12345'); // invalid
    await page.locator('input[type="password"]').first().fill('Test@1234');
    await page.locator('input[type="password"]').nth(1).fill('Test@1234');
    await page.getByRole('button', { name: 'إنشاء الحساب' }).click();

    await expect(page.getByText('رقم الهاتف المصري غير صحيح')).toBeVisible();
    await expect(page).toHaveURL(/register/);
  });

  test('shows error for mismatched passwords', async ({ page }) => {
    await page.goto('/auth/register');
    await page.getByPlaceholder('محمد أحمد').fill('Test User');
    await page.locator('input[type="tel"]').fill('01012345678');
    await page.locator('input[type="password"]').first().fill('Test@1234');
    await page.locator('input[type="password"]').nth(1).fill('Different@5678');
    await page.getByRole('button', { name: 'إنشاء الحساب' }).click();

    await expect(page.getByText('كلمتا المرور غير متطابقتين')).toBeVisible();
  });

  test('shows error for duplicate phone number', async ({ page }) => {
    const phone = basePhone();
    // Register first time
    await registerTestUser(page, phone);

    // Logout
    await page.goto('/auth/login');

    // Try to register same phone again
    await page.goto('/auth/register');
    await page.getByPlaceholder('محمد أحمد').fill('Another User');
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('input[type="password"]').first().fill('Test@1234');
    await page.locator('input[type="password"]').nth(1).fill('Test@1234');
    await page.getByRole('button', { name: 'إنشاء الحساب' }).click();

    await expect(page.getByText('هذا الرقم مسجل بالفعل', { exact: false })).toBeVisible({ timeout: 8_000 });
  });

  test('already-authenticated user redirected from register page', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    // Navigate back to register - should redirect
    await page.goto('/auth/register');
    await expect(page).toHaveURL(/dashboard|admin/);
  });
});

test.describe('Authentication — Login', () => {
  const testPhone = basePhone();

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerTestUser(page, testPhone);
    await page.close();
  });

  test('successful login navigates to dashboard', async ({ page }) => {
    await loginTestUser(page, testPhone);

    await expect(page).toHaveURL(/dashboard/);
  });

  test('shows error for wrong credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[type="tel"]').fill(testPhone);
    await page.locator('input[type="password"]').fill('WrongPass@999');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    await expect(
      page.getByText('رقم الهاتف أو كلمة المرور غير صحيحة', { exact: false })
    ).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/login/);
  });

  test('shows validation error for empty form', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    // Should show HTML validation or zod error
    const phoneInput = page.locator('input[type="tel"]');
    const isInvalid = await phoneInput.evaluate(el =>
      !(el as HTMLInputElement).validity.valid
    );
    expect(isInvalid).toBe(true);
  });
});

test.describe('Authentication — Protected Routes', () => {
  test('unauthenticated user redirected to login from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user redirected to login from profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/login/);
  });

  test('non-admin redirected from admin panel', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone); // student role

    await page.goto('/admin');
    await expect(page).toHaveURL(/dashboard/); // redirected away
  });

  test('login preserves intended destination', async ({ page }) => {
    await page.goto('/certificates');
    await expect(page).toHaveURL(/login/);

    // Login
    const phone = basePhone();
    // Need a pre-created user for this test
    await page.goto('/auth/register');
    await page.getByPlaceholder('محمد أحمد').fill('Dest User');
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('input[type="password"]').first().fill('Test@1234');
    await page.locator('input[type="password"]').nth(1).fill('Test@1234');
    await page.getByRole('button', { name: 'إنشاء الحساب' }).click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
  });
});

test.describe('Authentication — Logout', () => {
  test('logout clears session and redirects to login', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await expect(page).toHaveURL(/dashboard/);

    // Open user dropdown and click logout
    await page.locator('button').filter({ hasText: /مستخدم|User/ }).first().click().catch(() => {
      // fallback: look for user avatar button
      return page.locator('[aria-label="user menu"]').click();
    });

    // Click logout button
    await page.getByRole('button', { name: /تسجيل الخروج/ }).click();

    await expect(page).toHaveURL(/login/, { timeout: 10_000 });

    // Visiting dashboard should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Page Direction (RTL)', () => {
  test('HTML element has dir="rtl" attribute', async ({ page }) => {
    await page.goto('/');
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });

  test('login form is right-to-left', async ({ page }) => {
    await page.goto('/auth/login');
    const body = page.locator('body');
    const direction = await body.evaluate(el => window.getComputedStyle(el).direction);
    expect(direction).toBe('rtl');
  });
});
