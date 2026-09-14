/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#087D43',
        secondary: '#48B83F',
        deep: '#075C35',
        ink: '#171717',
        surface: '#FFFFFF',
        soft: '#F1FAF4',
        panel: '#F5F7F6',
        line: '#E3EAE6',
        muted: '#5B6B63',
        warn: '#C98A2B',
        bad: '#C6423C',
        badBg: '#FDEEEC',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
