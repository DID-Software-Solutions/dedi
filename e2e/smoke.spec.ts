import { test, expect, type Page } from '@playwright/test';

/**
 * Boots the real game in headless Chromium (WebGL via SwiftShader) and walks the
 * critical path: load → controls wizard → main menu → start → HUD live with the
 * new mini-boss bar present. Asserts no uncaught exceptions along the way.
 */

// Headless Chromium refuses pointer lock (no real display owns the document), so
// the game's requestPointerLock on Play throws a benign error that never occurs
// for a real player. Ignore only that one; everything else still fails the test.
const IGNORED = [/not valid for pointer lock/i];

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  const keep = (s: string) => !IGNORED.some((re) => re.test(s));
  page.on('pageerror', (e) => { if (keep(e.message)) errors.push(`pageerror: ${e.message}`); });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && keep(msg.text())) errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

// Headless Chromium has no real pointing device, so `(any-pointer: fine)` is
// false and DeviceGate would block boot. Every real desktop has a mouse, so we
// emulate one before any page script runs — restoring the desktop the gate expects.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const realMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query.includes('any-pointer: fine') || query.includes('pointer: fine')
        ? ({ matches: true, media: query, onchange: null,
             addEventListener() {}, removeEventListener() {},
             addListener() {}, removeListener() {}, dispatchEvent: () => false } as MediaQueryList)
        : realMatchMedia(query);
  });
});

// The wizard only shows on first visit (gated by localStorage). Dismiss it if present.
async function dismissWizardIfPresent(page: Page): Promise<void> {
  const wizardBtn = page.locator('#wizard-btn');
  if (await wizardBtn.count()) {
    await wizardBtn.click();
  }
}

test('boots to the main menu with a live WebGL canvas and no errors', async ({ page }) => {
  const errors = trackErrors(page);

  await page.goto('/');
  await expect(page).toHaveTitle(/DEDI/);

  const canvas = page.locator('#renderCanvas');
  await expect(canvas).toBeVisible();
  // Canvas has real pixel dimensions → engine attached and sized.
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);

  await dismissWizardIfPresent(page);

  await expect(page.locator('#btn-play')).toBeVisible();
  await expect(page.locator('h1')).toHaveText('DEDI');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('starting a run shows the HUD and the new mini-boss bar element', async ({ page }) => {
  const errors = trackErrors(page);

  await page.goto('/');
  await dismissWizardIfPresent(page);

  await page.locator('#btn-play').click();

  // HUD becomes visible with health + ammo readouts.
  await expect(page.locator('#hud-health-num')).toBeVisible();
  await expect(page.locator('#hud-ammo-cur')).toBeVisible();
  await expect(page.locator('#hud-weapon-name')).toHaveText('DILDO PISTOL');

  // The mini-boss bar exists in the DOM (hidden until a boss is alive).
  await expect(page.locator('#hud-boss')).toHaveCount(1);
  await expect(page.locator('#hud-boss-bar')).toHaveCount(1);

  // Radar canvas is present alongside the main canvas (2 canvases total).
  await expect(page.locator('canvas')).toHaveCount(2);

  expect(errors, errors.join('\n')).toEqual([]);
});
