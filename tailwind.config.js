/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors (Spotify-inspired)
        'bg-primary': '#0a0e27',
        'bg-secondary': '#1a1f3a',
        'bg-tertiary': '#2a3150',

        'accent-primary': '#3b82f6',
        'accent-secondary': '#8b5cf6',
        'accent-success': '#10b981',
        'accent-warning': '#f59e0b',
        'accent-error': '#ef4444',

        'text-primary': '#ffffff',
        'text-secondary': '#94a3b8',
        'text-tertiary': '#64748b',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',      // 12px
        'sm': '0.875rem',     // 14px
        'base': '1rem',       // 16px
        'lg': '1.125rem',     // 18px
        'xl': '1.25rem',      // 20px
        '2xl': '1.5rem',      // 24px
        '3xl': '1.875rem',    // 30px
        '4xl': '2.25rem',     // 36px
        '6xl': '3.75rem',     // 60px
      },
      spacing: {
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
      },
      borderRadius: {
        'sm': '0.375rem',   // 6px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.5rem',    // 24px
        'full': '9999px',
      },
      animation: {
        'slide-in': 'slideInFromLeft 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'spin': 'spin 0.8s linear infinite',
      },
      keyframes: {
        slideInFromLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
