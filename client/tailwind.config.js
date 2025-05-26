/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      // Design system colors
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6", // Main brand color
          600: "#2563eb", // Hover states
          700: "#1d4ed8", // Active states
          800: "#1e40af",
          900: "#1e3a8a",
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        info: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        // Surface colors for better semantic naming
        surface: {
          primary: "var(--surface-primary)",
          secondary: "var(--surface-secondary)",
          tertiary: "var(--surface-tertiary)",
        },
        border: {
          primary: "var(--border-primary)",
          secondary: "var(--border-secondary)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
      },

      // Design system spacing
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },

      // Design system typography
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
      },

      // Design system border radius
      borderRadius: {
        none: "0",
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },

      // Design system shadows
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
        none: "none",

        // Custom shadows for design system
        soft: "0 2px 8px rgba(0, 0, 0, 0.1)",
        button: "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        dropdown:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        modal:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },

      // Animation and transitions
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-in-up": "slideInUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "bounce-gentle": "bounceGentle 0.6s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceGentle: {
          "0%, 20%, 53%, 80%, 100%": { transform: "translateY(0)" },
          "40%, 43%": { transform: "translateY(-10px)" },
          "70%": { transform: "translateY(-5px)" },
          "90%": { transform: "translateY(-2px)" },
        },
      },

      // Enhanced transition durations
      transitionDuration: {
        0: "0ms",
        75: "75ms",
        100: "100ms",
        150: "150ms",
        200: "200ms",
        300: "300ms",
        500: "500ms",
        700: "700ms",
        1000: "1000ms",
      },

      // Backdrop blur for overlays
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
      },

      // Z-index scale for consistent layering
      zIndex: {
        1: "1",
        10: "10",
        20: "20",
        30: "30",
        40: "40",
        50: "50",
        auto: "auto",
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
        toast: "1080",
      },

      // Grid template columns for complex layouts
      gridTemplateColumns: {
        sidebar: "280px 1fr",
        dashboard: "repeat(auto-fit, minmax(300px, 1fr))",
        table: "auto 1fr auto",
        stat: "auto 1fr",
      },

      // Custom screens for design system breakpoints
      screens: {
        xs: "475px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
        "3xl": "1920px",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class", // Use class strategy for better control
    }),

    // Custom plugin for design system components
    function ({ addComponents, theme }) {
      addComponents({
        // Button components
        ".btn": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: theme("borderRadius.lg"),
          fontWeight: theme("fontWeight.medium"),
          fontSize: theme("fontSize.sm[0]"),
          lineHeight: theme("fontSize.sm[1].lineHeight"),
          transition: "all 0.2s ease-in-out",
          cursor: "pointer",
          border: "none",
          textDecoration: "none",
          outline: "none",
          position: "relative",
          overflow: "hidden",
          padding: "0.75rem 1.5rem",

          "&:disabled": {
            opacity: "0.6",
            cursor: "not-allowed",
          },

          "&:focus-visible": {
            outline: "none",
            boxShadow: `0 0 0 2px ${theme(
              "colors.primary.500"
            )}, 0 0 0 4px rgba(59, 130, 246, 0.1)`,
          },
        },

        ".btn-primary": {
          backgroundColor: theme("colors.primary.500"),
          color: theme("colors.white"),
          boxShadow: theme("boxShadow.button"),

          "&:hover:not(:disabled)": {
            backgroundColor: theme("colors.primary.600"),
            boxShadow: theme("boxShadow.md"),
            transform: "translateY(-1px)",
          },

          "&:active": {
            transform: "translateY(0)",
          },
        },

        ".btn-secondary": {
          backgroundColor: theme("colors.gray.100"),
          color: theme("colors.gray.700"),
          border: `1px solid ${theme("colors.gray.300")}`,

          "&:hover:not(:disabled)": {
            backgroundColor: theme("colors.gray.200"),
            borderColor: theme("colors.gray.400"),
          },
        },

        ".btn-ghost": {
          backgroundColor: "transparent",
          color: theme("colors.gray.600"),

          "&:hover:not(:disabled)": {
            backgroundColor: theme("colors.gray.100"),
            color: theme("colors.gray.900"),
          },
        },

        ".btn-danger": {
          backgroundColor: theme("colors.danger.500"),
          color: theme("colors.white"),

          "&:hover:not(:disabled)": {
            backgroundColor: theme("colors.danger.600"),
          },
        },

        // Card components
        ".card": {
          backgroundColor: theme("colors.white"),
          border: `1px solid ${theme("colors.gray.200")}`,
          borderRadius: theme("borderRadius.xl"),
          boxShadow: theme("boxShadow.card"),
          transition: "all 0.3s ease-in-out",
          overflow: "hidden",
        },

        ".card-interactive": {
          "&:hover": {
            boxShadow: theme("boxShadow.lg"),
            transform: "translateY(-2px)",
          },
        },

        ".card-header": {
          padding: "1.5rem",
          borderBottom: `1px solid ${theme("colors.gray.200")}`,
          backgroundColor: theme("colors.gray.50"),
        },

        ".card-body": {
          padding: "1.5rem",
        },

        ".card-footer": {
          padding: "1rem 1.5rem",
          borderTop: `1px solid ${theme("colors.gray.200")}`,
          backgroundColor: theme("colors.gray.50"),
        },

        // Form components
        ".form-group": {
          marginBottom: "1.5rem",
        },

        ".form-label": {
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: theme("fontWeight.medium"),
          color: theme("colors.gray.700"),
          fontSize: theme("fontSize.sm[0]"),
        },

        ".form-input": {
          width: "100%",
          padding: "0.75rem 1rem",
          border: `1px solid ${theme("colors.gray.300")}`,
          borderRadius: theme("borderRadius.lg"),
          backgroundColor: theme("colors.white"),
          color: theme("colors.gray.900"),
          fontSize: theme("fontSize.sm[0]"),
          transition: "all 0.2s ease-in-out",

          "&:focus": {
            outline: "none",
            borderColor: theme("colors.primary.500"),
            boxShadow: `0 0 0 3px rgba(59, 130, 246, 0.1)`,
          },

          "&::placeholder": {
            color: theme("colors.gray.400"),
          },
        },

        // Badge components
        ".badge": {
          display: "inline-flex",
          alignItems: "center",
          padding: "0.25rem 0.75rem",
          borderRadius: theme("borderRadius.full"),
          fontSize: theme("fontSize.xs[0]"),
          fontWeight: theme("fontWeight.medium"),
          textTransform: "uppercase",
          letterSpacing: "0.025em",
        },

        ".badge-primary": {
          backgroundColor: theme("colors.primary.100"),
          color: theme("colors.primary.800"),
        },

        ".badge-success": {
          backgroundColor: theme("colors.success.100"),
          color: theme("colors.success.800"),
        },

        ".badge-warning": {
          backgroundColor: theme("colors.warning.100"),
          color: theme("colors.warning.800"),
        },

        ".badge-danger": {
          backgroundColor: theme("colors.danger.100"),
          color: theme("colors.danger.800"),
        },

        ".badge-info": {
          backgroundColor: theme("colors.info.100"),
          color: theme("colors.info.800"),
        },
      });
    },
  ],
};
