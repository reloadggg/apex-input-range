export type ControllerLayout = 'xbox' | 'ds4' | 'dualsense';
export type ControllerPreference = ControllerLayout | 'auto';

export const CONTROLLER_NAMES: Record<ControllerLayout, string> = {
  xbox: 'Xbox', ds4: 'DualShock 4', dualsense: 'DualSense / PS5',
};
const LABELS: Record<ControllerLayout, readonly string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→'],
  ds4: ['×', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', '↑', '↓', '←', '→'],
  dualsense: ['×', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', '↑', '↓', '←', '→'],
};

export function detectControllerLayout(id: string): ControllerLayout {
  if (/dualsense|\bps5\b/i.test(id) || /054c.*(?:0ce6|0df2)/i.test(id)) return 'dualsense';
  if (/dualshock|\bds4\b|\bps4\b/i.test(id) || /054c.*(?:05c4|09cc)/i.test(id) || /^wireless controller$/i.test(id)) return 'ds4';
  return 'xbox';
}

export function resolveControllerLayout(preference: ControllerPreference, detected?: ControllerLayout): ControllerLayout {
  return preference === 'auto' ? detected ?? 'xbox' : preference;
}

export function controllerLabels(layout: ControllerLayout) {
  const buttonLabel = (id: number) => LABELS[layout][id] ?? '?';
  const buttonName = (id: number) => {
    if (id === 10 || id === 11) return `${buttonLabel(id)} · ${id === 10 ? '左' : '右'}摇杆按下`;
    if (id >= 4 && id <= 7) return `${buttonLabel(id)} · ${id % 2 ? '右' : '左'}${id < 6 ? '肩键' : '扳机'}`;
    return `${buttonLabel(id)} 键`;
  };
  return { layout, buttonLabel, buttonName, keyLabel: (keys: number[]) => keys.length ? keys.map(buttonLabel).join(' + ') : '未设置' };
}
