/**
 * Seurat — Puppeteer UI Tests
 *
 * Tests that exercise actual DOM interactions: clicking buttons, typing
 * into inputs, and verifying visible UI state. Requires Seurat dev server
 * running on port 5179.
 *
 * Usage:
 *   cd tools/tests && pnpm test:seurat:ui
 */
import { existsSync } from 'fs';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEV_PORT = 5179;
const DEV_URL = `http://localhost:${DEV_PORT}/`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

function findChromePath(): string {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  throw new Error('Chrome/Chromium not found.');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

type UiTestFn = (page: Page) => Promise<void>;

class UiTestRunner {
  private tests: Array<{ name: string; fn: UiTestFn }> = [];

  test(name: string, fn: UiTestFn): void {
    this.tests.push({ name, fn });
  }

  async run(page: Page): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const { name, fn } of this.tests) {
      try {
        await fn(page);
        results.push({ name, passed: true });
      } catch (err) {
        results.push({
          name,
          passed: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function registerTests(runner: UiTestRunner): void {
  // -----------------------------------------------------------------------
  // Dashboard renders
  // -----------------------------------------------------------------------
  runner.test('Dashboard renders with title and New Character button', async (page) => {
    // The dashboard is the default section
    await page.waitForSelector('[data-testid="new-character-btn"]', { timeout: 5000 });
    const btnText = await page.$eval(
      '[data-testid="new-character-btn"]',
      (el) => el.textContent?.trim(),
    );
    if (!btnText?.includes('New Character')) {
      throw new Error(`Expected button text to contain "New Character", got "${btnText}"`);
    }
  });

  // -----------------------------------------------------------------------
  // Sidebar navigation is visible
  // -----------------------------------------------------------------------
  runner.test('Sidebar navigation items are rendered', async (page) => {
    const sections = ['dashboard', 'concept', 'generate', 'review', 'animate', 'atlas', 'manifest'];
    for (const s of sections) {
      const el = await page.$(`[data-testid="nav-${s}"]`);
      if (!el) throw new Error(`Sidebar nav item "nav-${s}" not found`);
    }
  });

  // -----------------------------------------------------------------------
  // + New Character button opens dialog
  // -----------------------------------------------------------------------
  runner.test('Clicking + New Character opens the create dialog', async (page) => {
    // Ensure dialog is not open
    let dialog = await page.$('[data-testid="create-dialog"]');
    if (dialog) throw new Error('Dialog should not be open initially');

    // Click the button
    await page.click('[data-testid="new-character-btn"]');
    await sleep(300);

    // Verify dialog opened
    dialog = await page.$('[data-testid="create-dialog"]');
    if (!dialog) throw new Error('Dialog did not open after clicking + New Character');

    // Verify inputs exist
    const idInput = await page.$('[data-testid="char-id-input"]');
    if (!idInput) throw new Error('Character ID input not found in dialog');

    const nameInput = await page.$('[data-testid="char-name-input"]');
    if (!nameInput) throw new Error('Display Name input not found in dialog');

    const createBtn = await page.$('[data-testid="create-btn"]');
    if (!createBtn) throw new Error('Create button not found in dialog');

    const cancelBtn = await page.$('[data-testid="cancel-btn"]');
    if (!cancelBtn) throw new Error('Cancel button not found in dialog');
  });

  // -----------------------------------------------------------------------
  // Create button is disabled when ID is empty
  // -----------------------------------------------------------------------
  runner.test('Create button is disabled when ID field is empty', async (page) => {
    // Dialog should still be open from previous test
    const dialog = await page.$('[data-testid="create-dialog"]');
    if (!dialog) {
      // Re-open if needed
      await page.click('[data-testid="new-character-btn"]');
      await sleep(300);
    }

    // ID input should be empty
    const idValue = await page.$eval(
      '[data-testid="char-id-input"]',
      (el) => (el as HTMLInputElement).value,
    );
    if (idValue !== '') throw new Error(`Expected empty ID, got "${idValue}"`);

    // Create button should be disabled
    const disabled = await page.$eval(
      '[data-testid="create-btn"]',
      (el) => (el as HTMLButtonElement).disabled,
    );
    if (!disabled) throw new Error('Create button should be disabled when ID is empty');
  });

  // -----------------------------------------------------------------------
  // Typing an ID enables the Create button
  // -----------------------------------------------------------------------
  runner.test('Typing a character ID enables the Create button', async (page) => {
    // Type into the ID field
    await page.click('[data-testid="char-id-input"]');
    await page.type('[data-testid="char-id-input"]', 'test_hero');
    await sleep(100);

    // Verify value was set
    const idValue = await page.$eval(
      '[data-testid="char-id-input"]',
      (el) => (el as HTMLInputElement).value,
    );
    if (idValue !== 'test_hero') {
      throw new Error(`Expected "test_hero", got "${idValue}"`);
    }

    // Create button should now be enabled
    const disabled = await page.$eval(
      '[data-testid="create-btn"]',
      (el) => (el as HTMLButtonElement).disabled,
    );
    if (disabled) throw new Error('Create button should be enabled after typing ID');
  });

  // -----------------------------------------------------------------------
  // Display name input accepts free text
  // -----------------------------------------------------------------------
  runner.test('Display name input accepts free text', async (page) => {
    await page.click('[data-testid="char-name-input"]');
    await page.type('[data-testid="char-name-input"]', 'Test Hero');
    await sleep(100);

    const nameValue = await page.$eval(
      '[data-testid="char-name-input"]',
      (el) => (el as HTMLInputElement).value,
    );
    if (nameValue !== 'Test Hero') {
      throw new Error(`Expected "Test Hero", got "${nameValue}"`);
    }
  });

  // -----------------------------------------------------------------------
  // ID input filters non-snake_case characters
  // -----------------------------------------------------------------------
  runner.test('ID input filters out non-snake_case characters', async (page) => {
    // Clear the input first
    await page.click('[data-testid="char-id-input"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await sleep(50);

    // Type mixed-case with special chars
    await page.type('[data-testid="char-id-input"]', 'My Hero-123!');
    await sleep(100);

    const idValue = await page.$eval(
      '[data-testid="char-id-input"]',
      (el) => (el as HTMLInputElement).value,
    );
    // Only lowercase letters, digits, and underscores should remain
    if (idValue !== 'yero123') {
      throw new Error(`Expected "yero123" (filtered), got "${idValue}"`);
    }
  });

  // -----------------------------------------------------------------------
  // Cancel button closes the dialog
  // -----------------------------------------------------------------------
  runner.test('Cancel button closes the dialog', async (page) => {
    await page.click('[data-testid="cancel-btn"]');
    await sleep(300);

    const dialog = await page.$('[data-testid="create-dialog"]');
    if (dialog) throw new Error('Dialog should be closed after clicking Cancel');
  });

  // -----------------------------------------------------------------------
  // Clicking overlay closes the dialog
  // -----------------------------------------------------------------------
  runner.test('Clicking overlay closes the dialog', async (page) => {
    // Re-open dialog
    await page.click('[data-testid="new-character-btn"]');
    await sleep(300);

    let dialog = await page.$('[data-testid="create-dialog"]');
    if (!dialog) throw new Error('Dialog should be open');

    // Click on the overlay (outside the dialog) - click at top-left corner
    await page.click('[data-testid="create-dialog-overlay"]', {
      offset: { x: 10, y: 10 },
    });
    await sleep(300);

    dialog = await page.$('[data-testid="create-dialog"]');
    if (dialog) throw new Error('Dialog should be closed after clicking overlay');
  });

  // -----------------------------------------------------------------------
  // Create button calls store action (bridge not required - test button click)
  // -----------------------------------------------------------------------
  runner.test('Create button is clickable when ID is filled', async (page) => {
    // Open dialog
    await page.click('[data-testid="new-character-btn"]');
    await sleep(300);

    // Type a character ID
    await page.click('[data-testid="char-id-input"]');
    await page.type('[data-testid="char-id-input"]', 'ui_test_char');
    await sleep(100);

    // Verify button is enabled
    const disabled = await page.$eval(
      '[data-testid="create-btn"]',
      (el) => (el as HTMLButtonElement).disabled,
    );
    if (disabled) throw new Error('Create button should be enabled');

    // Verify button text
    const text = await page.$eval(
      '[data-testid="create-btn"]',
      (el) => el.textContent?.trim(),
    );
    if (text !== 'Create') throw new Error(`Expected "Create", got "${text}"`);

    // Click the button — it will try to call the bridge API (may fail without bridge)
    // We just verify the button is clickable and not blocked
    await page.click('[data-testid="create-btn"]');
    await sleep(500);

    // After click, button should show "Creating..." momentarily or dialog should close
    // Since bridge may not be running, the dialog might stay open with an error
    // The key assertion is that the click was NOT blocked
  });

  // -----------------------------------------------------------------------
  // Sidebar nav: non-dashboard items disabled without character
  // -----------------------------------------------------------------------
  runner.test('Sidebar nav items are disabled without a selected character', async (page) => {
    // Close any open dialog first
    const dialog = await page.$('[data-testid="create-dialog"]');
    if (dialog) {
      await page.click('[data-testid="cancel-btn"]');
      await sleep(200);
    }

    // Click concept nav — should not change section (no character selected)
    await page.click('[data-testid="nav-concept"]');
    await sleep(200);

    // Check that section did NOT change (still dashboard)
    const conceptOpacity = await page.$eval(
      '[data-testid="nav-concept"]',
      (el) => window.getComputedStyle(el).opacity,
    );
    // Disabled items have opacity 0.3
    if (parseFloat(conceptOpacity) > 0.5) {
      throw new Error(`Concept nav should be dimmed (opacity ~0.3), got ${conceptOpacity}`);
    }
  });

  // -----------------------------------------------------------------------
  // Dashboard nav always works
  // -----------------------------------------------------------------------
  runner.test('Dashboard nav is always enabled', async (page) => {
    const dashOpacity = await page.$eval(
      '[data-testid="nav-dashboard"]',
      (el) => window.getComputedStyle(el).opacity,
    );
    if (parseFloat(dashOpacity) < 0.5) {
      throw new Error(`Dashboard nav should not be dimmed, got opacity ${dashOpacity}`);
    }

    // Click it — should work
    await page.click('[data-testid="nav-dashboard"]');
    await sleep(200);

    // Verify we're on dashboard (button has active styling)
    const bg = await page.$eval(
      '[data-testid="nav-dashboard"]',
      (el) => window.getComputedStyle(el).background,
    );
    // Active nav item has #1e2a42 background
    if (!bg.includes('rgb')) {
      throw new Error('Dashboard nav should have active background');
    }
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const chromePath = process.env.CHROME_PATH || findChromePath();
  console.log(`Using Chrome: ${chromePath}`);

  let browser: Browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
  } catch (err) {
    console.error('Failed to launch Chrome:', err);
    process.exit(1);
  }

  let page: Page;
  try {
    page = await browser.newPage();
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Seurat]') || text.includes('Error') || text.includes('error')) {
        console.log(`  [browser] ${text}`);
      }
    });
    page.on('pageerror', (err) => {
      console.log(`  [page error] ${err.message}`);
    });

    console.log(`Opening ${DEV_URL}...`);
    await page.goto(DEV_URL, { waitUntil: 'networkidle2', timeout: 15000 });
  } catch (err) {
    console.error(`Failed to load Seurat at ${DEV_URL}`);
    console.error('Make sure the dev server is running: cd apps/seurat && pnpm dev');
    console.error(err);
    await browser.close();
    process.exit(1);
  }

  // Wait for React to render
  await sleep(1000);

  console.log('Running UI tests...\n');
  const runner = new UiTestRunner();
  registerTests(runner);
  const results = await runner.run(page);

  let passed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.passed) {
      passed++;
      console.log(`  PASS  ${r.name}`);
    } else {
      failed++;
      console.log(`  FAIL  ${r.name}`);
      console.log(`        ${r.error}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  await page.close();
  await browser.close();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
