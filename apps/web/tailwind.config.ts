import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Brand colours — always reference CSS vars (P13)
      colors: {
        bol: {
          'navy-900':    'var(--bol-navy-900)',
          'navy-800':    'var(--bol-navy-800)',
          'navy-700':    'var(--bol-navy-700)',
          'emerald-500': 'var(--bol-emerald-500)',
          'emerald-300': 'var(--bol-emerald-300)',
          'green-700':   'var(--bol-green-700)',
          'gold-400':    'var(--bol-gold-400)',
          'gold-700':    'var(--bol-gold-700)',
          'ink-muted':   'var(--bol-ink-muted)',
          'ink-muted-l': 'var(--bol-ink-muted-l)',
          'danger-d':    'var(--bol-danger-d)',
          'danger-l':    'var(--bol-danger-l)',
        },
        // Semantic aliases wired to CSS-var tokens
        bg:          'var(--bg)',
        surface:     'var(--surface-1)',
        primary:     'var(--primary)',
        accent:      'var(--accent)',
        danger:      'var(--danger)',
      },
      fontFamily: {
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
    },
  },
  plugins: [],
};

export default config;
