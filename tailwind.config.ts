import type { Config } from "tailwindcss";

/**
 * Design system.
 * A restrained, professional palette: deep green-charcoal ground, a single
 * muted green as the primary accent, a cool steel-blue as the balancing
 * secondary, and warm ivory for type. No neon, no gold — colour is used
 * sparingly and with intent.
 */
const green = { DEFAULT: "#5AA98A", soft: "#87C4A6", deep: "#2E6B50" };

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B110E", // deep green-charcoal
        surface: "#131A16", // raised sections
        panel: "#171F1B", // cards / panels
        foreground: "#E8E6DD", // warm ivory
        muted: "#8A928A", // green-grey secondary text
        subtle: "#5C665F", // tertiary / captions
        line: "rgba(232,230,221,0.09)", // hairline borders
        accent: green, // primary — muted green
        emerald: green, // alias kept so no stray class breaks
        steel: { DEFAULT: "#7FA1B2", soft: "#ABC6D2", deep: "#37505C" }, // secondary — cool
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      maxWidth: {
        content: "1180px",
        column: "720px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ring-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "ring-spin-rev": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "ring-spin": "ring-spin 90s linear infinite",
        "ring-spin-rev": "ring-spin-rev 120s linear infinite",
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(0,0,0,0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
