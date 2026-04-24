import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7c3aed',
          dark: '#6d28d9',
          light: '#f5f3ff',
          lighter: '#ede9fe',
          border: '#c4b5fd',
          muted: '#a78bfa',
        },
        accent: {
          DEFAULT: '#059669',
          dark: '#047857',
          light: '#d1fae5',
          lighter: '#ecfdf5',
          bright: '#6ee7b7',
        },
        hero: {
          DEFAULT: '#1e0a3c',
          mid: '#3b1a7a',
          end: '#4c1d95',
          footer: '#0f0520',
          bar: '#1e0a3c',
        },
        canvas: '#faf9ff',
        ink: '#1a1a2e',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient':
          'linear-gradient(135deg, #1e0a3c 0%, #3b1a7a 50%, #4c1d95 100%)',
        'hero-simple': 'linear-gradient(135deg, #1e0a3c, #3b1a7a)',
        'primary-grad': 'linear-gradient(135deg, #7c3aed, #6d28d9)',
        'cta-gradient': 'linear-gradient(135deg, #7c3aed, #059669)',
        'auth-side': 'linear-gradient(160deg, #7c3aed 0%, #5b21b6 100%)',
        'progress-purple': 'linear-gradient(90deg, #7c3aed, #a78bfa)',
        'progress-green': 'linear-gradient(90deg, #059669, #34d399)',
        'avatar-grad': 'linear-gradient(135deg, #7c3aed, #059669)',
      },
      borderWidth: {
        '1.5': '1.5px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,.06)',
        'card-hover': '0 8px 32px rgba(124,58,237,.15)',
        nav: '0 2px 12px rgba(124,58,237,.06)',
        purchase: '0 8px 40px rgba(0,0,0,.15)',
        'primary-hover': '0 4px 16px rgba(124,58,237,.35)',
      },
    },
  },
  plugins: [],
} satisfies Config