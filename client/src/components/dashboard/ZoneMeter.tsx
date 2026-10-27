import { AlertTriangle } from 'lucide-react';
import type { FaultInfo, ZoneForecast, ZoneState } from '@shared/types';
import { LEVEL_COLOR, displayLevel, riskWord } from '../../utils/thermalColors';
import { StatusPill } from '../ui/StatusPill';
import { Gauge } from './Gauge';

interface Props {
  zone: ZoneState;
  forecast: ZoneForecast | undefined;
  ambient: number;
  faults: FaultInfo[];
  onOpen: () => void;
}

export function ZoneMeter({ zone, forecast, ambient, faults, onOpen }: Props) {
  const level = displayLevel(zone, forecast);
  const color = LEVEL_COLOR[level];
  const risk = riskWord(forecast?.source === 'neural-network' ? forecast.riskScore : null);
  const open = faults.filter((f) => f.zoneId === zone.id && f.state !== 'fixed');
  return (
    <button
      onClick={onOpen}
      className="group rounded-2xl border border-line bg-card p-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-accent/50"
      style={level !== 'normal' ? { borderColor: `${color}88` } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-ink">{zone.name}</h3>
        <StatusPill status={zone.status} />
      </div>
      <div className="mx-auto mt-3 w-full max-w-[290px]">
        <Gauge value={zone.peakTemp} min={ambient} warn={zone.warningTemp} limit={zone.limit} color={color} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-soft px-2 py-2">
          <div className="text-[13px] text-muted">Warning</div>
          <div className="text-base font-bold tabular-nums text-ink">{zone.warningTemp}°C</div>
        </div>
        <div className="rounded-xl bg-soft px-2 py-2">
          <div className="text-[13px] text-muted">Trend</div>
          <div className="text-base font-bold tabular-nums text-ink">
            {zone.trend >= 0 ? '+' : ''}{zone.trend.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl bg-soft px-2 py-2">
          <div className="text-[13px] text-muted">AI risk</div>
          <div className="text-base font-bold" style={{ color: risk.color }}>{risk.word}</div>
        </div>
      </div>
      {open.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-warn/10 px-3 py-2 text-sm font-semibold text-warn">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {open.length === 1 ? '1 open issue needs repair' : `${open.length} open issues need repair`}
        </div>
      )}
    </button>
  );
}
