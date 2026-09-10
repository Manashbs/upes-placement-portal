/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        upes: {
          navy: '#0B132B',
          navyLight: '#1C2541',
          navySidebar: '#0F172A',
          gold: '#F59E0B',
          goldHover: '#D97706',
          slate: '#334155',
          bg: '#F8FAFC',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(#E2E8F0 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}
