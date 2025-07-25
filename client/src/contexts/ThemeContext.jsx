import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check for saved theme preference first
    const savedTheme = localStorage.getItem("pazar-theme");
    if (savedTheme) {
      return savedTheme;
    }

    // For new users, default to light theme regardless of system preference
    // This ensures a consistent experience for first-time visitors
    return "light";
  });

  const [systemTheme, setSystemTheme] = useState("light");

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");

      // If user hasn't set a preference, follow system
      const savedTheme = localStorage.getItem("pazar-theme");
      if (!savedTheme) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Save theme preference
    localStorage.setItem("pazar-theme", theme);

    // Remove existing theme classes
    root.classList.remove("light", "dark");
    body.classList.remove("light-theme", "dark-theme");

    // Add new theme classes
    root.classList.add(theme);
    body.classList.add(`${theme}-theme`);

    // Set data attribute for CSS selectors
    root.setAttribute("data-theme", theme);

    // Set color-scheme for better browser integration
    root.style.colorScheme = theme;

    // Meta theme-color for mobile browsers
    const updateMetaThemeColor = () => {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.name = "theme-color";
        document.head.appendChild(metaThemeColor);
      }

      // Set appropriate theme color
      metaThemeColor.content = theme === "dark" ? "#111827" : "#ffffff";
    };

    updateMetaThemeColor();
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  const setLightTheme = () => setTheme("light");
  const setDarkTheme = () => setTheme("dark");

  const followSystemTheme = () => {
    localStorage.removeItem("pazar-theme");
    setTheme(systemTheme);
  };

  const value = {
    theme,
    systemTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    followSystemTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
    isSystemDark: systemTheme === "dark",
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export default ThemeContext;
