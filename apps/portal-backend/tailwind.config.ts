import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./scripts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "noemia": {
          50: "#f7f4ee",
          100: "#f6ecd9",
          200: "#eadfcf",
          300: "#ddd6ca",
          400: "#d8d2c8",
          500: "#c4b8a8",
          600: "#8e6a3b",
          700: "#7b5c31",
          800: "#6f512c",
          900: "#10261d",
        },
        "muted": "#5f6f68",
        "text-primary": "#10261d",
        "border-light": "#e9e2d6",
        "border-lighter": "#ddd6ca",
      },
      fontFamily: {
        "sans": ["'Avenir Next'", "'Segoe UI'", "ui-sans-serif", "system-ui", "sans-serif"],
        "serif": ["'Iowan Old Style'", "'Palatino Linotype'", "'Book Antiqua'", "Georgia", "serif"],
      },
      borderRadius: {
        "lg": "18px",
        "xl": "32px",
        "2xl": "24px",
        "3xl": "20px",
      },
      boxShadow: {
        "card": "0 20px 60px rgba(16, 38, 29, 0.06)",
        "card-light": "0 20px 60px rgba(16, 38, 29, 0.05)",
        "button": "0 12px 30px rgba(142, 106, 59, 0.25)",
        "luxury": "0 28px 70px rgba(16, 38, 29, 0.12)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.65)",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "112": "28rem",
      },
    },
  },
  plugins: [],
};

export default config;
