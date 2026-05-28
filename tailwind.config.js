/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1A6B47',
          50: '#E8F5EE',
          100: '#C5E5D3',
          200: '#9ED3B5',
          300: '#72BE93',
          400: '#4CAE77',
          500: '#1A6B47',
          600: '#155A3A',
          700: '#0F4329',
          800: '#092B1A',
          900: '#03140B',
        },
        gold: {
          DEFAULT: '#C9A84C',
          50: '#FDF8EC',
          100: '#F9EDCC',
          200: '#F3D98A',
          300: '#ECC54A',
          400: '#C9A84C',
          500: '#A88630',
          600: '#876519',
          700: '#654707',
          800: '#432D01',
          900: '#211600',
        },
        academy: {
          green: '#1A6B47',
          gold: '#C9A84C',
          dark: '#0D1B12',
          surface: '#F8FAF9',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(16px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
      },
      backgroundImage: {
        'hero-pattern': "url('/hero-pattern.svg')",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
