import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#02897A",
          light: "#35B8A3",
          dark: "#01635A"
        },
        danger: "#F97373",
        warning: "#FBBF24",
        muted: "#6B7280"
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem"
      },
      boxShadow: {
        card: "0 10px 25px rgba(15, 23, 42, 0.08)",
        focus: "0 0 0 3px rgba(2, 137, 122, 0.1)"
      },
      spacing: {
        container: "5rem", // max-w-5xl equivalent
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
      }
    }
  },
  plugins: []
};

export default config;


