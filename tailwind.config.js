/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // PENTING: Ini agar file React terdeteksi
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}