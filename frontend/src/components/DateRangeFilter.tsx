/**
 * Compact From–To date range filter for list pages.
 * Controlled: the parent owns `from`/`to` (YYYY-MM-DD strings, '' = unset)
 * and updates them via `onChange`.
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  label = 'Date',
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        className="input max-w-[150px]"
        value={from}
        max={to || undefined}
        aria-label={`${label} from`}
        title={`${label} from`}
        onChange={(e) => onChange({ from: e.target.value, to })}
      />
      <span className="text-sm text-muted-foreground">–</span>
      <input
        type="date"
        className="input max-w-[150px]"
        value={to}
        min={from || undefined}
        aria-label={`${label} to`}
        title={`${label} to`}
        onChange={(e) => onChange({ from, to: e.target.value })}
      />
      {(from || to) && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => onChange({ from: '', to: '' })}
        >
          Clear
        </button>
      )}
    </div>
  );
}
