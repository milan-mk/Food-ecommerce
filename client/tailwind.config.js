/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#231815',
        muted: '#6B645E',
        line: '#E4E1DB',
        surface: '#F4F3F0',
        ketchup: { DEFAULT: '#D93A2B', dark: '#B52C1F', light: '#FCE4E0' },
        mustard: { DEFAULT: '#FFC233', dark: '#E5A800', light: '#FFF3CC' },
        leaf: { DEFAULT: '#2E8B57', light: '#DDF3E6' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: { ticket: '6px 6px 0 0 #231815' }, // the one hard shadow in the design
    },
  },
  plugins: [],
};
