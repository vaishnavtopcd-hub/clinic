/**
 * Dynamic per-clinic brand colour.
 *
 * The whole app's brand scale (`brand-50`…`brand-900`) plus the semantic
 * `--primary` / `--ring` tokens are driven by CSS variables defined in
 * index.css. Given a single clinic primary colour we derive the full tint/shade
 * scale and write it onto <html>, re-theming buttons, links, navigation, active
 * states, icons and focus rings everywhere at once.
 *
 * The shape is intentionally minimal but open — secondary colour, logo and
 * favicon can be layered on later without touching callers.
 */

/** The default violet (matches the CSS defaults in index.css, brand-600). */
export const DEFAULT_BRAND_HEX = '#7c4ee6';

/** Curated presets shown in the picker, plus a free custom colour. */
export const BRAND_PALETTE: { name: string; hex: string }[] = [
  { name: 'Violet', hex: '#7c4ee6' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Cyan', hex: '#0891b2' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Pink', hex: '#db2777' },
  { name: 'Slate', hex: '#475569' },
];

const STORAGE_KEY = 'physio_brand';

type Rgb = { r: number; g: number; b: number };

/** Accepts #rgb or #rrggbb; returns null when unparseable. */
function hexToRgb(hex: string): Rgb | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
/** Mix a channel toward white (p>0) by fraction p. */
const tint = (c: number, p: number) => clamp(c + (255 - c) * p);
/** Mix a channel toward black by fraction p. */
const shade = (c: number, p: number) => clamp(c * (1 - p));
const channels = ({ r, g, b }: Rgb) => `${r} ${g} ${b}`;

// How far each step is tinted (+) toward white or shaded (−) toward black,
// with the chosen colour sitting at 600. Calibrated to reproduce the original
// violet scale closely.
const STEPS: { key: string; tint?: number; shade?: number }[] = [
  { key: '50', tint: 0.95 },
  { key: '100', tint: 0.9 },
  { key: '200', tint: 0.78 },
  { key: '300', tint: 0.6 },
  { key: '400', tint: 0.35 },
  { key: '500', tint: 0.15 },
  { key: '600' }, // the chosen colour itself
  { key: '700', shade: 0.18 },
  { key: '800', shade: 0.34 },
  { key: '900', shade: 0.48 },
];

/** Build the `{ '50': 'r g b', … }` scale from a single base colour. */
function generateBrandScale(hex: string): Record<string, string> {
  const base = hexToRgb(hex) ?? hexToRgb(DEFAULT_BRAND_HEX)!;
  const out: Record<string, string> = {};
  for (const s of STEPS) {
    const c =
      s.tint != null
        ? { r: tint(base.r, s.tint), g: tint(base.g, s.tint), b: tint(base.b, s.tint) }
        : s.shade != null
          ? { r: shade(base.r, s.shade), g: shade(base.g, s.shade), b: shade(base.b, s.shade) }
          : base;
    out[s.key] = channels(c);
  }
  return out;
}

/**
 * Apply (or clear) the brand colour on the document root.
 * Pass a hex to theme the app; pass null to revert to the CSS default violet.
 * The choice is persisted so a reload re-applies instantly (no colour flash)
 * before the auth/clinic data has loaded.
 */
export function applyBrandColor(hex: string | null) {
  const root = document.documentElement;
  if (!hex || !hexToRgb(hex)) {
    for (const s of STEPS) root.style.removeProperty(`--brand-${s.key}`);
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const scale = generateBrandScale(hex);
  for (const [k, v] of Object.entries(scale)) {
    root.style.setProperty(`--brand-${k}`, v);
  }
  localStorage.setItem(STORAGE_KEY, hex);
}

/** Re-apply the last persisted colour (call once at startup to avoid a flash). */
export function initBrandColor() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) applyBrandColor(stored);
}

/**
 * Brand scale as inline CSS variables for *scoped* theming — set on a single
 * element's `style` to recolour only its subtree (e.g. a live preview box)
 * without touching the rest of the app.
 */
export function brandScaleVars(hex: string): Record<string, string> {
  const scale = generateBrandScale(hex);
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(scale)) vars[`--brand-${k}`] = v;
  return vars;
}
