/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        primary: { DEFAULT: '#5A2C81', dark: '#3F1D5A', foreground: '#ffffff' },
        primaryDark: '#3F1D5A',
        lilac: '#F3ECFC',
        mist: '#F7F7FB',
        ink: '#161226',
        sage: '#26B27D',
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#5A2C81',
        background: '#ffffff',
        foreground: '#161226',
        secondary: { DEFAULT: '#f1f5f9', foreground: '#161226' },
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff' },
        muted: { DEFAULT: '#f1f5f9', foreground: '#64748b' },
        accent: { DEFAULT: '#F3ECFC', foreground: '#5A2C81' },
        popover: { DEFAULT: '#ffffff', foreground: '#161226' },
        card: { DEFAULT: '#ffffff', foreground: '#161226' },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(90, 44, 129, 0.12)',
        card: '0 16px 36px rgba(18, 23, 39, 0.06)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(90,44,129,0.08) 1px, transparent 0)',
        hero: 'linear-gradient(135deg, rgba(243,236,252,0.95), rgba(255,255,255,1) 55%, rgba(232,248,241,0.9))',
        cta: 'linear-gradient(135deg, #35164F, #5A2C81 50%, #7E4CB0)',
      },
      keyframes: {
        marquee: { '0%': { transform: 'translate3d(0,0,0)' }, '100%': { transform: 'translate3d(-50%,0,0)' } },
        'accordion-down': { from: { height: 0 }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: 0 } },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
