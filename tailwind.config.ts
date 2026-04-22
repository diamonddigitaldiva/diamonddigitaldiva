import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        wordmark: ['Cinzel', 'serif'],
        input: ['"Cormorant Garamond"', 'serif'],
      },
      colors: {
        amethyst: {
          DEFAULT: "hsl(var(--amethyst))",
          deep: "hsl(var(--amethyst-deep))",
        },
        sapphire: "hsl(var(--sapphire))",
        pearl: "hsl(var(--pearl))",
        ivory: "hsl(var(--ivory))",
        charcoal: "hsl(var(--charcoal))",
        gold: {
          DEFAULT: "hsl(var(--gold))",
          deep: "hsl(var(--gold-deep))",
        },
        blush: "hsl(var(--blush))",
        "true-black": "hsl(var(--true-black))",

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Legacy aliases — keep until all components migrate.
        "soft-blush": "hsl(var(--blush))",
        cream: "hsl(var(--pearl))",
        "warm-beige": "hsl(var(--ivory))",
        "moon-gray": "hsl(var(--border))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(15, 15, 16, 0.08)",
        signet: "0 16px 40px -12px rgba(106, 76, 147, 0.45)",
        editorial: "0 30px 80px -30px rgba(15, 15, 16, 0.25)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
