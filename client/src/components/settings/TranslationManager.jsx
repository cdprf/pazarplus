import logger from "../../utils/logger.js";
import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Card, CardHeader, CardTitle, CardContent, Button } from "../ui";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  LanguageIcon,
  ExclamationTriangleIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useAlert } from "../../contexts/AlertContext";
import translationService from "../../services/api/translationService";

const flattenObject = (obj, prefix = "") => {
  const flattened = {};
  for (let key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}.`));
    } else {
      flattened[`${prefix}${key}`] = obj[key];
    }
  }
  return flattened;
};

const unflattenObject = (flattened) => {
  const result = {};
  for (let key in flattened) {
    const keys = key.split(".");
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = flattened[key];
  }
  return result;
};

const TranslationManager = () => {
  const { supportedLanguages, currentLanguage, isI18nReady } = useLanguage();
  const { showAlert } = useAlert();

  // Always call all hooks first - before any early returns
  const [translations, setTranslations] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Complete translation function with all required keys
  const t = (key, params = {}) => {
    const translations = {
      "translationManager.title": "Translation Manager",
      "translationManager.subtitle":
        "Manage and edit translations for different languages",
      "translationManager.description": "Manage application translations",
      "translationManager.language": "Language",
      "translationManager.search": "Search translations...",
      "translationManager.searchPlaceholder": "Search by key or value...",
      "translationManager.addNew": "Add New Translation",
      "translationManager.addTranslation": "Add Translation",
      "translationManager.key": "Key",
      "translationManager.value": "Value",
      "translationManager.translationKey": "Translation Key",
      "translationManager.translationValue": "Translation Value",
      "translationManager.keyPlaceholder": "e.g., common.save",
      "translationManager.valuePlaceholder": "Enter translation value",
      "translationManager.actions": "Actions",
      "translationManager.edit": "Edit",
      "translationManager.delete": "Delete",
      "translationManager.save": "Save",
      "translationManager.cancel": "Cancel",
      "translationManager.export": "Export",
      "translationManager.import": "Import",
      "translationManager.saveAll": "Save All",
      "translationManager.saving": "Saving...",
      "translationManager.loading": "Loading translations...",
      "translationManager.saved": "Translations saved successfully",
      "translationManager.added": "Translation added successfully",
      "translationManager.deleted": "Translation deleted successfully",
      "translationManager.error": "Failed to save translations",
      "translationManager.keyExists": "Translation key already exists",
      "translationManager.deleteConfirm":
        "Are you sure you want to delete this translation? This action cannot be undone.",
      "translationManager.noTranslations":
        "No translations found. Try adjusting your search or add a new translation.",
      "translationManager.count": "Translations ({count})",
      "translationManager.currentlyDevelopment":
        "Development Mode - Changes saved locally",
      "translationManager.invalidKeyFormat":
        "Invalid key format. Use only letters, numbers, dots, underscores, and hyphens.",
      "translationManager.fileTooLarge": "File too large. Maximum size is 5MB",
      "translationManager.invalidFileType": "Please select a valid JSON file",
      "translationManager.importSuccess": "Translations imported successfully",
      "translationManager.importFailed": "Import failed",
      "translationManager.exportSuccess": "Translations exported successfully",
      "translationManager.exportFailed": "Export failed",
      "translationManager.provideBothKeyValue":
        "Please provide both key and value",
      "translationManager.clearSearch": "Clear search",
      "translationManager.addFirstTranslation": "Add First Translation",
      "translationManager.keyHelp":
        "Use dot notation for nested keys (e.g., menu.file.save)",
      "translationManager.required": "required",
      "settings.language.select": "Language",
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
      "common.cancel": "Cancel",
      "common.import": "Import",
      "common.export": "Export",
    };

    let result = translations[key] || key;

    // Simple parameter substitution
    if (params && typeof result === "string") {
      Object.keys(params).forEach((param) => {
        result = result.replace(`{${param}}`, params[param]);
      });
    }

    return result;
  };

  const loadTranslations = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/translations/${selectedLanguage}`);
      if (response.ok) {
        const currentTranslations = await response.json();
        if (currentTranslations) {
          setTranslations(flattenObject(currentTranslations));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.error(
          `Failed to load translations: ${response.status}`,
          errorData
        );
        showAlert(
          `Failed to load translations: ${response.statusText}`,
          "error"
        );
        setTranslations({});
      }
    } catch (error) {
      logger.error("Error loading translations:", error);
      showAlert("Failed to load translations. Please try again.", "error");
      setTranslations({});
    } finally {
      setLoading(false);
    }
  }, [selectedLanguage, showAlert]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  const saveTranslations = async () => {
    setLoading(true);
    try {
      const unflattened = unflattenObject(translations);

      // Save to localStorage as backup (in production, this should be saved to server)
      localStorage.setItem(
        `translations_${selectedLanguage}`,
        JSON.stringify(unflattened)
      );

      // TODO: Implement server-side API call for super admin
      try {
        await translationService.updateTranslations(
          selectedLanguage,
          unflattened
        );
      } catch (apiError) {
        logger.warn("Could not save to server, saved locally:", apiError);
      }

      showAlert(t("translationManager.saved"), "success");
    } catch (error) {
      logger.error("Error saving translations:", error);
      showAlert(t("translationManager.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await translationService.exportTranslations(selectedLanguage);
      showAlert(t("translationManager.exportSuccess"), "success");
    } catch (error) {
      logger.error("Export error:", error);
      showAlert(t("translationManager.exportFailed"), "error");
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.name.endsWith(".json")) {
      showAlert(t("translationManager.invalidFileType"), "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      showAlert(t("translationManager.fileTooLarge"), "error");
      return;
    }

    try {
      setLoading(true);
      await translationService.importTranslations(selectedLanguage, file);
      await loadTranslations();
      showAlert(t("translationManager.importSuccess"), "success");
    } catch (error) {
      logger.error("Import error:", error);
      showAlert(
        `${t("translationManager.importFailed")}: ${error.message}`,
        "error"
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleEdit = (key) => {
    setEditingKey(key);
    setEditingValue(translations[key]);
  };

  const handleSaveEdit = () => {
    setTranslations((prev) => ({
      ...prev,
      [editingKey]: editingValue,
    }));
    setEditingKey(null);
    setEditingValue("");
    showAlert(t("translationManager.saved"), "success");
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue("");
  };

  const handleDelete = (key) => {
    if (window.confirm(t("translationManager.deleteConfirm"))) {
      setTranslations((prev) => {
        const newTranslations = { ...prev };
        delete newTranslations[key];
        return newTranslations;
      });
      showAlert(t("translationManager.deleted"), "success");
    }
  };

  const handleAddNew = () => {
    if (newKey && newValue) {
      // Add validation for key format
      const keyRegex = /^[a-zA-Z0-9._-]+$/;
      if (!keyRegex.test(newKey)) {
        showAlert(t("translationManager.invalidKeyFormat"), "error");
        return;
      }

      // Prevent XSS by sanitizing values
      const sanitizedValue = newValue.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ""
      );

      if (translations[newKey]) {
        showAlert(t("translationManager.keyExists"), "warning");
        return;
      }

      setTranslations((prev) => ({
        ...prev,
        [newKey]: sanitizedValue,
      }));
      setNewKey("");
      setNewValue("");
      setShowAddForm(false);
      showAlert(t("translationManager.added"), "success");
    } else {
      showAlert(t("translationManager.provideBothKeyValue"), "error");
    }
  };

  // Optimize filtering with useMemo
  const filteredTranslations = React.useMemo(() => {
    if (!searchTerm) return Object.entries(translations);

    const lowerSearchTerm = searchTerm.toLowerCase();
    return Object.entries(translations).filter(
      ([key, value]) =>
        key.toLowerCase().includes(lowerSearchTerm) ||
        String(value).toLowerCase().includes(lowerSearchTerm)
    );
  }, [translations, searchTerm]);

  // Don't render if i18n is not ready - after all hooks
  if (!isI18nReady) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Loading translation manager...
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Initializing language system
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      role="main"
      aria-labelledby="translation-manager-title"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <LanguageIcon
            className="w-8 h-8 text-indigo-600"
            aria-hidden="true"
          />
          <div>
            <h1
              id="translation-manager-title"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              {t("translationManager.title")}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t("translationManager.subtitle")}
            </p>
          </div>
        </div>

        {/* Super Admin Only Comment */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
              aria-hidden="true"
            />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              {t("translationManager.currentlyDevelopment")}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="flex items-center space-x-2 min-w-fit">
                  <label
                    htmlFor="language-selector"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                  >
                    {t("settings.language.select")}:
                  </label>
                  <select
                    id="language-selector"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="min-w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    aria-label="Select language to manage"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t("translationManager.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    aria-label="Search translations"
                    role="searchbox"
                  />
                  {searchTerm && (
                    <Button
                      onClick={() => setSearchTerm("")}
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={t("translationManager.clearSearch")}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    id="import-translations"
                    aria-describedby="import-help"
                  />
                  <label
                    htmlFor="import-translations"
                    className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 min-h-[44px]"
                  >
                    <CloudArrowUpIcon className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">
                      {t("common.import")}
                    </span>
                    <span className="sr-only">
                      Import translations from JSON file
                    </span>
                  </label>

                  <Button
                    onClick={handleExport}
                    variant="secondary"
                    className="flex items-center space-x-2 min-h-[44px]"
                    aria-label="Export translations to JSON file"
                  >
                    <CloudArrowDownIcon
                      className="w-4 h-4"
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">
                      {t("common.export")}
                    </span>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center space-x-2 min-h-[44px]"
                    aria-label="Add new translation"
                  >
                    <PlusIcon className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">
                      {t("translationManager.addTranslation")}
                    </span>
                  </Button>

                  <Button
                    onClick={saveTranslations}
                    disabled={loading}
                    variant="success"
                    className="flex items-center space-x-2 min-h-[44px]"
                    aria-label={
                      loading ? "Saving translations" : "Save all translations"
                    }
                  >
                    {loading ? (
                      <div
                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
                        aria-hidden="true"
                      ></div>
                    ) : (
                      <CheckIcon className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                      {loading
                        ? t("translationManager.saving")
                        : t("translationManager.saveAll")}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <p
              id="import-help"
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              Import: Select a JSON file with translation data. Export: Download
              current translations as JSON.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add New Translation Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("translationManager.addNew")}</span>
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setNewKey("");
                  setNewValue("");
                }}
                variant="ghost"
                size="sm"
                aria-label="Close form"
              >
                <XMarkIcon className="w-5 h-5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="translation-key"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t("translationManager.translationKey")}{" "}
                  <span
                    className="text-red-500"
                    aria-label={t("translationManager.required")}
                  >
                    *
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="translation-key"
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={t("translationManager.keyPlaceholder")}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      newKey && translations[newKey]
                        ? "border-red-300 bg-red-50 dark:bg-red-900/20"
                        : "border-gray-300"
                    }`}
                    aria-describedby={
                      newKey && translations[newKey] ? "key-error" : "key-help"
                    }
                    required
                  />
                  {newKey && translations[newKey] && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    </div>
                  )}
                </div>
                {newKey && translations[newKey] ? (
                  <p
                    id="key-error"
                    className="text-sm text-red-600 dark:text-red-400 mt-1"
                  >
                    {t("translationManager.keyExists")}
                  </p>
                ) : (
                  <p id="key-help" className="text-xs text-gray-500 mt-1">
                    {t("translationManager.keyHelp")}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="translation-value"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t("translationManager.translationValue")}{" "}
                  <span
                    className="text-red-500"
                    aria-label={t("translationManager.required")}
                  >
                    *
                  </span>
                </label>
                <input
                  id="translation-value"
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={t("translationManager.valuePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setNewKey("");
                  setNewValue("");
                }}
                variant="secondary"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleAddNew}
                disabled={!newKey || !newValue || translations[newKey]}
              >
                {t("translationManager.addTranslation")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Translations List */}
      <Card className="shadow-sm border-0 bg-white dark:bg-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <span>Translations</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                {filteredTranslations.length}
              </span>
            </CardTitle>
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm("")}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
                aria-label={t("translationManager.clearSearch")}
              >
                {t("translationManager.clearSearch")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("translationManager.loading")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This may take a few seconds
                  </p>
                </div>
              </div>
            </div>
          ) : filteredTranslations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <LanguageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {searchTerm
                      ? "No translations found"
                      : "No translations yet"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {searchTerm
                      ? `No translations match "${searchTerm}". Try a different search term.`
                      : "Get started by adding your first translation."}
                  </p>
                </div>
                {!searchTerm && (
                  <Button onClick={() => setShowAddForm(true)} className="mt-2">
                    {t("translationManager.addFirstTranslation")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTranslations.map(([key, value]) => (
                  <div
                    key={key}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white mb-1 break-all">
                          {key}
                        </div>
                        {editingKey === key ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              aria-label={`Edit translation for ${key}`}
                            />
                            <Button
                              onClick={handleSaveEdit}
                              size="sm"
                              className="p-2 min-h-[36px] min-w-[36px]"
                              aria-label="Save changes"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              size="sm"
                              variant="secondary"
                              className="p-2 min-h-[36px] min-w-[36px]"
                              aria-label="Cancel editing"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 dark:text-gray-300 break-words">
                            {value}
                          </div>
                        )}
                      </div>

                      {editingKey !== key && (
                        <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
                          <Button
                            onClick={() => handleEdit(key)}
                            size="sm"
                            variant="secondary"
                            className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"
                            aria-label={`Edit translation for ${key}`}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(key)}
                            size="sm"
                            variant="danger"
                            className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"
                            aria-label={`Delete translation for ${key}`}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationManager;
