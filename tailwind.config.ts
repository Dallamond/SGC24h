import type { Config } from "tailwindcss";

// Misma paleta que la web Camis24h, sin el estilo grafiti: aquí manda la legibilidad.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        rust: { DEFAULT: "#C1502E", dark: "#9C3D22", light: "#DA8563" },
        sage: { DEFAULT: "#4B6358", dark: "#374A41" },
        paper: "#F3EEE3",
        ink: "#1A1B1B",
      },
      fontFamily: { sans: ["var(--font-grotesk)", "sans-serif"] },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        pop: { "0%": { transform: "scale(.4)", opacity: "0" }, "70%": { transform: "scale(1.25)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        grow: { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        pulseRing: { "0%": { boxShadow: "0 0 0 0 rgba(75,99,88,.45)" }, "100%": { boxShadow: "0 0 0 14px rgba(75,99,88,0)" } },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .5s cubic-bezier(.2,.8,.2,1) .3s both",
        grow: "grow .7s cubic-bezier(.2,.8,.2,1) both",
        "pulse-ring": "pulseRing 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
