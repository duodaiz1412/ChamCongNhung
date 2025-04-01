/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: "#FF4319",
          800: "#FFF4F2",
        },
        red: {
          600: "#FF0000",
        },
        gray: {
          default: "#242728",
        },
        custom: {
          background: "#f2f2f3",
        },
      },
      boxShadow: {
        custom1: "0px 1px 2px 0px rgba(16, 24, 40, 0.06)",
        custom2: "0px 1px 3px 0px rgba(16, 24, 40, 0.1)",
      },
    },
  },
  plugins: [],
}

