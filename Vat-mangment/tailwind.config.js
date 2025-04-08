/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'paynes-gray': '#666A86',
        'slate-gray': '#788AA3',
        'cambridge-blue': '#92B6B1',
        'celadon': '#B2C9AB',
        'dutch-white': '#E8DDB5',
      },
    },
  },
  plugins: [],
};