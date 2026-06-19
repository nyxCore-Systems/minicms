import type { Config } from 'tailwindcss'

// Brand colors are CSS variables holding full color values (e.g. #0d1b2a), so
// Tailwind's `/opacity` modifier cannot inject an alpha channel the usual way
// (`rgb(var(--x) / <alpha>)` would yield invalid `rgb(#0d1b2a / …)`). Wrapping
// each color as a function lets us emit `color-mix(...)` when a modifier is
// present, so utilities like `bg-brand-accent/10` work across all themes.
const brandColor =
  (cssVar: string) =>
  ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined
      ? `var(${cssVar})`
      : `color-mix(in srgb, var(${cssVar}) calc(${opacityValue} * 100%), transparent)`

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: brandColor('--brand-primary'),
          'primary-light': brandColor('--brand-primary-light'),
          accent: brandColor('--brand-accent'),
          'accent-light': brandColor('--brand-accent-light'),
          bg: brandColor('--brand-bg'),
          'bg-dark': brandColor('--brand-bg-dark'),
          text: brandColor('--brand-text'),
          'text-muted': brandColor('--brand-text-muted'),
          'text-light': brandColor('--brand-text-light'),
          surface: brandColor('--brand-surface'),
          border: brandColor('--brand-border'),
          // Backwards-compatible aliases
          forest: brandColor('--brand-primary'),
          sage: brandColor('--brand-primary-light'),
          'sage-light': brandColor('--brand-primary-light'),
          copper: brandColor('--brand-accent'),
          'copper-light': brandColor('--brand-accent-light'),
          cream: brandColor('--brand-bg'),
          'cream-dark': brandColor('--brand-bg-dark'),
          dark: brandColor('--brand-text'),
          warmgray: brandColor('--brand-text-muted'),
          'warmgray-light': brandColor('--brand-text-light'),
          steel: '#4a6d8c',
        },
      },
      fontFamily: {
        sans: ['var(--font-body, Inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-heading, Georgia)', 'Cambria', 'serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'pill': '9999px',
        'section': '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'glow': 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(224, 161, 30, 0.12)' },
          '50%': { boxShadow: '0 0 40px rgba(224, 161, 30, 0.25)' },
        },
      },
      boxShadow: {
        'natural': '6px 6px 9px rgba(0, 0, 0, 0.2)',
        'natural-lg': '8px 8px 16px rgba(0, 0, 0, 0.2)',
        'deep': '0 10px 30px rgba(0, 0, 0, 0.15)',
        'sharp': '4px 4px 0px rgba(0, 0, 0, 0.1)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        // Keep old names pointing to new values so existing code won't break
        'glass': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'glass-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'glass-inset': 'none',
      },
    },
  },
  plugins: [],
}

export default config
