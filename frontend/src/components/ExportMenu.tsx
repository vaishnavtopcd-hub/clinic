import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Sheet, ChevronDown } from 'lucide-react';
import {
  runExport,
  type ExportColumn,
  type ExportFormat,
} from '../lib/export';

interface ExportMenuProps<T> {
  /** File name without extension. */
  filename: string;
  /** Title shown on the PDF. */
  title?: string;
  columns: ExportColumn<T>[];
  /** Returns the rows to export (e.g. fetch the full filtered set). */
  fetchRows: () => Promise<T[]> | T[];
  disabled?: boolean;
}

const OPTIONS: { fmt: ExportFormat; label: string; icon: typeof FileText }[] = [
  { fmt: 'pdf', label: 'PDF (.pdf)', icon: FileText },
  { fmt: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { fmt: 'csv', label: 'CSV (.csv)', icon: Sheet },
];

export function ExportMenu<T>({
  filename,
  title,
  columns,
  fetchRows,
  disabled,
}: ExportMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fmt: ExportFormat) => {
    setOpen(false);
    setBusy(true);
    try {
      const rows = await fetchRows();
      if (!rows.length) {
        window.alert('Nothing to export.');
        return;
      }
      await runExport(fmt, filename, title ?? filename, columns, rows);
    } catch {
      window.alert('Export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
      >
        <Download className="h-4 w-4" />
        {busy ? 'Exporting…' : 'Export'}
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
            {OPTIONS.map((o) => (
              <button
                key={o.fmt}
                type="button"
                onClick={() => run(o.fmt)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                <o.icon className="h-4 w-4 text-muted-foreground" />
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
