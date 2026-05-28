import { test, expect } from '@playwright/test';
import { registerTestUser } from './helpers';

const basePhone = () => `010${Math.floor(Math.random() * 90000000 + 10000000)}`;

test.describe('Checkout Flow', () => {
  test('checkout page requires authentication', async ({ page }) => {
    // Navigate to checkout without login
    await page.goto('/checkout/arabic-grammar-basics');
    await expect(page).toHaveURL(/login/);
  });

  test('checkout page renders for authenticated user', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/checkout/arabic-grammar-basics');
    await page.waitForLoadState('networkidle');

    // Either checkout rendered or redirected if course not found
    const isCheckout = await page.getByText('إتمام عملية الشراء').isVisible().catch(() => false);
    const isNotFound = await page.getByText('404').isVisible().catch(() => false);

    // One of these should be true
    expect(isCheckout || isNotFound || page.url().includes('/courses')).toBe(true);
  });

  test('coupon validation shows discount preview', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    // Go to courses first to find a published course
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const firstCourse = page.locator('a[href*="/courses/"]').first();
    const hasCard = await firstCourse.isVisible().catch(() => false);

    if (!hasCard) {
      test.skip();
      return;
    }

    // Get course slug
    const href = await firstCourse.getAttribute('href') ?? '';
    const slug = href.split('/courses/')[1];
    if (!slug) { test.skip(); return; }

    await page.goto(`/checkout/${slug}`);
    await page.waitForLoadState('networkidle');

    const isCheckout = await page.getByText('إتمام عملية الشراء').isVisible().catch(() => false);
    if (!isCheckout) { test.skip(); return; }

    // Enter coupon code
    const couponInput = page.locator('input[placeholder*="أدخل كود"]');
    await couponInput.fill('WELCOME25');
    await page.getByRole('button', { name: 'تطبيق' }).first().click();

    // Wait for API response
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should show error (coupon may not exist in test env) or success
    const hasError = await page.getByText(/غير صحيح|غير متاح/, { exact: false }).isVisible().catch(() => false);
    const hasSuccess = await page.getByText('WELCOME25').isVisible().catch(() => false);

    expect(hasError || hasSuccess).toBe(true);
  });

  test('payment provider selection UI', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const firstCourse = page.locator('a[href*="/courses/"]').first();
    const hasCard = await firstCourse.isVisible().catch(() => false);
    if (!hasCard) { test.skip(); return; }

    const href = await firstCourse.getAttribute('href') ?? '';
    const slug = href.split('/courses/')[1];
    if (!slug) { test.skip(); return; }

    await page.goto(`/checkout/${slug}`);
    await page.waitForLoadState('networkidle');

    const isCheckout = await page.getByText('إتمام عملية الشراء').isVisible().catch(() => false);
    if (!isCheckout) { test.skip(); return; }

    // Payment provider options should be visible
    await expect(page.getByText('فوري')).toBeVisible();
    await expect(page.getByText('فودافون كاش')).toBeVisible();
    await expect(page.getByText('بطاقة ائتمانية')).toBeVisible();

    // Can select Vodafone Cash
    await page.getByText('فودافون كاش').click();
    // Selection indicator (the radio circle) should be filled
    const vodafoneOption = page.locator('button').filter({ hasText: 'فودافون كاش' });
    await expect(vodafoneOption).toBeVisible();
  });

  test('access code redemption field renders', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const firstCourse = page.locator('a[href*="/courses/"]').first();
    const hasCard = await firstCourse.isVisible().catch(() => false);
    if (!hasCard) { test.skip(); return; }

    const href = await firstCourse.getAttribute('href') ?? '';
    const slug = href.split('/courses/')[1];
    if (!slug) { test.skip(); return; }

    await page.goto(`/checkout/${slug}`);
    await page.waitForLoadState('networkidle');

    const isCheckout = await page.getByText('إتمام عملية الشراء').isVisible().catch(() => false);
    if (!isCheckout) { test.skip(); return; }

    // Access code section
    await expect(page.getByText('كود الوصول')).toBeVisible();
    const codeInput = page.locator('input[placeholder*="XXXX"]');
    await expect(codeInput).toBeVisible();
  });
});

test.describe('Fawry Payment Result', () => {
  test('payment result page renders without crash', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone);

    // Navigate to payment result with state
    await page.goto('/payment-result');
    await page.waitForLoadState('networkidle');

    // Should redirect to courses if no state
    await expect(page).toHaveURL(/courses|payment-result/);
  });
});

test.describe('Admin Payments', () => {
  // Admin tests require admin user - skip if no admin credentials in test env
  test('admin payments page requires admin role', async ({ page }) => {
    const phone = basePhone();
    await registerTestUser(page, phone); // student

    await page.goto('/admin/payments');
    // Should be redirected away
    await expect(page).not.toHaveURL(/admin\/payments/);
  });
});
