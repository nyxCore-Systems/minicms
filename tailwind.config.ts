import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          'primary-light': 'var(--brand-primary-light)',
          accent: 'var(--brand-accent)',
          'accent-light': 'var(--brand-accent-light)',
          bg: 'var(--brand-bg)',
          'bg-dark': 'var(--brand-bg-dark)',
          text: 'var(--brand-text)',
          'text-muted': 'var(--brand-text-muted)',
          'text-light': 'var(--brand-text-light)',
          surface: 'var(--brand-surface)',
          border: 'var(--brand-border)',
          // Backwards-compatible aliases
          forest: 'var(--brand-primary)',
          sage: 'var(--brand-primary-light)',
          'sage-light': 'var(--brand-primary-light)',
          copper: 'var(--brand-accent)',
          'copper-light': 'var(--brand-accent-light)',
          cream: 'var(--brand-bg)',
          'cream-dark': 'var(--brand-bg-dark)',
          dark: 'var(--brand-text)',
          warmgray: 'var(--brand-text-muted)',
          'warmgray-light': 'var(--brand-text-light)',
          steel: '#4a6d8c',
        },
      },
      fontFamily: {
        sans: ['var(--font-body, Inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-heading, Georgia)', 'Cambria', 'serif'],
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
