import { controllerLabels, resolveControllerLayout } from './gamepad.ts';
import type { ControllerLayout, ControllerPreference } from './gamepad.ts';

export const BUTTONS = [
  { id: 0, label: 'A', group: 'face', name: 'A 键', key: 'a' },
  { id: 1, label: 'B', group: 'face', name: 'B 键', key: 'b' },
  { id: 2, label: 'X', group: 'face', name: 'X 键', key: 'x' },
  { id: 3, label: 'Y', group: 'face', name: 'Y 键', key: 'y' },
  { id: 4, label: 'LB', group: 'shoulder', name: '左肩键', key: 'q' },
  { id: 5, label: 'RB', group: 'shoulder', name: '右肩键', key: 'e' },
  { id: 6, label: 'LT', group: 'shoulder', name: '左扳机', key: '1' },
  { id: 7, label: 'RT', group: 'shoulder', name: '右扳机', key: '3' },
  { id: 8, label: 'View', group: 'system', name: '视图键', key: 'v' },
  { id: 9, label: 'Menu', group: 'system', name: '菜单键', key: 'm' },
  { id: 10, label: 'LS', group: 'stick', name: '左摇杆按下', key: 'f' },
  { id: 11, label: 'RS', group: 'stick', name: '右摇杆按下', key: 'j' },
  { id: 12, label: '↑', group: 'dpad', name: '十字键上', key: 'ArrowUp' },
  { id: 13, label: '↓', group: 'dpad', name: '十字键下', key: 'ArrowDown' },
  { id: 14, label: '←', group: 'dpad', name: '十字键左', key: 'ArrowLeft' },
  { id: 15, label: '→', group: 'dpad', name: '十字键右', key: 'ArrowRight' },
] as const;

export type Mode = 'button' | 'action' | 'adapt';
export type Binding = { id: string; action: string; button: number; chord?: number[]; enabled?: boolean };
export type Sequence = { id: string; label: string; actions: string[]; enabled: boolean; weight: number; delays?: number[]; labels?: string[] };
export type DrillCategory = 'basic' | 'combat' | 'movement';
export type QuickDrill = Sequence & { category: DrillCategory; description: string; note: string; source?: { author: string; date: string; chapter: string; url: string } };
export type Settings = { mode: Mode; duration: number; selected: number[]; sound: boolean; hint: boolean; bindings: Binding[]; controllerLayout: ControllerPreference;
  previousBindings: Binding[]; previousReady: boolean; currentSource: string; previousSource: string;
  weights: Record<string, number>; sequences: Sequence[]; sequenceShare: number; transitionMs: number; boostChanged: boolean; schemaVersion: number; drillId: string | null; providedRevision: string;
};
export type Target = { id: string; button: number; action: string; chord?: number[]; sequence?: { id: string; label: string; actions: string[]; step: number; delays?: number[]; labels?: string[] } };
export type Attempt = { button: number; target: number; correct: boolean; reaction: number; action: string;
  actionId?: string; inputKeys?: number[]; targetKeys?: number[]; oldKeys?: number[]; oldHabit?: boolean; sequence?: Target['sequence'];
};
export type Session = { id: string; date: string; mode: Mode; demo: boolean; seconds: number; attempts: Attempt[]; bestStreak: number; controllerLayout?: ControllerLayout };

export const DEFAULT_BINDINGS: Binding[] = [
  { id: 'jump', action: '跳跃', button: 0 },
  { id: 'crouch', action: '蹲下 / 滑铲', button: 1 },
  { id: 'interact', action: '互动 / 换弹', button: 2 },
  { id: 'weapon', action: '切换武器', button: 3 },
  { id: 'tactical', action: '战术技能', button: 4 },
  { id: 'ping', action: '标记', button: 5 },
  { id: 'aim', action: '瞄准', button: 6 },
  { id: 'fire', action: '射击', button: 7 },
  { id: 'sprint', action: '冲刺', button: 10 },
  { id: 'melee', action: '近战攻击', button: 11 },
  { id: 'heal', action: '使用治疗物品', button: 12 },
  { id: 'extra', action: '角色额外动作', button: 13 },
  { id: 'firemode', action: '切换射击模式', button: 14 },
  { id: 'grenade', action: '装备手雷', button: 15 },
  { id: 'map', action: '打开地图', button: 8 },
  { id: 'inventory', action: '打开背包', button: 9 },
  { id: 'ultimate', action: '终极技能 / 大招', button: 4, chord: [4, 5] },
];

export const DEFAULT_SEQUENCES: Sequence[] = [
  { id: 'slide-reload', label: '滑铲接换弹', actions: ['crouch', 'interact'], enabled: true, weight: 5 },
  { id: 'jump-slide-reload', label: '跳跃 · 滑铲 · 换弹', actions: ['jump', 'crouch', 'interact'], enabled: true, weight: 4 },
  { id: 'jump-tactical', label: '跳跃与技能切换', actions: ['jump', 'tactical', 'jump'], enabled: true, weight: 5 },
  { id: 'tactical-reload', label: '技能接换弹', actions: ['tactical', 'interact'], enabled: true, weight: 3 },
  { id: 'slide-ultimate', label: '滑铲接大招', actions: ['crouch', 'ultimate'], enabled: true, weight: 3 },
];

export const QUICK_DRILLS: QuickDrill[] = [
  { id: 'slide-jump', category: 'basic', label: '滑铲跳', actions: ['crouch', 'jump'], labels: ['滑铲', '跳跃'], enabled: true, weight: 5,
    description: '先把蹲键与跳键接顺', note: '游戏里需要先有移动速度才能滑铲；这里练习滑铲与跳跃的按键切换。' },
  { id: 'jump-reload', category: 'basic', label: '跳跃接换弹', actions: ['jump', 'interact'], labels: ['跳跃', '换弹'], enabled: true, weight: 5,
    description: '跳完能立即找到换弹键', note: '按你当前的跳跃与互动 / 换弹键练习。游戏中互动键的作用取决于附近物体与互动设置。' },
  { id: 'slide-reload', category: 'basic', label: '滑铲接换弹', actions: ['crouch', 'interact'], labels: ['滑铲', '换弹'], enabled: true, weight: 5,
    description: '重点适应滑铲后的换弹', note: '先练滑铲到换弹的顺序；游戏中的移动方向、掩体与换弹完成时间需要另行判断。' },
  { id: 'combat-chain', category: 'basic', label: '实战串练', actions: ['tactical', 'jump', 'crouch', 'fire', 'crouch', 'fire', 'interact', 'weapon'], labels: ['技能', '跳跃', '滑铲', '射击', '蹲下', '射击', '换弹', '换枪'], delays: [200, 200, 450, 250, 200, 350, 300], enabled: true, weight: 5,
    description: '你指定的 8 步高压串练', note: '练习忙乱时连续找键。技能效果、弹药和角色姿态由游戏决定；每次射击只计一次按下。' },
  { id: 'swap-fire', category: 'combat', label: '切枪补枪', actions: ['fire', 'weapon', 'fire'], labels: ['射击', '换枪', '再射击'], delays: [300, 300], enabled: true, weight: 5,
    description: '第一把枪打完，切第二把接上', note: '练习射击 → 换枪 → 射击的切换，减少打完一梭子后误按换弹。是否切枪仍要看副武器弹药和交火距离。' },
  { id: 'crouch-reload-fire', category: 'combat', label: '蹲下换弹再开火', actions: ['fire', 'crouch', 'interact', 'fire'], labels: ['射击', '蹲下', '换弹', '再射击'], delays: [200, 250, 450], enabled: true, weight: 5,
    description: '射击后，蹲键与换弹键连续衔接', note: '模拟有合适掩体时的按键顺序。训练不检查掩体、姿态或弹匣；游戏里要等换弹完成再开火。' },
  { id: 'slide-jump-fire', category: 'combat', label: '滑铲跳接开火', actions: ['crouch', 'jump', 'fire', 'weapon', 'fire'], labels: ['滑铲', '跳跃', '射击', '换枪', '再射击'], delays: [200, 300, 350, 300], enabled: true, weight: 5,
    description: '移动键切到扳机，再切枪补伤害', note: '衔接滑铲跳与双武器输入。游戏里需要控制移动方向、准星和散布；这里专注于找对按键。' },
  { id: 'tactical-ultimate-fire', category: 'combat', label: '技能与大招切换', actions: ['tactical', 'jump', 'ultimate', 'fire'], labels: ['技能', '跳跃', '大招', '射击'], delays: [250, 350, 450], enabled: true, weight: 5,
    description: '单键技能切到大招组合键', note: '专门练技能、跳跃与大招的键位冲突；大招按当前绑定输入。这是按键串练，英雄技能的施放条件和动画需在游戏中确认。' },
  { id: 'wall-bounce', category: 'movement', label: '蹬墙跳按键预习', actions: ['crouch', 'jump', 'jump'], labels: ['滑铲', '起跳', '再按跳'], delays: [200, 350], enabled: true, weight: 3,
    description: '滑铲跳后，再次找到跳键', note: '简化为滑铲 → 跳 → 再跳。游戏里要有速度、合适墙面与入墙角度，并在触墙时处理摇杆方向和再次起跳；本页不判断蹬墙成功。',
    source: { author: 'Sonyx', date: '2026-05-11', chapter: '1:37 · Wall Bounce', url: 'https://www.youtube.com/watch?v=Wgk8LAgn4mo&t=97s' } },
  { id: 'bunny-hop', category: 'movement', label: '兔子跳按键预习', actions: ['crouch', 'jump', 'jump', 'jump'], labels: ['滑铲', '起跳', '第二次跳', '第三次跳'], delays: [200, 400, 400], enabled: true, weight: 3,
    description: '练习蹲键起手与连续重新按跳', note: '游戏里需要速度、持续蹲姿、落地跳跃和摇杆控制；按住蹲 / 切换蹲的操作不同。本页只检查按下顺序，不检查持续蹲姿或落地时机。连续跳要松开再按。',
    source: { author: 'District', date: '2026-09-04', chapter: '6:12 · Bhopping', url: 'https://www.youtube.com/watch?v=Ynqade6g0t4&t=372s' } },
  { id: 'zipline-jump', category: 'movement', label: '滑索跳按键预习', actions: ['interact', 'jump', 'jump'], labels: ['互动', '第一次跳', '第二次跳'], delays: [200, 200], enabled: true, weight: 3,
    description: '互动键接连续两次跳跃', note: '先熟悉互动 → 跳 → 跳。游戏里的滑索超级跳还需要合适的站位、滑索距离与快速输入时机；本页放慢练找键，不判断超级跳成功。连续跳要松开再按。',
    source: { author: 'Sonyx', date: '2026-05-11', chapter: '22:31 · Zipline Super Jump', url: 'https://www.youtube.com/watch?v=Wgk8LAgn4mo&t=1351s' } },
];

export function drillDelayLabel(drill: Sequence): string {
  if (!drill.delays?.length) return '可调停顿';
  const min = Math.min(...drill.delays) / 1000, max = Math.max(...drill.delays) / 1000;
  return min === max ? `${min} 秒停顿` : `${min}–${max} 秒停顿`;
}

export function bindingKeys(binding: { button: number; chord?: number[]; enabled?: boolean }): number[] {
  return binding.enabled === false ? [] : binding.chord?.length ? [...binding.chord].sort((a, b) => a - b) : [binding.button];
}
export function keyLabel(keys: number[], layout: ControllerLayout = 'xbox'): string { return controllerLabels(layout).keyLabel(keys); }
export function sameKeys(a: number[], b: number[]): boolean { return a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => v === [...b].sort((x, y) => x - y)[i]); }
export function withKeys(binding: Binding, keys: number[]): Binding { return { ...binding, button: keys[0] ?? binding.button, chord: keys.length > 1 ? keys : undefined, enabled: keys.length > 0 }; }

export const DEFAULT_SETTINGS: Settings = {
  mode: 'button', duration: 60, selected: [0, 1, 2, 3, 4, 5, 6, 7, 10, 11],
  sound: true, hint: false, bindings: DEFAULT_BINDINGS, controllerLayout: 'auto',
  previousBindings: DEFAULT_BINDINGS, previousReady: false, currentSource: '默认参考布局', previousSource: '尚未设置',
  weights: Object.fromEntries(DEFAULT_BINDINGS.map(b => [b.id, b.id === 'sprint' ? 0 : ['jump', 'crouch', 'interact', 'tactical', 'ultimate'].includes(b.id) ? 5 : 1])),
  sequences: DEFAULT_SEQUENCES, sequenceShare: 80, transitionMs: 120, boostChanged: true, schemaVersion: 2,
  drillId: null, providedRevision: '',
};

export function normalizeBindings(value: unknown): Binding[] {
  return DEFAULT_BINDINGS.map(def => {
    const b = Array.isArray(value) ? value.find(b => b && b.id === def.id) : undefined;
    if (!b || !Number.isInteger(b.button) || b.button < 0 || b.button > 15) return { ...def };
    const chord = Array.isArray(b.chord) ? [...new Set<number>(b.chord.filter((v: number) => Number.isInteger(v) && v >= 0 && v < 16))].slice(0, 2) : undefined;
    return { ...def, button: b.button, ...(chord ? { chord: chord.length > 1 ? chord : undefined } : { chord: undefined }), ...(b.enabled === false ? { enabled: false } : {}), action: typeof b.action === 'string' && b.action.trim() ? b.action.trim().slice(0, 24) : def.action };
  });
}

export function normalizeSettings(value: unknown): Settings {
  const data = value && typeof value === 'object' ? value as Partial<Settings> : {};
  return {
    mode: data.mode === 'action' || data.mode === 'adapt' ? data.mode : 'button',
    duration: [0, 30, 60, 120].includes(data.duration!) ? data.duration! : 60,
    selected: Array.isArray(data.selected) ? [...new Set(data.selected.filter(x => Number.isInteger(x) && x >= 0 && x < 16))] : [...DEFAULT_SETTINGS.selected],
    sound: typeof data.sound === 'boolean' ? data.sound : true,
    hint: typeof data.hint === 'boolean' ? data.hint : false,
    controllerLayout: data.controllerLayout === 'xbox' || data.controllerLayout === 'ds4' || data.controllerLayout === 'dualsense' ? data.controllerLayout : 'auto',
    bindings: normalizeBindings(data.bindings), previousBindings: normalizeBindings(data.previousBindings), previousReady: data.previousReady === true,
    currentSource: typeof data.currentSource === 'string' ? data.currentSource.slice(0, 200) : DEFAULT_SETTINGS.currentSource,
    previousSource: typeof data.previousSource === 'string' ? data.previousSource.slice(0, 200) : DEFAULT_SETTINGS.previousSource,
    weights: Object.fromEntries(DEFAULT_BINDINGS.map(b => [b.id, b.id === 'sprint' ? 0 : [0, 1, 3, 5].includes(data.weights?.[b.id] ?? -1) ? data.weights![b.id] : DEFAULT_SETTINGS.weights[b.id]])),
    sequences: Array.isArray(data.sequences) ? data.sequences.filter(s => s && typeof s.id === 'string' && typeof s.label === 'string' && Array.isArray(s.actions) && s.actions.length >= 2 && s.actions.length <= 12 && s.actions.every(id => DEFAULT_BINDINGS.some(b => b.id === id))).slice(0, 15).map(s => ({ id: s.id.slice(0, 80), label: s.label.slice(0, 40), actions: s.actions, enabled: s.enabled !== false, weight: [1, 3, 4, 5].includes(s.weight) ? s.weight : 3, ...(Array.isArray(s.delays) ? { delays: s.delays.slice(0, s.actions.length - 1).map(d => Number.isFinite(d) && d >= 0 && d <= 1500 ? d : 240) } : {}), ...(Array.isArray(s.labels) && s.labels.every(l => typeof l === 'string') ? { labels: s.labels.map(l => l.slice(0, 24)) } : {}) })) : DEFAULT_SEQUENCES,
    sequenceShare: [0, 50, 80, 100].includes(data.sequenceShare!) ? data.sequenceShare! : 80,
    transitionMs: [0, 120, 240].includes(data.transitionMs!) ? data.transitionMs! : 120,
    boostChanged: data.boostChanged !== false, schemaVersion: 2,
    drillId: QUICK_DRILLS.some(d => d.id === data.drillId) ? data.drillId! : null,
    providedRevision: typeof data.providedRevision === 'string' ? data.providedRevision : '',
  };
}

export function getTargets(settings: Settings): Target[] {
  const drill = settings.mode === 'adapt' ? QUICK_DRILLS.find(d => d.id === settings.drillId) : undefined;
  if (drill && !drill.actions.every(id => id !== 'sprint' && settings.bindings.some(b => b.id === id && b.enabled !== false))) return [];
  return settings.mode === 'button'
    ? BUTTONS.filter(b => settings.selected.includes(b.id)).map(b => ({ id: String(b.id), button: b.id, action: controllerLabels(resolveControllerLayout(settings.controllerLayout)).buttonName(b.id) }))
    : settings.bindings.filter(b => b.id !== 'sprint' && b.enabled !== false && (drill ? drill.actions.includes(b.id) : settings.mode === 'adapt' ? settings.weights[b.id] > 0 : bindingKeys(b).every(k => settings.selected.includes(k)))).map(b => ({ id: b.id, button: b.button, action: b.action, chord: b.chord }));
}

export function chooseTarget(targets: Target[], previous?: Target, random = Math.random): Target | undefined {
  const alternatives = targets.filter(t => t.id !== previous?.id);
  const pool = alternatives.length ? alternatives : targets;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

// Hysteresis makes partially held analog triggers stable; only down edges count.
export function readButtonEdges(values: number[], previous: boolean[]): { held: boolean[]; edges: number[] } {
  const held = values.slice(0, 16).map((v, i) => v >= (previous[i] ? 0.35 : 0.55));
  return { held, edges: held.flatMap((down, i) => down && !previous[i] ? [i] : []) };
}

export function summarize(attempts: Attempt[]) {
  const hits = attempts.filter(a => a.correct);
  return {
    hits: hits.length,
    errors: attempts.length - hits.length,
    accuracy: attempts.length ? Math.round(hits.length / attempts.length * 100) : 0,
    average: hits.length ? Math.round(hits.reduce((s, a) => s + a.reaction, 0) / hits.length) : 0,
  };
}

export function loadJson(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

export function loadHistory(): Session[] {
  const raw = loadJson('input-range-history');
  if (!Array.isArray(raw)) return [];
  const keysValid = (keys: unknown) => keys === undefined || Array.isArray(keys) && keys.length <= 16 && keys.every(k => Number.isInteger(k) && k >= 0 && k < 16);
  return raw.filter(s => s && typeof s.id === 'string' && typeof s.date === 'string' && Number.isFinite(Date.parse(s.date)) && ['button', 'action', 'adapt'].includes(s.mode) && typeof s.demo === 'boolean' && Number.isFinite(s.seconds) && s.seconds >= 0 && Number.isInteger(s.bestStreak) && s.bestStreak >= 0 && Array.isArray(s.attempts) && s.attempts.every((a: Attempt) => a && Number.isInteger(a.button) && a.button >= 0 && a.button < 16 && Number.isInteger(a.target) && a.target >= 0 && a.target < 16 && typeof a.correct === 'boolean' && Number.isFinite(a.reaction) && a.reaction >= 0 && typeof a.action === 'string' && keysValid(a.inputKeys) && keysValid(a.targetKeys) && keysValid(a.oldKeys) && (a.sequence === undefined || a.sequence && typeof a.sequence.id === 'string' && typeof a.sequence.label === 'string' && Array.isArray(a.sequence.actions) && a.sequence.actions.every(id => typeof id === 'string') && Number.isInteger(a.sequence.step) && a.sequence.step >= 0 && a.sequence.step < a.sequence.actions.length))).slice(0, 50).map(s => ({ ...s, controllerLayout: s.controllerLayout === 'ds4' || s.controllerLayout === 'dualsense' ? s.controllerLayout : 'xbox' }));
}
