/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ContractOS brand colours
        navy: {
          DEFAULT: '#1B2A4A',
          dark: '#0D1B2E',
          light: '#243660',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D9BB72',
          dark: '#A8872F',
        },
        success: {
          DEFAULT: '#12B76A',
          dark: '#065F46',
        },
        danger: {
          DEFAULT: '#7B1C1C',
          light: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
