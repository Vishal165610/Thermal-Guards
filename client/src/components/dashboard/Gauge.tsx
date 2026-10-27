interface Props {
  value: number;
  min: number;
  warn: number;
  limit: number;
  color: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Half-circle meter: green zone up to the warning level, amber up to the limit, red beyond. */
export function Gauge({ value, min, warn, limit, color }: Props) {
  const max = limit + (limit - min) * 0.25;
  const cx = 110;
  const cy = 108;
  const r = 86;
  const angle = (v: number) => Math.PI * (1 - clamp((v - min) / (max - min), 0, 1));
  const pt = (v: number, rad = r): [number, number] => [cx + rad * Math.cos(angle(v)), cy - rad * Math.sin(angle(v))];
  const arc = (a: number, b: number, rad = r) => {
    const [x1, y1] = pt(a, rad);
    const [x2, y2] = pt(b, rad);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rad} ${rad} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const v = clamp(value, min, max);
  const [nx, ny] = pt(v, r);
  const [lx1, ly1] = pt(limit, r - 12);
  const [lx2, ly2] = pt(limit, r + 12);

  return (
    <svg viewBox="0 0 220 132" className="w-full" role="img" aria-label={`${value.toFixed(1)} degrees`}>
      {/* soft track: normal / warning / limit */}
      <path d={arc(min, warn)} stroke="#16A34A" strokeOpacity="0.22" strokeWidth="16" fill="none" />
      <path d={arc(warn, limit)} stroke="#D97706" strokeOpacity="0.28" strokeWidth="16" fill="none" />
      <path d={arc(limit, max)} stroke="#DC2626" strokeOpacity="0.28" strokeWidth="16" fill="none" />
      {/* current value */}
      {v > min + 0.2 && <path d={arc(min, v)} stroke={color} strokeWidth="16" strokeLinecap="round" fill="none" />}
      {/* limit marker */}
      <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#0F172A" strokeWidth="2.5" />
      <circle cx={nx} cy={ny} r="7" fill="#fff" stroke={color} strokeWidth="4" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="34" fontWeight="800" fill="#0F172A" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value.toFixed(1)}°
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#64748B">
        limit {limit}°C
      </text>
    </svg>
  );
}
