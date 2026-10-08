import { localizeTree as L, tx } from './i18n';
import { useRef, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Check, FileUp, FolderOpen, Gamepad2, Plus, RotateCcw, X } from 'lucide-react';
import { BUTTONS, DEFAULT_BINDINGS, bindingKeys, withKeys } from './engine';
import { useControllerLabels } from './ControllerLayout';
import type { Binding, Settings } from './engine';
import { compareBindings } from './adaptation';
import { mergeImported, parseApexConfigs } from './apexConfig';
import type { ConfigFile } from './apexConfig';
import { applyProvided } from './presets';
import ConfigImportGuide from './ConfigImportGuide';
type Props = {
    settings: Settings;
    setSettings: (update: (s: Settings) => Settings) => void;
    ready: boolean;
    capture: string | null;
    setCapture: (id: string | null) => void;
    start: () => void;
};
export default function BindingsPanel({ settings, setSettings, ready, capture, setCapture, start }: Props) {
    const { keyLabel } = useControllerLabels();
    const rows = compareBindings(settings.previousBindings, settings.bindings);
    const changed = rows.filter(r => r.changed);
    const [onlyChanged, setOnlyChanged] = useState(false);
    function change(side: 'before' | 'after', id: string, keys: number[]) {
        const field = side === 'before' ? 'previousBindings' : 'bindings';
        setCapture(null);
        setSettings(s => ({ ...s, [field]: s[field].map(b => b.id === id ? withKeys(b, keys) : b), ...(side === 'before' ? { previousReady: true, previousSource: '手动编辑的旧键位' } : { currentSource: '手动编辑的当前键位' }) }));
    }
    function deriveUltimate(side: 'before' | 'after') {
        const bindings = side === 'before' ? settings.previousBindings : settings.bindings;
        const keys = [...new Set(['tactical', 'ping'].flatMap(id => bindingKeys(bindings.find(b => b.id === id)!)))];
        if (keys.length === 2)
            change(side, 'ultimate', keys);
    }
    return L(<>
    <ConfigImportGuide />
    <div className="remap-intro"><span className="tip-icon"><ArrowLeftRight size={20}/></span><div><strong>{tx("先对齐两套键位，再练习新的反应。")}</strong><p>{tx("左边保留旧习惯，右边是训练答案。支持直接上传配置，也可以逐项手动输入。")}</p></div><button className="secondary-button" onClick={() => { setSettings(applyProvided); setCapture(null); }}><FolderOpen size={14}/>{tx("载入本次提供的文件")}</button></div>
    <div className="import-grid">
      <ImportCard side="before" source={settings.previousSource} onApply={(result) => { setCapture(null); setSettings(s => ({ ...s, previousBindings: mergeImported(s.previousBindings, result), previousReady: true, previousSource: result.sources.join(' + ') })); }}/>
      <ImportCard side="after" source={settings.currentSource} onApply={(result) => { setCapture(null); setSettings(s => ({ ...s, bindings: mergeImported(s.bindings, result), currentSource: result.sources.join(' + ') })); }}/>
    </div>
    <div className="remap-summary"><div><span className="summary-number">{settings.previousReady ? changed.length : '—'}</span><span>个动作已改键</span></div><div><span className="summary-number">{settings.previousReady ? changed.filter(r => r.oldKeyNow.length).length : '—'}</span><span>个旧键改作其他动作</span></div><div className="summary-tip">{settings.previousReady ? '旧键冲突会自动生成往返动作组，并在专项训练中增加出现频率。' : '请先导入或填写旧键位，才能判断变化和旧习惯误触。'}</div></div>
    <section className="comparison-card"><div className="comparison-heading"><div><ArrowLeftRight size={17}/><strong>{tx("前后键位对照")}</strong><span>{tx("训练始终使用右侧当前键位")}</span></div><label><input type="checkbox" checked={onlyChanged} onChange={e => setOnlyChanged(e.target.checked)}/>{tx("只看改动")}</label></div>
      <div className="comparison-scroll"><table className="comparison-table"><thead><tr><th>游戏动作</th><th>改键前 · 旧习惯</th><th>改键后 · 当前答案</th><th>变化与冲突</th></tr></thead><tbody>{rows.filter(r => !onlyChanged || r.changed).map(row => <tr key={row.current.id} className={settings.previousReady && row.changed ? 'binding-changed' : ''}>
        <td><strong>{row.current.action}</strong><small>{row.current.id}</small>{['jump', 'crouch', 'interact', 'tactical', 'ultimate'].includes(row.current.id) && <span className="priority-tag">高频动作</span>}</td>
        <td><BindingEditor binding={row.previous} side="before" ready={ready} capture={capture === `before:${row.current.id}`} onCapture={() => setCapture(capture === `before:${row.current.id}` ? null : `before:${row.current.id}`)} onChange={keys => change('before', row.current.id, keys)}/></td>
        <td><BindingEditor binding={row.current} side="after" ready={ready} capture={capture === `after:${row.current.id}`} onCapture={() => setCapture(capture === `after:${row.current.id}` ? null : `after:${row.current.id}`)} onChange={keys => change('after', row.current.id, keys)}/></td>
        <td>{!settings.previousReady ? <span className="muted">等待旧方案</span> : row.changed ? <><span className="changed-label">{keyLabel(row.oldKeys)}<ArrowRight size={12}/>{keyLabel(row.newKeys)}</span><small className="conflict-note">{row.oldKeyNow.length ? `旧键现在是「${row.oldKeyNow.map(b => b.action).join(' / ')}」` : '动作绑定已变化'}</small></> : <span className="unchanged-label"><Check size={12}/>未改动</span>}</td>
      </tr>)}</tbody></table></div>
      <div className="comparison-footer"><span>{`组合键需同时按下；摇杆 ${keyLabel([10, 11])} 指按压。`}</span><button onClick={() => deriveUltimate('before')}>旧大招 = 技能 + 标记</button><button onClick={() => deriveUltimate('after')}>新大招 = 技能 + 标记</button></div>
    </section>
    {capture && <p className="notice capture-notice" role="status"><Gamepad2 size={16}/>正在录入 {capture.startsWith('before') ? '旧方案' : '当前方案'}：按下手柄键，或按 Esc 取消。组合键请使用表格里的第二个按键菜单。</p>}
    <div className="page-actions"><button className="text-button" onClick={() => { setCapture(null); setSettings(s => ({ ...s, previousBindings: DEFAULT_BINDINGS.map(b => ({ ...b })), previousReady: true, previousSource: '标准默认参考布局（手动选择）' })); }}><RotateCcw size={13}/>{tx(" 旧方案使用默认参考")}</button><button className="primary-button" onClick={start}>{tx("练习这些改键")}<ArrowRight size={16}/></button></div>
  </>);
}
function BindingEditor({ binding, side, onChange, ready, capture, onCapture }: {
    binding: Binding;
    side: string;
    onChange: (keys: number[]) => void;
    ready: boolean;
    capture: boolean;
    onCapture: () => void;
}) {
    const { buttonLabel, buttonName } = useControllerLabels();
    const keys = bindingKeys(binding);
    const prefix = `${side === 'before' ? '改前' : '改后'}${binding.action}`;
    return L(<div className={`binding-editor ${capture ? 'listening' : ''}`}><div><select aria-label={`${prefix}主按键`} value={keys[0] ?? -1} onChange={e => { const key = Number(e.target.value); onChange(key < 0 ? [] : [...new Set([key, ...keys.slice(1)])]); }}><option value={-1}>不训练 / 未设置</option>{BUTTONS.map(b => <option key={b.id} value={b.id}>{buttonName(b.id)}</option>)}</select><button className="capture-button" disabled={!ready} onClick={e => { onCapture(); e.currentTarget.blur(); }} aria-label={`${prefix}录入`}>{capture ? '取消' : '录入'}</button></div><div className="chord-editor"><Plus size={10}/><select aria-label={`${prefix}组合键`} disabled={!keys.length} value={keys[1] ?? -1} onChange={e => onChange(Number(e.target.value) < 0 ? keys.slice(0, 1) : [keys[0], Number(e.target.value)])}><option value={-1}>单键</option>{BUTTONS.filter(b => b.id !== keys[0]).map(b => <option key={b.id} value={b.id}>{buttonLabel(b.id)}</option>)}</select></div></div>);
}
function ImportCard({ side, source, onApply }: {
    side: 'before' | 'after';
    source: string;
    onApply: (result: ReturnType<typeof parseApexConfigs>) => void;
}) {
    const { keyLabel } = useControllerLabels();
    const [files, setFiles] = useState<ConfigFile[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [drag, setDrag] = useState(false);
    const [applied, setApplied] = useState(false);
    const generation = useRef(0);
    const result = files.length ? parseApexConfigs(files) : null;
    const label = side === 'before' ? '改键前' : '改键后';
    async function readFiles(list: FileList | File[]) {
        const current = ++generation.current;
        setBusy(true);
        setError('');
        setApplied(false);
        try {
            const incoming = Array.from(list);
            if (incoming.some(f => f.size > 2 * 1024 * 1024))
                throw Error('配置文件最大 2 MB，请选择文本格式的 .cfg 文件。');
            const read = await Promise.all(incoming.map(async (file) => {
                if (!/\.(cfg|txt)$/i.test(file.name))
                    throw Error('请选择 .cfg 或 .txt 格式的 Apex 配置文件。');
                const bytes = new Uint8Array(await file.arrayBuffer());
                const text = bytes[0] === 0xff && bytes[1] === 0xfe ? new TextDecoder('utf-16le').decode(bytes) : bytes[0] === 0xfe && bytes[1] === 0xff ? new TextDecoder('utf-16be').decode(bytes) : new TextDecoder('utf-8').decode(bytes);
                return { name: file.name, text };
            }));
            if (generation.current === current)
                setFiles(previous => [...previous.filter(f => !read.some(r => r.name === f.name)), ...read]);
        }
        catch (e) {
            if (generation.current === current)
                setError(e instanceof Error ? e.message : '读取失败，请重试。');
        }
        finally {
            if (generation.current === current)
                setBusy(false);
        }
    }
    return L(<section className={`import-card ${side}`}><div className="import-card-title"><span className="profile-label">{side === 'before' ? 'BEFORE' : 'AFTER'}</span><h2>{`${label}方案`}</h2><span className="source-chip" title={source}><Check size={11}/><span>{source}</span></span></div>
    <label className={`dropzone ${drag ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); void readFiles(e.dataTransfer.files); }}><input type="file" accept=".cfg,.txt" multiple aria-label={tx(`导入${label}配置`)} onChange={e => { if (e.target.files)
        void readFiles(e.target.files); e.target.value = ''; }}/><FileUp size={23}/><strong>{busy ? '正在读取配置…' : '拖入配置，或点击选择'}</strong><span>{side === 'before' ? 'profile_backup.cfg / settings_backup.cfg' : 'profile.cfg / settings.cfg'} · 可多选</span></label>
    {!!files.length && <div className="file-chips">{files.map(file => <span key={file.name}><span translate="no">{file.name}</span><button aria-label={`${tx('移除')} ${file.name}`} onClick={() => { generation.current++; setBusy(false); setApplied(false); setFiles(previous => previous.filter(f => f.name !== file.name)); }}><X size={11}/></button></span>)}</div>}
    {result && <><p className="import-result">{result.layout} · 识别 {result.resolved.length} 个动作<small>未识别的动作保留原设置</small></p><ul className="import-warnings">{result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul><details className="import-preview"><summary>查看识别结果</summary>{result.bindings.filter(b => result.resolved.includes(b.id)).map(b => <div key={b.id}><span>{b.action}</span><b>{keyLabel(bindingKeys(b))}</b></div>)}</details><button className="import-apply" disabled={busy || result.requiresProfile || !result.resolved.length || applied} onClick={() => { onApply(result); setApplied(true); }}><Check size={13}/>{applied ? `已应用到${label}方案` : `应用到${label}方案`}</button></>}
    {error && <p className="import-error" role="alert">{error}</p>}
    <p className="import-hint">配置只在浏览器内解析，不会上传到服务器。仅有 settings 文件时，通常还需要配套 profile。</p>
  </section>);
}
