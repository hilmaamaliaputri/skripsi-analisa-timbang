import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        lcd: ['"Share Tech Mono"', 'monospace'],
      },
      colors: {
        // Page & surface (LIGHT)
        ink: {
          0: '#ffffff',
          1: '#f9fafb',
          2: '#f3f4f6',
          3: '#e5e7eb',
          4: '#d1d5db',
        },
        edge: {
          DEFAULT: '#e5e7eb',
          strong: '#cbd5e1',
        },
        // Text (DARK)
        bone: {
          0: '#111827',
          1: '#374151',
          2: '#6b7280',
          3: '#9ca3af',
        },
        // Always-dark accent (icons on yellow buttons, shutter rings)
        obsidian: '#0a0b0d',
        // Brand
        safety: {
          DEFAULT: '#fbbf24',
          bright: '#fde047',
          deep: '#d97706',
        },
        // Status — adjusted for light bg readability
        ok: '#059669',
        pending: '#d97706',
        synced: '#0284c7',
        err: '#dc2626',
        // LCD readout (warm amber, untuk display timbangan)
        lcd: '#ffb000',
      },
    },
  },
  safelist: [
    'bg-pending/10', 'bg-pending/40', 'border-pending/40', 'text-pending',
    'bg-ok/10', 'bg-ok/40', 'border-ok/40', 'text-ok',
    'bg-synced/10', 'bg-synced/40', 'border-synced/40', 'text-synced',
    'bg-err/10', 'bg-err/40', 'border-err/40', 'text-err',
  ],
  plugins: [],
} satisfies Config
