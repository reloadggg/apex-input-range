import { useEffect, useRef, useState } from 'react';
import { BUTTONS, getTargets, readButtonEdges } from './engine';
import { judgeInput, nextTarget, transitionDelay } from './adaptation';
import type { Attempt, Session, Settings, Target } from './engine';
import { detectControllerLayout, resolveControllerLayout } from './gamepad';
import type { ControllerLayout } from './gamepad';

export type Phase = 'idle' | 'countdown' | 'running' | 'paused' | 'finished';
type Runtime = {
  phase: Phase; elapsed: number; countdown: number; target?: Target;
  attempts: Attempt[]; streak: number; bestStreak: number;
  feedback: 'correct' | 'wrong' | null; lastButton: number | null;
  pauseReason: string; promptElapsed: number; feedbackUntil: number;
};
export type Device = { id: string; index: number; standard: boolean; layout: ControllerLayout };
const empty = (): Runtime => ({ phase: 'idle', elapsed: 0, countdown: 3000, attempts: [], streak: 0, bestStreak: 0, feedback: null, lastButton: null, pauseReason: '', promptElapsed: 0, feedbackUntil: 0 });

export function useTrainer(settings: Settings, demo: boolean, onFinish: (session: Session) => void, onCapture: (button: number) => void, capturing: boolean) {
  const [ui, setUi] = useState(empty);
  const [device, setDevice] = useState<Device | null>(null);
  const [pressed, setPressed] = useState<number[]>([]);
  const [apiError, setApiError] = useState('');
  const runtime = useRef(empty());
  const current = useRef({ settings, demo, onFinish, onCapture, capturing });
  current.current = { settings, demo, onFinish, onCapture, capturing };
  const sessionSettings = useRef(settings);
  const sessionDemo = useRef(demo);
  const deviceRef = useRef<Device | null>(null);
  const pausedPhase = useRef<'countdown' | 'running'>('running');
  const previous = useRef<boolean[]>([]);
  const lastFrame = useRef(performance.now());
  const audio = useRef<AudioContext | null>(null);
  const publish = () => setUi({ ...runtime.current });

  function tone(correct: boolean) {
    if (!sessionSettings.current.sound || !audio.current || audio.current.state !== 'running') return;
    try {
      const ctx = audio.current;
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      oscillator.connect(volume); volume.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(correct ? 740 : 180, ctx.currentTime);
      volume.gain.setValueAtTime(0.07, ctx.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      oscillator.start(); oscillator.stop(ctx.currentTime + 0.1);
    } catch { /* Sound is optional; blocked audio must not interrupt a session. */ }
  }

  function finish() {
    const r = runtime.current;
    if (!['running', 'paused', 'countdown'].includes(r.phase)) return;
    r.phase = 'finished'; r.feedback = null;
    if (r.attempts.length) current.current.onFinish({
      id: crypto.randomUUID(), date: new Date().toISOString(), mode: sessionSettings.current.mode,
      demo: sessionDemo.current, seconds: Math.round(r.elapsed / 1000), attempts: [...r.attempts], bestStreak: r.bestStreak,
      controllerLayout: resolveControllerLayout(sessionSettings.current.controllerLayout),
    });
    publish();
  }

  function pause(reason = '休息一下，准备好后继续。') {
    const r = runtime.current;
    if (r.phase !== 'running' && r.phase !== 'countdown') return;
    pausedPhase.current = r.phase; r.phase = 'paused'; r.pauseReason = reason;
    publish();
  }

  function resume() {
    if (runtime.current.phase !== 'paused' || (!current.current.demo && !deviceRef.current?.standard)) return;
    runtime.current.phase = pausedPhase.current;
    lastFrame.current = performance.now();
    publish();
  }

  function start() {
    if (!getTargets(current.current.settings).length || (!current.current.demo && !deviceRef.current?.standard)) return;
    if (!['idle', 'finished'].includes(runtime.current.phase)) return;
    sessionSettings.current = structuredClone(current.current.settings);
    sessionSettings.current.controllerLayout = resolveControllerLayout(current.current.settings.controllerLayout, deviceRef.current?.layout);
    sessionDemo.current = current.current.demo;
    runtime.current = { ...empty(), phase: 'countdown' };
    lastFrame.current = performance.now();
    if (current.current.settings.sound) {
      try { audio.current ??= new AudioContext(); void audio.current.resume().catch(() => {}); } catch { /* optional */ }
    }
    publish();
  }

  function input(edges: number[], held: number[]) {
    if (!edges.length) return;
    if (current.current.capturing) { current.current.onCapture(edges[0]); return; }
    const r = runtime.current;
    if (r.phase !== 'running' || !r.target || r.feedback === 'correct') return;
    const old = sessionSettings.current.previousReady && sessionSettings.current.mode !== 'button' ? sessionSettings.current.previousBindings.find(b => b.id === r.target?.id) : undefined;
    const judgment = judgeInput(r.target, edges, held, old);
    if (!judgment) return;
    const { correct, button } = judgment;
    r.attempts = [...r.attempts, { ...judgment, target: r.target.button, reaction: Math.round(r.promptElapsed), action: r.target.action, actionId: r.target.id, sequence: r.target.sequence }];
    r.streak = correct ? r.streak + 1 : 0;
    r.bestStreak = Math.max(r.bestStreak, r.streak);
    r.feedback = correct ? 'correct' : 'wrong';
    r.feedbackUntil = r.elapsed + (correct ? transitionDelay(sessionSettings.current, r.target) : 400);
    r.lastButton = button;
    tone(correct); publish();
  }

  const handlers = useRef({ input, pause, finish, resume });
  handlers.current = { input, pause, finish, resume };
  useEffect(() => {
    let frame = 0;
    let published = 0;
    let previousPressed = '';
    let failed = false;
    const keyHeld = new Set<number>();
    function loop(now: number) {
      const dt = now - lastFrame.current;
      lastFrame.current = now;
      let pads: (Gamepad | null)[] = [];
      try {
        if (!navigator.getGamepads) { if (!failed) setApiError('当前浏览器不支持 Gamepad API，请使用最新版 Chrome 或 Edge。'); failed = true; }
        else pads = Array.from(navigator.getGamepads());
      } catch { if (!failed) setApiError('浏览器阻止了手柄访问，请在本机 localhost 页面中打开。'); failed = true; }
      const connected = pads.filter((p): p is Gamepad => !!p?.connected);
      const pad = connected.find(p => p.index === deviceRef.current?.index) ?? connected.find(p => p.mapping === 'standard') ?? connected[0];
      const nextDevice = pad ? { id: pad.id, index: pad.index, standard: pad.mapping === 'standard', layout: detectControllerLayout(pad.id) } : null;
      const changed = nextDevice?.id !== deviceRef.current?.id || nextDevice?.index !== deviceRef.current?.index || nextDevice?.standard !== deviceRef.current?.standard;
      const swapped = changed && !!deviceRef.current;
      if (changed) {
        deviceRef.current = nextDevice; setDevice(nextDevice);
        previous.current = [];
        if (!current.current.demo && swapped) handlers.current.pause('手柄连接发生变化，确认连接后继续。');
      }
      const edges = readButtonEdges(pad?.buttons.map(b => b.value) ?? [], previous.current);
      previous.current = edges.held;
      const held = current.current.demo ? [...keyHeld] : edges.held.flatMap((v, i) => v ? [i] : []);
      const signature = held.join(',');
      if (signature !== previousPressed) { setPressed(held); previousPressed = signature; }
      const r = runtime.current;
      if (!current.current.demo && !nextDevice?.standard) handlers.current.pause('手柄已断开，重新连接后可继续。');
      if (r.phase === 'countdown') {
        r.countdown = Math.max(0, r.countdown - dt);
        if (r.countdown === 0) {
          r.phase = 'running'; r.target = nextTarget(sessionSettings.current); r.promptElapsed = 0;
        }
      } else if (r.phase === 'running') {
        r.elapsed += dt; r.promptElapsed += dt;
        if (sessionSettings.current.duration > 0 && r.elapsed >= sessionSettings.current.duration * 1000) {
          r.elapsed = sessionSettings.current.duration * 1000; handlers.current.finish();
        } else if (r.feedback && r.elapsed >= r.feedbackUntil) {
          if (r.feedback === 'correct') { r.target = nextTarget(sessionSettings.current, r.target); r.promptElapsed = 0; }
          r.feedback = null;
        }
      }
      if (!current.current.demo && pad?.mapping === 'standard' && !swapped) handlers.current.input(edges.edges, held);
      if (now - published > 50 && (r.phase === 'running' || r.phase === 'countdown')) { setUi({ ...r }); published = now; }
      frame = requestAnimationFrame(loop);
    }
    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable)) return;
      if (event.code === 'Escape') {
        if (runtime.current.phase === 'paused') handlers.current.resume(); else handlers.current.pause();
        return;
      }
      if (!current.current.demo || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const id = BUTTONS.find(b => b.key.toLowerCase() === event.key.toLowerCase())?.id;
      if (id === undefined) return;
      event.preventDefault(); keyHeld.add(id); handlers.current.input([id], [...keyHeld]);
    }
    function keyUp(event: KeyboardEvent) {
      const id = BUTTONS.find(b => b.key.toLowerCase() === event.key.toLowerCase())?.id;
      if (id !== undefined) keyHeld.delete(id);
    }
    function blur() { keyHeld.clear(); handlers.current.pause('窗口已失去焦点，训练已自动暂停。'); }
    function visibility() { if (document.hidden) blur(); }
    frame = requestAnimationFrame(loop);
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return { ui, device, pressed, apiError, start, pause, resume, finish, sessionLayout: resolveControllerLayout(sessionSettings.current.controllerLayout), reset: () => { runtime.current = empty(); publish(); } };
}
