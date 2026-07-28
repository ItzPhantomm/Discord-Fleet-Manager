export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        phantom: {
          bg: '#0a0a0f',
          surface: '#12121a',
          surfaceHover: '#1a1a24',
          border: '#2a2a3a',
          borderHover: '#3a3a4a',
          primary: '#00d4aa',
          primaryHover: '#00e8bb',
          primaryMuted: '#00d4aa20',
          accent: '#ff6b35',
          accentHover: '#ff8555',
          text: '#e8e8ed',
          textMuted: '#6b6b7a',
          textDim: '#4a4a5a',
          success: '#00d47e',
          warning: '#ffb800',
          danger: '#ff3355',
          info: '#00b4ff'
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.5' }],
        'lg': ['1.125rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.2' }],
        '4xl': ['2.25rem', { lineHeight: '1.1' }]
      },
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px'
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
        'elevation-2': '0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
        'elevation-3': '0 10px 15px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.2)',
        'elevation-4': '0 20px 25px rgba(0,0,0,0.3), 0 10px 10px rgba(0,0,0,0.2)',
        'glow-primary': '0 0 20px rgba(0, 212, 170, 0.3)',
        'glow-accent': '0 0 20px rgba(255, 107, 53, 0.3)'
      },
      transitionDuration: {
        '75': '75ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms'
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.2, 0, 0, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'fade-out': 'fadeOut 150ms ease-in',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'scale-out': 'scaleOut 150ms ease-in',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideUp: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
};