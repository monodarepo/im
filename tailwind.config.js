/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        positive: '#16A34A',
        negative: '#DC2626',
        attention: '#F59E0B',
        neutral: '#64748B',
        hub: '#1E4FD8',
        gtm: '#0F766E',
        rgm: '#7C3AED',
        ag: '#EA7317',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
