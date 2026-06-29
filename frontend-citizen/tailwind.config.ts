import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Cream / black / rust design tokens ───────────────────────
        cream: "var(--bg-cream)",
        "surface-white": "var(--surface-white)",
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        "border-subtle": "var(--border-subtle)",
        "tag-red": {
          bg: "var(--tag-red-bg)",
          text: "var(--tag-red-text)",
        },
        "tag-teal": {
          bg: "var(--tag-teal-bg)",
          text: "var(--tag-teal-text)",
        },
        "tag-orange": {
          bg: "var(--tag-orange-bg)",
          text: "var(--tag-orange-text)",
        },
        "tag-blue": {
          bg: "var(--tag-blue-bg)",
          text: "var(--tag-blue-text)",
        },
        "tag-pink": {
          bg: "var(--tag-pink-bg)",
          text: "var(--tag-pink-text)",
        },
        warning: {
          bg: "var(--warning-bg)",
        },
        // ── Dark surface family ──────────────────────────────────────
        night: {
          DEFAULT: "#0D0F14",
          50:  "#f5f5f6",
          100: "#e0e1e4",
          200: "#c0c2c8",
          300: "#888c96",
          400: "#545a66",
          500: "#363c49",
          600: "#252a35",
          700: "#1C2030",
          800: "#161A23",
          900: "#0D0F14",
          950: "#080A0E",
        },
        // ── Bold yellow / amber – primary brand accent ───────────────
        amber: {
          DEFAULT: "#F5C518",
          50:  "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F5C518",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        // ── Civic green accent ───────────────────────────────────────
        jade: {
          DEFAULT: "#4ADE80",
          50:  "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
        },
        // ── Coral / signal red ───────────────────────────────────────
        coral: {
          DEFAULT: "#F87171",
          50:  "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        // ── Legacy warm tones (kept for status dots etc.) ────────────
        forest: {
          50: "#edf6f0", 100: "#d4ebdc", 200: "#a9d6bb", 300: "#75bb94",
          400: "#479a6f", 500: "#2c7d54", 600: "#1d6543", 700: "#175036",
          800: "#143f2c", 900: "#0e2d20",
        },
        clay: {
          50: "#fbf1ea", 100: "#f6ddcf", 200: "#ecbda6", 300: "#df9776",
          400: "#cf6f48", 500: "#bd5a33", 600: "#a4471f", 700: "#83381b",
          800: "#642c19", 900: "#492115",
        },
        emerald: {
          50: "#ecfdf5", 100: "#d1fae5", 400: "#34d399",
          500: "#10b981", 600: "#059669", 700: "#047857",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        soft:  "0 1px 3px rgba(20,20,20,0.06), 0 8px 24px rgba(20,20,20,0.08)",
        lift:  "0 16px 48px -8px rgba(20,20,20,0.12)",
        glow:  "0 0 0 1px rgba(194,80,46,0.12), 0 12px 32px -8px rgba(194,80,46,0.18)",
        "glow-teal": "0 0 0 1px rgba(31,90,77,0.12), 0 12px 32px -8px rgba(31,90,77,0.15)",
      },
      keyframes: {
        "pulse-ring": {
          "0%":   { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0"   },
        },
        float: {
          "0%,100%": { transform: "translateY(0)"    },
          "50%":     { transform: "translateY(-8px)" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)"    },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.22,1,0.36,1) infinite",
        float:        "float 6s ease-in-out infinite",
        "fade-up":    "fade-up 0.4s ease both",
      },
    },
  },
  plugins: [],
};
export default config;
