import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableSequences, nextTarget, transitionDelay } from '../src/adaptation.ts';
import { customDrillId, DEFAULT_SETTINGS, findDrill, getTargets, MIXED_DRILL_ID, normalizeSettings, practiceDrills, QUICK_DRILLS } from '../src/engine.ts';

test('mixed drills default to all three categories and complete each chain before switching', () => {
  const settings = normalizeSettings({ ...DEFAULT_SETTINGS, mode: 'adapt', drillId: MIXED_DRILL_ID, sequenceShare: 0, weights: {} });
  assert.equal(practiceDrills(settings).length, 11);
  assert.deepEqual(new Set(practiceDrills(settings).map(d => QUICK_DRILLS.find(q => q.id === d.id)?.category)), new Set(['basic', 'combat', 'movement']));
  const pairs = { ...settings, mixedDrillIds: ['slide-jump', 'swap-fire'] };
  let target = nextTarget(pairs, undefined, () => 0)!;
  assert.equal(target.sequence?.id, 'slide-jump');
  assert.equal(target.id, 'crouch');
  target = nextTarget(pairs, target, () => 0.99)!;
  assert.equal(target.sequence?.id, 'slide-jump');
  assert.equal(target.id, 'jump');
  target = nextTarget(pairs, target, () => 0)!;
  assert.equal(target.sequence?.id, 'swap-fire');
  assert.equal(target.id, 'fire');
  target = nextTarget(pairs, target)!;
  assert.equal(target.id, 'weapon');
  target = nextTarget(pairs, target)!;
  assert.equal(target.id, 'fire');
  assert.equal(nextTarget(pairs, target)?.sequence?.id, 'slide-jump');
});

test('mixed selection persists, ignores random weights, and skips whole unavailable groups', () => {
  const settings = normalizeSettings({ ...DEFAULT_SETTINGS, mode: 'adapt', drillId: 'mixed', mixedDrillIds: ['slide-jump', 'swap-fire', 'swap-fire', 'missing'], weights: Object.fromEntries(DEFAULT_SETTINGS.bindings.map(b => [b.id, 0])), sequenceShare: 0 });
  assert.deepEqual(settings.mixedDrillIds, ['slide-jump', 'swap-fire']);
  assert.equal(nextTarget(settings, undefined, () => 0)?.sequence?.id, 'slide-jump');
  settings.bindings = settings.bindings.map(b => b.id === 'jump' ? { ...b, enabled: false } : b);
  assert.deepEqual(availableSequences(settings).map(s => s.id), ['swap-fire']);
  assert.ok(!getTargets(settings).some(t => t.id === 'jump' || t.id === 'crouch' || t.id === 'sprint'));
  settings.mixedDrillIds = [];
  assert.deepEqual(getTargets(settings), []);
  assert.equal(nextTarget(settings), undefined);
  assert.deepEqual(normalizeSettings(settings).mixedDrillIds, []);
});

test('custom groups with a catalog id stay independent and use current bindings and saved timing', () => {
  const settings = normalizeSettings({ ...DEFAULT_SETTINGS, mode: 'adapt', drillId: customDrillId('slide-reload'), sequences: [{ id: 'slide-reload', label: 'My combo', actions: ['tactical', 'jump', 'ultimate'], delays: [350, 900], enabled: true, weight: 3 }] });
  settings.bindings = settings.bindings.map(b => b.id === 'tactical' ? { ...b, button: 10 } : b);
  assert.equal(findDrill(settings, 'slide-reload')?.actions[0], 'crouch');
  assert.equal(findDrill(settings)?.actions[0], 'tactical');
  let target = nextTarget(settings)!;
  assert.equal(target.button, 10);
  assert.equal(transitionDelay(settings, target), 350);
  target = nextTarget(settings, target)!;
  assert.equal(target.id, 'jump');
  assert.equal(transitionDelay(settings, target), 900);
  target = nextTarget(settings, target)!;
  assert.deepEqual(target.chord, [4, 5]);
  assert.equal(nextTarget(settings, target)?.id, 'tactical');
  const mixed = { ...settings, drillId: 'mixed', mixedDrillIds: [customDrillId('slide-reload')] };
  assert.equal(nextTarget(mixed)?.sequence?.label, 'My combo');
  assert.equal(normalizeSettings(JSON.parse(JSON.stringify(settings))).drillId, customDrillId('slide-reload'));
});

test('disabled and removed custom groups cannot become mixed targets; old saves migrate safely', () => {
  const settings = normalizeSettings({ ...DEFAULT_SETTINGS, mode: 'adapt', drillId: 'mixed', mixedDrillIds: ['custom:off', 'custom:sprint', 'custom:gone'], sequences: [
    { id: 'off', label: 'Off', actions: ['jump', 'fire'], enabled: false },
    { id: 'sprint', label: 'Legacy sprint', actions: ['sprint', 'jump'], enabled: true },
  ] });
  assert.deepEqual(settings.mixedDrillIds, ['custom:off', 'custom:sprint']);
  assert.deepEqual(practiceDrills(settings), []);
  assert.equal(nextTarget(settings), undefined);
  assert.equal(normalizeSettings({ ...settings, drillId: 'custom:gone' }).drillId, null);
  const legacy = normalizeSettings({ drillId: 'slide-jump', sequences: DEFAULT_SETTINGS.sequences });
  assert.equal(legacy.drillId, 'slide-jump');
  assert.equal(legacy.mixedDrillIds.length, 11);
});
