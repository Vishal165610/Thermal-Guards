import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { SimulationSnapshot, ZoneId } from '@shared/types';

/** Observed peak temperature of the selected zone (simulation measurements only). */
export function HistoryChart({ snapshot, zoneId }: { snapshot: SimulationSnapshot; zoneId: ZoneId }) {
  const zone = snapshot.zones.find((z) => z.id === zoneId)!;
  const real = zone.history.slice(-(snapshot.step + 1)); // drop padding from before step 0
  const n = real.length;
  const data = real.map((t, i) => ({ step: snapshot.step - (n - 1 - i), temp: t }));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-2"><i className="h-1 w-5 rounded bg-accent" /> Measured</span>
        <span className="flex items-center gap-2"><i className="h-1 w-5 rounded bg-warn" /> Warning level</span>
        <span className="flex items-center gap-2"><i className="h-1 w-5 rounded bg-crit" /> Limit</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="#E8ECF4" vertical={false} />
            <XAxis dataKey="step" type="number" domain={['dataMin', 'dataMax']} tickCount={6} stroke="#CBD5E1" />
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
              formatter={(v) => [`${Number(v).toFixed(1)}°C`, 'Measured']}
            />
            <ReferenceLine y={zone.warningTemp} stroke="#D97706" strokeDasharray="5 5" strokeWidth={2} />
            <ReferenceLine y={zone.limit} stroke="#DC2626" strokeDasharray="5 5" strokeWidth={2} />
            <Line type="monotone" dataKey="temp" stroke="#4F46E5" strokeWidth={3} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
