/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        telegram: {
          blue: '#0088cc',
          'blue-dark': '#006699',
          'bg-dark': '#17212b',
          'bg-darker': '#0e1621',
          'sidebar': '#232e3c',
          'message-out': '#2b5278',
          'message-in': '#182533',
          'text': '#f5f5f5',
          'text-secondary': '#aaaaaa',
        }
      }
    },
  },
  plugins: [],
}
