/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        surface: "#121215",
        surfaceBorder: "#27272a",
        primaryText: "#f4f4f5",
        secondaryText: "#a1a1aa",
        accent: "#3f3f46",
        positive: "#10b981",
        warning: "#f59e0b",
        critical: "#ef4444"
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"]
      }
    },
  },
  plugins: [],
}
