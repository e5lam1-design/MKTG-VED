/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617',
        foreground: '#f8fafc',
        card: 'rgba(30, 41, 59, 0.5)',
        primary: '#6366f1',
        secondary: '#1e293b',
        muted: '#94a3b8',
        border: 'rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}
