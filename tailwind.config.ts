import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      screens: {
        xs: "376px",
      },
      fontSize: {
        xs: "12px",
      },
      lineHeight: {
        4: "16px",
        8: "24px",
      },
      fontFamily: {
        sans: "var(--font-dm-sans)",
      },
      colors: {
        skeleton: "#1b1b1b",
        main: "var(--bg-primary)",
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        tertiary: "var(--color-tertiary)",
        error: "var(--color-error)",
        iron: {
          50: "#F6F7F8",
          600: "#7E8792",
          800: "#5F656E",
          950: "#323539",
        },
        black: {
          DEFAULT: "#111",
        },
        gray: {
          100: "#D7D7D7",
          200: "#1B1B1B",
          300: "#282828",
          400: "#303030",
          600: "#606060",
          700: "#4A4A4A",
          900: "#6E6E6E",
          10: "#808080",
          11: "#B1B1B1",
          12: "#EEE",
        },
      },
    },
  },
  plugins: [require("daisyui")],
};
export default config;
