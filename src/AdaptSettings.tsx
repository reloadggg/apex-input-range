import { localizeTree as L, formatDate } from './i18n';
import { ArrowRight, Plus, X } from 'lucide-react';
import { bindingKeys, customDrillId, drillDelayLabel, findDrill, MIXED_DRILL_ID, practiceDrills, QUICK_DRILLS } from './engine';
import { useControllerLabels } from './ControllerLayout';
import type { Settings, Sequence } from './engine';
import { availableSequences, compareBindings } from './adaptation';

export default function AdaptSettings({ settings, onChange, disabled, openBindings }: { settings: Settings; onChange: (update: Partial<Settings>) => void; disabled: boolean; openBindings: () => void }) {
  const { keyLabel } = useControllerLabels();
  const coreIds = ['jump', 'crouch', 'interact', 'tactical', 'ultimate'];
  const core = settings.bindings.filter(b => coreIds.includes(b.id)), more = settings.bindings.filter(b => !coreIds.includes(b.id));
  const changed = settings.previousReady ? compareBindings(settings.previousBindings, settings.bindings).filter(r => r.changed).map(r => r.current.id) : [];
  const sequences = availableSequences(settings), generated = sequences.filter(s => s.id.startsWith('conflict-'));
  const drill = QUICK_DRILLS.find(d => d.id === settings.drillId);
  const timingOptions = <div className="duration-options three">{[0, 120, 240].map(ms => <button type="button" key={ms} disabled={disabled} className={settings.transitionMs === ms ? 'chosen' : ''} onClick={() => onChange({ transitionMs: ms })}>{ms ? `${ms / 1000} 秒` : '立即'}</button>)}</div>;
  if (settings.drillId === MIXED_DRILL_ID || settings.drillId?.startsWith('custom:')) {
    const custom = findDrill(settings);
    return L(<div className="fixed-drill-settings">
      <span className="profile-label">{custom ? '我的弱项' : '混合训练'}</span><h3>{custom?.label || '混合连招训练'}</h3>
      <p>{custom ? '按你保存的顺序练习，整组完成后重新开始。可在上方「我的弱项 / 自定义」编辑动作与停顿。' : `从 ${practiceDrills(settings).length} 组中随机抽取，整组完成后切换。`}</p>
      <p>按键使用当前方案，不受随机专项的动作权重和连续比例影响。停用的动作不会出题。</p>
      <label className="field-label spaced">默认切题停顿</label>{timingOptions}<p>已单独设置停顿的步骤使用自己的间隔。</p>
      <button className="text-button" disabled={disabled} onClick={() => onChange({ drillId: null })}>回到随机改键专项<ArrowRight size={12}/></button>
    </div>);
  }
  function rows(bindings: typeof core) { return bindings.map(b => <div className="weight-row" key={b.id}><span>{b.action}<small>{keyLabel(bindingKeys(b))}{changed.includes(b.id) && <em>已改</em>}</small></span><select aria-label={`${b.action}出现频率`} disabled={disabled || b.enabled === false || b.id === 'sprint'} value={b.id === 'sprint' ? 0 : settings.weights[b.id]} onChange={e => onChange({ weights: { ...settings.weights, [b.id]: Number(e.target.value) } })}><option value={0}>不练</option><option value={1}>普通</option><option value={3}>高频</option><option value={5}>重点</option></select></div>); }
  function editSequence(id: string, patch: Partial<Sequence>) { onChange({ sequences: settings.sequences.map(s => s.id === id ? { ...s, ...patch } : s) }); }
  if (drill) return L(<div className="fixed-drill-settings">
    <span className="profile-label">{drill.category === 'movement' ? '身法预习' : '连招训练'}</span><h3>{drill.label}</h3><p>{drill.description}</p>
    <p>{`整组 ${drill.actions.length} 步，跟随高亮逐步完成。错键保留当前步骤，完成一整组后重新开始。`}</p>
    <ol>{drill.actions.map((id, i) => { const b = settings.bindings.find(b => b.id === id); return <li key={i}><span>{i + 1}. {drill.labels?.[i] || b?.action}</span><b>{b ? keyLabel(bindingKeys(b)) : '未设置'}</b></li>; })}</ol>
    {drill.delays ? <p className="drill-timing">{drillDelayLabel(drill)}。等下一步高亮再按；间隔用于练习节奏，不代表游戏动画或身法判定窗口。</p> : <><label className="field-label">两步之间的停顿</label>{timingOptions}</>}
    <div className="drill-context"><strong>怎么练</strong><p>{drill.note}</p></div>
    {drill.source ? <div className="drill-source"><span>玩家教程 · {drill.source.author} · <time dateTime={drill.source.date}>{formatDate(drill.source.date, true)}</time></span><a href={drill.source.url} target="_blank" rel="noreferrer">{drill.source.chapter}<ArrowRight size={12}/></a><p>按教程主题选编的简化练习，完整动作请查看原视频。</p></div> : <p className="drill-origin">按键场景编排 · 用于改键适应</p>}
    <button className="text-button" disabled={disabled} onClick={() => onChange({ drillId: null })}>回到随机改键专项<ArrowRight size={12}/></button>
  </div>);
  return L(<div className="adapt-settings">
    <div className="range-heading"><label className="field-label">动作出现频率</label><button disabled={disabled} className="text-button" onClick={openBindings}>键位对照<ArrowRight size={10}/></button></div><div className="weight-list">{rows(core)}</div><details className="more-actions"><summary>其他动作（切枪等）</summary>{rows(more)}</details>
    <label className="adapt-check"><input type="checkbox" disabled={disabled} checked={settings.boostChanged} onChange={e => onChange({ boostChanged: e.target.checked })}/>改过的动作与冲突组合加练 ×3</label>
    <p className="field-help">自动加练依据改键前后的冲突，不依据训练成绩。自己的弱项可在首页「我的弱项 / 自定义」自由编排。</p>
    {!settings.previousReady && <p className="field-help">先填写旧方案，即可自动识别冲突并加练。</p>}
    <details className="adapt-advanced"><summary>连续动作与节奏<span>{settings.sequenceShare}% · {sequences.length} 组</span></summary>
      <label className="field-label spaced">连续动作比例</label><div className="duration-options">{[0, 50, 80, 100].map(n => <button type="button" key={n} disabled={disabled} className={settings.sequenceShare === n ? 'chosen' : ''} onClick={() => onChange({ sequenceShare: n })}>{n}%</button>)}</div><p className="field-help">按动作组抽取，其余为单动作；每组按顺序练完。</p>
      <label className="field-label spaced">组内切题间隔</label>{timingOptions}
      <details className="sequence-editor" open><summary>连续动作组 <span>{sequences.length} 组可用</span></summary>
        {settings.sequences.map(s => <div className="sequence-edit-row" key={s.id}>
          <label><input type="checkbox" disabled={disabled} checked={s.enabled} onChange={e => editSequence(s.id, { enabled: e.target.checked })}/>{s.label}</label>
          <select aria-label={`${s.label}频率`} disabled={disabled} value={s.weight} onChange={e => editSequence(s.id, { weight: Number(e.target.value) })}><option value={1}>普通</option><option value={3}>高频</option><option value={4}>重点</option><option value={5}>最高</option></select>
          <div className="sequence-actions">{s.actions.map((id, i) => <select key={i} disabled={disabled} value={id} aria-label={`${s.label}第${i + 1}步`} onChange={e => editSequence(s.id, { actions: s.actions.map((a, j) => j === i ? e.target.value : a), labels: s.labels?.map((label, j) => j === i ? '' : label) })}>{settings.bindings.map(b => <option key={b.id} value={b.id} disabled={b.id === 'sprint'}>{b.action}{b.id === 'sprint' ? '（自动奔跑，不练）' : ''}</option>)}</select>)}</div>
          <button title="删除此动作组" aria-label={`删除${s.label}`} disabled={disabled} onClick={() => onChange({ sequences: settings.sequences.filter(item => item.id !== s.id), mixedDrillIds: settings.mixedDrillIds.filter(id => id !== customDrillId(s.id)) })}><X size={12}/></button>
          {s.enabled && !sequences.some(item => item.id === s.id) && <p className="field-help">包含未启用或不练的动作，本组暂不出题。</p>}
        </div>)}
        <button className="add-sequence" disabled={disabled || settings.sequences.length >= 15} onClick={() => onChange({ sequences: [...settings.sequences, { id: crypto.randomUUID(), label: `自定义动作组 ${settings.sequences.length + 1}`, actions: ['crouch', 'interact'], enabled: true, weight: 3 }] })}><Plus size={12}/>添加动作组</button>
      </details>
      {!!generated.length && <p className="field-help">{`另有 ${generated.length} 组旧键冲突自动加练，例如：`}{generated[0].actions.map(id => settings.bindings.find(b => b.id === id)?.action).join(' → ')}</p>}
      {!sequences.length && <p className="field-help">当前没有可用动作组，将使用单动作训练。</p>}
    </details>
  </div>);
}
