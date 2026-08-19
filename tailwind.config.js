/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Assistant', 'system-ui', 'sans-serif'],
        display: ['"Frank Ruhl Libre"', 'serif'],
      },
      colors: {
        ink: '#16233d',
        surface: '#f6f7f9',
        brand: '#0f766e',
      },
    },
  },
  plugins: [],
};
