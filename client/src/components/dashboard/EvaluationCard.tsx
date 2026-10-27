import { FlaskConical } from 'lucide-react';
import type { ModelEvaluation } from '@shared/types';
import { Card } from '../ui/Card';

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const SCENARIO_NAMES: Record<string, string> = {
  'cooling-failure': 'Cooling failure',
  'machine-overheating': 'Machine overheating',
  fire: 'Fire',
};

function Stat({ big, label, sub, tone }: { big: string; label: string; sub: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-soft/60 px-5 py-4">
      <div className="text-[13px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-4xl font-extrabold tabular-nums" style={{ color: tone }}>{big}</div>
      <div className="mt-1 text-sm text-muted">{sub}</div>
    </div>
  );
}

function LeadBar({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  const w = value === null ? 0 : Math.max(2, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-[210px] shrink-0 text-[15px] font-semibold text-ink">{label}</span>
      <div className="h-6 flex-1 rounded-full bg-soft">
        <div className="h-6 rounded-full" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="w-[90px] shrink-0 text-right text-lg font-extrabold tabular-nums text-ink">{value === null ? '–' : `${value} steps`}</span>
    </div>
  );
}

export function EvaluationCard({ evaluation: e }: { evaluation: ModelEvaluation | undefined }) {
  if (!e) {
    return (
      <Card title="How well does the AI warn? (simulated test)" subtitle="Held-out check on fresh simulated incidents">
        <p className="text-base text-muted">No evaluation is stored with this model. Run <code>npm run evaluate</code> to create one.</p>
      </Card>
    );
  }
  const max = Math.max(e.medianLeadAi ?? 0, e.medianLeadRule ?? 0, 1);
  return (
    <Card
      title="How well does the AI warn? (simulated test)"
      subtitle={e.basis}
      right={<span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent"><FlaskConical className="h-4 w-4" />Held-out · simulated</span>}
    >
      <div className="grid grid-cols-3 gap-4">
        <Stat
          big={pct(e.detectionRate)} tone="#16A34A" label="Breaches warned early"
          sub={`${e.caught} of ${e.breachRuns} real limit breaches had an AI warning first`}
        />
        <Stat
          big={e.medianLeadAi === null ? '–' : `${e.medianLeadAi} steps`} tone="#4F46E5" label="Typical warning time"
          sub={`median time between the AI warning and the breach${e.earlierThanRuleRate !== null ? ` · earlier than the WARNING level in ${pct(e.earlierThanRuleRate)} of cases` : ''}`}
        />
        <Stat
          big={pct(e.falseAlarmRate)} tone="#D97706" label="Warnings in safe runs"
          sub={`of ${e.safeRuns} zone runs that never crossed the limit`}
        />
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-line px-5 py-4">
        <div className="text-[13px] font-bold uppercase tracking-wider text-muted">Warning time before the limit is crossed (median)</div>
        <LeadBar label="Thermal Guard AI" value={e.medianLeadAi} max={max} color="#4F46E5" />
        <LeadBar label="Plain WARNING level" value={e.medianLeadRule} max={max} color="#94A3B8" />
      </div>

      <table className="mt-5 w-full text-left text-[15px]">
        <thead>
          <tr className="text-[13px] uppercase tracking-wider text-muted">
            <th className="py-2 font-bold">Incident type</th>
            <th className="py-2 font-bold">Breaches</th>
            <th className="py-2 font-bold">Warned first</th>
            <th className="py-2 font-bold">AI lead</th>
            <th className="py-2 font-bold">WARNING-level lead</th>
          </tr>
        </thead>
        <tbody>
          {e.byScenario.map((s) => (
            <tr key={s.scenario} className="border-t border-line">
              <td className="py-2 font-semibold text-ink">{SCENARIO_NAMES[s.scenario] ?? s.scenario}</td>
              <td className="py-2 tabular-nums">{s.breaches}</td>
              <td className="py-2 tabular-nums">{s.caught}</td>
              <td className="py-2 font-bold tabular-nums text-accent">{s.medianLeadAi ?? '–'} steps</td>
              <td className="py-2 tabular-nums text-muted">{s.medianLeadRule ?? '–'} steps</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-muted">
        Measured on simulated incidents from the same simulator, not on a real plant. For slow cooling failures the plain WARNING level can
        come as early as the AI, so the AI gains most on fast problems (machines, fire). Rerun with <code>npm run evaluate</code>.
      </p>
    </Card>
  );
}
