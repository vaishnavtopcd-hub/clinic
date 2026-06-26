import { useState } from 'react';
import type { DashboardTrendPoint } from '../lib/types';
import { currency } from '../lib/format';

/**
 * Dependency-free gradient area chart for the admin dashboard:
 *  - filled gradient area = revenue collected (right axis)
 *  - overlaid line        = number of patients (left axis)
 * Rendered as a responsive, theme-aware SVG with a hover crosshair + tooltip.
 */
export function RevenuePatientsChart({ data }: { data: DashboardTrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  // viewBox geometry (scales to container width via width="100%")
  const W = 720;
  const H = 280;
  const M = { top: 16, right: 56, bottom: 28, left: 44 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const n = data.length;
  const band = n > 0 ? plotW / n : plotW;

  const maxPatients = Math.max(1, ...data.map((d) => d.patients));
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  // 10% headroom so the peak never touches the top edge.
  const patY = (v: number) => M.top + plotH - (v / (maxPatients * 1.1)) * plotH;
  const revY = (v: number) => M.top + plotH - (v / (maxRevenue * 1.1)) * plotH;

  // Points sit at band centres so the line/area read like a time series.
  const cx = (i: number) => M.left + band * i + band / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  const revLine = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${cx(i)} ${revY(d.revenue)}`)
    .join(' ');
  // Close the area down to the baseline for the gradient fill.
  const revArea =
    n > 0
      ? `${revLine} L ${cx(n - 1)} ${M.top + plotH} L ${cx(0)} ${M.top + plotH} Z`
      : '';
  const patLine = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${cx(i)} ${patY(d.patients)}`)
    .join(' ');

  const compact = (v: number) =>
    v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`;

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
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="text-accent-500" stopColor="currentColor" stopOpacity={0.35} />
            <stop offset="100%" className="text-accent-500" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + dual axis labels (left = patients, right = ₹revenue) */}
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
                strokeDasharray="3 4"
              />
              <text x={M.left - 8} y={y + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {Math.round(maxPatients * 1.1 * t)}
              </text>
              <text x={M.left + plotW + 8} y={y + 3} className="fill-muted-foreground text-[10px]">
                ₹{compact(maxRevenue * 1.1 * t)}
              </text>
            </g>
          );
        })}

        {/* revenue gradient area + line */}
        <path d={revArea} fill="url(#revFill)" />
        <path d={revLine} fill="none" className="stroke-accent-500" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* patients line */}
        <path
          d={patLine}
          fill="none"
          className="stroke-brand-500"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="5 4"
        />

        {/* hover crosshair + month hit-areas */}
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
              />
            )}
            <text x={cx(i)} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {d.label}
            </text>
          </g>
        ))}

        {/* points (drawn last so they sit on top) */}
        {data.map((d, i) => (
          <g key={`pt-${d.month}`}>
            <circle cx={cx(i)} cy={revY(d.revenue)} r={active === i ? 5 : 3.5} className="fill-accent-500 stroke-background" strokeWidth={2} />
            <circle cx={cx(i)} cy={patY(d.patients)} r={active === i ? 5 : 3.5} className="fill-brand-500 stroke-background" strokeWidth={2} />
          </g>
        ))}
      </svg>

      {/* tooltip */}
      {active !== null && data[active] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md"
          style={{ left: `${(cx(active) / W) * 100}%`, top: 4 }}
        >
          <p className="font-semibold text-foreground">{data[active].label}</p>
          <p className="text-muted-foreground">
            Patients: <span className="font-medium text-foreground">{data[active].patients}</span>
          </p>
          <p className="text-muted-foreground">
            Revenue: <span className="font-medium text-success">{currency(data[active].revenue)}</span>
          </p>
        </div>
      )}

      {/* legend */}
      <div className="mt-2 flex items-center justify-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-full bg-accent-500" /> Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-brand-500" /> Patients
        </span>
      </div>
    </div>
  );
}
