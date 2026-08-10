/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#07080b',
          900: '#0b0d13',
          850: '#10121a',
          800: '#161924',
          700: '#202433',
          600: '#2e3448',
        },
        klein: {
          DEFAULT: '#1d4ed8',
          bright:  '#2563eb',
          glow:    '#3b82f6',
          dark:    '#1e40af',
        },
        amber: {
          tactile: '#d97706',
          bright:  '#f59e0b',
          dim:     '#92400e',
        },
        violet: {
          DEFAULT: '#7c3aed',
          bright:  '#8b5cf6',
          dark:    '#5b21b6',
        },
        titanium: {
          DEFAULT: '#94a3b8',
          light:   '#e2e8f0',
          dark:    '#475569',
          muted:   '#64748b',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Space Mono', 'Consolas', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
        sm:   '3px',
        DEFAULT: '4px',
        md:   '6px',
        lg:   '8px',
      },
      boxShadow: {
        tactile: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 16px -2px rgba(0,0,0,0.5)',
        klein:   '0 0 14px -4px rgba(37,99,235,0.45)',
        amber:   '0 0 14px -4px rgba(217,119,6,0.45)',
        violet:  '0 0 14px -4px rgba(124,58,237,0.45)',
      },
      opacity: {
        8: '0.08',
      },
      animation: {
        fadeIn: 'fadeIn 240ms ease both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
