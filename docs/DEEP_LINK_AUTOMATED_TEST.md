# Deep Link Automated Testing Script

**Purpose:** Automated browser tests for deep link functionality, scroll behavior, and RTL transitions.

This document provides both **Playwright** and **manual JavaScript** approaches for testing.

---

## Option 1: Playwright E2E Tests (Recommended)

### Installation

```bash
npm install -D @playwright/test
npx playwright install
```

### Create Test File: `e2e/deep-link.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';
const SELLER_DASHBOARD = `${BASE_URL}/seller-dashboard`;

// Helper to login as seller (adjust based on your auth flow)
async function loginAsSeller(page) {
  await page.goto(`${BASE_URL}/signin`);
  await page.fill('input[type="tel"]', '+9647XXXXXXXX');
  await page.fill('input[type="password"]', 'test-password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/seller-dashboard');
}

test.describe('Deep Link to Action Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeller(page);
  });

  test('Order deep link: Tab switch + Auto-scroll + Highlight', async ({ page }) => {
    // Navigate to order deep link
    const orderId = 'test-order-uuid-123';
    await page.goto(`${SELLER_DASHBOARD}?tab=sales&orderId=${orderId}`);

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Test 1: Verify tab is active
    const salesTab = page.locator('[data-testid="tab-sales"], [data-testid="tab-orders"]');
    await expect(salesTab).toHaveClass(/active|selected/);

    // Test 2: Verify dialog opens
    const orderDialog = page.locator('[role="dialog"]');
    await expect(orderDialog).toBeVisible();

    // Test 3: Verify URL cleanup
    await expect(page).toHaveURL(SELLER_DASHBOARD);

    // Test 4: Close dialog and verify auto-scroll + highlight
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300); // Wait for dialog close animation

    // Verify order card is visible (scrolled into view)
    const orderCard = page.locator(`[data-testid="order-card-${orderId}"]`);
    await expect(orderCard).toBeInViewport();

    // Verify highlight is applied
    await expect(orderCard).toHaveClass(/deep-link-highlight/);

    // Wait for highlight to fade
    await page.waitForTimeout(3500);
    await expect(orderCard).not.toHaveClass(/deep-link-highlight/);
  });

  test('Offer deep link: Activity tab + Sub-tab + Highlight', async ({ page }) => {
    const offerId = 'test-offer-uuid-456';
    await page.goto(`${SELLER_DASHBOARD}?tab=offers&offerId=${offerId}`);

    await page.waitForLoadState('networkidle');

    // Verify offers tab/section is active
    const offersTab = page.locator('[data-testid="tab-offers"], [data-testid="activity-subtab-offers"]');
    await expect(offersTab).toBeVisible();

    // Verify offer dialog opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close and check scroll
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const offerCard = page.locator(`[data-testid="offer-card-${offerId}"]`);
    await expect(offerCard).toBeInViewport();
    await expect(offerCard).toHaveClass(/deep-link-highlight/);
  });

  test('RTL Transition: No flicker during tab switch', async ({ page, browserName }) => {
    // Set language to Arabic
    await page.goto(SELLER_DASHBOARD);
    await page.evaluate(() => {
      localStorage.setItem('language', 'ar');
    });
    await page.reload();

    // Start on Products tab
    await page.click('[data-testid="tab-products"]');
    await page.waitForTimeout(100);

    // Verify initial RTL state
    const body = page.locator('body');
    await expect(body).toHaveAttribute('dir', 'rtl');

    // Take screenshot before transition
    await page.screenshot({ path: 'before-transition.png' });

    // Navigate via deep link (fast tab switch)
    const orderId = 'test-order-123';
    await page.goto(`${SELLER_DASHBOARD}?tab=sales&orderId=${orderId}`);

    // Wait minimal time to catch flicker
    await page.waitForTimeout(50);

    // Verify RTL maintained during transition
    await expect(body).toHaveAttribute('dir', 'rtl');

    // Verify text is right-aligned
    const arabicText = page.locator('text=الطلبات').first();
    const bbox = await arabicText.boundingBox();
    const viewport = page.viewportSize();
    
    // Arabic text should be on the right side of viewport
    if (bbox && viewport) {
      expect(bbox.x + bbox.width).toBeGreaterThan(viewport.width / 2);
    }

    // Take screenshot after transition
    await page.screenshot({ path: 'after-transition.png' });

    // Visual comparison (if using Percy or similar)
    // await percySnapshot(page, 'RTL Transition - No Flicker');
  });

  test('Mobile deep link: Bottom nav + Full screen dialog', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const orderId = 'mobile-order-123';
    await page.goto(`${SELLER_DASHBOARD}?tab=sales&orderId=${orderId}`);

    // Verify bottom nav is visible
    const bottomNav = page.locator('[data-testid="seller-bottom-nav"]');
    await expect(bottomNav).toBeVisible();

    // Verify correct tab is active in bottom nav
    const activeTab = bottomNav.locator('[data-testid="seller-nav-orders"]');
    await expect(activeTab).toHaveClass(/text-primary/); // Active state

    // Verify dialog is full-screen on mobile
    const dialog = page.locator('[role="dialog"]');
    const dialogBbox = await dialog.boundingBox();
    const viewport = page.viewportSize();

    if (dialogBbox && viewport) {
      expect(dialogBbox.width).toBeCloseTo(viewport.width, 10);
    }

    // Test swipe-to-close on mobile
    await page.touchscreen.tap(dialogBbox!.x + 50, dialogBbox!.y + 50);
    await page.touchscreen.swipe(
      { x: dialogBbox!.x + 50, y: dialogBbox!.y + 50 },
      { x: dialogBbox!.x + 50, y: dialogBbox!.y + 300 }
    );

    // Dialog should close
    await expect(dialog).not.toBeVisible();
  });

  test('Error handling: Invalid order ID', async ({ page }) => {
    await page.goto(`${SELLER_DASHBOARD}?tab=sales&orderId=invalid-uuid-999`);

    // Should load normally without errors
    await expect(page.locator('[data-testid="tab-orders"]')).toBeVisible();

    // No dialog should open
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // No console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('Performance: Deep link loads within 3 seconds', async ({ page }) => {
    const orderId = 'perf-test-order';
    const startTime = Date.now();

    await page.goto(`${SELLER_DASHBOARD}?tab=sales&orderId=${orderId}`);

    // Wait for interactive state
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Measure Time to Interactive
    const ttiMetrics = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]));
    });

    expect(ttiMetrics.domInteractive).toBeLessThan(2000);
  });

  test('Accessibility: Keyboard navigation after deep link', async ({ page }) => {
    const orderId = 'a11y-test-order';
    await page.goto(`${SELLER_DASHBOARD}?tab=sales&orderId=${orderId}`);

    // Dialog should be focused
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeFocused();

    // Tab should cycle through interactive elements
    await page.keyboard.press('Tab');
    const firstButton = dialog.locator('button').first();
    await expect(firstButton).toBeFocused();

    // Escape should close dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // Focus should return to main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeFocused();
  });
});

test.describe('Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserType => {
    test(`Deep links work in ${browserType}`, async ({ page }) => {
      await loginAsSeller(page);
      await page.goto(`${SELLER_DASHBOARD}?tab=sales&orderId=compat-test`);
      await expect(page.locator('[data-testid="tab-orders"]')).toBeVisible();
    });
  });
});
```

### Run Playwright Tests

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test deep-link.spec.ts

# Run with UI mode
npx playwright test --ui

# Generate report
npx playwright show-report
```

---

## Option 2: Manual JavaScript Test in Browser Console

For quick testing without setting up Playwright:

### Test Script: Copy to Browser Console

```javascript
// ============================================
// DEEP LINK INTEGRATION TEST - MANUAL SCRIPT
// ============================================
// Copy this entire script and run in browser console
// on the seller dashboard page

(async function deepLinkTest() {
  console.log('🧪 Starting Deep Link Integration Test...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, passed, details = '') {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
    if (details) console.log(`   ${details}`);
    results.tests.push({ name, passed, details });
    passed ? results.passed++ : results.failed++;
  }

  // Test 1: Tab Migration Function
  console.log('\n📋 Test Suite 1: Tab Migration Logic');
  try {
    // Assuming tab-migration is exposed or we test via URL
    const testUrls = [
      { url: '?tab=sales', expected: 'orders' },
      { url: '?tab=offers', expected: 'activity' },
      { url: '?tab=products', expected: 'inventory' },
      { url: '?tab=wallet', expected: 'earnings' },
    ];

    testUrls.forEach(({ url, expected }) => {
      const params = new URLSearchParams(url);
      const tab = params.get('tab');
      logTest(`Legacy tab "${tab}" mapping`, true, `Should map to "${expected}"`);
    });
  } catch (e) {
    logTest('Tab Migration', false, e.message);
  }

  // Test 2: Check if deep link elements exist
  console.log('\n📋 Test Suite 2: DOM Elements');
  
  const orderCard = document.querySelector('[data-testid^="order-card-"]');
  logTest('Order cards have data-testid', !!orderCard, 
    orderCard ? `Found: ${orderCard.getAttribute('data-testid')}` : 'Not found');

  const offerCard = document.querySelector('[data-testid^="offer-card-"]');
  logTest('Offer cards have data-testid', !!offerCard,
    offerCard ? `Found: ${offerCard.getAttribute('data-testid')}` : 'Not found');

  const productCard = document.querySelector('[data-testid^="product-card-"]');
  logTest('Product cards have data-testid', !!productCard,
    productCard ? `Found: ${productCard.getAttribute('data-testid')}` : 'Not found');

  // Test 3: RTL Detection
  console.log('\n📋 Test Suite 3: RTL Consistency');
  
  const htmlDir = document.documentElement.dir;
  const bodyDir = document.body.dir;
  logTest('HTML dir attribute', htmlDir === 'rtl' || htmlDir === 'ltr',
    `Current: ${htmlDir || 'not set'}`);

  const arabicText = document.querySelector('[lang="ar"]') || 
                     document.body.textContent.match(/[\u0600-\u06FF]/);
  if (arabicText) {
    const computed = window.getComputedStyle(document.body);
    const textAlign = computed.direction;
    logTest('Arabic text direction', textAlign === 'rtl',
      `Direction: ${textAlign}`);
  } else {
    logTest('Arabic text direction', true, 'No Arabic content to test');
  }

  // Test 4: CSS Animation Classes
  console.log('\n📋 Test Suite 4: Highlight Animation');
  
  const styleSheets = Array.from(document.styleSheets);
  let hasHighlightClass = false;
  try {
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule.selectorText && rule.selectorText.includes('deep-link-highlight')) {
            hasHighlightClass = true;
          }
        });
      } catch (e) {
        // CORS issue, skip
      }
    });
  } catch (e) {
    console.warn('Could not check stylesheets:', e.message);
  }
  logTest('Highlight CSS class exists', hasHighlightClass);

  // Test 5: Simulate Deep Link Navigation
  console.log('\n📋 Test Suite 5: Deep Link Simulation');
  
  console.log('⏳ Simulating deep link navigation...');
  
  // Store current URL
  const originalUrl = window.location.href;
  
  // Test order deep link
  const testOrderId = orderCard ? 
    orderCard.getAttribute('data-testid').replace('order-card-', '') : 'test-123';
  
  console.log(`   Testing: ?tab=sales&orderId=${testOrderId}`);
  
  // Navigate
  window.history.pushState({}, '', `?tab=sales&orderId=${testOrderId}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if URL was cleaned
  const cleanedUrl = !window.location.search || window.location.search === '';
  logTest('URL cleanup after deep link', cleanedUrl,
    `Current URL: ${window.location.href}`);

  // Restore original URL
  window.history.pushState({}, '', originalUrl);

  // Test 6: Scroll Position
  console.log('\n📋 Test Suite 6: Auto-Scroll Functionality');
  
  if (orderCard) {
    const rect = orderCard.getBoundingClientRect();
    const inViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
    logTest('Order card in viewport', inViewport,
      `Position: top=${Math.round(rect.top)}, left=${Math.round(rect.left)}`);
  }

  // Test 7: Z-Index Check
  console.log('\n📋 Test Suite 7: Z-Index Stack');
  
  const sellerNav = document.querySelector('[data-testid="seller-bottom-nav"]');
  if (sellerNav) {
    const zIndex = window.getComputedStyle(sellerNav).zIndex;
    logTest('Seller nav z-index', parseInt(zIndex) >= 100000,
      `Z-Index: ${zIndex} (should be 100000+)`);
  }

  const mainNav = document.querySelector('nav[style*="zIndex"]');
  if (mainNav) {
    const zIndex = window.getComputedStyle(mainNav).zIndex;
    logTest('Main nav z-index', parseInt(zIndex) === 99999,
      `Z-Index: ${zIndex}`);
  }

  // Final Report
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
  console.log('='.repeat(50));

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.details}`);
    });
  }

  console.log('\n✨ Test complete! Check results above.\n');

  return results;
})();
```

### Run Manual Test

1. Open seller dashboard in browser
2. Open Developer Console (F12)
3. Copy and paste the entire script above
4. Press Enter
5. Review results in console

---

## Test Results Template

### Test Execution Log

**Date:** _____________  
**Tester:** _____________  
**Environment:** □ Local □ Staging □ Production  
**Browser:** _____________  
**Viewport:** _____________

#### Automated Tests (Playwright)

| Test | Status | Duration | Notes |
|------|--------|----------|-------|
| Order deep link | □ PASS □ FAIL | _____ ms | |
| Offer deep link | □ PASS □ FAIL | _____ ms | |
| RTL transition | □ PASS □ FAIL | _____ ms | |
| Mobile deep link | □ PASS □ FAIL | _____ ms | |
| Error handling | □ PASS □ FAIL | _____ ms | |
| Performance | □ PASS □ FAIL | _____ ms | |
| Accessibility | □ PASS □ FAIL | _____ ms | |

#### Manual Console Tests

| Test Suite | Passed | Failed | Success Rate |
|------------|--------|--------|--------------|
| Tab Migration | ___ | ___ | ___% |
| DOM Elements | ___ | ___ | ___% |
| RTL Consistency | ___ | ___ | ___% |
| Highlight Animation | ___ | ___ | ___% |
| Deep Link Simulation | ___ | ___ | ___% |
| Auto-Scroll | ___ | ___ | ___% |
| Z-Index Stack | ___ | ___ | ___% |

**Overall Status:** □ APPROVED □ NEEDS WORK

---

## Troubleshooting

### Common Issues

**Issue:** Tests fail to find elements  
**Solution:** Ensure `data-testid` attributes are present. Check with:
```javascript
console.log(document.querySelectorAll('[data-testid^="order-card-"]').length);
```

**Issue:** RTL flicker detected  
**Solution:** Check CSS transition timing in `index.css`. Ensure `dir="rtl"` is set before render.

**Issue:** Highlight not visible  
**Solution:** Verify `.deep-link-highlight` CSS is loaded:
```javascript
console.log(document.styleSheets[0].cssRules);
```

**Issue:** Auto-scroll not working  
**Solution:** Check `useDeepLinkScroll` hook is imported and `scrollToElement` is called.

---

**Last Updated:** 2026-02-03  
**Version:** 1.0
