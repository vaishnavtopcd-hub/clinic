import { useState } from 'react';
import type { DashboardTrendPoint } from '../lib/types';
import { currency } from '../lib/format';

/**
 * Stylish, dependency-free trend chart for the admin dashboard:
 *  - smooth gradient area  = revenue collected (right axis)
 *  - smooth glowing line   = number of patients (left axis)
 * Responsive, theme-aware SVG with animated draw-in, soft glow, a hover guide
 * and a floating tooltip.
 */
export function RevenuePatientsChart({ data }: { data: DashboardTrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const W = 720;
  const H = 300;
  const M = { top: 20, right: 54, bottom: 34, left: 46 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const n = data.length;
  const band = n > 0 ? plotW / n : plotW;
  const cx = (i: number) => M.left + band * i + band / 2;

  const maxPatients = Math.max(1, ...data.map((d) => d.patients));
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const patY = (v: number) => M.top + plotH - (v / (maxPatients * 1.15)) * plotH;
  const revY = (v: number) => M.top + plotH - (v / (maxRevenue * 1.15)) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const compact = (v: number) =>
    v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`;

  // Catmull-Rom → cubic bézier for smooth, natural curves.
  const smooth = (pts: [number, number][]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
    const t = 0.18;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) * t;
      const c1y = p1[1] + (p2[1] - p0[1]) * t;
      const c2x = p2[0] - (p3[0] - p1[0]) * t;
      const c2y = p2[1] - (p3[1] - p1[1]) * t;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  };

  const revPts = data.map((d, i) => [cx(i), revY(d.revenue)] as [number, number]);
  const patPts = data.map((d, i) => [cx(i), patY(d.patients)] as [number, number]);

  const revLine = smooth(revPts);
  const revArea =
    n > 0
      ? `${revLine} L ${cx(n - 1)} ${M.top + plotH} L ${cx(0)} ${M.top + plotH} Z`
      : '';
  const patLine = smooth(patPts);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Monthly revenue and patients"
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          {/* revenue area fill */}
          <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="text-brand-500" stopColor="currentColor" stopOpacity={0.45} />
            <stop offset="55%" className="text-brand-500" stopColor="currentColor" stopOpacity={0.14} />
            <stop offset="100%" className="text-brand-500" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
          {/* revenue line gradient */}
          <linearGradient id="revStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" className="text-brand-400" stopColor="currentColor" />
            <stop offset="100%" className="text-brand-600" stopColor="currentColor" />
          </linearGradient>
          {/* patients line gradient */}
          <linearGradient id="patStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" className="text-accent-400" stopColor="currentColor" />
            <stop offset="100%" className="text-accent-600" stopColor="currentColor" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-40%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* subtle gridlines + dual axis labels */}
        {ticks.map((t) => {
          const y = M.top + plotH - t * plotH;
          return (
            <g key={t}>
              <line
                x1={M.left}
                x2={M.left + plotW}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeOpacity={0.6}
                strokeDasharray="2 6"
              />
              <text x={M.left - 10} y={y + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {Math.round(maxPatients * 1.15 * t)}
              </text>
              <text x={M.left + plotW + 10} y={y + 3} className="fill-muted-foreground text-[10px]">
                ₹{compact(maxRevenue * 1.15 * t)}
              </text>
            </g>
          );
        })}

        {/* revenue area */}
        <path d={revArea} fill="url(#revArea)" />

        {/* revenue smooth line (glow + animated draw) */}
        <path
          d={revLine}
          fill="none"
          stroke="url(#revStroke)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#softGlow)"
          pathLength={1}
          strokeDasharray={1}
        >
          <animate attributeName="stroke-dashoffset" from={1} to={0} dur="1.1s" fill="freeze" />
        </path>

        {/* patients smooth line (animated draw) */}
        <path
          d={patLine}
          fill="none"
          stroke="url(#patStroke)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 0"
          pathLength={1}
        >
          <animate attributeName="stroke-dashoffset" from={1} to={0} dur="1.1s" begin="0.15s" fill="freeze" />
        </path>

        {/* hover hit-areas + guide + month labels */}
        {data.map((d, i) => (
          <g key={d.month} onMouseEnter={() => setActive(i)}>
            <rect x={M.left + band * i} y={M.top} width={band} height={plotH} fill="transparent" />
            {active === i && (
              <line
                x1={cx(i)}
                x2={cx(i)}
                y1={M.top}
                y2={M.top + plotH}
                className="stroke-muted-foreground/40"
                strokeDasharray="3 3"
              />
            )}
            <text x={cx(i)} y={H - 12} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {d.label}
            </text>
          </g>
        ))}

        {/* points */}
        {data.map((d, i) => (
          <g key={`pt-${d.month}`}>
            <circle cx={cx(i)} cy={revY(d.revenue)} r={active === i ? 5.5 : 0} className="fill-brand-500 stroke-background" strokeWidth={2.5} />
            <circle cx={cx(i)} cy={patY(d.patients)} r={active === i ? 5.5 : 0} className="fill-accent-500 stroke-background" strokeWidth={2.5} />
          </g>
        ))}
      </svg>

      {/* tooltip */}
      {active !== null && data[active] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{ left: `${(cx(active) / W) * 100}%`, top: 6 }}
        >
          <p className="mb-1 font-semibold text-foreground">{data[active].label}</p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Revenue <span className="font-semibold text-foreground">{currency(data[active].revenue)}</span>
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-accent-500" />
            Patients <span className="font-semibold text-foreground">{data[active].patients}</span>
          </p>
        </div>
      )}

      {/* legend */}
      <div className="mt-2 flex items-center justify-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-full bg-brand-500" /> Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-accent-500" /> Patients
        </span>
      </div>
    </div>
  );
}
