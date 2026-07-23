/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // SplitFrame design tokens (design.md §1)
        surface: {
          0: "#0A0B0E",
          1: "#101218",
          2: "#161922",
          3: "#1D212D",
        },
        line: {
          DEFAULT: "#242836",
          strong: "#333848",
        },
        ink: {
          DEFAULT: "#F2F4F8",
          2: "#A9B0C0",
          3: "#6B7280",
        },
        before: {
          DEFAULT: "#4CC9F0",
          dim: "#4CC9F01F",
        },
        after: {
          DEFAULT: "#B8F04A",
          dim: "#B8F04A1F",
          ink: "#101300",
        },
        warn: "#FF6B6B",
        // shadcn/ui semantic tokens (dark palette, see index.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "glow-after": "0 0 24px rgba(184,240,74,.25)",
        "glow-after-sm": "0 0 8px rgba(184,240,74,.35)",
        "glow-before-sm": "0 0 8px rgba(76,201,240,.35)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "ambient-drift": {
          "0%": { transform: "translate3d(-4%, -2%, 0)" },
          "50%": { transform: "translate3d(4%, 3%, 0)" },
          "100%": { transform: "translate3d(-4%, -2%, 0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 16px rgba(184,240,74,.18)" },
          "50%": { boxShadow: "0 0 34px rgba(184,240,74,.4)" },
        },
        "demo-wipe": {
          "0%": { left: "18%" },
          "50%": { left: "82%" },
          "100%": { left: "18%" },
        },
        "demo-wipe-clip": {
          "0%": { clipPath: "inset(0 0 0 18%)" },
          "50%": { clipPath: "inset(0 0 0 82%)" },
          "100%": { clipPath: "inset(0 0 0 18%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "ambient-drift": "ambient-drift 24s ease-in-out infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "demo-wipe": "demo-wipe 4s ease-in-out infinite",
        "demo-wipe-clip": "demo-wipe-clip 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
