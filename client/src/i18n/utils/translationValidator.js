import { commonTranslations } from '../namespaces/common';
import { businessTranslations } from '../namespaces/business';
import { navigationTranslations } from '../namespaces/navigation';

/**
 * Translation validation and management tools
 */
export class TranslationValidator {
  constructor() {
    this.supportedLanguages = ['tr', 'en'];
    this.requiredNamespaces = ['common', 'business', 'navigation'];
    this.allTranslations = {
      common: commonTranslations,
      business: businessTranslations,
      navigation: navigationTranslations
    };
  }

  /**
   * Validate all translations for completeness
   * @returns {object} Validation results
   */
  validateAll() {
    const results = {
      summary: {
        totalKeys: 0,
        translatedKeys: 0,
        missingKeys: 0,
        completionPercentage: 0
      },
      languages: {},
      missingKeys: {},
      extraKeys: {},
      recommendations: []
    };

    this.supportedLanguages.forEach(lang => {
      results.languages[lang] = this.validateLanguage(lang);
      results.missingKeys[lang] = results.languages[lang].missing;
      results.extraKeys[lang] = results.languages[lang].extra;
    });

    // Calculate summary
    const allLanguageResults = Object.values(results.languages);
    results.summary.totalKeys = Math.max(...allLanguageResults.map(r => r.total));
    results.summary.translatedKeys = Math.min(...allLanguageResults.map(r => r.translated));
    results.summary.missingKeys = Math.max(...allLanguageResults.map(r => r.missing.length));
    results.summary.completionPercentage = results.summary.totalKeys > 0 
      ? (results.summary.translatedKeys / results.summary.totalKeys) * 100 
      : 0;

    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  /**
   * Validate specific language
   * @param {string} language - Language code
   * @returns {object} Validation result
   */
  validateLanguage(language) {
    const result = {
      language,
      total: 0,
      translated: 0,
      missing: [],
      extra: [],
      namespaces: {}
    };

    this.requiredNamespaces.forEach(namespace => {
      const namespaceResult = this.validateNamespace(language, namespace);
      result.namespaces[namespace] = namespaceResult;
      result.total += namespaceResult.total;
      result.translated += namespaceResult.translated;
      result.missing.push(...namespaceResult.missing.map(key => `${namespace}.${key}`));
      result.extra.push(...namespaceResult.extra.map(key => `${namespace}.${key}`));
    });

    result.percentage = result.total > 0 ? (result.translated / result.total) * 100 : 0;

    return result;
  }

  /**
   * Validate specific namespace
   * @param {string} language - Language code
   * @param {string} namespace - Namespace name
   * @returns {object} Validation result
   */
  validateNamespace(language, namespace) {
    const result = {
      namespace,
      language,
      total: 0,
      translated: 0,
      missing: [],
      extra: []
    };

    if (!this.allTranslations[namespace]) {
      console.warn(`Unknown namespace: ${namespace}`);
      return result;
    }

    const referenceLanguage = 'en'; // Use English as reference
    const reference = this.allTranslations[namespace][referenceLanguage];
    const target = this.allTranslations[namespace][language];

    if (!reference || !target) {
      console.warn(`Missing translations for namespace: ${namespace}, language: ${language}`);
      return result;
    }

    this.compareTranslationObjects(reference, target, result);

    result.percentage = result.total > 0 ? (result.translated / result.total) * 100 : 0;

    return result;
  }

  /**
   * Recursively compare translation objects
   * @param {object} reference - Reference translations
   * @param {object} target - Target translations
   * @param {object} result - Result object to populate
   * @param {string} path - Current path
   */
  compareTranslationObjects(reference, target, result, path = '') {
    for (const key in reference) {
      const currentPath = path ? `${path}.${key}` : key;
      result.total++;

      if (typeof reference[key] === 'object' && reference[key] !== null) {
        if (!target[key] || typeof target[key] !== 'object') {
          result.missing.push(currentPath);
        } else {
          this.compareTranslationObjects(reference[key], target[key], result, currentPath);
        }
      } else {
        if (target[key] === undefined || target[key] === null || target[key] === '') {
          result.missing.push(currentPath);
        } else {
          result.translated++;
        }
      }
    }

    // Check for extra keys
    for (const key in target) {
      const currentPath = path ? `${path}.${key}` : key;
      if (reference[key] === undefined) {
        result.extra.push(currentPath);
      }
    }
  }

  /**
   * Generate recommendations based on validation results
   * @param {object} results - Validation results
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check completion percentage
    if (results.summary.completionPercentage < 100) {
      recommendations.push({
        type: 'warning',
        message: `Translation completion is at ${results.summary.completionPercentage.toFixed(1)}%. Consider completing missing translations.`,
        action: 'complete_translations'
      });
    }

    // Check for languages with many missing keys
    Object.entries(results.languages).forEach(([lang, langResult]) => {
      if (langResult.missing.length > 10) {
        recommendations.push({
          type: 'error',
          message: `Language "${lang}" has ${langResult.missing.length} missing translation keys.`,
          action: 'translate_language',
          data: { language: lang, missingCount: langResult.missing.length }
        });
      }

      if (langResult.extra.length > 5) {
        recommendations.push({
          type: 'info',
          message: `Language "${lang}" has ${langResult.extra.length} extra keys that might be unused.`,
          action: 'review_extra_keys',
          data: { language: lang, extraCount: langResult.extra.length }
        });
      }
    });

    // Check for namespace-specific issues
    this.requiredNamespaces.forEach(namespace => {
      const namespaceResults = this.supportedLanguages.map(lang => 
        results.languages[lang].namespaces[namespace]
      );

      const avgCompletion = namespaceResults.reduce((sum, ns) => sum + ns.percentage, 0) / namespaceResults.length;

      if (avgCompletion < 80) {
        recommendations.push({
          type: 'warning',
          message: `Namespace "${namespace}" has low completion rate (${avgCompletion.toFixed(1)}%). Consider prioritizing this area.`,
          action: 'focus_namespace',
          data: { namespace, completion: avgCompletion }
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate missing translation template
   * @param {string} language - Target language
   * @returns {object} Translation template
   */
  generateMissingTemplate(language) {
    const result = this.validateLanguage(language);
    const template = {};

    result.missing.forEach(key => {
      this.setNestedValue(template, key, `[MISSING: ${key}]`);
    });

    return template;
  }

  /**
   * Set nested value in object
   * @param {object} obj - Target object
   * @param {string} path - Dot-separated path
   * @param {any} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Export validation report
   * @param {string} format - Export format ('json', 'csv', 'html')
   * @returns {string} Formatted report
   */
  exportReport(format = 'json') {
    const results = this.validateAll();

    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);
      
      case 'csv':
        return this.generateCSVReport(results);
      
      case 'html':
        return this.generateHTMLReport(results);
      
      default:
        return JSON.stringify(results, null, 2);
    }
  }

  /**
   * Generate CSV report
   * @param {object} results - Validation results
   * @returns {string} CSV content
   */
  generateCSVReport(results) {
    const lines = ['Language,Namespace,Total Keys,Translated,Missing,Completion %'];

    Object.entries(results.languages).forEach(([lang, langResult]) => {
      Object.entries(langResult.namespaces).forEach(([namespace, nsResult]) => {
        lines.push([
          lang,
          namespace,
          nsResult.total,
          nsResult.translated,
          nsResult.missing.length,
          nsResult.percentage.toFixed(1)
        ].join(','));
      });
    });

    return lines.join('\n');
  }

  /**
   * Generate HTML report
   * @param {object} results - Validation results
   * @returns {string} HTML content
   */
  generateHTMLReport(results) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Translation Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .language { margin-bottom: 20px; }
        .namespace { margin-left: 20px; margin-bottom: 10px; }
        .progress { width: 100%; height: 20px; background: #ddd; border-radius: 10px; overflow: hidden; }
        .progress-bar { height: 100%; background: #4caf50; transition: width 0.3s; }
        .missing-keys { max-height: 200px; overflow-y: auto; background: #fff; border: 1px solid #ddd; padding: 10px; }
        .recommendation { padding: 10px; margin: 5px 0; border-radius: 3px; }
        .recommendation.error { background: #ffebee; border-left: 4px solid #f44336; }
        .recommendation.warning { background: #fff3e0; border-left: 4px solid #ff9800; }
        .recommendation.info { background: #e3f2fd; border-left: 4px solid #2196f3; }
    </style>
</head>
<body>
    <h1>Translation Validation Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Keys: ${results.summary.totalKeys}</p>
        <p>Translated Keys: ${results.summary.translatedKeys}</p>
        <p>Missing Keys: ${results.summary.missingKeys}</p>
        <p>Completion: ${results.summary.completionPercentage.toFixed(1)}%</p>
        <div class="progress">
            <div class="progress-bar" style="width: ${results.summary.completionPercentage}%"></div>
        </div>
    </div>

    <h2>Languages</h2>
    ${Object.entries(results.languages).map(([lang, langResult]) => `
        <div class="language">
            <h3>${lang.toUpperCase()} (${langResult.percentage.toFixed(1)}% complete)</h3>
            ${Object.entries(langResult.namespaces).map(([namespace, nsResult]) => `
                <div class="namespace">
                    <h4>${namespace}: ${nsResult.translated}/${nsResult.total} (${nsResult.percentage.toFixed(1)}%)</h4>
                    <div class="progress">
                        <div class="progress-bar" style="width: ${nsResult.percentage}%"></div>
                    </div>
                    ${nsResult.missing.length > 0 ? `
                        <details>
                            <summary>Missing Keys (${nsResult.missing.length})</summary>
                            <div class="missing-keys">
                                ${nsResult.missing.map(key => `<div>${key}</div>`).join('')}
                            </div>
                        </details>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}

    <h2>Recommendations</h2>
    ${results.recommendations.map(rec => `
        <div class="recommendation ${rec.type}">
            <strong>${rec.type.toUpperCase()}</strong>: ${rec.message}
        </div>
    `).join('')}

    <p><small>Generated on ${new Date().toLocaleString()}</small></p>
</body>
</html>
    `;
  }
}

export default TranslationValidator;
