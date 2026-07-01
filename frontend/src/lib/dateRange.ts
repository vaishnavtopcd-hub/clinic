/** Shared date-range presets for list/dashboard filters. */
export type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

/** Presets including "All" (no date bound) — used by reports. */
export const DATE_PRESETS_WITH_ALL: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

/** Local (not UTC) YYYY-MM-DD for the given date. */
const localYmd = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

/** Resolve a preset to a `{ from, to }` range ('' = unset, for custom). */
export function presetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = localYmd(now);
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') {
    const d = new Date(now);
    // Week starts Monday: shift back (weekday+6)%7 days.
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { from: localYmd(d), to: today };
  }
  if (preset === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: localYmd(d), to: today };
  }
  return { from: '', to: '' }; // custom
}

/** Short label describing the active period, used to caption metrics. */
export function periodLabel(preset: DatePreset): string {
  switch (preset) {
    case 'today':
      return "Today's";
    case 'week':
      return "This Week's";
    case 'month':
      return "This Month's";
    default:
      return 'Selected';
  }
}
