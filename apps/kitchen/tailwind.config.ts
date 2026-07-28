import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#f59e0b',
          600: '#d97706',
        },
        surface: {
          800: '#1e1e24',
          850: '#18181d',
          900: '#111114',
          950: '#0a0a0c',
        },
        ticket: {
          new: '#ef4444',
          prep: '#f59e0b',
          ready: '#22c55e',
        },
      },
      fontFamily: {
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ticket': '0 2px 8px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
