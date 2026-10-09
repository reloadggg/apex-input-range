import { localizeTree as L } from './i18n';
import { useState } from 'react';
import { Check, Crosshair, Layers, Shuffle } from 'lucide-react';
import { bindingKeys, canPracticeSequence, customDrillId, drillDelayLabel, findDrill, MIXED_DRILL_ID, practiceDrills, QUICK_DRILLS } from './engine';
import { useControllerLabels } from './ControllerLayout';
import type { DrillCategory, Settings, Target } from './engine';
import CustomDrills from './CustomDrills';

const CATEGORIES: { id: DrillCategory; label: string; detail: string }[] = [
  { id: 'basic', label: '常用基础', detail: '从两步练起，再挑战你指定的 8 步实战串练。' },
  { id: 'combat', label: '交火衔接', detail: '新增 4 组 · 针对改键编排的交火场景，重点练换枪、换弹和技能冲突。' },
  { id: 'movement', label: '身法预习', detail: '新增 3 组 · 参考近期玩家教程选题，先熟悉按键，再进游戏练地形与时机。' },
];
type Tab = DrillCategory | 'mixed' | 'custom';
export function QuickDrills({ settings, disabled, choose, onChange }: { settings: Settings; disabled: boolean; choose: (id: string | null) => void; onChange: (patch: Partial<Settings>) => void }) {
  const { keyLabel } = useControllerLabels();
  const [category, setCategory] = useState<Tab>(() => settings.drillId === MIXED_DRILL_ID ? 'mixed' : settings.drillId?.startsWith('custom:') ? 'custom' : QUICK_DRILLS.find(d => d.id === settings.drillId)?.category ?? 'basic');
  const selected = settings.mode === 'adapt' ? findDrill(settings) : undefined;
  const mixed = settings.mode === 'adapt' && settings.drillId === MIXED_DRILL_ID;
  const mixOptions = [...QUICK_DRILLS, ...settings.sequences.map(s => ({ ...s, id: customDrillId(s.id) }))];
  function toggleMix(id: string) {
    onChange({ mixedDrillIds: settings.mixedDrillIds.includes(id) ? settings.mixedDrillIds.filter(item => item !== id) : [...settings.mixedDrillIds, id] });
  }
  return L(<section className="quick-drills" aria-label="连招训练快捷入口">
    <div className="quick-drills-heading"><span><Layers size={17}/>连招训练<small>11 组 · 同页完整预览</small></span><button disabled={disabled} className={!settings.drillId ? 'selected' : ''} onClick={() => choose(null)}><Shuffle size={12}/>随机专项</button></div>
    <div className="drill-categories" role="group" aria-label="连招分类">
      <button disabled={disabled} aria-pressed={category === 'mixed'} onClick={() => { setCategory('mixed'); choose(MIXED_DRILL_ID); }}><Shuffle size={12}/>混合训练</button>
      {CATEGORIES.map(c => <button key={c.id} disabled={disabled} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}<small>{QUICK_DRILLS.filter(d => d.category === c.id).length}</small></button>)}
      <button disabled={disabled} aria-pressed={category === 'custom'} onClick={() => setCategory('custom')}>我的弱项 / 自定义</button>
    </div>
    {category === 'custom' ? <CustomDrills settings={settings} disabled={disabled} choose={choose} onChange={onChange}/> : category === 'mixed' ? <div className="mixed-drills">
      <p className="drill-category-help">勾选想混练的连招，每组等概率抽取，整组完成后再换一组；有多组时不连续重复同一组。也可以加入自己保存的弱项。</p>
      <div className="mixed-toolbar"><strong>{`已选 ${settings.mixedDrillIds.length} 组 · ${practiceDrills({ ...settings, drillId: MIXED_DRILL_ID }).length} 组可用`}</strong><button type="button" disabled={disabled} onClick={() => onChange({ mixedDrillIds: mixOptions.filter(d => canPracticeSequence(d, settings)).map(d => d.id) })}>全选可用连招</button><button type="button" disabled={disabled} onClick={() => onChange({ mixedDrillIds: [] })}>清空选择</button></div>
      <div className="mixed-grid">{[...CATEGORIES, { id: 'custom', label: '我的弱项', detail: '' }].map(group => <fieldset key={group.id}><legend>{group.label}</legend>{mixOptions.filter(d => group.id === 'custom' ? d.id.startsWith('custom:') : QUICK_DRILLS.some(q => q.id === d.id && q.category === group.id)).map(d => {
        const available = canPracticeSequence(d, settings), checked = settings.mixedDrillIds.includes(d.id);
        return <label key={d.id}><input type="checkbox" checked={checked} disabled={disabled || !available && !checked} onChange={() => toggleMix(d.id)}/><span>{d.label}<small>{available ? `${d.actions.length} 步` : '本组或所需动作未启用'}</small></span></label>;
      })}</fieldset>)}</div>
      {!settings.sequences.length && <p className="field-help">在「我的弱项 / 自定义」保存动作组后，可加入混练。</p>}
    </div> : <>
    <p className="drill-category-help">{CATEGORIES.find(c => c.id === category)?.detail}</p>
    <div className={`quick-drill-grid category-${category}`}>{QUICK_DRILLS.filter(d => d.category === category).map(drill => {
      const available = drill.actions.every(id => settings.bindings.some(b => b.id === id && b.enabled !== false));
      return <button key={drill.id} className={`quick-drill ${selected?.id === drill.id ? 'selected' : ''} ${drill.id === 'combat-chain' ? 'combat' : ''}`} aria-label={`练习${drill.label}`} disabled={disabled || !available} title={!available ? '请先在键位对照中启用本组需要的动作' : drill.description} onClick={() => choose(drill.id)}>
        <div><strong>{drill.label}</strong>{selected?.id === drill.id && <Check size={14}/>}</div>
        <p className="drill-action-line">{(drill.labels || drill.actions.map(id => settings.bindings.find(b => b.id === id)?.action || '')).join(' → ')}</p>
        <p className="drill-key-line">{drill.actions.map(id => { const b = settings.bindings.find(b => b.id === id); return b ? keyLabel(bindingKeys(b)) : '未设置'; }).join(' → ')}</p>
        <small className="drill-card-meta">{available ? `${drill.actions.length} 步 · ${drillDelayLabel(drill)}` : '所需动作未启用'}</small>
      </button>;
    })}</div></>}
    <p className="drill-selection-help">{mixed ? <><strong>已选：混合训练</strong> · 点击「开始训练」，随机抽取完整连招</> : selected ? <><strong>已选：{selected.label}</strong> · 下方预览，点击「开始训练」练习</> : '选一组查看完整步骤，再点击「开始训练」。'}</p>
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
