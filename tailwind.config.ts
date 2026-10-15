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
    },
  },
  plugins: [],
};

export default config;
