/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        Popins: ['"Custom Font"', "Poppins"],
        Gruppo: ['"Custom Font"', "Gruppo"],
        Raleway: ['"Custom Font"', "Raleway"],
        MonaSans: ['"Custom Font"', "MonaSans"],
        FengardoNeue: ['"Custom Font"', "FengardoNeue"],
      }
    },
  },
  plugins: [],
}
