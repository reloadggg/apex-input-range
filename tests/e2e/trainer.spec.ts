import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../src/engine';
import { mergeImported, parseApexConfigs } from '../../src/apexConfig';

const files = JSON.parse(readFileSync(new URL('../../src/provided-configs.json', import.meta.url), 'utf8'));
const bindings = mergeImported(DEFAULT_SETTINGS.bindings, parseApexConfigs(files.after));
const previousBindings = mergeImported(DEFAULT_SETTINGS.previousBindings, parseApexConfigs(files.before));
const base = { ...DEFAULT_SETTINGS, providedRevision: 'local-profile-2026-10-09', mode: 'adapt', bindings, previousBindings, previousReady: true, sound: false, duration: 0, boostChanged: false, sequenceShare: 100, sequences: [{ id: 'slide-reload', label: '滑铲接换弹', actions: ['crouch', 'interact'], enabled: true, weight: 5 }] };

// Optional remote fonts must not make local controller tests wait on the network.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
});

async function boot(page: Page, settings = base) {
  await page.addInitScript(settings => {
    if (!localStorage.getItem('e2e-seeded')) { localStorage.setItem('input-range-settings', JSON.stringify(settings)); localStorage.setItem('e2e-seeded', '1'); }
    (window as any).__pad = { id: 'Xbox simulated standard', index: 0, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [(window as any).__pad] });
  }, settings);
  await page.clock.install();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.clock.runFor(50);
}
async function press(page: Page, keys: number[], heldMs = 34) {
  await page.evaluate(keys => { const p = (window as any).__pad; for (const k of keys) p.buttons[k] = { value: 1, pressed: true }; }, keys);
  await page.clock.runFor(heldMs);
  await page.evaluate(() => { const p = (window as any).__pad; p.buttons.forEach((b: any) => { b.value = 0; b.pressed = false; }); });
  await page.clock.runFor(34);
}
async function start(page: Page) {
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.clock.runFor(3050);
  await expect(page.locator('.countdown-number')).toHaveCount(0);
}

test('mixed picker persists its pool and changes groups only after complete gamepad sequences', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await boot(page);
  await page.getByRole('button', { name: '混合训练', exact: true }).click();
  await page.getByRole('button', { name: '清空选择', exact: true }).click();
  await expect(page.getByRole('button', { name: '开始训练', exact: true })).toBeDisabled();
  await page.locator('.mixed-grid').getByRole('checkbox', { name: /^滑铲跳\s*2/ }).check();
  await page.locator('.mixed-grid').getByRole('checkbox', { name: /^切枪补枪/ }).check();
  await page.reload(); await page.clock.runFor(50);
  await expect(page.locator('.mixed-grid input:checked')).toHaveCount(2);
  await start(page);
  await expect(page.locator('.combo-heading strong')).toHaveText('滑铲跳');
  await expect(page.getByRole('button', { name: '清空选择', exact: true })).toBeDisabled();
  await press(page, [2]);
  await expect(page.locator('.sequence-current h2')).toHaveText('滑铲');
  await press(page, [5]); await page.clock.runFor(160);
  await expect(page.locator('.sequence-current h2')).toHaveText('跳跃');
  await press(page, [4]); await page.clock.runFor(160);
  await expect(page.locator('.combo-heading strong')).toHaveText('切枪补枪');
  for (const key of [7, 11, 7]) { await press(page, [key]); await page.clock.runFor(340); }
  await expect(page.locator('.combo-heading strong')).toHaveText('滑铲跳');
});

test('manual weak spot editor saves reordered steps and delays, practices, and joins mixed selection', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: '我的弱项 / 自定义', exact: true }).click();
  await page.getByRole('button', { name: '新建动作组', exact: true }).click();
  await page.getByLabel('动作组名称', { exact: true }).fill('我的起手组合');
  await page.getByLabel('第 1 步动作', { exact: true }).selectOption('tactical');
  await page.getByLabel('第 2 步动作', { exact: true }).selectOption('jump');
  await page.getByRole('button', { name: '添加步骤', exact: true }).click();
  await page.getByLabel('第 3 步动作', { exact: true }).selectOption('crouch');
  await page.getByRole('button', { name: '添加步骤', exact: true }).click();
  await page.getByLabel('第 4 步动作', { exact: true }).selectOption('fire');
  await page.getByRole('button', { name: '上移第 4 步', exact: true }).click();
  await expect(page.getByLabel('第 3 步动作', { exact: true })).toHaveValue('fire');
  await page.getByRole('button', { name: '删除第 4 步', exact: true }).click();
  await page.getByLabel('第 1 步之后的停顿（秒）', { exact: true }).fill('1.6');
  await page.getByRole('button', { name: '保存并预览', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('0 至 1.5');
  await page.getByLabel('第 1 步之后的停顿（秒）', { exact: true }).fill('0.6');
  await page.getByLabel('第 2 步之后的停顿（秒）', { exact: true }).fill('0.25');
  await page.getByRole('button', { name: '保存并预览', exact: true }).click();
  await expect(page.locator('.combo-step-keys')).toHaveText(['LS', 'LB', 'RT']);
  await page.reload(); await page.clock.runFor(50);
  await expect(page.locator('.combo-heading strong')).toHaveText('我的起手组合');
  await start(page);
  await press(page, [10]); await page.clock.runFor(200);
  await expect(page.locator('.sequence-current h2')).toHaveText('战术技能');
  await press(page, [4]);
  await page.clock.runFor(400);
  await expect(page.locator('.sequence-current h2')).toHaveText('跳跃');
  await expect(page.locator('.metric').first()).toContainText('1 次正确 / 1 次输入');
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await page.getByRole('button', { name: '练习我的起手组合', exact: true }).click();
  await expect(page.locator('.combo-heading strong')).toHaveText('我的起手组合');
  await expect(page.getByRole('button', { name: '开始训练', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '混合训练', exact: true }).click();
  await page.getByRole('button', { name: '清空选择', exact: true }).click();
  await page.locator('.mixed-grid').getByRole('checkbox', { name: /^我的起手组合/ }).check();
  await page.getByRole('button', { name: '我的弱项 / 自定义', exact: true }).click();
  await page.getByRole('button', { name: '删除我的起手组合', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('input-range-settings')!).mixedDrillIds)).toEqual([]);
  await expect(page.getByRole('button', { name: '开始训练', exact: true })).toBeDisabled();
});

test('mixed and custom panels fit mobile in English and Japanese', async ({ page }) => {
  await boot(page);
  for (const language of ['en', 'ja']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Language / 语言 / 言語').selectOption(language);
    await page.getByRole('button', { name: language === 'en' ? 'Mixed practice' : 'ミックス練習', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.getByRole('button', { name: language === 'en' ? 'My weak spots / Custom' : '苦手な操作 / カスタム', exact: true }).click();
    await page.getByRole('button', { name: language === 'en' ? 'New sequence' : 'シーケンスを作成', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/custom-${language}-mobile.png`, fullPage: true });
    await page.getByRole('button', { name: language === 'en' ? 'Cancel editing' : '編集をキャンセル', exact: true }).click();
  }
});

test('provided profiles seed new defaults, comparison and mobile layout', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: '改键专项', exact: true })).toHaveClass('chosen');
  await page.screenshot({ path: 'test-results/train-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '键位对照', exact: true }).first().click();
  await expect(page.getByLabel('改后跳跃主按键')).toHaveValue('4');
  await expect(page.getByLabel('改前跳跃主按键')).toHaveValue('0');
  await expect(page.getByLabel('改后蹲下 / 滑铲主按键')).toHaveValue('5');
  await expect(page.getByLabel('改后战术技能主按键')).toHaveValue('10');
  await page.screenshot({ path: 'test-results/comparison-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/comparison-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('upload requires the profile, previews/apply changes, and manual old keys persist', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '键位对照', exact: true }).first().click();
  await page.getByLabel('改后跳跃主按键').selectOption('2');
  await page.getByLabel('改前跳跃主按键').selectOption('6');
  await page.getByLabel('导入改键后配置').setInputFiles({ name: 'settings.cfg', mimeType: 'text/plain', buffer: Buffer.from(files.after.find((f: any) => f.name === 'settings.cfg').text) });
  await expect(page.getByRole('button', { name: '应用到改键后方案', exact: true })).toBeDisabled();
  await expect(page.locator('.import-warnings')).toContainText('无法单独确定改键结果');
  await page.getByLabel('导入改键后配置').setInputFiles({ name: 'profile.cfg', mimeType: 'text/plain', buffer: Buffer.from(files.after.find((f: any) => f.name === 'profile.cfg').text) });
  await page.getByRole('button', { name: '应用到改键后方案', exact: true }).click();
  await expect(page.getByLabel('改后跳跃主按键')).toHaveValue('4');
  await expect(page.getByLabel('改前跳跃主按键')).toHaveValue('6');
  await page.reload(); await page.getByRole('button', { name: '键位对照', exact: true }).first().click();
  await expect(page.getByLabel('改后跳跃主按键')).toHaveValue('4');
  await expect(page.getByLabel('改前跳跃主按键')).toHaveValue('6');
});

test('ordered gamepad sequence, old-habit feedback, no hold repeats, history survives reload', async ({ page }) => {
  await boot(page); await start(page);
  await expect(page.locator('.action-target h2')).toHaveText('蹲下 / 滑铲');
  await press(page, [1]);
  await expect(page.locator('.feedback-text')).toContainText('按回旧键 B');
  await expect(page.locator('.metric').nth(3)).toContainText('其中 1 次按回旧键');
  await press(page, [5], 400); await page.clock.runFor(150);
  await expect(page.locator('.action-target h2')).toHaveText('互动 / 换弹');
  await expect(page.locator('.sequence-strip')).toContainText('第 2 / 2 步');
  await press(page, [2], 500);
  await expect(page.locator('.metric').first()).toContainText('2 次正确 / 3 次输入');
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await page.getByRole('button', { name: '训练记录', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('改键专项');
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.locator('.transition-results')).toContainText('蹲下 / 滑铲 → 互动 / 换弹');
  await expect(page.locator('.session-detail')).toContainText('1 次按回旧键');
  await page.reload(); await page.getByRole('button', { name: '训练记录', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('ultimate accepts only overlapping two-key input and does not score partial presses', async ({ page }) => {
  const chordSettings = { ...base, mode: 'action', bindings: bindings.map(b => ({ ...b, enabled: b.id === 'ultimate' })) };
  await boot(page, chordSettings); await start(page);
  await expect(page.locator('.action-target h2')).toContainText('大招');
  await press(page, [3]); await press(page, [10]);
  await expect(page.locator('.metric').first()).toContainText('0 次正确 / 0 次输入');
  await press(page, [3, 10], 800);
  await expect(page.locator('.metric').first()).toContainText('1 次正确 / 1 次输入');
});

test('disconnect and window blur pause, timer freezes and countdown finishes a timed session', async ({ page }) => {
  await boot(page, { ...base, duration: 30 }); await start(page); await press(page, [5]);
  await page.evaluate(() => { (window as any).__pad.connected = false; }); await page.clock.runFor(50);
  await expect(page.getByRole('heading', { name: '训练已暂停' })).toBeVisible();
  await expect(page.getByRole('button', { name: '继续训练', exact: true })).toBeDisabled();
  const time = await page.locator('.time-left b').innerText(); await page.clock.runFor(5000);
  await expect(page.locator('.time-left b')).toHaveText(time);
  await page.evaluate(() => { (window as any).__pad.connected = true; }); await page.clock.runFor(50);
  await page.getByRole('button', { name: '继续训练', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: '训练已暂停' })).toBeVisible();
  await page.getByRole('button', { name: '继续训练', exact: true }).click(); await page.clock.runFor(31000);
  await expect(page.locator('.round-tag')).toHaveText('本轮完成');
  await expect(page.locator('.time-left b')).toHaveText('00:00');
});

test('keyboard demo can press a chord after pause with focus on resume control', async ({ page }) => {
  await boot(page, { ...base, mode: 'action', bindings: bindings.map(b => ({ ...b, enabled: b.id === 'ultimate' })) });
  await page.getByRole('button', { name: '键盘体验', exact: true }).click(); await start(page);
  await page.keyboard.press('Escape'); await expect(page.getByRole('heading', { name: '训练已暂停' })).toBeVisible();
  await page.getByRole('button', { name: '继续训练', exact: true }).click();
  await page.keyboard.down('y'); await page.keyboard.down('f'); await page.keyboard.up('y'); await page.keyboard.up('f');
  await expect(page.locator('.metric').first()).toContainText('1 次正确 / 1 次输入');
  await page.getByRole('button', { name: '结束', exact: true }).click(); await page.getByRole('button', { name: '训练记录', exact: true }).click();
  await expect(page.locator('.demo-tag')).toHaveText('体验');
});

test('same-page combat chain shows all eight steps and enforces inter-step delays', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: '练习实战串练', exact: true }).click();
  await expect(page.locator('.combo-steps li')).toHaveCount(8);
  await expect(page.locator('.combo-step-keys')).toHaveText(['LS', 'LB', 'RB', 'RT', 'RB', 'RT', 'X', 'RS']);
  const columns = await page.locator('.combo-steps').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(4);
  await page.screenshot({ path: 'test-results/combat-preview.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/combat-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await start(page);
  const labels = ['技能', '跳跃', '滑铲', '射击', '蹲下', '射击', '换弹', '换枪'];
  const keys = [10, 4, 5, 7, 5, 7, 2, 11];
  const delays = [200, 200, 450, 250, 200, 350, 300, 120];
  for (let i = 0; i < keys.length; i++) {
    await expect(page.locator('.sequence-current h2')).toHaveText(labels[i]);
    await expect(page.locator('.combo-steps li[aria-current="step"]')).toContainText(labels[i]);
    await press(page, [keys[i]]);
    if (i === 2) {
      await page.clock.runFor(100);
      await expect(page.locator('.sequence-current h2')).toHaveText('滑铲');
      await expect(page.locator('.target-label')).toContainText('秒后进入下一步');
    }
    await page.clock.runFor(delays[i] + 20);
  }
  await expect(page.locator('.metric').first()).toContainText('8 次正确 / 8 次输入');
  await expect(page.locator('.sequence-current h2')).toHaveText('技能');
});

test('short combos preview together and jump then X uses the current binding', async ({ page }) => {
  await boot(page); await page.getByRole('button', { name: '练习滑铲跳', exact: true }).click();
  await expect(page.locator('.combo-step-keys')).toHaveText(['RB', 'LB']);
  await page.getByRole('button', { name: '练习跳跃接换弹', exact: true }).click();
  await expect(page.locator('.combo-step-keys')).toHaveText(['LB', 'X']);
  await start(page); await press(page, [4]); await page.clock.runFor(150);
  await expect(page.locator('.sequence-current h2')).toHaveText('换弹');
  await press(page, [2]);
  await expect(page.locator('.metric').first()).toContainText('2 次正确 / 2 次输入');
});

test('combat category exposes new drills, uses remapped weapons and shows per-drill timing', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /交火衔接/ }).click();
  await expect(page.locator('.quick-drill')).toHaveCount(4);
  await page.getByRole('button', { name: '练习技能与大招切换', exact: true }).click();
  await expect(page.locator('.combo-step-keys')).toHaveText(['LS', 'LB', 'Y + LS', 'RT']);
  await page.getByRole('button', { name: '练习切枪补枪', exact: true }).click();
  await expect(page.locator('.combo-step-keys')).toHaveText(['RT', 'RS', 'RT']);
  await expect(page.locator('.drill-timing')).toContainText('0.3 秒停顿');
  await expect(page.locator('.drill-selection-help')).toContainText('已选：切枪补枪');
  await page.screenshot({ path: 'test-results/combat-catalog.png', fullPage: true });
  await start(page);
  await expect(page.getByRole('button', { name: /身法预习/ })).toBeDisabled();
  await press(page, [7]); await page.clock.runFor(350);
  await press(page, [3]);
  await expect(page.locator('.feedback-text')).toContainText('按回旧键 Y');
  await expect(page.locator('.sequence-current h2')).toHaveText('换枪');
  await press(page, [11]); await page.clock.runFor(350);
  await press(page, [7]);
  await expect(page.locator('.metric').first()).toContainText('3 次正确 / 4 次输入');
});

test('movement rehearsal persists selection, shows source and requires separate repeated jumps', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await page.getByRole('button', { name: /身法预习/ }).click();
  await expect(page.locator('.quick-drill')).toHaveCount(3);
  await page.getByRole('button', { name: '练习滑索跳按键预习', exact: true }).click();
  await page.reload(); await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: /身法预习/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.combo-step-keys')).toHaveText(['X', 'LB', 'LB']);
  await expect(page.locator('.movement-practice-note')).toContainText('不判断超级跳成功');
  await expect(page.locator('.drill-source a')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=Wgk8LAgn4mo&t=1351s');
  await expect(page.locator('.drill-source time')).toHaveAttribute('datetime', '2026-05-11');
  await expect(page.locator('.drill-source time')).toHaveText('2026年5月11日');
  await page.screenshot({ path: 'test-results/movement-catalog.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/movement-catalog-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await start(page); await press(page, [2]); await page.clock.runFor(250);
  await press(page, [4], 800);
  await expect(page.locator('.sequence-current h2')).toHaveText('第二次跳');
  await expect(page.locator('.metric').first()).toContainText('2 次正确 / 2 次输入');
  await press(page, [4]); await page.clock.runFor(250);
  await expect(page.locator('.metric').first()).toContainText('3 次正确 / 3 次输入');
  await expect(page.locator('.sequence-current h2')).toHaveText('互动');
  expect(errors).toEqual([]);
});

for (const pad of [
  { layout: 'ds4', name: 'DualShock 4', id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', share: 'Share' },
  { layout: 'dualsense', name: 'DualSense / PS5', id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', share: 'Create' },
]) {
  test(`${pad.layout} auto detection updates combos, binding editor, diagram and history`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await boot(page);
    await page.evaluate(id => { (window as any).__pad.id = id; }, pad.id); await page.clock.runFor(50);
    await expect(page.getByLabel('手柄键位显示')).toHaveValue('auto');
    await expect(page.locator('.controller-picker')).toContainText(`当前：${pad.name}`);
    await expect(page.getByRole('img', { name: `${pad.name} 手柄示意图，目标键和按下的按键会高亮` })).toBeVisible();
    await expect(page.locator('.controller [data-button-id="8"] text')).toHaveText(pad.share);
    const stickY = await page.locator('.controller [data-button-id="10"] circle').first().getAttribute('cy');
    await expect(page.locator('.controller [data-button-id="11"] circle').first()).toHaveAttribute('cy', stickY!);
    await page.getByRole('button', { name: '键位对照', exact: true }).first().click();
    await expect(page.getByLabel('改后跳跃主按键').locator('option:checked')).toHaveText('L1 · 左肩键');
    await expect(page.getByLabel('改后互动 / 换弹主按键').locator('option:checked')).toHaveText('□ 键');
    await page.getByRole('button', { name: '训练场', exact: false }).first().click();
    await page.getByRole('button', { name: '练习跳跃接换弹', exact: true }).click();
    await expect(page.locator('.combo-step-keys')).toHaveText(['L1', '□']);
    await page.screenshot({ path: `test-results/${pad.layout}-preview.png`, fullPage: true });
    if (pad.layout === 'dualsense') {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await page.screenshot({ path: 'test-results/dualsense-mobile.png', fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1050 });
    }
    await start(page);
    await expect(page.getByLabel('手柄键位显示')).toBeDisabled();
    await press(page, [4]); await page.clock.runFor(150); await press(page, [2]);
    await expect(page.locator('.metric').first()).toContainText('2 次正确 / 2 次输入');
    await page.getByRole('button', { name: '结束', exact: true }).click();
    await page.getByLabel('手柄键位显示').selectOption('xbox');
    await page.getByRole('button', { name: '训练记录', exact: true }).click();
    await page.getByRole('button', { name: '查看', exact: true }).click();
    await expect(page.locator('.history-controller')).toHaveText(pad.name);
    await expect(page.locator('.detail-chord')).toHaveText(['L1', '□']);
    expect(errors).toEqual([]);
  });
}

test('manual PS layout works with virtual Xbox, persists and never enables raw nonstandard input', async ({ page }) => {
  await boot(page, { ...base, mode: 'button', selected: [0] });
  await page.getByLabel('手柄键位显示').selectOption('dualsense');
  await page.reload(); await page.clock.runFor(50);
  await expect(page.getByLabel('手柄键位显示')).toHaveValue('dualsense');
  await expect(page.locator('.target-key')).toHaveText('×');
  await expect(page.getByRole('button', { name: '练习 ×', exact: true })).toBeVisible();
  await start(page); await press(page, [0]);
  await expect(page.locator('.metric').first()).toContainText('1 次正确 / 1 次输入');
  await page.getByRole('button', { name: '结束', exact: true }).click();
  await page.evaluate(() => { (window as any).__pad.mapping = ''; }); await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: /再练一轮/ })).toBeDisabled();
  await expect(page.locator('.device-caption')).toHaveText('需要浏览器标准映射');
});

const languagePicker = (page: Page) => page.getByLabel('Language / 语言 / 言語', { exact: true });
async function expectEnglishOnly(page: Page) {
  const untranslated = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement?.closest('[translate="no"], script, style') && /[\u3400-\u9fff]/.test(node.textContent || '')) texts.push(node.textContent!.trim());
    }
    return texts;
  });
  expect(untranslated).toEqual([]);
}

test('English and Japanese persist without changing bindings, and all English pages translate', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: '键位对照', exact: true }).first().click();
  await page.getByLabel('改前跳跃主按键').selectOption('6');
  const saved = await page.evaluate(() => localStorage.getItem('input-range-settings'));
  await languagePicker(page).selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByLabel('Before Jump primary button')).toHaveValue('6');
  await expectEnglishOnly(page);
  for (const label of ['Practice', 'History', 'Guide']) {
    await page.locator('nav').getByRole('button', { name: label, exact: true }).click();
    await expectEnglishOnly(page);
  }
  expect(await page.evaluate(() => localStorage.getItem('input-range-settings'))).toBe(saved);
  await languagePicker(page).selectOption('ja');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await page.reload(); await page.clock.runFor(50);
  await expect(languagePicker(page)).toHaveValue('ja');
  await expect(page.getByRole('button', { name: '練習開始', exact: true })).toBeVisible();
  expect(normalizeSettings(JSON.parse((await page.evaluate(() => localStorage.getItem('input-range-settings')))!))).toEqual(normalizeSettings(JSON.parse(saved!)));
});

test('language changes preserve combo progress, chord scoring and saved history', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /交火衔接/ }).click();
  await page.getByRole('button', { name: '练习技能与大招切换', exact: true }).click();
  await start(page);
  await press(page, [10]); await page.clock.runFor(300);
  await languagePicker(page).selectOption('en');
  await expect(page.locator('.sequence-current h2')).toHaveText('Jump');
  await press(page, [4]); await page.clock.runFor(400);
  await expect(page.locator('.sequence-current h2')).toHaveText('Ultimate');
  await press(page, [3]);
  await expect(page.locator('.metric').first()).toContainText('2 correct / 2 total');
  await press(page, [3, 10]); await page.clock.runFor(500);
  await languagePicker(page).selectOption('ja');
  await expect(page.locator('.sequence-current h2')).toHaveText('射撃');
  await press(page, [7]);
  await languagePicker(page).selectOption('en');
  await expect(page.locator('.metric').first()).toContainText('4 correct / 4 total');
  await page.getByRole('button', { name: 'End', exact: true }).click();
  const history = await page.evaluate(() => localStorage.getItem('input-range-history'));
  await page.locator('nav').getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await expectEnglishOnly(page);
  await languagePicker(page).selectOption('ja');
  expect(await page.evaluate(() => localStorage.getItem('input-range-history'))).toBe(history);
  await page.reload(); await page.clock.runFor(50);
  expect(await page.evaluate(() => localStorage.getItem('input-range-history'))).toBe(history);
});

test('config guide copies exact Windows paths and handles clipboard denial with manual selection', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: '键位对照', exact: true }).first().click();
  const profilePath = '%userprofile%\\Saved Games\\Respawn\\Apex\\profile';
  const localPath = '%userprofile%\\Saved Games\\Respawn\\Apex\\local';
  await expect(page.getByLabel('profile 配置目录')).toHaveValue(profilePath);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { (window as any).__copiedPath = value; } } }));
  await page.getByRole('button', { name: '复制 profile 路径', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__copiedPath)).toBe(profilePath);
  await expect(page.locator('.config-copy-status')).toContainText('目录已复制');
  await page.getByText('可选：补充 settings 文件', { exact: true }).click();
  await expect(page.getByLabel('local 配置目录')).toHaveValue(localPath);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } }));
  await page.getByRole('button', { name: '复制 local 路径', exact: true }).click();
  await expect(page.getByLabel('local 配置目录')).toBeFocused();
  expect(await page.getByLabel('local 配置目录').evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!)).toBe(localPath.length);
  await expect(page.locator('.config-copy-status')).toContainText('Ctrl + C');
  await languagePicker(page).selectOption('en');
  await page.getByLabel('Import After configuration').setInputFiles({ name: 'settings.cfg', mimeType: 'text/plain', buffer: Buffer.from(files.after.find((f: any) => f.name === 'settings.cfg').text) });
  await expect(page.getByRole('button', { name: 'Apply to After profile', exact: true })).toBeDisabled();
  await expectEnglishOnly(page);
  await page.getByLabel('Import After configuration').setInputFiles({ name: 'profile.cfg', mimeType: 'text/plain', buffer: Buffer.from(files.after.find((f: any) => f.name === 'profile.cfg').text) });
  await expect(page.getByRole('button', { name: 'Apply to After profile', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Apply to After profile', exact: true }).click();
  await expectEnglishOnly(page);
  await page.screenshot({ path: 'test-results/import-guide-en.png', fullPage: true });
});

test('English and Japanese long combo layouts fit desktop and mobile', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: '练习实战串练', exact: true }).click();
  for (const language of ['en', 'ja']) {
    await languagePicker(page).selectOption(language);
    await expect(page.locator('.combo-steps li')).toHaveCount(8);
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.screenshot({ path: `test-results/combo-${language}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `test-results/combo-${language}-mobile.png`, fullPage: true });
  }
});
