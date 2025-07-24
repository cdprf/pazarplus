import logger from "../utils/logger";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import enTranslations from "./locales/en.json";
import trTranslations from "./locales/tr.json";

// Import enhanced namespace translations
import { commonTranslations } from "./namespaces/common";
import { businessTranslations } from "./namespaces/business";
import { navigationTranslations } from "./namespaces/navigation";

// Merge all translations
const mergeTranslations = (baseTranslations, ...namespaces) => {
  const merged = { ...baseTranslations };

  namespaces.forEach((namespace) => {
    Object.keys(namespace).forEach((key) => {
      merged[key] = { ...merged[key], ...namespace[key] };
    });
  });

  return merged;
};

const resources = {
  en: {
    translation: mergeTranslations(
      enTranslations,
      {
        en: {
          common: commonTranslations.en,
          business: businessTranslations.en,
          navigation: navigationTranslations.en,
        },
      }.en
    ),
  },
  tr: {
    translation: mergeTranslations(
      trTranslations,
      {
        tr: {
          common: commonTranslations.tr,
          business: businessTranslations.tr,
          navigation: navigationTranslations.tr,
        },
      }.tr
    ),
  },
};

// Enhanced i18n configuration with better error handling and performance
const i18nConfig = {
  resources,
  fallbackLng: ["tr", "en"], // Multiple fallback languages
  lng: "tr", // Default language
  debug: process.env.NODE_ENV === "development", // Debug only in development

  interpolation: {
    escapeValue: false, // React already escapes values
    formatSeparator: ",",
    format: function (value, format, lng) {
      // Custom formatting functions
      if (format === "uppercase") return value.toUpperCase();
      if (format === "lowercase") return value.toLowerCase();
      if (format === "currency") {
        const locale = lng === "tr" ? "tr-TR" : "en-US";
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: lng === "tr" ? "TRY" : "USD",
        }).format(value);
      }
      if (format === "date") {
        const locale = lng === "tr" ? "tr-TR" : "en-US";
        return new Intl.DateTimeFormat(locale).format(new Date(value));
      }
      return value;
    },
  },

  detection: {
    order: ["localStorage", "navigator", "htmlTag", "path", "subdomain"],
    caches: ["localStorage"],
    lookupFromPathIndex: 0,
    lookupFromSubdomainIndex: 0,
    checkWhitelist: true,
  },

  react: {
    useSuspense: false, // Critical: disable suspense to prevent hanging
    bindI18n: "languageChanged loaded",
    bindI18nStore: "added removed",
    transEmptyNodeValue: "",
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p", "span", "em", "b"],
    hashTransKey: function (defaultValue) {
      return defaultValue;
    },
    defaultTransParent: "div",
  },

  backend: {
    loadPath: "/locales/{{lng}}/{{ns}}.json",
    addPath: "/locales/add/{{lng}}/{{ns}}",
    allowMultiLoading: false,
    crossDomain: false,
    withCredentials: false,
    reloadInterval: false,
  },

  // Enhanced configuration
  load: "languageOnly",
  keySeparator: ".",
  nsSeparator: ":",
  pluralSeparator: "_",
  contextSeparator: "_",

  // Performance optimizations
  initImmediate: false,
  preload: ["tr", "en"],
  cleanCode: true,

  // Namespace configuration
  defaultNS: "translation",
  fallbackNS: "translation",

  // Missing key handling
  saveMissing: process.env.NODE_ENV === "development",
  missingKeyHandler: function (lng, ns, key, fallbackValue) {
    if (process.env.NODE_ENV === "development") {
      logger.warn(`Missing translation key: ${key} for language: ${lng}`);
    }
  },

  // Custom parsing
  parseMissingKeyHandler: function (key) {
    // Generate human-readable fallback from key
    return key
      .split(".")
      .pop()
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  },

  // Post-processing
  postProcess: ["interval", "plural"],

  // Retry configuration
  retry: {
    times: 3,
    interval: 300,
  },
};

// Initialize i18n with enhanced error handling
const initializeI18n = async () => {
  try {
    await i18n
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init(i18nConfig);

    logger.info("i18n initialized successfully");

    // Add event listeners for language changes
    i18n.on("languageChanged", (lng) => {
      document.documentElement.lang = lng;
      document.documentElement.dir = ["ar", "he", "fa", "ur"].includes(lng)
        ? "rtl"
        : "ltr";
    });

    // Set initial language attributes
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = ["ar", "he", "fa", "ur"].includes(
      i18n.language
    )
      ? "rtl"
      : "ltr";
  } catch (error) {
    logger.error("i18n initialization failed:", error);

    // Fallback initialization with minimal config
    try {
      await i18n.init({
        lng: "tr",
        resources,
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
      });
      logger.info("i18n initialized with fallback configuration");
    } catch (fallbackError) {
      logger.error("i18n fallback initialization failed:", fallbackError);
    }
  }
};

// Initialize
initializeI18n();

export default i18n;
