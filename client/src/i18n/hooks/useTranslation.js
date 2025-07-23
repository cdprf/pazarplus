import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TranslationUtils } from '../utils/translationUtils';
import i18n from '../index';

/**
 * Enhanced translation hook with better error handling and caching
 */
export const useTranslation = (namespace = null) => {
  const { currentLanguage, isI18nReady } = useLanguage();
  const [isReady, setIsReady] = useState(false);
  const [translationCache, setTranslationCache] = useState(new Map());

  useEffect(() => {
    setIsReady(isI18nReady && i18n.isInitialized);
  }, [isI18nReady]);

  // Clear cache when language changes
  useEffect(() => {
    setTranslationCache(new Map());
  }, [currentLanguage]);

  /**
   * Main translation function
   */
  const t = useCallback((key, options = {}, fallback = null) => {
    if (!isReady) {
      return fallback || TranslationUtils.generateFallback(key);
    }

    // Check cache first
    const cacheKey = `${namespace || ''}.${key}.${JSON.stringify(options)}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    let result;
    if (namespace) {
      result = TranslationUtils.tn(namespace, key, options, fallback);
    } else {
      result = TranslationUtils.t(key, options, fallback);
    }

    // Cache the result
    setTranslationCache(prev => {
      const newCache = new Map(prev);
      newCache.set(cacheKey, result);
      
      // Limit cache size to prevent memory leaks
      if (newCache.size > 1000) {
        const firstKey = newCache.keys().next().value;
        newCache.delete(firstKey);
      }
      
      return newCache;
    });

    return result;
  }, [isReady, namespace, translationCache]);

  /**
   * Plural translation function
   */
  const tp = useCallback((key, count, options = {}, fallback = null) => {
    return t(key, { ...options, count }, fallback);
  }, [t]);

  /**
   * Translation with interpolation
   */
  const ti = useCallback((key, interpolations = {}, fallback = null) => {
    return t(key, interpolations, fallback);
  }, [t]);

  /**
   * Common translations shortcut
   */
  const tc = useCallback((key, options = {}, fallback = null) => {
    return TranslationUtils.tc(key, options, fallback);
  }, []);

  /**
   * Business translations shortcut
   */
  const tb = useCallback((key, options = {}, fallback = null) => {
    return TranslationUtils.tb(key, options, fallback);
  }, []);

  /**
   * Navigation translations shortcut
   */
  const tnav = useCallback((key, options = {}, fallback = null) => {
    return TranslationUtils.tnav(key, options, fallback);
  }, []);

  /**
   * Format date with current locale
   */
  const formatDate = useCallback((date, options = {}) => {
    return TranslationUtils.formatDate(date, options);
  }, []);

  /**
   * Format number with current locale
   */
  const formatNumber = useCallback((number, options = {}) => {
    return TranslationUtils.formatNumber(number, options);
  }, []);

  /**
   * Format currency with current locale
   */
  const formatCurrency = useCallback((amount, currency = 'TRY', options = {}) => {
    return TranslationUtils.formatCurrency(amount, currency, options);
  }, []);

  /**
   * Get relative time string
   */
  const getRelativeTime = useCallback((date) => {
    return TranslationUtils.getRelativeTime(date);
  }, []);

  /**
   * Check if key exists
   */
  const exists = useCallback((key) => {
    if (!isReady) return false;
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return TranslationUtils.keyExists(fullKey);
  }, [isReady, namespace]);

  /**
   * Get current language info
   */
  const language = currentLanguage;
  const isRTL = TranslationUtils.isRTL();
  const textDirection = TranslationUtils.getTextDirection();

  return {
    t,
    tp,
    ti,
    tc,
    tb,
    tnav,
    formatDate,
    formatNumber,
    formatCurrency,
    getRelativeTime,
    exists,
    language,
    isRTL,
    textDirection,
    isReady,
    namespace
  };
};

/**
 * Hook for specific namespaces
 */
export const useCommonTranslation = () => useTranslation('common');
export const useBusinessTranslation = () => useTranslation('business');
export const useNavigationTranslation = () => useTranslation('navigation');

/**
 * Hook for translation management (admin features)
 */
export const useTranslationManager = () => {
  const { currentLanguage } = useLanguage();
  const [missingKeys, setMissingKeys] = useState([]);

  const getMissingKeys = useCallback(() => {
    return TranslationUtils.getMissingKeys();
  }, []);

  const clearMissingKeys = useCallback(() => {
    TranslationUtils.clearMissingKeys();
    setMissingKeys([]);
  }, []);

  const validateTranslations = useCallback((language, referenceTranslations) => {
    return TranslationUtils.validateTranslations(language, referenceTranslations);
  }, []);

  const exportMissingKeys = useCallback(() => {
    const missing = getMissingKeys();
    const data = JSON.stringify(missing, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `missing-keys-${currentLanguage}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentLanguage, getMissingKeys]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMissingKeys(getMissingKeys());
    }, 5000); // Check for missing keys every 5 seconds

    return () => clearInterval(interval);
  }, [getMissingKeys]);

  return {
    missingKeys,
    getMissingKeys,
    clearMissingKeys,
    validateTranslations,
    exportMissingKeys,
    currentLanguage
  };
};
