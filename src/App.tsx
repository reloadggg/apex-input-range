import { localizeTree as L, tx, useLanguage, LANGUAGE_STORAGE_KEY, formatDate } from './i18n';
import { useEffect, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, AudioLines, Check, ChevronRight, CircleHelp, Clock3, Crosshair, Flame, Gamepad2, Github, History, Keyboard, LayoutGrid, Link2, Pause, Play, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, Square, Target, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Controller from './Controller';
import { ControllerLayoutContext, useControllerLabels } from './ControllerLayout';
import { CONTROLLER_NAMES, controllerLabels, resolveControllerLayout } from './gamepad';
import type { ControllerPreference } from './gamepad';
import { BUTTONS, bindingKeys, findDrill, getTargets, loadHistory, MIXED_DRILL_ID, practiceDrills, summarize, withKeys } from './engine';
import type { Session, Settings } from './engine';
import { useTrainer } from './useTrainer';
import { initialSettings } from './presets';
import { compareBindings, oldHabitCount } from './adaptation';
import BindingsPanel from './BindingsPanel';
import AdaptSettings from './AdaptSettings';
import { ComboPrompt, QuickDrills } from './ComboTrainer';
type Page = 'train' | 'bindings' | 'history' | 'guide';
const PROJECT_URL = 'https://github.com/reloadggg/apex-input-range';
const NAV: {
    id: Page;
    label: string;
    icon: LucideIcon;
}[] = [
    { id: 'train', label: '训练场', icon: Crosshair }, { id: 'bindings', label: '键位对照', icon: SlidersHorizontal },
    { id: 'history', label: '训练记录', icon: History }, { id: 'guide', label: '使用指南', icon: CircleHelp },
];
const GROUPS = [{ id: 'face', label: '面部按键', detail: 'A / B / X / Y' }, { id: 'shoulder', label: '肩键与扳机', detail: 'LB / RB / LT / RT' }, { id: 'stick', label: '摇杆按压', detail: 'LS / RS' }, { id: 'dpad', label: '十字方向键', detail: '↑ / ↓ / ← / →' }, { id: 'system', label: '功能按键', detail: 'View / Menu' }];
function KeyCap({ id, small = false }: {
    id: number;
    small?: boolean;
}) {
    const b = BUTTONS[id];
    const { buttonLabel } = useControllerLabels();
    return <span className={`keycap key-${b.label.toLowerCase()} ${small ? 'small' : ''}`}>{buttonLabel(id)}</span>;
}
function Toggle({ checked, onChange, label, disabled = false }: {
    checked: boolean;
    onChange: () => void;
    label: string;
    disabled?: boolean;
}) {
    return <button type="button" className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} aria-label={tx(label)} disabled={disabled} onClick={onChange}><span /></button>;
}
function Metric({ icon: Icon, label, value, unit, detail, accent }: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    unit?: string;
    detail: string;
    accent?: boolean;
}) {
    return L(<div className="metric"><div className="metric-label"><Icon size={15}/>{label}</div><div className={`metric-value ${accent ? 'orange' : ''}`}>{value}<span>{unit}</span></div><div className="metric-detail">{detail}</div></div>);
}
export default function App() {
    const { language, setLanguage } = useLanguage();
    useEffect(() => {
        document.documentElement.lang = language;
        document.title = `Input Range · ${tx('连招训练')}`;
        try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Language still works without storage. */ }
    }, [language]);
    const [page, setPage] = useState<Page>('train');
    const [settings, setSettings] = useState<Settings>(initialSettings);
    const [history, setHistory] = useState<Session[]>(loadHistory);
    const [demo, setDemo] = useState(false);
    const [capture, setCapture] = useState<string | null>(null);
    const [storageError, setStorageError] = useState(false);
    const [historyId, setHistoryId] = useState<string | null>(null);
    const trainer = useTrainer(settings, demo, session => { setHistory(h => [session, ...h].slice(0, 50)); }, button => {
        const [side, id] = (capture || '').split(':');
        const field = side === 'before' ? 'previousBindings' : 'bindings';
        setSettings(s => ({ ...s, [field]: s[field].map(b => b.id === id ? withKeys(b, [button]) : b), ...(side === 'before' ? { previousReady: true, previousSource: '手动录入的旧方案' } : { currentSource: '手动录入的当前方案' }) }));
        setCapture(null);
    }, !!capture);
    const { ui, device, pressed } = trainer;
    const active = ['running', 'countdown', 'paused'].includes(ui.phase);
    const ready = demo || !!device?.standard;
    const layout = active ? trainer.sessionLayout : resolveControllerLayout(settings.controllerLayout, device?.layout);
    const { keyLabel, buttonLabel } = controllerLabels(layout);
    const targets = getTargets({ ...settings, controllerLayout: layout });
    const stats = summarize(ui.attempts);
    const modeLabel = settings.mode === 'button' ? '按键识别' : settings.mode === 'adapt' ? settings.drillId ? '连招训练' : '改键专项' : '动作记忆';
    const oldErrors = oldHabitCount(ui.attempts);
    const changedCount = settings.previousReady ? compareBindings(settings.previousBindings, settings.bindings).filter(r => r.changed).length : 0;
    const today = history.filter(s => !s.demo && new Date(s.date).toDateString() === new Date().toDateString());
    const todayHits = today.reduce((n, s) => n + summarize(s.attempts).hits, 0);
    useEffect(() => {
        try {
            localStorage.setItem('input-range-settings', JSON.stringify(settings));
            localStorage.setItem('input-range-history', JSON.stringify(history));
            setStorageError(false);
        }
        catch {
            setStorageError(true);
        }
    }, [settings, history]);
    useEffect(() => {
        function cancel(e: KeyboardEvent) { if (e.key === 'Escape')
            setCapture(null); }
        window.addEventListener('keydown', cancel);
        return () => window.removeEventListener('keydown', cancel);
    }, []);
    function navigate(next: Page) { if (active)
        return; setCapture(null); setPage(next); }
    function update<K extends keyof Settings>(key: K, value: Settings[K]) { if (!active)
        setSettings(s => ({ ...s, [key]: value, ...(key === 'mode' ? { drillId: null } : {}) })); }
    function beginSession() { trainer.start(); document.querySelector('.practice-card')?.scrollIntoView({ block: 'start', behavior: 'instant' }); }
    function changePractice(patch: Partial<Settings>) {
        if (active) return;
        setSettings(s => ({ ...s, ...patch }));
        if ('drillId' in patch) trainer.reset();
    }
    function toggleGroup(group: string) {
        const ids = BUTTONS.filter(b => b.group === group).map(b => b.id);
        const all = ids.every(id => settings.selected.includes(id));
        update('selected', all ? settings.selected.filter(id => !ids.includes(id as never)) : [...new Set([...settings.selected, ...ids])]);
    }
    function exportHistory() {
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), sessions: history }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'input-range-history.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    const mixed = settings.mode === 'adapt' && settings.drillId === MIXED_DRILL_ID;
    const activeDrill = settings.mode === 'adapt' ? findDrill(settings) : undefined;
    const preview = ui.target && active ? ui.target : mixed ? undefined : activeDrill ? targets.find(t => t.id === activeDrill.actions[0]) : targets[0];
    const displaySequence = ui.target?.sequence && active ? ui.target.sequence : activeDrill ? { ...activeDrill, step: 0 } : undefined;
    const showTarget = settings.mode === 'button' || settings.hint;
    const remaining = settings.duration ? Math.max(0, settings.duration - ui.elapsed / 1000) : ui.elapsed / 1000;
    const recent = ui.attempts.slice(-9);
    return L(<ControllerLayoutContext.Provider value={layout}><div className={`app-shell layout-${layout}`}>
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('train'); }} aria-label="Input Range 首页"><span className="brand-logo"><Zap size={24} fill="currentColor"/></span><span>input<span className="brand-light">range</span><small>BUILD YOUR INSTINCT.</small></span></a>
      <div className="workspace-tag"><span className="tiny-dot"/> APEX LEGENDS <span className="tag-line">/</span>训练空间</div>
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="主导航">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'selected' : ''}`} aria-label={label} aria-current={page === id ? 'page' : undefined} disabled={active} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="daily-card"><span className="daily-icon"><Activity size={18}/></span><div>一点练习，更多本能。<p>{`今天已完成 ${todayHits} 次正确输入`}</p></div><div className="daily-track"><span style={{ width: `${Math.min(100, todayHits)}%` }}/></div><small>每日小目标 <b>{todayHits} / 100</b></small></div><div className="local-note"><ShieldCheck size={14}/>数据仅保存在当前浏览器</div><div className="sidebar-version">INPUT RANGE <span>V.1.0</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">工作空间<ChevronRight size={13}/><span>{NAV.find(n => n.id === page)?.label}</span></div><div className="topbar-right"><label className="language-picker" translate="no"><select aria-label="Language / 语言 / 言語" value={language} onChange={e => setLanguage(e.target.value)}><option value="zh-CN">中文</option><option value="en">English</option><option value="ja">日本語</option></select></label><span className="local-badge"><span className="tiny-dot"/>本地训练</span><a className="project-link" href={PROJECT_URL} target="_blank" rel="noopener noreferrer" title="查看项目源码（新标签页）"><Github size={15} aria-hidden="true"/>GitHub</a></div></header>
      <main>
        <div className="page-heading"><div className="eyebrow"><span/>INPUT RANGE / APEX</div><div className="heading-row"><div><h1>{page === 'train' ? <>把新键位，练成<em>下意识。</em></> : page === 'bindings' ? '看清改动，练掉旧习惯。' : page === 'history' ? '每一次练习，都有迹可循。' : '从连接手柄开始。'}</h1><p>{page === 'train' ? '为 Apex 改键后的适应期而生。少一点误触，多一点肌肉记忆。' : page === 'bindings' ? '导入 Apex 配置，对照改键前后，让高频动作接得更顺。' : page === 'history' ? '回顾反应速度与误触，找到下一次练习的重点。' : '一分钟准备，把注意力交给下一次输入。'}</p></div><div className={`connection-badge ${ready ? 'connected' : ''}`}><span className="connection-dot"/><div>{demo ? '键盘体验模式' : device ? device.standard ? '手柄已连接' : '非标准映射' : '等待手柄连接'}<small>{demo ? '模拟输入 · 单独记录' : device ? CONTROLLER_NAMES[layout] : '连接后按任意手柄键'}</small></div><Gamepad2 size={20}/></div></div></div>
        {trainer.apiError && <p className="notice error">{trainer.apiError}</p>}
        {storageError && <p className="notice error">浏览器存储不可用。本次仍可训练，关闭页面后设置与成绩可能丢失。</p>}
        <div className="controller-picker"><label htmlFor="controller-layout"><Gamepad2 size={17}/>手柄键位显示</label><select id="controller-layout" disabled={active || !!capture} value={settings.controllerLayout} onChange={e => update('controllerLayout', e.target.value as ControllerPreference)}><option value="auto">自动识别</option><option value="xbox">Xbox</option><option value="ds4">DualShock 4 / PS4</option><option value="dualsense">DualSense / PS5</option></select><span>当前：{CONTROLLER_NAMES[layout]} · 保留 Apex 动作绑定</span><small>DS4Windows 显示为 Xbox 时，可在这里手动选择 PS 手柄。</small></div>

        {page === 'train' && <>
          <div className="training-grid"><div className="training-left">
            <QuickDrills settings={settings} disabled={active} choose={drillId => changePractice({ mode: 'adapt', drillId })} onChange={changePractice}/>
            <section className="practice-card" aria-label="训练面板">
              <div className="practice-top"><span className="section-name"><Target size={17}/>反应训练 <small>/ {modeLabel}</small></span><span className={`round-tag ${active ? 'live' : ''}`}>{ui.phase === 'finished' ? '本轮完成' : ui.phase === 'paused' ? '已暂停' : active ? '训练中' : '准备就绪'}</span></div>
              <div className={`practice-body ${ui.feedback || ''}`}><div className="prompt-content">
                {ui.phase === 'countdown' ? <><p className="prompt-overline">手指就位 · 即将开始</p><div className="countdown-number">{Math.ceil(ui.countdown / 1000)}</div><p className="target-label">看清提示，按下对应按键</p></> : ui.phase === 'paused' ? <><span className="state-icon"><Pause size={27}/></span><h2>训练已暂停</h2><p className="target-label">{ui.pauseReason}</p><button className="primary-button" disabled={!ready} onClick={trainer.resume}><Play size={15}/>继续训练</button></> : ui.phase === 'finished' ? <><span className="state-icon"><Trophy size={28}/></span><h2>{stats.hits ? '又离本能近了一点。' : '准备好了，再试一次。'}</h2><p className="target-label">{ui.attempts.length ? `${demo ? '体验' : '训练'}成绩已记录 · ${stats.hits} 次正确输入 · 最佳连击 ${ui.bestStreak}` : '本轮还没有输入，不计入训练记录。'}</p><button className="primary-button" disabled={!ready || !targets.length} onClick={beginSession}><RotateCcw size={15}/>再练一轮</button></> : <>
                  <p className="prompt-overline">{displaySequence || mixed ? '连招训练' : settings.mode === 'button' ? '按下对应的手柄按键' : '这个动作，应该按哪一键？'}</p>
                  {displaySequence ? <ComboPrompt sequence={displaySequence} settings={settings} correct={ui.feedback === 'correct'} running={ui.phase === 'running'}/> : mixed ? <div className="action-target"><Crosshair size={18}/><h2>混合连招训练</h2><p className="field-help">{practiceDrills(settings).length ? `从 ${practiceDrills(settings).length} 组中随机抽取，整组完成后切换。` : '请在上方勾选至少一组可用连招。'}</p></div> : preview ? settings.mode === 'button' ? <div className="target-orbit"><div className="target-key">{buttonLabel(preview.button)}</div></div> : <div className="action-target"><Crosshair size={18}/><h2>{preview.action}</h2></div> : <h2>请选择练习范围</h2>}
                  {preview && !displaySequence && settings.mode !== 'button' && showTarget && <div className="answer-hint">对应按键<span className="chord-keycap">{bindingKeys(preview).map(id => <KeyCap id={id} key={id} small/>)}</span></div>}
                  {preview && !displaySequence && bindingKeys(preview).length > 1 && <p className="combo-instruction">两个按键同时按下</p>}
                  <p className="target-label">{ui.phase === 'running' ? ui.feedback === 'correct' && displaySequence ? `完成！${(Math.max(0, ui.feedbackUntil - ui.elapsed) / 1000).toFixed(1)} 秒后进入下一步` : displaySequence ? '跟随高亮按键 · 过渡停顿时不用输入' : settings.mode === 'button' ? '看清提示，按下对应按键' : '想起你的游戏键位，然后按下它' : '一次专注的练习，就是进步的开始。'}</p>
                  {ui.feedback && <p className={`feedback-text ${ui.feedback}`} role="status">{ui.feedback === 'correct' ? '正确！' : ui.attempts.at(-1)?.oldHabit ? `按回旧键 ${keyLabel(ui.attempts.at(-1)!.oldKeys || [])} 了，试试当前键位` : `按到了 ${buttonLabel(ui.lastButton ?? 0)}，再试一次`}</p>}
                  {ui.phase === 'idle' && <><button className="primary-button start-button" disabled={!ready || !targets.length} onClick={beginSession}><Play size={15} fill="currentColor"/>开始训练<ArrowRight size={15}/></button><p className="start-caption">{!targets.length ? settings.drillId ? '请在上方选择可用连招，并启用所需动作。' : '请在右侧至少选择一个按键' : !ready ? '连接 Xbox / PS 手柄，按任意键唤醒' : `${settings.duration ? `${settings.duration} 秒` : '不限时'}专注练习 · ${activeDrill ? `${activeDrill.actions.length} 步连招` : `${targets.length} 个训练目标`}`}</p></>}
                </>}
              </div><span className="corner corner-tl"/><span className="corner corner-tr"/><span className="corner corner-bl"/><span className="corner corner-br"/></div>
              <div className="practice-bottom"><span className="time-left"><Clock3 size={14}/>{settings.duration ? '剩余时间' : '训练用时'}<b>{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(Math.floor(remaining % 60)).padStart(2, '0')}</b></span>{active ? <div className="session-controls">{ui.phase !== 'paused' && <button onClick={() => trainer.pause()}><Pause size={12}/>暂停</button>}<button onClick={trainer.finish}><Square size={12}/>结束</button></div> : <span className="keyboard-shortcut">专注练习<span>ESC</span>暂停</span>}</div>
            </section>
            <section className="stats-card" aria-label="本轮统计">
              <Metric icon={Target} label="正确率" value={stats.accuracy} unit="%" detail={`${stats.hits} 次正确 / ${ui.attempts.length} 次输入`} accent/>
              <Metric icon={Zap} label="平均反应" value={stats.average || '—'} unit="ms" detail="从出现提示到正确输入"/>
              <Metric icon={Flame} label="当前连击" value={ui.streak} detail={`最佳连击 ${ui.bestStreak} 次`}/>
              <Metric icon={X} label="错误次数" value={stats.errors} detail={`其中 ${oldErrors} 次按回旧键`}/>
            </section>
            {settings.mode === 'adapt' && <div className="adapt-focus-card"><div><strong>{changedCount ? `${changedCount} 个动作已改键，重新建立动作顺序。` : '从高频动作开始，逐步建立新习惯。'}</strong><p>滑铲 → 换弹 · 跳跃 ↔ 技能 · 技能与大招。旧键冲突自动往返练习，答对一整组再切换场景。</p></div><button className="text-button" disabled={active} onClick={() => navigate('bindings')}>查看前后对照<ArrowRight size={12}/></button></div>}
            <div className="input-stream"><div><span className="section-name"><AudioLines size={14}/>输入轨迹</span><small>最近 9 次</small></div><div className="stream-items">{recent.length ? recent.map((a, i) => <span key={i} className={`stream-item ${a.correct ? '' : 'wrong'}`} title={a.correct ? a.action : `误按 ${keyLabel(a.inputKeys || [a.button])}，应按 ${keyLabel(a.targetKeys || [a.target])}`}>{a.correct ? <Check size={11}/> : <X size={11}/>} {keyLabel(a.inputKeys || [a.button])}{a.oldHabit && <span>旧</span>}</span>) : <span className="stream-empty">你的每一次输入，都会在这里留下轨迹。<span className="empty-dots">· · · · · ·</span></span>}</div></div>
          </div>
          <aside className="training-settings">
            <section className="settings-card"><div className="card-heading"><span><Settings2 size={17}/>训练设置</span><span className="micro-label">PREFERENCES</span></div><fieldset disabled={active}>
              <label className="field-label">训练模式</label><div className="mode-switch three-modes">{(['button', 'action', 'adapt'] as const).map(mode => <button key={mode} className={settings.mode === mode ? 'chosen' : ''} onClick={() => update('mode', mode)}>{mode === 'button' ? '按键识别' : mode === 'action' ? '动作记忆' : '改键专项'}</button>)}</div><p className="field-help">{settings.mode === 'button' ? `看到 ${buttonLabel(0)}，按下 ${buttonLabel(0)}。先熟悉手柄的位置。` : settings.mode === 'adapt' ? '高频动作与旧键冲突，加上连续动作训练。' : '看到「跳跃」，按下你为它绑定的按键。'}</p><p className="field-help">自动奔跑 · 冲刺不出题</p>
              <label className="field-label spaced">单轮时长</label><div className="duration-options">{[30, 60, 120, 0].map(n => <button key={n} className={settings.duration === n ? 'chosen' : ''} onClick={() => update('duration', n)}>{n || '自由'}{n > 0 && <small>秒</small>}</button>)}</div>
              {settings.mode === 'adapt' ? <AdaptSettings settings={settings} disabled={active} onChange={changePractice} openBindings={() => navigate('bindings')}/> : <><div className="range-heading"><label className="field-label">练习范围</label><span>{settings.selected.length} 个按键</span></div><div className="group-options">{GROUPS.map(group => { const buttons = BUTTONS.filter(b => b.group === group.id); return <div className="group-option" key={group.id}><button className="group-title" onClick={() => toggleGroup(group.id)}><span className={`checkbox ${buttons.every(b => settings.selected.includes(b.id)) ? 'checked' : ''}`}>{buttons.every(b => settings.selected.includes(b.id)) && <Check size={10}/>}</span>{group.label}</button><div className="individual-keys">{buttons.map(b => <button key={b.id} className={settings.selected.includes(b.id) ? 'included' : ''} aria-label={`练习 ${buttonLabel(b.id)}`} aria-pressed={settings.selected.includes(b.id)} onClick={() => update('selected', settings.selected.includes(b.id) ? settings.selected.filter(id => id !== b.id) : [...settings.selected, b.id])}>{buttonLabel(b.id)}</button>)}</div></div>; })}</div></>}
              <div className="setting-toggle"><span><Volume2 size={14}/>声音反馈</span><Toggle label="声音反馈" checked={settings.sound} onChange={() => update('sound', !settings.sound)} disabled={active}/></div><div className="setting-toggle"><span><Keyboard size={14}/>按键提示</span><Toggle label="显示动作对应按键" checked={settings.hint} onChange={() => update('hint', !settings.hint)} disabled={active}/></div>
            </fieldset>{active && <p className="locked-note">本轮结束后可以调整设置</p>}</section>
            <section className="device-card"><div className="card-heading"><span><Gamepad2 size={16}/>手柄监视器</span><span className={`monitor-dot ${ready ? 'on' : ''}`}/></div><Controller pressed={pressed} target={showTarget && preview ? bindingKeys(preview) : []}/><p className="device-caption">{pressed.length ? `正在按下 ${keyLabel(pressed)}` : ready ? '实时输入已就绪' : device ? '需要浏览器标准映射' : '按下按键，在这里查看反馈'}</p><div className="device-footer"><span>{demo ? '键盘模拟输入' : device ? `${CONTROLLER_NAMES[layout]} · 标准映射` : 'Xbox / DS4 / DualSense · USB / 蓝牙'}</span><button disabled={active} onClick={() => { setDemo(!demo); trainer.reset(); }}><Keyboard size={12}/>{demo ? '使用手柄' : '键盘体验'}</button></div>{demo && <div className="demo-guide">{BUTTONS.map(b => <span key={b.id}>{buttonLabel(b.id)} = {b.key} · </span>)}</div>}</section>
          </aside></div>
          <div className="coach-note"><span className="tip-icon"><Zap size={17}/></span><span><strong>慢一点，反而快一点。</strong> 先追求准确，再追求速度。每天练习 5 分钟，让新键位成为自然反应。</span></div>
        </>}

        {page === 'bindings' && <BindingsPanel settings={settings} setSettings={setSettings} ready={ready} capture={capture} setCapture={setCapture} start={() => { setSettings(s => ({ ...s, mode: 'adapt', drillId: null })); navigate('train'); trainer.reset(); }}/>}
        {page === 'history' && <>
          <div className="history-toolbar"><span>最近 {history.length} 轮训练<small>最多保留 50 轮 · 键盘体验单独标注</small></span><button className="secondary-button" disabled={!history.length} onClick={exportHistory}><ArrowDownToLine size={14}/>导出记录</button></div>
          {!history.length ? <div className="empty-state"><span className="state-icon"><History size={28}/></span><h2>第一份成绩，等你创造。</h2><p>完成一轮训练后，正确率、反应时间和误触记录会出现在这里。</p><button className="primary-button" onClick={() => navigate('train')}>前往训练场<ArrowRight size={15}/></button></div> : <div className="history-table-wrap"><table className="history-table"><thead><tr>{['训练时间', '模式', '时长', '正确率', '平均反应', '最佳连击', '详情'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{history.map(s => { const summary = summarize(s.attempts); return <tr key={s.id} className={historyId === s.id ? 'selected-row' : ''}><td>{formatDate(s.date)}{s.demo && <span className="demo-tag">体验</span>}</td><td>{s.mode === 'button' ? '按键识别' : s.mode === 'adapt' ? '改键专项' : '动作记忆'}<small className="history-controller">{CONTROLLER_NAMES[s.controllerLayout ?? 'xbox']}</small></td><td>{`${s.seconds} 秒`}</td><td><strong className="green">{summary.accuracy}%</strong></td><td>{summary.average} ms</td><td>{s.bestStreak}</td><td><button className="text-button" onClick={() => setHistoryId(historyId === s.id ? null : s.id)}>{historyId === s.id ? '收起' : '查看'}</button></td></tr>; })}</tbody></table></div>}
          {history.find(s => s.id === historyId) && <SessionDetail session={history.find(s => s.id === historyId)!}/>}
        </>}
        {page === 'guide' && <>
          <div className="guide-grid">{[
            ['连接 Xbox / PS 手柄', 'Xbox、DualShock 4（PS4）或 DualSense（PS5）均可使用。通过 USB 或蓝牙连接电脑，Xbox 也可使用无线适配器。在 Chrome / Edge 中打开本页，再按一下手柄上的任意按键；右上角变绿即表示识别成功。'],
            ['同步你在 Apex 的键位', '打开「键位对照」，导入 profile.cfg 与 settings.cfg，旧方案导入对应 backup 文件；也可以直接手动编辑。所有修改仅影响训练器。'],
            ['选择适合你的训练', '「改键专项」提高高频与改动动作的权重，并训练滑铲接换弹、跳跃接技能等动作组。可编辑顺序、连续动作比例和切题间隔。'],
            ['让练习形成反馈', '按错时题目保留，按对后自动切题。平均反应时间包含纠正错误的用时。按 Esc 或切出页面暂停；结束后可在训练记录查看各按键的表现。'],
          ].map(([title, body], i) => <section className="guide-card" key={title}><div><span className="state-icon"><Gamepad2 size={23}/></span><span className="guide-step">0{i + 1}</span></div><h2>{title}</h2><p>{body}</p>{i === 1 && <button className="text-button" onClick={() => navigate('bindings')}>键位对照<ArrowRight size={13}/></button>}</section>)}</div>
          <section className="faq-card"><h2>手柄没有被识别？</h2><p>先在 Windows「设置 → 蓝牙和设备」中确认连接，再回到浏览器按下手柄按键。页面需要保持前台，并通过 HTTPS 网站或本机 localhost 打开。需要浏览器提供 standard 映射。如果不支持，可更新浏览器、改用 USB，或使用将设备输出为标准手柄的映射工具。DS4Windows / Steam Input 输出虚拟 Xbox 时，可在顶部手动选择 PS 按键显示。</p><p>Elite 背键通常表现为它所映射的普通按键，浏览器无法单独区分。Xbox / PS 系统键、触摸板、麦克风键与震动不参与训练。本版支持双键组合与连续动作组；暂不训练摇杆方向和长按时长。</p><p>暂时没有手柄时，可以在训练场的「手柄监视器」启用键盘体验。体验成绩不会计入手柄每日目标。</p></section>
        </>}
        <footer className="page-footer"><span><span className="tiny-dot"/>专注输入，建立本能。</span><div className="project-links"><a className="project-link" href={PROJECT_URL} target="_blank" rel="noopener noreferrer" title="查看项目源码（新标签页）"><Github size={13} aria-hidden="true"/>GitHub</a><span aria-hidden="true">·</span><a className="project-link" href={`${PROJECT_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" title="查看 MIT 许可证（新标签页）">MIT License</a></div></footer>
      </main>
    </div>
  </div></ControllerLayoutContext.Provider>);
}
function SessionDetail({ session }: {
    session: Session;
}) {
    const { keyLabel } = controllerLabels(session.controllerLayout ?? 'xbox');
    const rows = [...new Set(session.attempts.map(a => a.actionId || String(a.target)))].map(id => {
        const attempts = session.attempts.filter(a => (a.actionId || String(a.target)) === id);
        return { id, attempts, ...summarize(attempts) };
    }).sort((a, b) => b.errors - a.errors);
    const transitions = session.attempts.filter(a => a.sequence && a.sequence.step > 0);
    const transitionRows = [...new Set(transitions.map(a => a.sequence!.actions[a.sequence!.step - 1] + ':' + a.action))].map(key => {
        const attempts = transitions.filter(a => a.sequence!.actions[a.sequence!.step - 1] + ':' + a.action === key);
        const first = attempts[0];
        const previousId = first.sequence!.actions[first.sequence!.step - 1];
        const previousAction = session.attempts.find(a => a.actionId === previousId)?.action || previousId;
        return { key, label: `${previousAction} → ${first.action}`, ...summarize(attempts), old: oldHabitCount(attempts) };
    });
    return L(<section className="session-detail"><div className="card-heading"><span><LayoutGrid size={17}/>动作表现</span><small>{`按误触次数排序 · ${oldHabitCount(session.attempts)} 次按回旧键`}</small></div><div className="detail-grid">{rows.map(row => <div className="detail-key" key={row.id}><span className="detail-chord">{keyLabel(row.attempts[0].targetKeys || [row.attempts[0].target])}</span><div><strong>{row.attempts[0].action}</strong><small>{`${row.accuracy}% 正确 · ${row.errors} 次误触`}</small><small>{row.average ? `${row.average} ms` : '尚未按对'}</small></div></div>)}</div>
      {!!transitionRows.length && <div className="transition-results"><h3>连续动作中的切换表现</h3>{transitionRows.map(row => <div key={row.key}><strong>{row.label}</strong><span>{`${row.accuracy}% 正确 · ${row.errors} 次误触 · ${row.old} 次旧键`}</span></div>)}</div>}
      {session.attempts.some(a => !a.correct) && <p className="mistake-note">最近误触：{session.attempts.filter(a => !a.correct).slice(-5).map(a => `${a.action} 应按 ${keyLabel(a.targetKeys || [a.target])}，误按 ${keyLabel(a.inputKeys || [a.button])}${a.oldHabit ? '（旧键习惯）' : ''}`).join('；')}</p>}
    </section>);
}
