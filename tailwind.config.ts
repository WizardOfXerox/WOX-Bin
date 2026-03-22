import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        xl: "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      boxShadow: {
        glow: "0 20px 60px rgba(0, 0, 0, 0.35)"
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(circle at top left, rgba(53,120,255,.22), transparent 30%), radial-gradient(circle at top right, rgba(0,188,212,.18), transparent 28%), linear-gradient(135deg, rgba(255,255,255,.04), transparent)"
      },
      transitionTimingFunction: {
        "wox-out": "cubic-bezier(0.22, 1, 0.36, 1)",
        "wox-spring": "cubic-bezier(0.34, 1.3, 0.64, 1)"
      },
      keyframes: {
        "wox-fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "wox-fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "wox-shimmer": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" }
        }
      },
      animation: {
        "wox-fade-up": "wox-fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "wox-fade-in": "wox-fade-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "wox-shimmer": "wox-shimmer 8s ease-in-out infinite alternate"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
