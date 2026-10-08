import { localizeTree as L } from './i18n';
import { useState } from 'react';
import { Check, Crosshair, Layers, Shuffle } from 'lucide-react';
import { bindingKeys, drillDelayLabel, QUICK_DRILLS } from './engine';
import { useControllerLabels } from './ControllerLayout';
import type { DrillCategory, Settings, Target } from './engine';

const CATEGORIES: { id: DrillCategory; label: string; detail: string }[] = [
  { id: 'basic', label: '常用基础', detail: '从两步练起，再挑战你指定的 8 步实战串练。' },
  { id: 'combat', label: '交火衔接', detail: '新增 4 组 · 针对改键编排的交火场景，重点练换枪、换弹和技能冲突。' },
  { id: 'movement', label: '身法预习', detail: '新增 3 组 · 参考近期玩家教程选题，先熟悉按键，再进游戏练地形与时机。' },
];
export function QuickDrills({ settings, disabled, choose }: { settings: Settings; disabled: boolean; choose: (id: string | null) => void }) {
  const { keyLabel } = useControllerLabels();
  const [category, setCategory] = useState<DrillCategory>(() => QUICK_DRILLS.find(d => d.id === settings.drillId)?.category ?? 'basic');
  const selected = settings.mode === 'adapt' ? QUICK_DRILLS.find(d => d.id === settings.drillId) : undefined;
  return L(<section className="quick-drills" aria-label="连招训练快捷入口">
    <div className="quick-drills-heading"><span><Layers size={17}/>连招训练<small>11 组 · 同页完整预览</small></span><button disabled={disabled} className={!settings.drillId ? 'selected' : ''} onClick={() => choose(null)}><Shuffle size={12}/>随机专项</button></div>
    <div className="drill-categories" role="group" aria-label="连招分类">{CATEGORIES.map(c => <button key={c.id} disabled={disabled} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}<small>{QUICK_DRILLS.filter(d => d.category === c.id).length}</small>{c.id !== 'basic' && <span>新增</span>}</button>)}</div>
    <p className="drill-category-help">{CATEGORIES.find(c => c.id === category)?.detail}</p>
    <div className={`quick-drill-grid category-${category}`}>{QUICK_DRILLS.filter(d => d.category === category).map(drill => {
      const available = drill.actions.every(id => settings.bindings.some(b => b.id === id && b.enabled !== false));
      return <button key={drill.id} className={`quick-drill ${selected?.id === drill.id ? 'selected' : ''} ${drill.id === 'combat-chain' ? 'combat' : ''}`} aria-label={`练习${drill.label}`} disabled={disabled || !available} title={!available ? '请先在键位对照中启用本组需要的动作' : drill.description} onClick={() => choose(drill.id)}>
        <div><strong>{drill.label}</strong>{selected?.id === drill.id && <Check size={14}/>}</div>
        <p className="drill-action-line">{(drill.labels || drill.actions.map(id => settings.bindings.find(b => b.id === id)?.action || '')).join(' → ')}</p>
        <p className="drill-key-line">{drill.actions.map(id => { const b = settings.bindings.find(b => b.id === id); return b ? keyLabel(bindingKeys(b)) : '未设置'; }).join(' → ')}</p>
        <small className="drill-card-meta">{available ? `${drill.actions.length} 步 · ${drillDelayLabel(drill)}` : '所需动作未启用'}</small>
      </button>;
    })}</div>
    <p className="drill-selection-help">{selected ? <><strong>已选：{selected.label}</strong> · 下方预览，点击「开始训练」练习</> : '选一组查看完整步骤，再点击「开始训练」。'}</p>
  </section>);
}
export function ComboPrompt({ sequence, settings, correct, running }: { sequence: NonNullable<Target['sequence']>; settings: Settings; correct: boolean; running: boolean }) {
  const { keyLabel } = useControllerLabels();
  const current = settings.bindings.find(b => b.id === sequence.actions[sequence.step]);
  const drill = QUICK_DRILLS.find(d => d.id === sequence.id);
  const stepLabel = (i: number) => sequence.labels?.[i] || settings.bindings.find(b => b.id === sequence.actions[i])?.action || '';
  return L(<div className={`combo-prompt sequence-strip ${sequence.actions.length > 4 ? 'long-combo' : ''}`}>
    <div className="combo-heading"><strong>{sequence.label}</strong><span>{running ? `第 ${sequence.step + 1} / ${sequence.actions.length} 步` : `${sequence.actions.length} 步连招预览`}</span></div>
    {drill?.category === 'movement' && <p className="movement-practice-note">{drill.note}</p>}
    <ol className="combo-steps">{sequence.actions.map((id, i) => {
      const b = settings.bindings.find(b => b.id === id);
      const done = running && (i < sequence.step || i === sequence.step && correct);
      const currentStep = i === sequence.step;
      return <li key={i} className={done ? 'done' : currentStep ? 'current' : ''} aria-current={currentStep ? 'step' : undefined}>
        <div className="combo-step-number">{String(i + 1).padStart(2, '0')}<span>{done ? '完成' : currentStep ? running ? '现在按' : '起手' : '接下来'}</span></div>
        <strong>{stepLabel(i)}</strong><span className="combo-step-keys">{b ? keyLabel(bindingKeys(b)) : '未设置'}</span>
        <small>{i < sequence.actions.length - 1 ? `间隔 ${(sequence.delays?.[i] ?? settings.transitionMs) / 1000} 秒` : '完成'}</small>
      </li>;
    })}</ol>
    <div className="action-target sequence-current"><Crosshair size={16}/><span>{correct ? '已完成' : running ? '当前步骤' : '准备起手'}</span><h2>{stepLabel(sequence.step)}</h2>{current && bindingKeys(current).length > 1 && <small>同时按下两键</small>}</div>
  </div>);
}
