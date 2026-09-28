/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          950: '#040711',
          900: '#070c18',
          850: '#0b1325',
          800: '#0f1b34',
          700: '#172749',
          600: '#233762',
          500: '#324d83',
        },
        rain: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        monsoon: {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        amberRisk: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        coralRisk: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        earth: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'bezel-outer': '0 0 0 1px rgba(255, 255, 255, 0.08), 0 20px 40px -15px rgba(0, 0, 0, 0.6)',
        'bezel-inner': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.4)',
        'glow-cyan': '0 0 35px -8px rgba(56, 189, 248, 0.35)',
        'glow-indigo': '0 0 35px -8px rgba(99, 102, 241, 0.35)',
        'glow-amber': '0 0 35px -8px rgba(245, 158, 11, 0.35)',
      },
      animation: {
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 3s cubic-bezier(0, 0.2, 0.8, 1) infinite',
        'rainfall': 'rainfall 2s linear infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        rainfall: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
