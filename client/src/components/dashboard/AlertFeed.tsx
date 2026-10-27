import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SimulationSnapshot } from '@shared/types';
import { fmtTemp } from '../../utils/thermalColors';
import { Button } from '../ui/Button';

interface Item {
  key: string;
  step: number;
  node: ReactNode;
}

const Badge = ({ text, tone }: { text: string; tone: string }) => (
  <span className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tracking-wider" style={{ color: tone, background: `${tone}1A` }}>
    {text}
  </span>
);

export function AlertFeed({ snapshot, onAck, disabled }: {
  snapshot: SimulationSnapshot; onAck: (id: string) => void; disabled: boolean;
}) {
  const items: Item[] = [];
  for (const a of snapshot.alerts) {
    const tone = a.state === 'resolved' ? '#64748B' : a.severity === 'critical' ? '#DC2626' : '#D97706';
    items.push({
      key: a.id, step: a.criticalStep ?? a.openedStep,
      node: (
        <div className="flex items-start gap-3">
          <Badge text="ALERT" tone={tone} />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-ink">
              {a.message} <span className="font-normal text-muted">· {a.state}</span>
            </div>
            <div className="mt-0.5 text-sm text-muted">
              opened step {a.openedStep}
              {a.criticalStep !== null ? ` · limit crossed step ${a.criticalStep}` : ''}
              {a.resolvedStep !== null ? ` · resolved step ${a.resolvedStep}` : ''} · peak {fmtTemp(a.peakTemp)}
            </div>
          </div>
          {a.state !== 'resolved' && (a.acknowledged ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ok"><Check className="h-4 w-4" /> Seen</span>
          ) : (
            <Button variant="outline" className="!px-3 !py-1.5 !text-sm" disabled={disabled} onClick={() => onAck(a.id)}>
              Acknowledge
            </Button>
          ))}
        </div>
      ),
    });
  }
  for (const p of snapshot.predictions) {
    const ai = p.source === 'neural-network';
    items.push({
      key: p.id, step: p.step,
      node: (
        <div className="flex items-start gap-3">
          <Badge text={ai ? 'AI' : 'TREND'} tone={ai ? '#4F46E5' : '#64748B'} />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-ink">{p.message}</div>
            <div className="mt-0.5 text-sm text-muted">
              confirmed at step {p.step}
              {p.riskScore !== null ? ` · risk score ${Math.round(p.riskScore * 100)}%` : ''} · a prediction, not a measurement
            </div>
          </div>
        </div>
      ),
    });
  }
  for (const a of snapshot.actions) {
    items.push({
      key: a.id, step: a.step,
      node: (
        <div className="flex items-start gap-3">
          <Badge text="ACTION" tone="#16A34A" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-ok">{a.label}</div>
            <div className="mt-0.5 text-sm text-muted">done at step {a.step} · operator action</div>
          </div>
        </div>
      ),
    });
  }
  items.sort((a, b) => b.step - a.step);

  if (items.length === 0) {
    return <p className="rounded-xl bg-soft px-4 py-6 text-center text-base text-muted">No alerts yet. All zones are within their limits.</p>;
  }
  return (
    <div className="space-y-3">
      {items.slice(0, 50).map((it) => (
        <div key={it.key} className="rounded-xl border border-line bg-white px-4 py-3">{it.node}</div>
      ))}
    </div>
  );
}
