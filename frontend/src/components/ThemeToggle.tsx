import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

/** One-click switch that toggles between light and dark mode. */
export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-border bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40"
    >
      <span
        className={`absolute flex h-6 w-6 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform duration-200 ${
          isDark ? 'translate-x-7' : 'translate-x-1'
        }`}
      >
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </span>
    </button>
  );
}
