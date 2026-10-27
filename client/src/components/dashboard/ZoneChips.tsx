import type { SimulationSnapshot, ZoneId } from '@shared/types';
import { STATUS_COLOR } from '../../utils/thermalColors';

export function ZoneChips({ snapshot, selected, onSelect }: {
  snapshot: SimulationSnapshot; selected: ZoneId; onSelect: (id: ZoneId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {snapshot.zones.map((z) => (
        <button
          key={z.id}
          onClick={() => onSelect(z.id)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[15px] font-semibold transition ${
            z.id === selected ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink hover:border-accent/60'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: STATUS_COLOR[z.status] }} />
          {z.name}
          <span className={`tabular-nums ${z.id === selected ? 'text-white/80' : 'text-muted'}`}>{z.peakTemp.toFixed(1)}°</span>
        </button>
      ))}
    </div>
  );
}
