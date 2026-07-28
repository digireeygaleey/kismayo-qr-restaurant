import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef9ec',
          100: '#fcf0cc',
          200: '#f9de94',
          300: '#f5c64e',
          400: '#f2b427',
          500: '#e99a11',
          600: '#cd750b',
          700: '#aa530d',
          800: '#8a4111',
          900: '#723611',
        },
        surface: {
          50: '#faf9f7',
          100: '#f5f3ef',
          200: '#eae6df',
          300: '#d8d1c5',
        },
        ink: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#3d3d3d',
          900: '#1a1a1a',
          950: '#0d0d0d',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)',
        'elevated': '0 4px 16px rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
