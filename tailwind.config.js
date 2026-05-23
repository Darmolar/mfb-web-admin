/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: '#fdf4f4',
        sidebar: '#2d3748',
        'sidebar-hover': '#3d4a5e',
        'sidebar-active': '#4a5568',
        primary: '#374151',
      },
    },
  },
  plugins: [],
}
