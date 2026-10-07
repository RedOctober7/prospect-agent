import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  // Theme lives on <html data-theme="dark|light">, set before first paint by
  // the inline script in app/layout.tsx.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        line: token("line"),
        "line-strong": token("line-strong"),
        fg: token("fg"),
        muted: token("muted"),
        subtle: token("subtle"),
        accent: token("accent"),
        "accent-ink": token("accent-ink"),
        danger: token("danger"),
        success: token("success"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        fadeSlideIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        traceIn: {
          "0%": { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "fade-slide-in": "fadeSlideIn 0.25s ease-out both",
        "trace-in": "traceIn 0.3s ease-out both",
        blink: "blink 1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
