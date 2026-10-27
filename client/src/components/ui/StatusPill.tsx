import type { ZoneStatus } from '@shared/types';
import { STATUS_COLOR, STATUS_LABEL } from '../../utils/thermalColors';

export function StatusPill({ status }: { status: ZoneStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
      style={{ color: c, background: `${c}1A` }}
    >
      <span className={`h-2 w-2 rounded-full ${status === 'CRITICAL' ? 'animate-pulseRing' : ''}`} style={{ background: c }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
