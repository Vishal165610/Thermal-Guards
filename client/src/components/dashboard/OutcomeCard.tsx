import { CheckCircle2, Hourglass, ShieldAlert } from 'lucide-react';
import type { OutcomeReport } from '@shared/types';
import { Card } from '../ui/Card';

export function OutcomeCard({ outcome }: { outcome: OutcomeReport }) {
  if (outcome.status === 'idle') {
    return (
      <Card title="Incident report" subtitle="How the response went">
        <p className="rounded-xl bg-soft px-4 py-4 text-base text-muted">
          No incident yet. When one ends, this card shows whether the breach was avoided, how long the limit was exceeded, and what was done.
        </p>
      </Card>
    );
  }
  const closed = outcome.status === 'closed';
  const good = closed && !outcome.breached;
  const tone = !closed ? '#4F46E5' : good ? '#16A34A' : '#D97706';
  const Icon = !closed ? Hourglass : good ? CheckCircle2 : ShieldAlert;
  return (
    <Card title="Incident report" subtitle={closed ? `Closed at step ${outcome.closedStep}` : 'Still running'}>
      <div className="flex items-start gap-3">
        <Icon className="mt-1 h-7 w-7 shrink-0" style={{ color: tone }} />
        <div>
          <div className="text-xl font-extrabold" style={{ color: tone }}>{outcome.headline}</div>
          <p className="mt-1 text-[15px] leading-relaxed text-ink/80">{outcome.detail}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-soft px-2 py-3">
          <div className="text-[13px] text-muted">Steps above limit</div>
          <div className="text-2xl font-extrabold tabular-nums">{outcome.stepsAboveLimit}</div>
        </div>
        <div className="rounded-xl bg-soft px-2 py-3">
          <div className="text-[13px] text-muted">Worst overshoot</div>
          <div className="text-2xl font-extrabold tabular-nums">{outcome.peakOverLimit !== null ? `${outcome.peakOverLimit.toFixed(1)}°` : '—'}</div>
        </div>
        <div className="rounded-xl bg-soft px-2 py-3">
          <div className="text-[13px] text-muted">Reaction time</div>
          <div className="text-2xl font-extrabold tabular-nums">{outcome.reactionSteps !== null ? `${outcome.reactionSteps} steps` : '—'}</div>
        </div>
      </div>
    </Card>
  );
}
