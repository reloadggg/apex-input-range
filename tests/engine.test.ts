import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS, chooseTarget, getTargets, normalizeSettings, readButtonEdges, summarize } from '../src/engine.ts';

test('held buttons and noisy analog triggers only produce one down edge until released', () => {
  let r = readButtonEdges([1, 0, 0, 0, 0, 0, 0.6], []);
  assert.deepEqual(r.edges, [0, 6]);
  r = readButtonEdges([1, 0, 0, 0, 0, 0, 0.45], r.held);
  assert.deepEqual(r.edges, []);
  r = readButtonEdges([0, 0, 0, 0, 0, 0, 0.3], r.held);
  assert.deepEqual(r.edges, []);
  r = readButtonEdges([1, 0, 0, 0, 0, 0, 0.56], r.held);
  assert.deepEqual(r.edges, [0, 6]);
});

test('custom Apex bindings determine targets, including duplicate physical bindings', () => {
  const settings = normalizeSettings({ ...DEFAULT_SETTINGS, mode: 'action', selected: [4], bindings: [{ id: 'jump', button: 4 }] });
  const targets = getTargets(settings);
  assert.deepEqual(targets.map(t => t.id), ['jump', 'tactical']);
  assert.ok(targets.every(t => t.button === 4));
  const next = chooseTarget(targets, targets[0], () => 0);
  assert.equal(next?.id, 'tactical');
});

test('random prompts avoid immediate repetition and handle one or no selected keys', () => {
  const targets = getTargets(DEFAULT_SETTINGS);
  assert.notEqual(chooseTarget(targets, targets[0], () => 0)?.id, targets[0].id);
  assert.equal(chooseTarget([targets[0]], targets[0])?.id, targets[0].id);
  assert.equal(chooseTarget([]), undefined);
});

test('corrupt persisted settings cannot introduce invalid button ids or modes', () => {
  const settings = normalizeSettings({ mode: 'garbage', duration: -1, selected: [-1, 16, 2, 2, '3', null], bindings: [null, { id: 'jump', button: 999 }] });
  assert.deepEqual(settings.selected, [2]);
  assert.equal(settings.mode, 'button');
  assert.equal(settings.duration, 60);
  assert.equal(settings.bindings[0].button, 0);
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
});

test('accuracy counts all attempts but reaction average counts corrected prompts once', () => {
  assert.deepEqual(summarize([]), { hits: 0, errors: 0, accuracy: 0, average: 0 });
  const attempts = [
    { button: 1, target: 0, correct: false, reaction: 100, action: '跳跃' },
    { button: 0, target: 0, correct: true, reaction: 500, action: '跳跃' },
    { button: 2, target: 2, correct: true, reaction: 300, action: '换弹' },
  ];
  assert.deepEqual(summarize(attempts), { hits: 2, errors: 1, accuracy: 67, average: 400 });
});
