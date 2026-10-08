import { DEFAULT_BINDINGS, bindingKeys, withKeys } from './engine.ts';
import type { Binding } from './engine.ts';

export type ConfigFile = { name: string; text: string };
export type ImportResult = { bindings: Binding[]; resolved: string[]; warnings: string[]; sources: string[]; layout: string; abilityCount: number; requiresProfile: boolean };
// +ability uses Apex's slot order, not the browser's standard Gamepad order.
export const SLOT_BUTTONS = [0, 1, 2, 3, 6, 7, 4, 5, 10, 11, 12, 13, 14, 15, 8];
const SLOT_ACTIONS = ['jump', 'crouch', 'interact', 'weapon', 'aim', 'fire', 'tactical', 'ping', 'sprint', 'melee', 'heal', 'extra', 'firemode', 'grenade', 'map'];
const PHYSICAL_KEYS: Record<string, number> = { A_BUTTON: 0, B_BUTTON: 1, X_BUTTON: 2, Y_BUTTON: 3, L_SHOULDER: 4, R_SHOULDER: 5, L_TRIGGER: 6, R_TRIGGER: 7, BACK: 8, START: 9, STICK1: 10, STICK2: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const COMMAND_ACTIONS: Record<string, string> = { '+jump': 'jump', '+duck': 'crouch', '+toggle_duck': 'crouch', '+use': 'interact', '+use_long': 'interact', '+reload': 'interact', '+useandreload': 'interact', '+weaponcycle': 'weapon', '+offhand1': 'tactical', '+offhand4': 'ultimate', '+ping': 'ping', '+zoom': 'aim', '+toggle_zoom': 'aim', '+attack': 'fire', '+speed': 'sprint', '+melee': 'melee', '+scriptcommand4': 'heal', '+scriptcommand5': 'extra', '+scriptcommand3': 'firemode', weaponselectordnance: 'grenade', toggle_map: 'map', toggle_inventory: 'inventory', ingamemenu_activate: 'inventory' };

// Parse data only. Never execute commands, aliases, or exec directives from a cfg.
export function parseApexConfigs(files: ConfigFile[]): ImportResult {
  const variables = new Map<string, string>();
  const commands = new Map<number, { command: string; line: number }>();
  const warnings: string[] = [];
  let heldCount = 0;
  for (const file of files) {
    for (const [i, raw] of file.text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
      const line = raw.trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) continue;
      const bind = line.match(/^(bind(?:_held)?(?:_US_standard)?)\s+"([^"]+)"\s+"([^"]*)"(?:\s+\d+)?/i);
      if (bind) {
        const key = PHYSICAL_KEYS[bind[2].toUpperCase()];
        if (key === undefined) continue; // Keyboard/mouse bindings must never become gamepad keys.
        if (bind[1].toLowerCase().includes('_held')) { heldCount++; continue; }
        commands.set(key, { command: bind[3].trim(), line: i + 1 });
        continue;
      }
      const unbind = line.match(/^unbind(?:_US_standard)?\s+"([^"]+)"/i);
      if (unbind && PHYSICAL_KEYS[unbind[1].toUpperCase()] !== undefined) { commands.set(PHYSICAL_KEYS[unbind[1].toUpperCase()], { command: '', line: i + 1 }); continue; }
      if (/^unbindall\s*(?:\/\/.*)?$/i.test(line)) for (const key of SLOT_BUTTONS) commands.set(key, { command: '', line: i + 1 });
      const variable = line.match(/^(gamepad_button_layout|gamepad_custom_pilot|gamepad_buttons_are_southpaw)\s+"?([^"\r\n]+)"?/i);
      if (variable) variables.set(variable[1].toLowerCase(), variable[2].trim());
    }
  }
  const layoutId = variables.get('gamepad_button_layout');
  let permutation: number[] | undefined;
  let layout = '未提供布局';
  if (layoutId === '0') { permutation = Array.from({ length: 15 }, (_, i) => i); layout = 'Apex 标准布局'; }
  else if (layoutId === '6') {
    const text = variables.get('gamepad_custom_pilot') || '';
    const parts = text.split(',').map(s => s.trim());
    const values = parts.map(Number);
    if ([14, 15].includes(values.length) && parts.every(s => /^\d+$/.test(s)) && values.every(v => v >= 0 && v < 15) && new Set(values).size === values.length && (values.length !== 14 || !values.includes(14))) {
      permutation = values.length === 14 ? [...values, 14] : values; layout = 'Apex 自定义布局';
    } else warnings.push('自定义布局数组缺失或无效：需要 gamepad_custom_pilot 的 14 / 15 个不重复动作编号。');
  } else if (layoutId !== undefined) warnings.push(`暂不能可靠识别布局编号 ${layoutId}，请在游戏切换为自定义布局后导入，或手动设置。`);
  else if (variables.has('gamepad_custom_pilot')) warnings.push('缺少 gamepad_button_layout，无法判断自定义数组是否正在生效。');
  if (variables.get('gamepad_buttons_are_southpaw') === '1') { permutation = undefined; warnings.push('检测到左右手交换选项，暂不自动套用其布局，请手动核对。'); }

  const resolved = new Map<string, Binding>();
  function assign(action: string, key: number) {
    const def = DEFAULT_BINDINGS.find(b => b.id === action);
    if (!def) return;
    if (resolved.has(action) && resolved.get(action)!.button !== key) warnings.push(`${def.action} 有多个物理绑定，保留最后一项，请在预览中核对。`);
    resolved.set(action, withKeys(def, [key]));
  }
  // A profile without settings uses Apex's ordinary physical-slot assignment.
  if (permutation && !commands.size) {
    permutation.forEach((action, slot) => assign(SLOT_ACTIONS[action], SLOT_BUTTONS[slot]));
    assign('inventory', 9);
  }
  let abilityCount = 0;
  for (const [key, { command, line }] of commands) {
    const ability = command.match(/^\+ability\s+(\d+)$/i);
    if (ability) {
      abilityCount++;
      const slot = Number(ability[1]);
      if (permutation && permutation[slot] !== undefined) assign(SLOT_ACTIONS[permutation[slot]], key);
      else if (slot > 14) warnings.push(`第 ${line} 行使用未知 ability 编号 ${slot}，未应用。`);
    } else if (command) {
      const actions = [...new Set(command.split(';').map(c => COMMAND_ACTIONS[c.trim().split(/\s+/)[0].toLowerCase()]).filter(Boolean))];
      if (actions.length === 1) assign(actions[0], key);
      else warnings.push(`第 ${line} 行的手柄指令${actions.length > 1 ? '包含多个动作' : '暂不支持'}，未自动应用。`);
    }
  }
  const requiresProfile = abilityCount > 0 && !permutation;
  if (requiresProfile) warnings.unshift('settings.cfg 中的 +ability 只是按键槽位，无法单独确定改键结果。请同时选择对应的 profile.cfg（旧方案选择 profile_backup.cfg）。');
  if (permutation && commands.size) {
    for (const action of SLOT_ACTIONS) if (!resolved.has(action)) warnings.push(`${DEFAULT_BINDINGS.find(b => b.id === action)?.action} 未识别，将保留原设置。`);
  }
  const tactical = resolved.get('tactical'), ping = resolved.get('ping');
  if (!resolved.has('ultimate') && tactical && ping && tactical.button !== ping.button) {
    resolved.set('ultimate', withKeys(DEFAULT_BINDINGS.find(b => b.id === 'ultimate')!, [...bindingKeys(tactical), ...bindingKeys(ping)]));
    warnings.push('大招按「战术技能键 + 标记键」生成，可在对照表中手动调整。');
  }
  if (heldCount) warnings.push('已忽略长按绑定；滑铲按蹲下键训练，换弹按互动 / 换弹键训练。');
  if (!resolved.size && !requiresProfile) warnings.push('没有识别到可用的 Xbox 动作绑定，请选择 Apex 的 settings.cfg 或 profile.cfg。');
  return { bindings: [...resolved.values()], resolved: [...resolved.keys()], warnings: [...new Set(warnings)], sources: files.map(f => f.name), layout, abilityCount, requiresProfile };
}

export function mergeImported(base: Binding[], imported: ImportResult): Binding[] {
  return base.map(binding => imported.bindings.find(b => b.id === binding.id) ?? binding);
}
