import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: "#00f5ff",
          pink: "#ff2fd6",
          violet: "#8b5cf6",
          green: "#42ff9e"
        }
      }
    }
  },
  plugins: []
};

export default config;
