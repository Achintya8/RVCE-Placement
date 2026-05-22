import tailwindAnimate from "tailwindcss-animate"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "bg-dark": ({ opacityValue }) => 
          opacityValue !== undefined 
            ? `rgba(var(--color-bg-dark), ${opacityValue})` 
            : `rgb(var(--color-bg-dark))`,
        "bg-card": ({ opacityValue }) => 
          opacityValue !== undefined 
            ? `rgba(var(--color-bg-card), ${opacityValue})` 
            : `rgba(var(--color-bg-card), var(--color-bg-card-opacity, 1))`,
        "text-main": ({ opacityValue }) => 
          opacityValue !== undefined 
            ? `rgba(var(--color-text-main), ${opacityValue})` 
            : `rgb(var(--color-text-main))`,
        "text-muted": ({ opacityValue }) => 
          opacityValue !== undefined 
            ? `rgba(var(--color-text-muted), ${opacityValue})` 
            : `rgb(var(--color-text-muted))`,
        "glass-border": ({ opacityValue }) => 
          opacityValue !== undefined 
            ? `rgba(var(--color-glass-border), ${opacityValue})` 
            : `rgba(var(--color-glass-border), var(--color-glass-border-opacity, 1))`,
      },
      keyframes: {
        loading: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        loading: "loading 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindAnimate],
}
