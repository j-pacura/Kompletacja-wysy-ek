/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html",
  ],
  darkMode: 'class',
  safelist: [
    // Material Design 3 color classes that must always be generated
    { pattern: /^(bg|text|border|ring)-(surface|primary|secondary|tertiary|error|on-)/ },
    { pattern: /^(bg|text|border|ring)-(outline|inverse)/ },
    'primary-gradient',
    'glass-panel',
    'shadow-glow',
  ],
  theme: {
    extend: {
      // Material Design 3 Color Palette
      // These are base colors - actual theme colors are set via CSS variables
      colors: {
        // Dynamic theme colors (CSS variables for multi-theme support)
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',

        'accent-primary': 'var(--color-accent-primary)',
        'accent-secondary': 'var(--color-accent-secondary)',
        'accent-success': 'var(--color-accent-success)',
        'accent-warning': 'var(--color-accent-warning)',
        'accent-error': 'var(--color-accent-error)',

        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',

        // Material Design 3 - Surface & Background
        'surface': 'var(--md-surface)',
        'surface-dim': 'var(--md-surface-dim)',
        'surface-bright': 'var(--md-surface-bright)',
        'surface-container-lowest': 'var(--md-surface-container-lowest)',
        'surface-container-low': 'var(--md-surface-container-low)',
        'surface-container': 'var(--md-surface-container)',
        'surface-container-high': 'var(--md-surface-container-high)',
        'surface-container-highest': 'var(--md-surface-container-highest)',
        'surface-variant': 'var(--md-surface-variant)',
        'background': 'var(--md-background)',

        // Material Design 3 - Primary
        'primary': 'var(--md-primary)',
        'primary-dim': 'var(--md-primary-dim)',
        'primary-container': 'var(--md-primary-container)',
        'primary-fixed': 'var(--md-primary-fixed)',
        'primary-fixed-dim': 'var(--md-primary-fixed-dim)',
        'on-primary': 'var(--md-on-primary)',
        'on-primary-container': 'var(--md-on-primary-container)',
        'on-primary-fixed': 'var(--md-on-primary-fixed)',
        'on-primary-fixed-variant': 'var(--md-on-primary-fixed-variant)',
        'inverse-primary': 'var(--md-inverse-primary)',

        // Material Design 3 - Secondary
        'secondary': 'var(--md-secondary)',
        'secondary-dim': 'var(--md-secondary-dim)',
        'secondary-container': 'var(--md-secondary-container)',
        'secondary-fixed': 'var(--md-secondary-fixed)',
        'secondary-fixed-dim': 'var(--md-secondary-fixed-dim)',
        'on-secondary': 'var(--md-on-secondary)',
        'on-secondary-container': 'var(--md-on-secondary-container)',
        'on-secondary-fixed': 'var(--md-on-secondary-fixed)',
        'on-secondary-fixed-variant': 'var(--md-on-secondary-fixed-variant)',

        // Material Design 3 - Tertiary
        'tertiary': 'var(--md-tertiary)',
        'tertiary-dim': 'var(--md-tertiary-dim)',
        'tertiary-container': 'var(--md-tertiary-container)',
        'tertiary-fixed': 'var(--md-tertiary-fixed)',
        'tertiary-fixed-dim': 'var(--md-tertiary-fixed-dim)',
        'on-tertiary': 'var(--md-on-tertiary)',
        'on-tertiary-container': 'var(--md-on-tertiary-container)',
        'on-tertiary-fixed': 'var(--md-on-tertiary-fixed)',
        'on-tertiary-fixed-variant': 'var(--md-on-tertiary-fixed-variant)',

        // Material Design 3 - Error
        'error': 'var(--md-error)',
        'error-dim': 'var(--md-error-dim)',
        'error-container': 'var(--md-error-container)',
        'on-error': 'var(--md-on-error)',
        'on-error-container': 'var(--md-on-error-container)',

        // Material Design 3 - On Colors
        'on-background': 'var(--md-on-background)',
        'on-surface': 'var(--md-on-surface)',
        'on-surface-variant': 'var(--md-on-surface-variant)',

        // Material Design 3 - Outline & Inverse
        'outline': 'var(--md-outline)',
        'outline-variant': 'var(--md-outline-variant)',
        'inverse-surface': 'var(--md-inverse-surface)',
        'inverse-on-surface': 'var(--md-inverse-on-surface)',
        'surface-tint': 'var(--md-surface-tint)',
      },
      fontFamily: {
        headline: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        label: ['Inter', 'system-ui', 'sans-serif'],
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
        '5xl': '3rem',        // 48px
        '6xl': '3.75rem',     // 60px
      },
      spacing: {
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
        '24': '6rem',     // 96px
      },
      borderRadius: {
        'sm': '0.25rem',    // 4px
        'DEFAULT': '0.5rem', // 8px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.5rem',    // 24px
        '3xl': '2rem',      // 32px
        'full': '9999px',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'slide-in': 'slideInFromLeft 0.3s ease-out',
        'slide-in-right': 'slideInFromRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease',
        'fade-out': 'fadeOut 0.2s ease',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-out': 'scaleOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'spin': 'spin 0.8s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        slideInFromLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInFromRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.9)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
        'glow': '0 0 20px rgba(114, 254, 143, 0.3)',
        'glow-primary': '0 0 20px var(--md-primary)',
      },
    },
  },
  plugins: [],
}
