import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SimulationSnapshot, ZoneId } from '@shared/types';

interface Row {
  step: number;
  observed?: number;
  predicted?: number;
}

/** Past 30 measured steps (solid) and the next 30 estimated steps (dashed). Clearly two different things. */
export function ForecastChart({ snapshot, zoneId }: { snapshot: SimulationSnapshot; zoneId: ZoneId }) {
  const zone = snapshot.zones.find((z) => z.id === zoneId)!;
  const fc = snapshot.forecasts.find((f) => f.zoneId === zoneId)!;
  const past = zone.history.slice(-Math.min(31, snapshot.step + 1));
  const now = snapshot.step;
  const rows: Row[] = past.map((t, i) => ({ step: now - (past.length - 1 - i), observed: t }));
  rows[rows.length - 1].predicted = zone.peakTemp; // the forecast line starts at "now"
  for (const p of fc.predicted) rows.push({ step: now + p.step, predicted: p.temp });
  const isAI = fc.source === 'neural-network';
  const color = isAI ? '#D97706' : '#64748B';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-2"><i className="h-1 w-5 rounded bg-accent" /> Measured</span>
        <span className="flex items-center gap-2">
          <i className="h-1 w-5 rounded" style={{ background: color }} />
          {isAI ? 'AI forecast (dashed)' : 'Trend estimate, not AI (dashed)'}
        </span>
        <span className="flex items-center gap-2"><i className="h-1 w-5 rounded bg-crit" /> Limit</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="#E8ECF4" vertical={false} />
            <XAxis dataKey="step" type="number" domain={['dataMin', 'dataMax']} tickCount={7} stroke="#CBD5E1" />
            <YAxis
              stroke="#CBD5E1"
              domain={[
                (min: number) => Math.floor(Math.min(min, zone.warningTemp) - 3),
                (max: number) => Math.ceil(Math.max(max, zone.limit) + 3),
              ]}
              tickCount={5}
            />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #E3E8F1', borderRadius: 12, fontSize: 14 }}
              labelFormatter={(s) => `step ${s}`}
              formatter={(v, name) => [`${Number(v).toFixed(1)}°C`, name === 'observed' ? 'Measured' : isAI ? 'AI forecast' : 'Trend estimate']}
            />
            <ReferenceLine y={zone.limit} stroke="#DC2626" strokeDasharray="5 5" strokeWidth={2} />
            <ReferenceLine x={now} stroke="#94A3B8" strokeDasharray="2 4" label={{ value: 'now', fill: '#64748B', fontSize: 13, position: 'insideTopLeft' }} />
            <Line type="monotone" dataKey="observed" stroke="#4F46E5" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls />
            <Line type="monotone" dataKey="predicted" stroke={color} strokeWidth={3} strokeDasharray="7 5" dot={{ r: 3.5, fill: color }} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
