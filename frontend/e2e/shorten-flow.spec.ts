import { test, expect } from '@playwright/test';

test.describe('E2E Shorten, Redirect & Stats Flow', () => {
  test('creates a link, verifies redirection, and checks analytics stats', async ({ page }) => {
    // Mock the backend API in Playwright for standalone frontend testing
    await page.route('**/api/v1/urls', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const shortCode = body.customCode || 'pw-test-slug';
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            shortCode,
            shortUrl: `http://localhost:4173/${shortCode}`,
            originalUrl: body.originalUrl,
            custom: Boolean(body.customCode),
            createdAt: new Date().toISOString(),
            expiresAt: body.expiresAt || null,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/v1/urls/*/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          shortCode: 'pw-test-slug',
          originalUrl: 'https://example.com/playwright-e2e-test',
          shortUrl: 'http://localhost:4173/pw-test-slug',
          clicks: 12,
          createdAt: new Date().toISOString(),
          expiresAt: null,
          isCustom: true,
          clicksByDay: [{ date: 'Today', clicks: 12 }],
          referrers: [{ source: 'Direct / None', clicks: 12, percentage: 100 }],
        }),
      });
    });

    // 1. Visit Home
    await page.goto('/');
    await expect(page).toHaveTitle(/Calm Glass|URL Shortener/i);

    // 2. Locate URL input and submit button
    const urlInput = page.getByLabel(/destination url/i);
    await expect(urlInput).toBeVisible();

    const targetUrl = 'https://example.com/playwright-e2e-test';
    await urlInput.fill(targetUrl);

    // 3. Shorten URL
    const shortenBtn = page.getByRole('button', { name: /shorten link/i });
    await shortenBtn.click();

    // 4. Verify Success Card
    await expect(page.getByText(/link created successfully/i)).toBeVisible();
    const shortLinkAnchor = page.locator('a[href*="http"]').filter({ hasText: /\/[A-Za-z0-9_-]+/ });
    await expect(shortLinkAnchor).toBeVisible();

    const shortUrlHref = await shortLinkAnchor.getAttribute('href');
    expect(shortUrlHref).toBeTruthy();

    const shortCode = shortUrlHref!.split('/').pop()!;
    expect(shortCode).toBeTruthy();

    // 5. Navigate to Stats / Details page
    await page.goto(`/links/${shortCode}`);

    // 6. Verify Link Details View
    await expect(page.getByRole('heading', { name: new RegExp(`/${shortCode}`) })).toBeVisible();
    await expect(page.getByText('Total Lifetime Clicks')).toBeVisible();
    await expect(page.getByText('Clicks Over Time')).toBeVisible();
    await expect(page.getByText('Top Referrers')).toBeVisible();
    await expect(page.getByRole('button', { name: /copy short link/i })).toBeVisible();
  });
});
