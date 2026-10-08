import assert from 'node:assert/strict';
import { test } from 'node:test';
import { controllerLabels, detectControllerLayout, resolveControllerLayout } from '../src/gamepad.ts';
import { bindingKeys, DEFAULT_SETTINGS, getTargets, loadHistory, normalizeSettings } from '../src/engine.ts';

test('Sony USB/Bluetooth ids and product names resolve DS4 or DualSense', () => {
  for (const id of ['Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)', 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)', 'Sony DualShock 4', 'Wireless Controller']) assert.equal(detectControllerLayout(id), 'ds4');
  for (const id of ['Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0df2)', 'DualSense Wireless Controller', 'Sony PS5 Controller']) assert.equal(detectControllerLayout(id), 'dualsense');
  for (const id of ['Xbox 360 Controller (XInput STANDARD GAMEPAD)', '8BitDo Pro', 'Wireless Controller (Vendor: 1234 Product: abcd)']) assert.equal(detectControllerLayout(id), 'xbox');
});

test('manual Sony display survives normalization and preserves physical bindings', () => {
  for (const controllerLayout of ['ds4', 'dualsense'] as const) {
    const settings = normalizeSettings({ ...DEFAULT_SETTINGS, controllerLayout, mode: 'action' });
    assert.equal(settings.controllerLayout, controllerLayout);
    assert.equal(resolveControllerLayout(controllerLayout, 'xbox'), controllerLayout);
    assert.deepEqual(getTargets(settings).map(bindingKeys), getTargets({ ...settings, controllerLayout: 'xbox' }).map(bindingKeys));
    const display = controllerLabels(controllerLayout);
    assert.equal(display.keyLabel([0, 1, 2, 3]), '× + ○ + □ + △');
    assert.equal(display.keyLabel([4, 5, 6, 7, 10, 11]), 'L1 + R1 + L2 + R2 + L3 + R3');
  }
  assert.equal(controllerLabels('ds4').buttonLabel(8), 'Share');
  assert.equal(controllerLabels('dualsense').buttonLabel(8), 'Create');
  assert.equal(normalizeSettings({}).controllerLayout, 'auto');
  assert.equal(normalizeSettings({ controllerLayout: 'bad' }).controllerLayout, 'auto');
  assert.equal(resolveControllerLayout('auto', 'dualsense'), 'dualsense');
  assert.equal(resolveControllerLayout('auto'), 'xbox');
  assert.equal(getTargets({ ...DEFAULT_SETTINGS, controllerLayout: 'ds4', selected: [0] })[0].action, '× 键');
});

test('history preserves Sony layout and migrates old or invalid layouts to Xbox', () => {
  const session = { id: 'test', date: '2026-10-09T00:00:00Z', mode: 'button', demo: false, seconds: 2, attempts: [], bestStreak: 0 };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify([{ ...session, controllerLayout: 'ds4' }, { ...session, controllerLayout: 'bad' }, session]) } });
  try { assert.deepEqual(loadHistory().map(s => s.controllerLayout), ['ds4', 'xbox', 'xbox']); }
  finally { delete (globalThis as Record<string, unknown>).localStorage; }
});
