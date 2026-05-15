import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0906',
          soft: '#111008',
        },
        parchment: {
          DEFAULT: '#f4edd8',
          dim: '#c8bfa8',
          muted: '#7a7264',
        },
        gilt: {
          DEFAULT: '#c9a84c',
          bright: '#e8c96a',
          dim: '#8a6f2e',
        },
        wire: {
          red: '#c0392b',
          green: '#27ae60',
          blue: '#2980b9',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        mono: ['var(--font-ibm-plex-mono)', 'Courier New', 'monospace'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        barFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
      },
      animation: {
        ticker: 'ticker 30s linear infinite',
        fadeUp: 'fadeUp 0.5s ease forwards',
        shimmer: 'shimmer 2s linear infinite',
        scan: 'scan 3s ease-in-out infinite',
        barFill: 'barFill 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
