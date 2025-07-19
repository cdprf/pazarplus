const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");

// TODO: Add super admin authentication middleware
// const { requireSuperAdmin } = require('../middleware/auth');

// Translation file paths
const TRANSLATION_DIR = path.join(__dirname, "../../client/src/i18n/locales");
const SUPPORTED_LANGUAGES = ["en", "tr"];

/**
 * Get all translations for a specific language
 */
router.get("/:language", async (req, res) => {
  try {
    const { language } = req.params;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language",
      });
    }

    const filePath = path.join(TRANSLATION_DIR, `${language}.json`);
    const fileContent = await fs.readFile(filePath, "utf8");
    const translations = JSON.parse(fileContent);

    res.json({
      success: true,
      data: {
        language,
        translations,
      },
    });
  } catch (error) {
    console.error("Error loading translations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load translations",
    });
  }
});

/**
 * Update translations for a specific language
 * TODO: Restrict to super admin only
 */
router.put("/:language", async (req, res) => {
  try {
    const { language } = req.params;
    const { translations } = req.body;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language",
      });
    }

    if (!translations || typeof translations !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid translations data",
      });
    }

    const filePath = path.join(TRANSLATION_DIR, `${language}.json`);

    // Create backup
    const backupPath = path.join(
      TRANSLATION_DIR,
      `${language}.backup.${Date.now()}.json`
    );
    try {
      const currentContent = await fs.readFile(filePath, "utf8");
      await fs.writeFile(backupPath, currentContent);
    } catch (error) {
      console.warn("Could not create backup:", error);
    }

    // Write new translations
    await fs.writeFile(filePath, JSON.stringify(translations, null, 2));

    res.json({
      success: true,
      message: "Translations updated successfully",
      data: {
        language,
        backupPath,
      },
    });
  } catch (error) {
    console.error("Error updating translations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update translations",
    });
  }
});

/**
 * Get list of supported languages
 */
router.get("/", async (req, res) => {
  try {
    const languages = [];

    for (const lang of SUPPORTED_LANGUAGES) {
      const filePath = path.join(TRANSLATION_DIR, `${lang}.json`);
      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, "utf8");
        const translations = JSON.parse(content);

        // Count translations (flatten object)
        const flatCount = countTranslations(translations);

        languages.push({
          code: lang,
          name: getLanguageName(lang),
          flag: getLanguageFlag(lang),
          lastModified: stats.mtime,
          translationCount: flatCount,
        });
      } catch (error) {
        console.warn(`Could not load language ${lang}:`, error);
      }
    }

    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    console.error("Error listing languages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list languages",
    });
  }
});

/**
 * Add a new translation key-value pair
 * TODO: Restrict to super admin only
 */
router.post("/:language/keys", async (req, res) => {
  try {
    const { language } = req.params;
    const { key, value } = req.body;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language",
      });
    }

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        message: "Key and value are required",
      });
    }

    const filePath = path.join(TRANSLATION_DIR, `${language}.json`);
    const fileContent = await fs.readFile(filePath, "utf8");
    const translations = JSON.parse(fileContent);

    // Set nested key
    setNestedKey(translations, key, value);

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(translations, null, 2));

    res.json({
      success: true,
      message: "Translation key added successfully",
      data: {
        language,
        key,
        value,
      },
    });
  } catch (error) {
    console.error("Error adding translation key:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add translation key",
    });
  }
});

/**
 * Delete a translation key
 * TODO: Restrict to super admin only
 */
router.delete("/:language/keys/:key", async (req, res) => {
  try {
    const { language, key } = req.params;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported language",
      });
    }

    const filePath = path.join(TRANSLATION_DIR, `${language}.json`);
    const fileContent = await fs.readFile(filePath, "utf8");
    const translations = JSON.parse(fileContent);

    // Delete nested key
    const deleted = deleteNestedKey(translations, key);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Translation key not found",
      });
    }

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(translations, null, 2));

    res.json({
      success: true,
      message: "Translation key deleted successfully",
      data: {
        language,
        key,
      },
    });
  } catch (error) {
    console.error("Error deleting translation key:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete translation key",
    });
  }
});

// Helper functions
function countTranslations(obj, count = 0) {
  for (let key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      count = countTranslations(obj[key], count);
    } else {
      count++;
    }
  }
  return count;
}

function getLanguageName(code) {
  const names = {
    en: "English",
    tr: "Türkçe",
  };
  return names[code] || code;
}

function getLanguageFlag(code) {
  const flags = {
    en: "🇺🇸",
    tr: "🇹🇷",
  };
  return flags[code] || "🌐";
}

function setNestedKey(obj, key, value) {
  const keys = key.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

function deleteNestedKey(obj, key) {
  const keys = key.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      return false;
    }
    current = current[keys[i]];
  }

  if (current[keys[keys.length - 1]] !== undefined) {
    delete current[keys[keys.length - 1]];
    return true;
  }

  return false;
}

module.exports = router;
