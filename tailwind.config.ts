import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9ecff',
          500: '#1d75bd',
          600: '#155f9c',
          700: '#104b7b',
        },
        forest: {
          500: '#23805f',
          600: '#1b654c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};

export default config;

