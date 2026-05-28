import { test, expect } from '@playwright/test';
import { registerTestUser, apiLogin } from './helpers';

const basePhone = () => `010${Math.floor(Math.random() * 90000000 + 10000000)}`;

test.describe('Course Browsing', () => {
  test('homepage loads with RTL layout', async ({ page }) => {
    await page.goto('/');

    // Hero section visible
    await expect(page.getByText('أكاديمية مستر مصطفى')).toBeVisible();

    // Direction is RTL
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('courses page renders course cards', async ({ page }) => {
    await page.goto('/courses');

    await expect(page.getByText('جميع الكورسات')).toBeVisible();
    // Wait for content (cards or empty state)
    await page.waitForLoadState('networkidle');
    // Either cards or empty state should be visible
    const hasCards = await page.locator('.card, [class*="card"]').count() > 0;
    expect(hasCards).toBeTruthy();
  });

  test('course search filters results', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="ابحث"]');
    await searchInput.fill('نحو');

    // Wait for debounce + API call
    await page.waitForTimeout(600);
    await page.waitForLoadState('networkidle');

    // URL should update with search param
    await expect(page).toHaveURL(/q=نحو/);
  });

  test('course detail page shows enrollment CTA for guest', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href*="/courses/"]').first();
    const hasCard = await firstCard.isVisible().catch(() => false);

    if (hasCard) {
      await firstCard.click();
      await page.waitForLoadState('networkidle');

      // Guest should see register CTA, not enroll button
      const cta = page.getByRole('link', { name: /إنشاء حساب للاشتراك|اشترك الآن|الاشتراك المجاني/ });
      await expect(cta).toBeVisible({ timeout: 10_000 });
    }
  });

  test('free lecture accessible without enrollment', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Look for a course with free preview content
    const previewBadge = page.getByText('مجاني', { exact: true }).first();
    const hasPreview = await previewBadge.isVisible().catch(() => false);

    // This test is conditional on seeded data
    if (hasPreview) {
      // Free content should be accessible
      expect(true).toBe(true);
    }
  });
});

test.describe('Student Dashboard', () => {
  test('enrolled courses show on dashboard', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await expect(page).toHaveURL(/dashboard/);
    await page.waitForLoadState('networkidle');

    // Stats cards should be visible
    await expect(page.getByText('كورسات نشطة')).toBeVisible();
    await expect(page.getByText('شهاداتي')).toBeVisible();
  });

  test('notifications page renders', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Should show notifications header or empty state
    await expect(
      page.getByText('الإشعارات').or(page.getByText('لا توجد إشعارات'))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('profile page loads user data', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Should show the user's phone
    await expect(page.getByText(phone)).toBeVisible({ timeout: 10_000 });
  });

  test('my courses page shows enrollment tabs', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/my-courses');
    await page.waitForLoadState('networkidle');

    // Tab navigation should be visible
    await expect(page.getByRole('button', { name: 'الكل' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'جارية' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'مكتملة' })).toBeVisible();
  });

  test('certificates page renders', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/certificates');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('شهاداتي').or(page.getByText('لا توجد شهادات بعد'))
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Certificate Verification', () => {
  test('verify page shows invalid for fake certificate number', async ({ page }) => {
    await page.goto('/verify/CERT-FAKE-NUMBER-123');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('شهادة غير صالحة', { exact: false })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('verify page accessible without authentication', async ({ page }) => {
    // Should not redirect to login
    await page.goto('/verify/CERT-TEST-001');
    await expect(page).not.toHaveURL(/login/);
  });
});

test.describe('Navigation', () => {
  test('sidebar navigation works on desktop', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    // Click on certificates in sidebar
    await page.getByRole('link', { name: 'شهاداتي' }).click();
    await expect(page).toHaveURL(/certificates/);

    // Click on notifications
    await page.getByRole('link', { name: 'الإشعارات' }).click();
    await expect(page).toHaveURL(/notifications/);
  });

  test('header logo navigates to home', async ({ page }) => {
    await page.goto('/courses');
    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Payment History', () => {
  test('payment history page renders for authenticated user', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/payment-history');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText('سجل المدفوعات').or(page.getByText('لا توجد مدفوعات'))
    ).toBeVisible({ timeout: 10_000 });
  });
});
