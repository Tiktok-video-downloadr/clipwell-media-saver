import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF8",
        ink: "#171412",
        line: "#DEDAD2",
        signal: "#E8A33D",
      },
    },
  },
  plugins: [],
};
export default config;
