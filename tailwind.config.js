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
        graphite: {
          950: '#070A0F',
          900: '#0B0F17',
          850: '#0F1522',
          800: '#151D2A',
          750: '#1A2434',
          700: '#222E42',
          600: '#32425B',
          500: '#4B5F7F',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          accent: '#00E5FF'
        },
        solar: {
          amber: '#FFA000',
          gold: '#F59E0B',
          glow: '#FBBF24'
        },
        status: {
          healthy: '#10B981',
          atRisk: '#F59E0B',
          delayed: '#EF4444',
          blocked: '#DC2626',
          completed: '#059669',
          ready: '#3B82F6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
