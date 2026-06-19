/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: '#fdf4f4',
        sidebar: '#242a37',
        'sidebar-hover': '#1d222d',
        'sidebar-active': '#181c25',
        primary: '#d4af37',
        secondary: '#c21a1a',
      },
    },
  },
  plugins: [],
}
