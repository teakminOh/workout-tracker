/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Warm charcoal dark theme — single source of truth is constants/theme.ts (Palette)
        bg: '#262421',
        surface: '#302D29',
        raised: '#3B3733',
        line: '#48433D',
        cream: '#EDE9E2',
        muted: '#A8A199',
        faint: '#736D64',
        accent: {
          DEFAULT: '#E8743B',
          pressed: '#C95E2C',
          soft: 'rgba(232, 116, 59, 0.14)',
          on: '#231911',
        },
        danger: '#D9655B',
      },
      borderRadius: {
        10: '10px',
      },
    },
  },
  plugins: [],
}
