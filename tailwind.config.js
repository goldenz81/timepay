/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scoped: utilities only apply inside #ae-root (employees Aurora layout),
  // so the rest of the app is completely unaffected.
  important: '#ae-root',
  // No global preflight: it would reset elements app-wide.
  // The page gets its own minimal scoped reset in aurora-reset.css instead.
  corePlugins: { preflight: false },
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'cairo': ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
