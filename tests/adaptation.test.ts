import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseApexConfigs, mergeImported } from '../src/apexConfig.ts';
import { availableSequences, compareBindings, judgeInput, nextTarget, targetWeight, transitionDelay } from '../src/adaptation.ts';
import { bindingKeys, DEFAULT_BINDINGS, DEFAULT_SETTINGS, getTargets, loadHistory, normalizeSettings, QUICK_DRILLS, withKeys } from '../src/engine.ts';

const provided = JSON.parse(readFileSync(new URL('../src/provided-configs.json', import.meta.url), 'utf8'));
const before = parseApexConfigs(provided.before);
const after = parseApexConfigs(provided.after);
const settings = normalizeSettings({ ...DEFAULT_SETTINGS, mode: 'adapt', previousReady: true, bindings: mergeImported(DEFAULT_BINDINGS, after), previousBindings: mergeImported(DEFAULT_BINDINGS, before) });

test('actual local profiles resolve custom slot order and standard backup', () => {
  assert.equal(after.requiresProfile, false);
  assert.equal(after.resolved.length, 17);
  assert.equal(before.resolved.length, 17);
  const key = (id: string) => bindingKeys(after.bindings.find(b => b.id === id)!);
  assert.deepEqual(key('jump'), [4]);
  assert.deepEqual(key('crouch'), [5]);
  assert.deepEqual(key('interact'), [2]);
  assert.deepEqual(key('tactical'), [10]);
  assert.deepEqual(key('weapon'), [11]);
  assert.deepEqual(key('ultimate'), [3, 10]);
  assert.deepEqual(bindingKeys(before.bindings.find(b => b.id === 'jump')!), [0]);
  assert.deepEqual(bindingKeys(before.bindings.find(b => b.id === 'ultimate')!), [4, 5]);
});

test('settings files alone never treat ability slots as actual action bindings', () => {
  const parsed = parseApexConfigs(provided.after.filter((f: { name: string }) => f.name === 'settings.cfg'));
  assert.equal(parsed.requiresProfile, true);
  assert.ok(parsed.abilityCount >= 14);
  assert.equal(parsed.resolved.includes('jump'), false);
  assert.ok(parsed.warnings.some(w => w.includes('profile.cfg')));
});

test('profile alone works and ignores stale custom array when standard layout is active', () => {
  const parsed = parseApexConfigs([{ name: 'profile.cfg', text: 'gamepad_button_layout "0"\ngamepad_custom_pilot "8,9,2,7,4,5,0,1,6,3,10,11,12,13,14"' }]);
  assert.deepEqual(bindingKeys(parsed.bindings.find(b => b.id === 'jump')!), [0]);
  assert.equal(parsed.resolved.length, 17);
});

test('invalid or unsupported layouts are reported without inventing mappings', () => {
  for (const text of ['gamepad_button_layout "6"\ngamepad_custom_pilot "0,0,2"', 'gamepad_button_layout "3"', 'gamepad_custom_pilot "0,1,2,3,4,5,6,7,8,9,10,11,12,13"', 'gamepad_button_layout "0"\ngamepad_buttons_are_southpaw "1"']) {
    const result = parseApexConfigs([{ name: 'bad.cfg', text }]);
    assert.ok(result.warnings.length);
    assert.equal(result.bindings.length, 0);
  }
});

test('explicit commands honor physical keys and last binding, not keyboard or held binds', () => {
  const result = parseApexConfigs([{ name: 'direct.cfg', text: '\uFEFFbind_US_standard "a" "+jump" 0\nbind_US_standard "A_BUTTON" "+jump" 0\nbind_held_US_standard "A_BUTTON" "+offhand1" 0\nbind_US_standard "X_BUTTON" "+reload" 0\nbind_US_standard "A_BUTTON" "+duck" 0\nbind_US_standard "B_BUTTON" "+offhand4" 0' }]);
  assert.equal(result.resolved.includes('jump'), false);
  assert.equal(result.resolved.includes('tactical'), false);
  assert.equal(result.bindings.find(b => b.id === 'crouch')?.button, 0);
  assert.equal(result.bindings.find(b => b.id === 'ultimate')?.button, 1);
  const merged = mergeImported(DEFAULT_BINDINGS, result);
  assert.equal(merged.find(b => b.id === 'fire')?.button, 7);
});

test('custom physical ability routing is combined with profile permutation', () => {
  const result = parseApexConfigs([{ name: 'profile.cfg', text: 'gamepad_button_layout "0"' }, { name: 'settings.cfg', text: 'bind_US_standard "L_SHOULDER" "+ability 0" 0' }]);
  assert.equal(result.bindings.find(b => b.id === 'jump')?.button, 4);
});

test('compare detects three-way old-key reuse and changed chord', () => {
  const rows = compareBindings(settings.previousBindings, settings.bindings);
  assert.equal(rows.find(r => r.current.id === 'jump')?.oldKeyNow[0].id, 'sprint');
  assert.equal(rows.find(r => r.current.id === 'jump')?.wasUsedBy[0].id, 'tactical');
  assert.equal(rows.find(r => r.current.id === 'ultimate')?.changed, true);
  assert.equal(rows.find(r => r.current.id === 'interact')?.changed, false);
});

test('changed high-frequency actions receive triple weight; opting out is respected', () => {
  const jump = { id: 'jump', action: '跳跃', button: 4 };
  assert.equal(targetWeight(jump, settings), 15);
  assert.equal(targetWeight(jump, { ...settings, boostChanged: false }), 5);
  assert.equal(targetWeight(jump, { ...settings, previousReady: false }), 5);
});

test('sequence proceeds slide -> reload without random interruption', () => {
  const custom = { ...settings, boostChanged: false, sequenceShare: 100, sequences: [{ id: 'slide-reload', label: '滑铲接换弹', actions: ['crouch', 'interact'], enabled: true, weight: 5 }] };
  const first = nextTarget(custom, undefined, () => 0)!;
  const second = nextTarget(custom, first, () => 0.99)!;
  assert.equal(first.id, 'crouch'); assert.equal(first.sequence?.step, 0);
  assert.equal(second.id, 'interact'); assert.equal(second.sequence?.step, 1);
  assert.equal(nextTarget(custom, second, () => 0)?.id, 'crouch');
});

test('automatic conflict groups and all sequences respect disabled actions', () => {
  assert.ok(availableSequences(settings).some(s => s.id === 'conflict-tactical-jump'));
  assert.ok(availableSequences(settings).every(s => !s.actions.includes('sprint')));
  const excluded = { ...settings, weights: { ...settings.weights, jump: 0, interact: 0 } };
  assert.ok(availableSequences(excluded).every(s => !s.actions.includes('jump') && !s.actions.includes('interact')));
  const noGroups = { ...excluded, sequences: [], boostChanged: false, sequenceShare: 100 };
  assert.ok(nextTarget(noGroups));
  assert.equal(nextTarget({ ...settings, bindings: [] }), undefined);
});

test('auto sprint is excluded after loading old settings without removing its binding or physical key', () => {
  const old = { ...settings, weights: { ...settings.weights, sprint: 5 }, sequences: [{ id: 'old-sprint', label: '冲刺接跳', actions: ['sprint', 'jump'], enabled: true, weight: 5 }] };
  const migrated = normalizeSettings(old);
  assert.equal(migrated.weights.sprint, 0);
  assert.deepEqual(migrated.bindings.find(b => b.id === 'sprint'), settings.bindings.find(b => b.id === 'sprint'));
  for (const mode of ['adapt', 'action'] as const) {
    assert.ok(getTargets({ ...old, mode }).every(t => t.id !== 'sprint'));
    assert.ok(getTargets({ ...migrated, mode }).every(t => t.id !== 'sprint'));
  }
  assert.ok(availableSequences(old).every(s => !s.actions.includes('sprint')));
  assert.ok(getTargets({ ...migrated, mode: 'button' }).some(t => t.button === settings.bindings.find(b => b.id === 'sprint')!.button));
});

test('combination requires overlap, ignores partial input, and rejects unrelated edges', () => {
  const target = { id: 'ultimate', action: '大招', button: 10, chord: [10, 3] };
  assert.equal(judgeInput(target, [10], [10]), null);
  assert.equal(judgeInput(target, [3], [3]), null);
  assert.equal(judgeInput(target, [3], [10, 3])?.correct, true);
  assert.equal(judgeInput(target, [], [10, 3]), null);
  assert.equal(judgeInput(target, [3, 0], [10, 3, 0])?.correct, false);
});

test('old-habit mistakes distinguish old bindings from unrelated errors and stale held keys', () => {
  const target = { id: 'jump', action: '跳跃', button: 4 };
  const old = DEFAULT_BINDINGS[0];
  assert.equal(judgeInput(target, [0], [0], old)?.oldHabit, true);
  assert.equal(judgeInput(target, [1], [1, 0], old)?.oldHabit, false);
  assert.equal(judgeInput(target, [4], [4], old)?.oldHabit, false);
  const combo = { id: 'ultimate', action: '大招', button: 10, chord: [10, 3] };
  const oldCombo = DEFAULT_BINDINGS.find(b => b.id === 'ultimate')!;
  assert.equal(judgeInput(combo, [4, 5], [4, 5], oldCombo)?.oldHabit, true);
});

test('two-key bindings and disabled actions survive settings migration', () => {
  const normalized = normalizeSettings({ ...settings, bindings: settings.bindings.map(b => b.id === 'jump' ? withKeys(b, []) : b) });
  assert.deepEqual(bindingKeys(normalized.bindings.find(b => b.id === 'jump')!), []);
  assert.deepEqual(bindingKeys(normalized.bindings.find(b => b.id === 'ultimate')!), [3, 10]);
  assert.equal(normalized.previousReady, true);
});

test('homepage quick drills always preserve the chosen combo despite random weight settings', () => {
  const fixed = { ...settings, drillId: 'slide-jump', sequenceShare: 0, weights: Object.fromEntries(settings.bindings.map(b => [b.id, 0])) };
  const first = nextTarget(fixed, undefined, () => 0.99)!;
  const next = nextTarget(fixed, first, () => 0.99)!;
  assert.equal(first.id, 'crouch'); assert.equal(next.id, 'jump');
  assert.equal(nextTarget(fixed, next, () => 0.99)?.id, 'crouch');
  assert.equal(first.action, '滑铲');
});

test('combat chain keeps all eight steps and the pause after sliding', () => {
  const fixed = { ...settings, drillId: 'combat-chain' };
  const sequence = [];
  let current = nextTarget(fixed, undefined, () => 0)!;
  for (let i = 0; i < 8; i++) {
    sequence.push(current.id);
    assert.equal(current.sequence?.step, i);
    if (i === 2) { assert.equal(current.action, '滑铲'); assert.equal(transitionDelay(fixed, current), 450); }
    if (i === 4) assert.equal(current.action, '蹲下');
    current = nextTarget(fixed, current, () => 0.9)!;
  }
  assert.deepEqual(sequence, ['tactical', 'jump', 'crouch', 'fire', 'crouch', 'fire', 'interact', 'weapon']);
  assert.equal(current.sequence?.step, 0);
});

test('new catalog choices survive reload, override random exclusions and require enabled bindings', () => {
  for (const drill of QUICK_DRILLS.filter(d => d.category !== 'basic')) {
    const fixed = normalizeSettings(JSON.parse(JSON.stringify({ ...settings, drillId: drill.id, sequenceShare: 0, weights: Object.fromEntries(settings.bindings.map(b => [b.id, 0])) })));
    assert.equal(fixed.drillId, drill.id);
    let target = nextTarget(fixed, undefined, () => 0.99)!;
    for (let i = 0; i < drill.actions.length; i++) {
      assert.equal(target.id, drill.actions[i]);
      assert.equal(target.sequence?.step, i);
      assert.deepEqual(bindingKeys(target), bindingKeys(settings.bindings.find(b => b.id === drill.actions[i])!));
      target = nextTarget(fixed, target, () => 0.99)!;
    }
    assert.equal(target.sequence?.step, 0);
    const unavailable = { ...fixed, bindings: fixed.bindings.map(b => b.id === drill.actions[0] ? { ...b, enabled: false } : b) };
    assert.deepEqual(getTargets(unavailable), []);
    assert.equal(nextTarget(unavailable), undefined);
  }
});

test('new adaptation history persists while malformed chord data is rejected', () => {
  const valid = { id: 'test', date: '2026-10-09T00:00:00Z', mode: 'adapt', demo: true, seconds: 4, bestStreak: 1, attempts: [{ button: 3, target: 10, correct: true, reaction: 600, action: '大招', targetKeys: [3, 10], inputKeys: [3, 10] }] };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify([valid, { ...valid, id: 'bad', attempts: [{ ...valid.attempts[0], targetKeys: [99] }] }]) } });
  assert.equal(loadHistory().length, 1);
  delete (globalThis as Record<string, unknown>).localStorage;
});
