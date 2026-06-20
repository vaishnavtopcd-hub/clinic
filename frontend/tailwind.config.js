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

        // Primary — light violet (static scale, used for gradients / brand)
        brand: {
          50: '#f7f5ff',
          100: '#efeaff',
          200: '#ddd3ff',
          300: '#c5b3ff',
          400: '#a98cfb',
          500: '#8f66f4',
          600: '#7c4ee6',
          700: '#6838c4',
          800: '#532da0',
          900: '#43287e',
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
