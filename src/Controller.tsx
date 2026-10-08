import { localizeTree as L } from './i18n';
import { BUTTONS } from './engine';
import { useControllerLabels } from './ControllerLayout';
import { CONTROLLER_NAMES } from './gamepad';
const positions: Record<number, [
    number,
    number
]> = {
    0: [411, 152], 1: [442, 121], 2: [380, 121], 3: [411, 90],
    4: [153, 51], 5: [407, 51], 6: [167, 19], 7: [393, 19],
    8: [250, 119], 9: [310, 119], 10: [154, 122], 11: [350, 193],
    12: [214, 174], 13: [214, 220], 14: [191, 197], 15: [237, 197],
};
const playstationPositions: Record<number, [
    number,
    number
]> = {
    ...positions, 8: [216, 105], 9: [344, 105], 10: [216, 193],
    12: [154, 99], 13: [154, 145], 14: [131, 122], 15: [177, 122],
};
export default function Controller({ pressed, target }: {
    pressed: number[];
    target?: number[];
}) {
    const { layout, buttonLabel } = useControllerLabels();
    const ps = layout !== 'xbox';
    return L(<svg className={`controller controller-${layout}`} viewBox="75 0 410 295" role="img" aria-label={`${CONTROLLER_NAMES[layout]} 手柄示意图，目标键和按下的按键会高亮`}>
    <defs><linearGradient id="shell" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fafbfc"/><stop offset="1" stopColor="#e8eaee"/></linearGradient><filter id="shadow" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#243044" floodOpacity=".08"/></filter></defs>
    <path d="M161 59C129 60 112 84 104 121L84 230C77 273 112 288 138 256L183 222C198 211 211 209 231 211H329C349 209 362 211 377 222L422 256C448 288 483 273 476 230L456 121C448 84 431 60 399 59Z" fill="url(#shell)" stroke="#d5d9e0" strokeWidth="2" filter="url(#shadow)"/>
    {ps ? <><rect x="233" y="71" width="94" height="62" rx="12" fill="#e1e5eb" stroke="#d1d7e0"/><text x="280" y="166" textAnchor="middle" fill="#9da7b5" fontSize="14">PS</text></> : <circle cx="280" cy="85" r="12" fill="#d5dbe3"/>}
    {BUTTONS.map(button => {
      const [x, y] = (ps ? playstationPositions : positions)[button.id];
      const down = pressed.includes(button.id), wanted = target?.includes(button.id);
      const fill = down ? '#ee895f' : wanted ? '#fff0df' : '#f2f4f7';
      const stroke = down || wanted ? '#eaa17d' : '#cdd4de';
      return <g key={button.id} data-button-id={button.id} className={wanted ? 'controller-target' : ''}>
        {button.group === 'shoulder' ? <rect x={x - 30} y={y - 11} width="60" height="23" rx="8" fill={fill} stroke={stroke}/> : <circle cx={x} cy={y} r={button.group === 'stick' ? 27 : button.group === 'system' ? 13 : 18} fill={fill} stroke={stroke}/>}
        {button.group === 'stick' && <circle cx={x} cy={y} r="22" fill="none" stroke={stroke}/>}
        <text x={x} y={y + 4} textAnchor="middle" fill={down ? '#fff' : wanted ? '#ce7b50' : '#929eaf'} fontSize={ps && button.group === 'system' ? 8 : 12} fontFamily="Arial, sans-serif">{buttonLabel(button.id)}</text>
      </g>;
    })}
  </svg>);
}
