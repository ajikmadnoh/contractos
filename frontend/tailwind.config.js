/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Old dark-theme class names remapped → light design-system values
        // This keeps all Sprint-3 pages rendering correctly without rewriting them
        navy: {
          DEFAULT: '#FFFFFF',  // bg-navy  → white surface
          dark:    '#F7F9FB',  // bg-navy-dark → surface-2
          light:   '#EEF1F5',  // bg-navy-light → bg
        },
        gold: {
          DEFAULT: '#1F4FD8',  // text-gold / bg-gold → accent blue
          light:   '#4B72E0',
          dark:    '#1A3FAD',
        },
        success: {
          DEFAULT: '#059669',  // text-success / bg-success
          dark:    '#047857',
        },
        danger: {
          DEFAULT: '#DC2626',
          light:   '#EF4444',
        },
      },
    },
  },
  plugins: [],
};
