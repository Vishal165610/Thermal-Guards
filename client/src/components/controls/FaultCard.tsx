import { Check, Flame, HardHat, Snowflake, Cog, Truck, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ActionId, FaultInfo, Recommendation, ZoneId } from '@shared/types';
import { getAction } from '@shared/actions';
import { getZone } from '@shared/zones';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Props {
  fault: FaultInfo;
  recs: Recommendation[];
  disabled: boolean;
  onAction: (actionId: ActionId, zoneId: ZoneId, faultId: string) => void;
}

const KIND_ICON = { 'cooling-pump': Snowflake, 'machine-bearing': Cog, fire: Flame } as const;

const STATE_BADGE: Record<FaultInfo['state'], { text: string; color: string }> = {
  failing: { text: 'Failing now', color: '#DC2626' },
  contained: { text: 'Contained, repair needed', color: '#D97706' },
  travelling: { text: 'Technician on the way', color: '#4F46E5' },
  waiting: { text: 'Technician waiting', color: '#D97706' },
  repairing: { text: 'Repair in progress', color: '#4F46E5' },
  fixed: { text: 'Fixed', color: '#16A34A' },
};

function Steps({ fault }: { fault: FaultInfo }) {
  const idx = fault.state === 'failing' ? 0 : fault.state === 'fixed' ? 3 : 1;
  const labels = ['1  Contain it online', '2  Technician repairs it', '3  Fixed for good'];
  return (
    <div className="grid grid-cols-3 gap-2">
      {labels.map((l, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div
            key={l}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              done ? 'bg-ok/10 text-ok' : active ? 'bg-accent text-white' : 'bg-soft text-muted'
            }`}
          >
            {done && <Check className="h-4 w-4 shrink-0" />}
            {l}
          </div>
        );
      })}
    </div>
  );
}

function Row({ icon, title, text, cost, action, suggested }: {
  icon: ReactNode; title: string; text: string; cost: string; action: ReactNode; suggested?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${suggested ? 'border-accent/50 bg-accent/5' : 'border-line bg-white'}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft text-accent">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-base font-bold text-ink">
          {title}
          {suggested && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">Suggested</span>}
        </div>
        <div className="text-sm text-muted">{text}</div>
        <div className="text-sm text-muted"><span className="font-semibold text-ink/70">Cost:</span> {cost}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export function FaultCard({ fault, recs, disabled, onAction }: Props) {
  const Icon = KIND_ICON[fault.kind];
  const badge = STATE_BADGE[fault.state];
  const suggested = (a: ActionId) => recs.some((r) => r.actionId === a && (r.faultId === fault.id || r.zoneId === fault.zoneId));
  const dispatch = getAction('dispatch-technician');
  const zone = getZone(fault.zoneId);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-soft text-accent"><Icon className="h-6 w-6" /></div>
          <div>
            <h3 className="text-xl font-extrabold text-ink">{fault.title}</h3>
            <p className="text-sm text-muted">{zone.name}</p>
          </div>
        </div>
        <span className="rounded-full px-4 py-1.5 text-sm font-bold" style={{ color: badge.color, background: `${badge.color}1A` }}>
          {badge.text}
        </span>
      </div>

      <p className="mt-4 text-base leading-relaxed text-ink/85">{fault.summary}</p>
      {fault.note && <p className="mt-2 rounded-xl bg-soft px-4 py-3 text-[15px] font-medium text-ink/80">{fault.note}</p>}

      <div className="mt-4"><Steps fault={fault} /></div>

      {fault.state !== 'fixed' && (
        <div className="mt-5 space-y-3">
          {fault.onlineFixes.map((id) => {
            const def = getAction(id);
            return (
              <Row
                key={id}
                icon={<Wrench className="h-5 w-5" />}
                title={def.label}
                text={def.what}
                cost={def.tradeoff}
                suggested={suggested(id)}
                action={
                  <Button variant={suggested(id) ? 'primary' : 'outline'} disabled={disabled} onClick={() => onAction(id, fault.zoneId, fault.id)}>
                    Do it online
                  </Button>
                }
              />
            );
          })}
          <Row
            icon={<Truck className="h-5 w-5" />}
            title={dispatch.label}
            text={dispatch.what}
            cost={dispatch.tradeoff}
            suggested={suggested('dispatch-technician')}
            action={
              fault.canDispatch ? (
                <Button
                  variant={suggested('dispatch-technician') ? 'primary' : 'outline'}
                  disabled={disabled}
                  onClick={() => onAction('dispatch-technician', fault.zoneId, fault.id)}
                >
                  <HardHat className="h-4 w-4" /> Send
                </Button>
              ) : (
                <span className="text-sm font-semibold text-muted">
                  {fault.jobStepsLeft !== null ? `${fault.jobStepsLeft} steps left` : 'In progress'}
                </span>
              )
            }
          />
          {fault.state === 'failing' && (
            <p className="text-sm text-muted">Tip: contain the problem online first. A technician cannot start work while it is still active.</p>
          )}
        </div>
      )}
    </Card>
  );
}
