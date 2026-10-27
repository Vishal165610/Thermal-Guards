import { BarChart3, Bell, Boxes, Flame, LayoutDashboard, Pause, Play, RotateCcw, StepForward, Wifi, WifiOff, Wrench } from 'lucide-react';
import type { SimulationSnapshot } from '@shared/types';
import { SPEEDS } from '@shared/zones';
import type { PageId } from '../../hooks/usePage';

const TABS: { id: PageId; label: string; icon: typeof Bell }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'twin', label: 'Live Twin', icon: Boxes },
  { id: 'fix', label: 'Fix Center', icon: Wrench },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

interface Props {
  page: PageId;
  onPage: (p: PageId) => void;
  snapshot: SimulationSnapshot | null;
  connected: boolean;
  onReset: () => void;
  onControl: (p: { paused?: boolean; speed?: number; stepOnce?: boolean }) => void;
}

export function TopNav({ page, onPage, snapshot, connected, onReset, onControl }: Props) {
  const paused = snapshot?.control.paused ?? false;
  const speed = snapshot?.control.speed ?? 1;
  const openIssues = snapshot ? snapshot.faults.filter((f) => f.state !== 'fixed').length : 0;
  const unacked = snapshot ? snapshot.alerts.filter((a) => a.state !== 'resolved' && !a.acknowledged).length : 0;
  const badge = (id: PageId) => (id === 'fix' ? openIssues : id === 'alerts' ? unacked : 0);

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
          <Flame className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <div className="text-xl font-extrabold tracking-tight text-ink">Thermal Guard</div>
          <div className="hidden text-[13px] text-muted xl:block">Predictive industrial digital twin</div>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const n = badge(t.id);
          const on = page === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onPage(t.id)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition ${
                on ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-soft hover:text-ink'
              }`}
            >
              <Icon className="hidden h-[18px] w-[18px] xl:block" />
              {t.label}
              {n > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-crit px-1.5 text-xs font-bold text-white">{n}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <span
          className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${connected ? 'bg-ok/10 text-ok' : 'bg-crit/10 text-crit'}`}
        >
          {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {connected ? 'Live' : 'Disconnected'}
          {snapshot && <span className="font-semibold text-muted">· step {snapshot.step}</span>}
        </span>
        {snapshot && (
          <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
            <button
              onClick={() => onControl({ paused: !paused })}
              disabled={!connected}
              title={paused ? 'Resume' : 'Pause'}
              className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition disabled:opacity-40 ${paused ? 'bg-warn/15 text-warn' : 'text-ink hover:bg-soft'}`}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => onControl({ paused: true, stepOnce: true })}
              disabled={!connected}
              title="Advance one step"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink transition hover:bg-soft disabled:opacity-40"
            >
              <StepForward className="h-4 w-4" />
            </button>
            <span className="mx-0.5 h-5 w-px bg-line" />
            {SPEEDS.map((v) => (
              <button
                key={v}
                onClick={() => onControl({ speed: v })}
                disabled={!connected}
                className={`h-9 rounded-lg px-2.5 text-sm font-bold tabular-nums transition disabled:opacity-40 ${speed === v ? 'bg-accent text-white' : 'text-muted hover:bg-soft hover:text-ink'}`}
              >
                {v}×
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onReset}
          disabled={!connected}
          title="Reset simulation"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-ink transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <RotateCcw className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
