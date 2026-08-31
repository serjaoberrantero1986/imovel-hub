/**
 * Design Tokens & Theme Configuration
 * ImovelHub Pro - Design System Imobiliário
 */

export const DESIGN_TOKENS = {
  colors: {
    brand: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48', // Primary Brand Rose
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519',
    },
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#090d16',
    },
    amber: {
      500: '#f59e0b',
      600: '#d97706',
    },
    emerald: {
      500: '#10b981',
      600: '#059669',
    },
    indigo: {
      500: '#6366f1',
      600: '#4f46e5',
    }
  },
  typography: {
    fontDisplay: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    fontBody: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  shadows: {
    card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
    cardHover: '0 10px 25px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
    elevated: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glowRose: '0 4px 20px -2px rgba(225, 29, 72, 0.25)',
    glowIndigo: '0 4px 20px -2px rgba(79, 70, 229, 0.25)',
  },
  radius: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    '2xl': '1.25rem', // 20px
    full: '9999px',
  }
} as const;
