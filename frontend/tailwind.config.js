/** @type {import('tailwindcss').Config} */

// Semantic token → CSS variable (space-separated RGB channels so Tailwind's
// /<alpha-value> opacity modifier keeps working, e.g. bg-primary/10).
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware semantic tokens (defined in index.css for light & dark).
        background: token('bg'),
        foreground: token('fg'),
        card: {
          DEFAULT: token('card'),
          foreground: token('card-fg'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-fg'),
        },
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-fg'),
        },
        secondary: {
          DEFAULT: token('secondary'),
          foreground: token('secondary-fg'),
        },
        success: token('success'),
        warning: token('warning'),
        error: token('error'),
        info: token('info'),

        // Primary brand scale — driven by CSS variables (default violet in
        // index.css) so a clinic's chosen colour themes the whole app at
        // runtime. See theme/brand.ts.
        brand: {
          50: token('brand-50'),
          100: token('brand-100'),
          200: token('brand-200'),
          300: token('brand-300'),
          400: token('brand-400'),
          500: token('brand-500'),
          600: token('brand-600'),
          700: token('brand-700'),
          800: token('brand-800'),
          900: token('brand-900'),
        },
        // Accent — warm amber / gold. Numbered shades are static (used by
        // gradients); DEFAULT/foreground are theme-aware semantic tokens.
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-fg'),
          50: '#fff9ed',
          100: '#fdeecb',
          200: '#fbdc93',
          300: '#f9c65a',
          400: '#f7b032',
          500: '#f0980f',
          600: '#d97a08',
          700: '#b45a0a',
          800: '#923f0f',
          900: '#783410',
        },
      },
      boxShadow: {
        glow: '0 10px 30px -12px rgba(124, 78, 230, 0.45)',
      },
    },
  },
  plugins: [],
};
