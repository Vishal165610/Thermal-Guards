import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'danger' | 'ghost';

const STYLE: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-indigo-700 shadow-sm',
  outline: 'border border-line bg-white text-ink hover:border-accent hover:text-accent',
  danger: 'bg-crit text-white hover:bg-red-700 shadow-sm',
  ghost: 'text-muted hover:bg-soft hover:text-ink',
};

export function Button({
  variant = 'outline', className = '', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${STYLE[variant]} ${className}`}
    />
  );
}
