import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neon-green gaming palette
        pulse: {
          50:  '#ecfff5',
          100: '#d2ffe9',
          200: '#a4ffd1',
          300: '#6cffae',
          400: '#2eff8a',
          500: '#00e676', // primary accent
          600: '#00b85d',
          700: '#008a47',
          800: '#005f31',
          900: '#003a1e',
        },
        ink: {
          950: '#05070a',
          900: '#0a0d12',
          800: '#0f141c',
          700: '#161d28',
          600: '#212a39',
          500: '#2d384a',
          400: '#475064',
          300: '#7a8497',
          200: '#aab2c2',
          100: '#d3d8e2',
        },
      },
      boxShadow: {
        glow: '0 0 30px rgba(0, 230, 118, 0.35)',
        'glow-sm': '0 0 12px rgba(0, 230, 118, 0.45)',
      },
      backgroundImage: {
        'grid-pulse': 'radial-gradient(circle at 20% 0%, rgba(0,230,118,0.18), transparent 40%), radial-gradient(circle at 90% 90%, rgba(0,230,118,0.08), transparent 50%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
