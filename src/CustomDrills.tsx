import { useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Play, Plus, Save, Trash2, X } from 'lucide-react';
import { bindingKeys, canPracticeSequence, customDrillId } from './engine';
import type { Sequence, Settings } from './engine';
import { useControllerLabels } from './ControllerLayout';
import { localizeTree as L } from './i18n';
import './custom-drills.css';

type Props = {
  settings: Settings;
  disabled: boolean;
  onChange: (patch: Partial<Settings>) => void;
  choose: (id: string | null) => void;
};
type DraftStep = { key: string; action: string; label?: string; delay: string };
type Draft = { id: string; label: string; enabled: boolean; weight: number; steps: DraftStep[]; isNew: boolean };

export default function CustomDrills({ settings, disabled, onChange, choose }: Props) {
  const { keyLabel } = useControllerLabels();
  const formId = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const actions = settings.bindings.filter(binding => binding.id !== 'sprint');
  const available = (id: string) => actions.some(binding => binding.id === id && binding.enabled !== false && bindingKeys(binding).length > 0);
  const firstAction = actions.find(binding => available(binding.id))?.id;

  function startEdit(sequence?: Sequence) {
    if (disabled || (!sequence && settings.sequences.length >= 15)) return;
    const initialActions = sequence?.actions ?? (['crouch', 'interact'].every(available) ? ['crouch', 'interact'] : [firstAction ?? 'jump', firstAction ?? 'jump']);
    setDraft({
      id: sequence?.id ?? crypto.randomUUID(), label: sequence?.label ?? '', enabled: sequence?.enabled ?? true,
      weight: sequence?.weight ?? 3, isNew: !sequence,
      steps: initialActions.map((action, index) => ({
        key: crypto.randomUUID(), action, label: sequence?.labels?.[index],
        delay: String((sequence?.delays?.[index] ?? settings.transitionMs) / 1000),
      })),
    });
    setError('');
    setStatus('');
    setPendingDelete(null);
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  function updateStep(index: number, patch: Partial<DraftStep>) {
    if (disabled) return;
    setDraft(current => current && ({ ...current, steps: current.steps.map((step, i) => i === index ? { ...step, ...patch } : step) }));
    setError('');
  }

  function moveStep(index: number, direction: -1 | 1) {
    if (disabled) return;
    setDraft(current => {
      if (!current || index + direction < 0 || index + direction >= current.steps.length) return current;
      const steps = [...current.steps];
      [steps[index], steps[index + direction]] = [steps[index + direction], steps[index]];
      return { ...current, steps };
    });
  }

  function save() {
    if (disabled || !draft) return;
    if (!draft.label.trim()) { setError('请填写动作组名称。'); nameInput.current?.focus(); return; }
    if (draft.isNew && settings.sequences.length >= 15) { setError('最多保存 15 组，请先删除不需要的动作组。'); return; }
    if (draft.steps.length < 2 || draft.steps.length > 12) { setError('每组需要 2 至 12 个步骤。'); return; }
    if (!draft.steps.every(step => available(step.action))) { setError('请替换未启用的动作，或先在键位对照中设置按键。'); return; }
    const delays = draft.steps.slice(0, -1).map(step => step.delay.trim() ? Number(step.delay) : NaN);
    if (delays.some(delay => !Number.isFinite(delay) || delay < 0 || delay > 1.5)) { setError('每一步的停顿需要在 0 至 1.5 秒之间。'); return; }
    const sequence: Sequence = {
      id: draft.id, label: draft.label.trim().slice(0, 40), enabled: draft.enabled, weight: draft.weight,
      actions: draft.steps.map(step => step.action), delays: delays.map(delay => Math.round(delay * 1000)),
      ...(draft.steps.some(step => step.label) ? { labels: draft.steps.map(step => step.label ?? '') } : {}),
    };
    onChange({
      sequences: draft.isNew ? [...settings.sequences, sequence] : settings.sequences.map(item => item.id === draft.id ? sequence : item),
      mode: 'adapt', drillId: customDrillId(draft.id),
    });
    setDraft(null);
    setError('');
    setStatus(sequence.enabled ? '已保存并选中，下方可预览，点击「开始训练」练习。' : '已保存。启用动作组后可开始练习。');
  }

  function editSaved(sequence: Sequence, patch: Partial<Pick<Sequence, 'enabled' | 'weight'>>) {
    if (disabled) return;
    onChange({ sequences: settings.sequences.map(item => item.id === sequence.id ? { ...item, ...patch } : item) });
    setDraft(current => current?.id === sequence.id ? { ...current, ...patch, steps: current.steps } : current);
  }

  function remove(sequence: Sequence) {
    if (disabled) return;
    onChange({ sequences: settings.sequences.filter(item => item.id !== sequence.id), mixedDrillIds: settings.mixedDrillIds.filter(id => id !== customDrillId(sequence.id)), ...(settings.drillId === customDrillId(sequence.id) ? { drillId: null } : {}) });
    if (draft?.id === sequence.id) setDraft(null);
    setPendingDelete(null);
    setStatus('动作组已删除。');
  }

  const frequencyOptions = (weight: number) => <><option value={1}>普通</option><option value={3}>高频</option>{weight === 4 && <option value={4}>重点</option>}<option value={5}>最高</option></>;
  return L(<section className="custom-drills" aria-label="我的弱项 / 自定义">
    <div className="custom-drills-heading"><div><h3>我的弱项 / 自定义</h3><span>{`${settings.sequences.length} / 15 组`}</span></div><button type="button" className="secondary-button" disabled={disabled || settings.sequences.length >= 15 || !firstAction || !!draft} onClick={() => startEdit()}><Plus size={14}/>新建动作组</button></div>
    <p className="custom-drills-help">这里由你手动编排，不会根据训练成绩自动生成。按键跟随当前键位；可在键位对照手动修改。</p>
    <p className="custom-drills-help">初始的 5 组是可编辑示例，不代表系统识别出的弱项。</p>
    <p className="custom-drills-help">启用后可单独练习，也可在「混合训练」中勾选。频率仅影响随机专项；混合训练中各组等概率抽取。</p>
    {disabled && <p className="custom-drills-help">训练进行中，结束后可编辑动作组。</p>}
    {draft && <form className="custom-drill-form" aria-label="编辑动作组" noValidate onSubmit={event => { event.preventDefault(); save(); }}>
      <fieldset disabled={disabled}>
        <legend>{draft.isNew ? '新建动作组' : '编辑动作组'}</legend>
        <label className="custom-name-label" htmlFor={`${formId}-name`}>动作组名称<input ref={nameInput} id={`${formId}-name`} value={draft.label} maxLength={40} placeholder="例如：技能后跳滑铲换弹" onChange={event => { setDraft({ ...draft, label: event.target.value }); setError(''); }}/></label>
        <div className="custom-form-options"><label><input type="checkbox" checked={draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })}/>启用动作组</label><label>随机专项频率<select value={draft.weight} onChange={event => setDraft({ ...draft, weight: Number(event.target.value) })}>{frequencyOptions(draft.weight)}</select></label><span>{`${draft.steps.length} / 12 步`}</span></div>
        <ol className="custom-step-list">{draft.steps.map((step, index) => {
          const binding = actions.find(item => item.id === step.action);
          return <li key={step.key}>
            <span className="custom-step-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div className="custom-step-main"><label htmlFor={`${formId}-action-${step.key}`}>{`第 ${index + 1} 步动作`}</label><select id={`${formId}-action-${step.key}`} value={step.action} onChange={event => updateStep(index, { action: event.target.value, label: undefined })}>{!actions.some(item => item.id === step.action) && <option value={step.action} disabled>动作不可用</option>}{actions.map(item => <option key={item.id} value={item.id} disabled={!available(item.id)}>{item.action}{!available(item.id) && '（未启用）'}</option>)}</select><span className="custom-step-key">{available(step.action) && binding ? keyLabel(bindingKeys(binding)) : '未设置'}</span></div>
            <div className="custom-step-controls"><button type="button" disabled={disabled || index === 0} aria-label={`上移第 ${index + 1} 步`} onClick={() => moveStep(index, -1)}><ArrowUp size={14}/></button><button type="button" disabled={disabled || index === draft.steps.length - 1} aria-label={`下移第 ${index + 1} 步`} onClick={() => moveStep(index, 1)}><ArrowDown size={14}/></button><button type="button" disabled={disabled || draft.steps.length <= 2} aria-label={`删除第 ${index + 1} 步`} onClick={() => { setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) }); setError(''); }}><Trash2 size={13}/></button></div>
            {index < draft.steps.length - 1 && <label className="custom-step-delay" htmlFor={`${formId}-delay-${step.key}`}>到下一步停顿<input id={`${formId}-delay-${step.key}`} aria-label={`第 ${index + 1} 步之后的停顿（秒）`} type="number" inputMode="decimal" min="0" max="1.5" step="0.001" value={step.delay} onChange={event => updateStep(index, { delay: event.target.value })}/>秒</label>}
          </li>;
        })}</ol>
        <button type="button" className="custom-add-step" disabled={disabled || draft.steps.length >= 12 || !firstAction} onClick={() => setDraft({ ...draft, steps: [...draft.steps, { key: crypto.randomUUID(), action: firstAction!, delay: String(settings.transitionMs / 1000) }] })}><Plus size={13}/>添加步骤</button>
        <p className="custom-drills-help">每组 2–12 步，停顿 0–1.5 秒。这里只练按键顺序与节奏。</p>
        {error && <p className="custom-drill-error" role="alert">{error}</p>}
        <div className="custom-form-footer"><button type="submit" className="primary-button"><Save size={14}/>保存并预览</button><button type="button" className="secondary-button" onClick={() => { setDraft(null); setError(''); }}><X size={14}/>取消编辑</button></div>
      </fieldset>
    </form>}
    <div className="custom-drill-list">{settings.sequences.map(sequence => {
      const selected = settings.mode === 'adapt' && settings.drillId === customDrillId(sequence.id);
      const usable = canPracticeSequence(sequence, settings);
      return <article key={sequence.id} className={`custom-drill-card${selected ? ' selected' : ''}`}>
        <div className="custom-card-heading"><h4>{sequence.label}</h4>{selected && <span><Check size={12}/>已选</span>}<small>{`${sequence.actions.length} 步`}</small></div>
        <p className="custom-card-actions">{sequence.actions.map((id, i) => sequence.labels?.[i] || actions.find(binding => binding.id === id)?.action || '动作不可用').join(' → ')}</p>
        <p className="custom-card-keys">{sequence.actions.map(id => { const binding = actions.find(item => item.id === id); return binding && available(id) ? keyLabel(bindingKeys(binding)) : '未设置'; }).join(' → ')}</p>
        {!sequence.actions.every(available) && <p className="custom-card-warning">所需动作未启用，请先在键位对照中设置。</p>}
        {!sequence.enabled && <p className="custom-card-warning">本组已停用，启用后可练习。</p>}
        <div className="custom-card-settings"><label><input type="checkbox" disabled={disabled} checked={sequence.enabled} aria-label={`${sequence.label}启用状态`} onChange={event => editSaved(sequence, { enabled: event.target.checked })}/>启用动作组</label><select disabled={disabled} value={sequence.weight} aria-label={`${sequence.label}随机专项频率`} onChange={event => editSaved(sequence, { weight: Number(event.target.value) })}>{frequencyOptions(sequence.weight)}</select></div>
        <div className="custom-card-buttons"><button type="button" disabled={disabled || !usable} className={selected ? 'selected' : ''} aria-label={`练习${sequence.label}`} onClick={() => { choose(customDrillId(sequence.id)); setStatus('已选中，下方可预览，点击「开始训练」练习。'); }}><Play size={12}/>练习</button><button type="button" disabled={disabled || !!draft} aria-label={`编辑${sequence.label}`} onClick={() => startEdit(sequence)}><Pencil size={12}/>编辑</button><button type="button" disabled={disabled} aria-label={`删除${sequence.label}`} onClick={() => setPendingDelete(sequence.id)}><Trash2 size={12}/>删除</button></div>
        {pendingDelete === sequence.id && <div className="custom-delete-confirm"><span>删除此动作组？</span><button type="button" disabled={disabled} onClick={() => remove(sequence)}>确认删除</button><button type="button" disabled={disabled} onClick={() => setPendingDelete(null)}>取消</button></div>}
      </article>;
    })}</div>
    {!settings.sequences.length && <p className="custom-drills-empty">还没有动作组，点击「新建动作组」录入你容易按错的顺序。</p>}
    {settings.sequences.length >= 15 && <p className="custom-drills-help">最多保存 15 组，请先删除不需要的动作组。</p>}
    <p className="custom-drill-status" role="status">{status}</p>
  </section>);
}
