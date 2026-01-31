import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        'vibe-bg': '#050505',
        'vibe-card': '#0d0d0d',
        'vibe-border': '#1a1a1a',
        'vibe-purple': '#9945FF',
        'vibe-teal': '#14F195',
        'vibe-blue': '#00D4FF',
      },
      backgroundImage: {
        'gradient-vibe': 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
        'gradient-button': 'linear-gradient(90deg, #9945FF 0%, #14F195 100%)',
        'gradient-teal': 'linear-gradient(135deg, #0d6b5c 0%, #14F195 100%)',
      },
      animation: {
        'wave': 'wave 8s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(0) scaleY(1)' },
          '50%': { transform: 'translateY(-5px) scaleY(1.05)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
