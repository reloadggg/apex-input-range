import { bindingKeys, getTargets, practiceDrills, sameKeys } from './engine.ts';
import type { Binding, Settings, Target, Sequence, Attempt } from './engine.ts';

export function compareBindings(before: Binding[], after: Binding[]) {
  return after.map(current => {
    const previous = before.find(b => b.id === current.id) ?? current;
    const oldKeys = bindingKeys(previous), newKeys = bindingKeys(current);
    const changed = !sameKeys(oldKeys, newKeys);
    const oldKeyNow = changed ? after.filter(b => b.id !== current.id && oldKeys.length && sameKeys(bindingKeys(b), oldKeys)) : [];
    const wasUsedBy = changed ? before.filter(b => b.id !== current.id && newKeys.length && sameKeys(bindingKeys(b), newKeys)) : [];
    return { current, previous, oldKeys, newKeys, changed, oldKeyNow, wasUsedBy };
  });
}

function weighted<T>(pool: T[], weight: (item: T) => number, random: () => number): T | undefined {
  let cursor = random() * pool.reduce((n, item) => n + weight(item), 0);
  for (const item of pool) { cursor -= weight(item); if (cursor < 0) return item; }
  return pool.at(-1);
}

export function targetWeight(target: Target, settings: Settings): number {
  let weight = settings.weights[target.id] ?? 1;
  if (settings.previousReady && settings.boostChanged) {
    const previous = settings.previousBindings.find(b => b.id === target.id);
    if (previous && !sameKeys(bindingKeys(previous), bindingKeys(target))) weight *= 3;
  }
  return weight;
}

export function availableSequences(settings: Settings): Sequence[] {
  const targets = getTargets({ ...settings, mode: 'adapt' });
  const ids = new Set(targets.map(t => t.id));
  if (settings.drillId) return practiceDrills(settings);
  const sequences = settings.sequences.filter(s => s.enabled && s.actions.every(id => ids.has(id)));
  if (!settings.previousReady || !settings.boostChanged) return sequences;
  // Both directions are exercised, including three-way remaps, not just simple swaps.
  const conflicts = compareBindings(settings.previousBindings, settings.bindings).filter(row => row.changed && ids.has(row.current.id));
  const generated: Sequence[] = [];
  for (const row of conflicts) {
    for (const other of row.oldKeyNow.filter(b => ids.has(b.id))) {
      generated.push({ id: `conflict-${row.current.id}-${other.id}`, label: '旧键冲突切换', actions: [row.current.id, other.id, row.current.id], enabled: true, weight: 5 });
    }
  }
  return [...sequences, ...generated];
}

export function nextTarget(settings: Settings, previous?: Target, random = Math.random): Target | undefined {
  const targets = getTargets(settings);
  if (settings.mode === 'adapt' && previous?.sequence && previous.sequence.step < previous.sequence.actions.length - 1) {
    const step = previous.sequence.step + 1;
    const next = targets.find(t => t.id === previous.sequence!.actions[step]);
    if (next) return { ...next, action: previous.sequence.labels?.[step] || next.action, sequence: { ...previous.sequence, step } };
  }
  const sequences = settings.mode === 'adapt' ? availableSequences(settings) : [];
  if (sequences.length && (settings.drillId || random() * 100 < settings.sequenceShare)) {
    const alternatives = sequences.filter(s => s.id !== previous?.sequence?.id);
    const selected = weighted(alternatives.length ? alternatives : sequences, s => settings.drillId ? 1 : s.weight * (settings.boostChanged && settings.previousReady && s.actions.some(id => targetWeight(targets.find(t => t.id === id)!, settings) > settings.weights[id]) ? 3 : 1), random)!;
    const first = targets.find(t => t.id === selected.actions[0])!;
    return { ...first, action: selected.labels?.[0] || first.action, sequence: { id: selected.id, label: selected.label, actions: [...selected.actions], step: 0, delays: selected.delays, labels: selected.labels } };
  }
  const alternatives = targets.filter(t => t.id !== previous?.id);
  return weighted(alternatives.length ? alternatives : targets, t => settings.mode === 'adapt' ? targetWeight(t, settings) : 1, random);
}

export function judgeInput(target: Target, edges: number[], held: number[], old?: Binding): { correct: boolean; button: number; inputKeys: number[]; targetKeys: number[]; oldKeys?: number[]; oldHabit: boolean } | null {
  if (!edges.length) return null;
  const required = bindingKeys(target);
  const wrong = edges.find(id => !required.includes(id));
  if (wrong === undefined && !required.every(id => held.includes(id))) return null; // Wait for the other half of a chord, never count the first half as a mistake.
  const inputKeys = [...new Set([...edges, ...held.filter(id => required.includes(id))])].sort((a, b) => a - b);
  const oldKeys = old ? bindingKeys(old) : undefined;
  return { correct: wrong === undefined, button: wrong ?? edges[0], inputKeys, targetKeys: required, oldKeys,
    oldHabit: wrong !== undefined && !!oldKeys?.length && !sameKeys(oldKeys, required) && oldKeys.every(id => held.includes(id)) && edges.some(id => oldKeys.includes(id)),
  };
}

export function oldHabitCount(attempts: Attempt[]) { return attempts.filter(a => a.oldHabit).length; }

export function transitionDelay(settings: Settings, target: Target): number {
  if (settings.mode !== 'adapt') return 240;
  return target.sequence?.delays?.[target.sequence.step] ?? settings.transitionMs;
}
