import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import enTranslations from "./locales/en.json";
import trTranslations from "./locales/tr.json";

const resources = {
  en: {
    translation: enTranslations,
  },
  tr: {
    translation: trTranslations,
  },
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "tr", // Default to Turkish for Turkish market
    lng: "tr", // Default language
    debug: false, // Disable debug to prevent hanging

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },

    react: {
      useSuspense: false, // Critical: disable suspense to prevent hanging
      bindI18n: "languageChanged loaded",
      bindI18nStore: "added removed",
      transEmptyNodeValue: "",
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p"],
    },

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    // Add timeout to prevent hanging
    load: "languageOnly",
    keySeparator: ".",
    nsSeparator: false,

    // Prevent infinite loading
    initImmediate: false,
  })
  .catch((error) => {
    console.error("i18n initialization failed:", error);
  });

export default i18n;
