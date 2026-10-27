import type { ReactNode } from 'react';

export function Card({
  title, subtitle, right, children, className = '', pad = true,
}: { title?: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] ${className}`}>
      {(title || right) && (
        <header className="flex items-start justify-between gap-3 px-6 pt-5">
          <div>
            {title && <h3 className="text-lg font-bold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={pad ? 'px-6 pb-6 pt-4' : ''}>{children}</div>
    </section>
  );
}
