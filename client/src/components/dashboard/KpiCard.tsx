import type { ReactNode } from 'react';

export function KpiCard({
  icon, label, value, hint, tone = '#0F172A', onClick,
}: { icon: ReactNode; label: string; value: string; hint: string; tone?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border border-line bg-card p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${onClick ? 'transition hover:border-accent/50' : ''}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">{icon}{label}</div>
      <div className="mt-2 text-3xl font-extrabold tabular-nums" style={{ color: tone }}>{value}</div>
      <div className="mt-1 text-sm text-muted">{hint}</div>
    </Tag>
  );
}
