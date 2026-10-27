import { Radar, ShieldAlert, Timer } from 'lucide-react';
import type { TimelineEntry } from '@shared/types';
import { Card } from '../ui/Card';

function Node({ label, step, tone, empty, emptyText }: {
  label: string; step: number | null; tone: string; empty?: boolean; emptyText: string;
}) {
  return (
    <div
      className={`flex min-w-[150px] flex-col items-center rounded-xl border-2 px-4 py-3 ${empty ? 'border-dashed border-line text-muted' : ''}`}
      style={empty ? undefined : { borderColor: tone, color: tone, background: `${tone}12` }}
    >
      <span className="text-[13px] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-xl font-extrabold tabular-nums">{step !== null ? `step ${step}` : emptyText}</span>
    </div>
  );
}

export function EarlyWarningCard({ entry }: { entry: TimelineEntry | undefined }) {
  if (!entry) {
    return (
      <Card title="Predictive early warning timeline" subtitle="Did the forecast warn before the limit was crossed?">
        <div className="flex items-center gap-3 rounded-xl bg-soft px-4 py-4 text-base text-muted">
          <Timer className="h-5 w-5 shrink-0 text-accent" />
          Waiting. Start an incident in the Fix Center to see the forecast warning and the real breach on one timeline.
        </div>
      </Card>
    );
  }
  const good = entry.verdict === 'early-warning';
  const bad = entry.verdict === 'no-warning-before-breach' || entry.verdict === 'no-advance-notice';
  const leadTone = good ? '#16A34A' : bad ? '#DC2626' : '#D97706';
  const source = entry.aiWarningSource === 'trend-fallback' ? 'Trend estimate (not AI)' : 'AI warning';
  const headline =
    entry.leadSteps !== null
      ? entry.leadSteps > 0 ? `Early warning lead: ${entry.leadSteps} steps` : 'No advance notice'
      : entry.verdict === 'no-warning-before-breach' ? 'Reactive alarm only'
        : entry.verdict === 'warning-without-breach' ? 'No breach occurred'
          : 'Waiting for the limit to be crossed…';
  return (
    <Card
      title="Predictive early warning timeline"
      subtitle={`${entry.zoneName} · measured in simulation steps`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <Node label={source} step={entry.aiWarningStep} tone="#D97706" empty={entry.aiWarningStep === null}
          emptyText={entry.breachStep !== null ? 'none before breach' : 'not yet'} />
        <div className="flex min-w-[180px] flex-1 flex-col items-center">
          <div className="relative h-1 w-full rounded-full" style={{ background: entry.leadSteps !== null && entry.leadSteps > 0 ? leadTone : '#E3E8F1' }}>
            <Radar className="absolute -top-3 -left-1 h-7 w-7 rounded-full bg-white p-1 text-warn" />
            <ShieldAlert className="absolute -right-1 -top-3 h-7 w-7 rounded-full bg-white p-1 text-crit" />
          </div>
          <div className="mt-3 text-lg font-extrabold" style={{ color: leadTone }}>{headline}</div>
        </div>
        <Node label="Actual breach" step={entry.breachStep} tone="#DC2626" empty={entry.breachStep === null} emptyText="not crossed" />
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{entry.summary}</p>
    </Card>
  );
}
