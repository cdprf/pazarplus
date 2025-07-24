import logger from "../utils/logger";
import React, { createContext, useContext, useState, useEffect } from "react";
import i18n from "../i18n";

const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return default values instead of throwing error to prevent hanging
    return {
      currentLanguage: "tr",
      changeLanguage: () => {},
      supportedLanguages: [
        { code: "tr", name: "Türkçe", flag: "🇹🇷" },
        { code: "en", name: "English", flag: "🇺🇸" },
      ],
      isRTL: false,
      isI18nReady: false,
    };
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("tr");

  useEffect(() => {
    // Simple initialization check
    const checkI18nReady = () => {
      if (i18n && i18n.isInitialized) {
        setIsI18nReady(true);
        setCurrentLanguage(i18n.language || "tr");
        return true;
      }
      return false;
    };

    if (!checkI18nReady()) {
      // If not ready, try again after a short delay
      const timer = setTimeout(checkI18nReady, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isI18nReady) return;

    const savedLanguage = localStorage.getItem("preferred-language");
    if (savedLanguage && savedLanguage !== currentLanguage) {
      setCurrentLanguage(savedLanguage);
      if (i18n && i18n.changeLanguage) {
        i18n.changeLanguage(savedLanguage);
      }
    }
  }, [isI18nReady, currentLanguage]);

  const changeLanguage = async (language) => {
    try {
      setCurrentLanguage(language);
      localStorage.setItem("preferred-language", language);

      if (i18n && i18n.changeLanguage) {
        await i18n.changeLanguage(language);
      }

      document.documentElement.lang = language;
    } catch (error) {
      logger.error("Error changing language:", error);
    }
  };

  const supportedLanguages = [
    { code: "tr", name: "Türkçe", flag: "🇹🇷" },
    { code: "en", name: "English", flag: "🇺🇸" },
  ];

  const value = {
    currentLanguage,
    changeLanguage,
    supportedLanguages,
    isRTL: currentLanguage === "ar",
    isI18nReady,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
