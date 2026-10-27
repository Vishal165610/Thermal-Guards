import { Activity, Cog, Flame, RotateCcw, Snowflake } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ScenarioId, SimulationSnapshot, ZoneId } from '@shared/types';
import { ZONES } from '@shared/zones';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Props {
  snapshot: SimulationSnapshot;
  disabled: boolean;
  fireZone: ZoneId;
  onFireZone: (z: ZoneId) => void;
  onScenario: (s: ScenarioId, zoneId?: ZoneId) => void;
  onReset: () => void;
}

export function IncidentControls({ snapshot, disabled, fireZone, onFireZone, onScenario, onReset }: Props) {
  const active = snapshot.incident.scenario;
  const tile = (id: ScenarioId, label: string, hint: string, icon: ReactNode, tone: string, zone?: ZoneId) => (
    <button
      key={id}
      disabled={disabled}
      onClick={() => onScenario(id, zone)}
      className={`flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active === id ? 'bg-white' : 'border-line bg-white hover:border-accent/50'
      }`}
      style={active === id ? { borderColor: tone } : undefined}
    >
      <span className="mt-0.5" style={{ color: tone }}>{icon}</span>
      <span>
        <span className="block text-base font-bold text-ink">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </button>
  );
  return (
    <Card title="Simulate an incident" subtitle="Start a problem to test how the system reacts">
      <div className="space-y-3">
        {tile('cooling-failure', 'Cooling failure', 'The cooling pump fails and the cooling unit heats up.', <Snowflake className="h-6 w-6" />, '#D97706')}
        {tile('machine-overheating', 'Machine overheating', 'A bearing in Machine A overheats in the production area.', <Cog className="h-6 w-6" />, '#D97706')}
        {tile('fire', 'Fire scenario', 'A fire starts in the zone chosen below.', <Flame className="h-6 w-6" />, '#DC2626', fireZone)}
        <label className="flex items-center justify-between gap-3 text-sm font-semibold text-muted">
          Fire location
          <select
            value={fireZone}
            onChange={(e) => onFireZone(e.target.value as ZoneId)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-[15px] font-semibold text-ink"
          >
            {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </label>
        <div className="border-t border-line pt-3">
          {tile('normal', 'Normal day', 'Clears the incident. Open issues stay open and the equipment keeps running degraded.', <Activity className="h-6 w-6" />, '#16A34A')}
        </div>
        <Button variant="outline" className="w-full" disabled={disabled} onClick={onReset}>
          <RotateCcw className="h-4 w-4" /> Reset simulation
        </Button>
      </div>
    </Card>
  );
}
