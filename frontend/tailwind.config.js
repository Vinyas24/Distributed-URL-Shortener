/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        dark: {
          base: '#0B0B1A',
          surface: '#12122B',
          raised: '#1A1A38',
          overlay: '#22224A',
        },
        light: {
          base: '#F8F9FD',
          surface: '#FFFFFF',
          raised: '#F1F4FA',
          overlay: '#E8ECF5',
        },
        accent: {
          indigo: '#6366F1',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
          coral: '#F43F5E',
          'coral-hover': '#E11D48',
        },
      },
      borderRadius: {
        'glass-sm': '12px',
        'glass-md': '16px',
        'glass-lg': '20px',
        'glass-xl': '24px',
      },
      boxShadow: {
        'glass-base': '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
        'glass-raised': '0 12px 40px 0 rgba(0, 0, 0, 0.35)',
        'glass-overlay': '0 20px 60px 0 rgba(0, 0, 0, 0.45)',
        'glow-coral': '0 0 24px -4px rgba(244, 63, 94, 0.4)',
        'glow-indigo': '0 0 24px -4px rgba(99, 102, 241, 0.4)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      animation: {
        'aurora-1': 'aurora-drift-1 30s ease-in-out infinite alternate',
        'aurora-2': 'aurora-drift-2 25s ease-in-out infinite alternate',
        'aurora-3': 'aurora-drift-3 35s ease-in-out infinite alternate',
        'aurora-4': 'aurora-drift-4 28s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'aurora-drift-1': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(60px, -40px) scale(1.15)' },
          '100%': { transform: 'translate(-30px, 50px) scale(0.9)' },
        },
        'aurora-drift-2': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-50px, 60px) scale(1.2)' },
          '100%': { transform: 'translate(40px, -30px) scale(0.95)' },
        },
        'aurora-drift-3': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(40px, 40px) scale(0.85)' },
          '100%': { transform: 'translate(-50px, -40px) scale(1.1)' },
        },
        'aurora-drift-4': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-40px, -30px) scale(1.1)' },
          '100%': { transform: 'translate(50px, 30px) scale(0.95)' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      transitionDuration: {
        'micro': '150ms',
        'fast': '200ms',
        'normal': '250ms',
        'smooth': '300ms',
      },
    },
  },
  plugins: [],
};
