import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        "card-default": "0 10px 30px -15px rgba(var(--shadow-color), 0.05)",
        "card-hover": "0 15px 40px -15px rgba(var(--shadow-color), 0.1)",
      },
      colors: {
        status: {
          passed: "hsl(var(--status-passed))",
          "passed-foreground": "hsl(var(--status-passed-foreground))",
          pending: "hsl(var(--status-pending))",
          "pending-foreground": "hsl(var(--status-pending-foreground))",
          partial: "hsl(var(--status-partial))",
          "partial-foreground": "hsl(var(--status-partial-foreground))",
          "not-started": "hsl(var(--status-not-started))",
          "not-started-foreground": "hsl(var(--status-not-started-foreground))",
          "in-progress": "hsl(var(--status-in-progress))",
          "in-progress-foreground": "hsl(var(--status-in-progress-foreground))",
          late: "hsl(var(--status-late))",
          "late-foreground": "hsl(var(--status-late-foreground))",
          completed: "hsl(var(--status-completed))",
          "completed-foreground": "hsl(var(--status-completed-foreground))",
          failed: "hsl(var(--status-failed))",
          "failed-foreground": "hsl(var(--status-failed-foreground))",
        },
        score: {
          excellent: "hsl(var(--score-excellent))",
          "excellent-foreground": "hsl(var(--score-excellent-foreground))",
          good: "hsl(var(--score-good))",
          "good-foreground": "hsl(var(--score-good-foreground))",
          fair: "hsl(var(--score-fair))",
          "fair-foreground": "hsl(var(--score-fair-foreground))",
          poor: "hsl(var(--score-poor))",
          "poor-foreground": "hsl(var(--score-poor-foreground))",
          fail: "hsl(var(--score-fail))",
          "fail-foreground": "hsl(var(--score-fail-foreground))",
        },
        //Semantic Button Tokens
        "primary-button": "hsl(var(--primary-button))",
        "primary-button-foreground": "hsl(var(--primary-button-foreground))",
        "primary-button-hover": "hsl(var(--primary-button-hover))",

        "secondary-button": "hsl(var(--secondary-button))",
        "secondary-button-foreground":
          "hsl(var(--secondary-button-foreground))",
        "secondary-button-hover": "hsl(var(--secondary-button-hover))",

        "destructive-button": "hsl(var(--destructive-button))",
        "destructive-button-foreground":
          "hsl(var(--destructive-button-foreground))",

        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        main: {
          100: "hsl(var(--marine-100))",
          200: "hsl(var(--marine-200))",
          300: "hsl(var(--marine-300))",
          500: "hsl(var(--marine-500))",
          600: "hsl(var(--marine-600))",
          700: "hsl(var(--marine-700))",
          800: "hsl(var(--marine-800))",
          900: "hsl(var(--marine-900))",
        },
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
        "border-secondary": "hsl(var(--border-secondary))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          secondary: "hsl(var(--sidebar-secondary))",
          "secondary-foreground": "hsl(var(--sidebar-secondary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "caret-blink": {
          "0%,70%,100%": {
            opacity: "1",
          },
          "20%,50%": {
            opacity: "0",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
