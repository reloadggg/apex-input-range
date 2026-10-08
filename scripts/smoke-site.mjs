import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const address = process.argv[2];
if (!address) throw new Error('Usage: node scripts/smoke-site.mjs <site-url>');
const base = new URL(address);
const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (new URL(response.url()).origin === base.origin && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.addInitScript(() => {
    window.__smokePad = { id: 'Xbox standard smoke test', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.__smokePad] });
  });
  await page.clock.install();
  const response = await page.goto(address, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  await page.clock.runFor(100);
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  const iconUrl = new URL(icon, address);
  assert.ok(iconUrl.pathname.startsWith(base.pathname), 'Favicon must use the deployment base path');
  assert.equal((await page.request.get(iconUrl.href)).status(), 200);
  await page.getByRole('button', { name: '练习实战串练', exact: true }).click();
  assert.equal(await page.locator('.combo-steps li').count(), 8);
  await page.getByLabel('Language / 语言 / 言語').selectOption('en');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(3100);
  await page.evaluate(() => { window.__smokePad.buttons[10] = { value: 1, pressed: true }; });
  await page.clock.runFor(34);
  await page.evaluate(() => { window.__smokePad.buttons[10] = { value: 0, pressed: false }; });
  await page.clock.runFor(250);
  assert.equal(await page.locator('.sequence-current h2').innerText(), 'Jump');
  await page.getByRole('button', { name: 'End', exact: true }).click();
  await page.locator('nav').getByRole('button', { name: 'Bindings', exact: true }).click();
  assert.equal(await page.getByLabel('After Jump primary button').inputValue(), '4');
  await page.getByLabel('Language / 语言 / 言語').selectOption('ja');
  assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
  assert.deepEqual(errors, []);
  console.log(`PASS ${address}: assets, controller input, combos, bindings and languages`);
} finally {
  await browser.close();
}
