import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimulationSnapshot } from '@shared/types';
import { TOUR_STEPS, TOTAL_STEPS, simUsed, type TourApi } from './tourSteps';

interface Props {
  snapshot: SimulationSnapshot;
  api: TourApi;
  onExit: () => void;
  /** Height of the panel in pixels, so the page can leave room for it. */
  onHeight: (px: number) => void;
}

const TICK = 100;
const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function GuidedTour({ snapshot, api, onExit, onHeight }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [compact, setCompact] = useState(false);
  const [runId, setRunId] = useState(0); // bumps on "Run again" so step 1 is entered again
  const [elapsed, setElapsed] = useState(0); // ms in the current step
  const [total, setTotal] = useState(0); // ms in the whole tour
  const panelRef = useRef<HTMLDivElement>(null);

  // latest values for the timer and handlers (no stale closures)
  const snapRef = useRef(snapshot); snapRef.current = snapshot;
  const apiRef = useRef(api); apiRef.current = api;
  const pausedRef = useRef(paused); pausedRef.current = paused;
  const idxRef = useRef(idx); idxRef.current = idx;
  const elapsedRef = useRef(0);

  const step = TOUR_STEPS[Math.min(idx, TOTAL_STEPS - 1)];

  // ---- enter a step: switch page, set the scene, run its actions ----
  useEffect(() => {
    if (done) return;
    const st = TOUR_STEPS[idx];
    const a = apiRef.current;
    const s = snapRef.current;
    if (st.fresh && simUsed(s)) a.reset();
    a.go(st.page);
    st.enter?.(a, snapRef.current);
    elapsedRef.current = 0;
    setElapsed(0);
    const t = window.setTimeout(() => {
      const main = document.querySelector('main');
      const el = st.focus ? document.querySelector(st.focus) : null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else main?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 350);
    return () => window.clearTimeout(t);
  }, [idx, done, runId]);

  const goTo = useCallback((i: number) => {
    if (i >= TOTAL_STEPS) { setDone(true); return; }
    setDone(false);
    setIdx(Math.max(0, i));
  }, []);

  const setPause = useCallback((p: boolean) => {
    setPaused(p);
    // pausing the tour pauses the simulation; resuming gives the step the playback it wants
    const st = TOUR_STEPS[idxRef.current];
    apiRef.current.control({ paused: p ? true : !!st.simPaused });
  }, []);

  // ---- the clock ----
  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      elapsedRef.current += TICK;
      setElapsed(elapsedRef.current);
      setTotal((t) => t + TICK);
      const st = TOUR_STEPS[idxRef.current];
      const e = elapsedRef.current;
      const minOk = e >= st.sec * 1000;
      const cond = st.until ? st.until(snapRef.current) : true;
      const capped = st.until && st.maxSec !== undefined && e >= st.maxSec * 1000;
      if (minOk && (cond || capped)) {
        if (idxRef.current + 1 >= TOTAL_STEPS) setDone(true);
        else setIdx(idxRef.current + 1);
      }
    }, TICK);
    return () => window.clearInterval(id);
  }, [done]);

  // ---- keyboard: space, arrows, escape ----
  useEffect(() => {
    const on = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.code === 'Space') { ev.preventDefault(); setPause(!pausedRef.current); }
      else if (ev.code === 'ArrowRight') goTo(idxRef.current + 1);
      else if (ev.code === 'ArrowLeft') goTo(idxRef.current - 1);
      else if (ev.code === 'Escape') onExit();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [goTo, onExit, setPause]);

  // ---- tell the page how much room the panel needs ----
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight));
    ro.observe(el);
    onHeight(el.offsetHeight);
    return () => { ro.disconnect(); onHeight(0); };
  }, [onHeight]);

  const restart = () => {
    setPaused(false);
    setDone(false);
    setTotal(0);
    setIdx(0);
    setRunId((r) => r + 1);
  };

  // ---------- finished ----------
  if (done) {
    return (
      <div ref={panelRef} className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-accent bg-[#0B1220] px-10 py-7 text-white shadow-[0_-12px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-300">Demo complete · {mmss(total)}</div>
            <div className="mt-1 text-[38px] font-extrabold leading-tight">See the heat. Predict the risk. Act before failure.</div>
            <div className="mt-1 text-2xl text-slate-300">Questions? The dashboard is live: click anything, or press Reset in the top bar.</div>
          </div>
          <div className="flex gap-3">
            <button onClick={restart} className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-4 text-xl font-bold hover:bg-white/20"><RotateCcw className="h-6 w-6" />Run again</button>
            <button onClick={onExit} className="flex items-center gap-2 rounded-xl bg-accent px-6 py-4 text-xl font-bold hover:bg-indigo-500"><X className="h-6 w-6" />Close</button>
          </div>
        </div>
      </div>
    );
  }

  const waiting = !!step.until && elapsed >= step.sec * 1000 && !step.until(snapshot);
  const stepFrac = Math.min(1, elapsed / ((step.until ? Math.max(step.sec, 1) : step.sec) * 1000));
  const btn = 'flex h-12 items-center gap-2 rounded-xl px-5 text-lg font-bold transition';

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-0 bottom-0 z-50 bg-[#0B1220] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
      onKeyUp={(e) => { if (e.code === 'Space') e.preventDefault(); }}
    >
      {/* progress: one segment per step, click to jump */}
      <div className="flex h-2.5 gap-[3px] bg-[#0B1220]">
        {TOUR_STEPS.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
            title={`${i + 1}. ${s.title}`}
            onClick={() => goTo(i)}
            className="relative h-full flex-1 bg-white/15"
            style={{ flexGrow: s.sec + (s.until ? 8 : 0) }}
          >
            <span
              className="absolute inset-y-0 left-0 bg-indigo-400"
              style={{ width: i < idx ? '100%' : i === idx ? `${stepFrac * 100}%` : '0%' }}
            />
          </button>
        ))}
      </div>

      <div className="px-10 pb-3 pt-3">
        {/* top row: where we are + controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-base font-bold uppercase tracking-[0.15em]">
            <span className="rounded-full bg-indigo-500 px-4 py-1.5 text-white">Step {idx + 1} / {TOTAL_STEPS}</span>
            <span className="text-indigo-300">{step.label}</span>
            <span className="text-slate-400">· demo time {mmss(total)}</span>
            {paused && <span className="animate-pulseRing rounded-full bg-amber-500 px-4 py-1.5 text-white">Paused</span>}
            {!paused && waiting && <span className="animate-pulseRing text-amber-300">{step.waitingFor}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button className={`${btn} bg-white/10 hover:bg-white/20`} onClick={() => goTo(idx - 1)} disabled={idx === 0} title="Previous (←)"><SkipBack className="h-6 w-6" />Back</button>
            <button
              className={`${btn} ${paused ? 'bg-amber-500 hover:bg-amber-400' : 'bg-indigo-500 hover:bg-indigo-400'} min-w-[170px] justify-center text-xl`}
              onClick={() => setPause(!paused)} title="Pause / resume (Space)"
            >
              {paused ? <Play className="h-7 w-7" /> : <Pause className="h-7 w-7" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className={`${btn} bg-white/10 hover:bg-white/20`} onClick={() => goTo(idx + 1)} title="Next (→)">Next<SkipForward className="h-6 w-6" /></button>
            <button className={`${btn} bg-white/10 hover:bg-white/20 !px-4`} onClick={() => setCompact((c) => !c)} title={compact ? 'Show script' : 'Hide script'}>
              {compact ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
            </button>
            <button className={`${btn} bg-white/10 hover:bg-red-500/80 !px-4`} onClick={onExit} title="Stop the demo (Esc)"><X className="h-6 w-6" /></button>
          </div>
        </div>

        <h2 className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight">{step.title}</h2>

        {!compact && (
          <div className="mt-2 grid grid-cols-[1fr_1fr] gap-6">
            <div>
              <div className="mb-1 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">What you are looking at</div>
              <ul className="space-y-1.5 text-[22px] font-semibold leading-snug text-slate-100">
                {step.see(snapshot).map((l, i) => (
                  <li key={i} className="flex gap-3"><span className="mt-[10px] h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-400" /><span>{l}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-indigo-400/40 bg-indigo-500/15 px-5 py-3">
              <div className="mb-1 text-sm font-bold uppercase tracking-[0.2em] text-indigo-300">Say this</div>
              <p className="text-[24px] font-bold leading-snug text-white">{step.say(snapshot)}</p>
            </div>
          </div>
        )}
        <div className="mt-2 text-xs text-slate-500">Space = pause / resume · ← → = back / next · Esc = stop · click the bar on top to jump</div>
      </div>
    </div>
  );
}
