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

  // Remove useTranslation hook completely - use our own translation fallback
  const t = (key) => {
    // Simple fallback translation function
    const translations = {
      "translationManager.title": "Translation Manager",
      "translationManager.description": "Manage application translations",
      "translationManager.language": "Language",
      "translationManager.search": "Search translations...",
      "translationManager.addNew": "Add New Translation",
      "translationManager.key": "Key",
      "translationManager.value": "Value",
      "translationManager.actions": "Actions",
      "translationManager.edit": "Edit",
      "translationManager.delete": "Delete",
      "translationManager.save": "Save",
      "translationManager.cancel": "Cancel",
      "translationManager.export": "Export",
      "translationManager.import": "Import",
      "common.loading": "Loading...",
      "common.error": "Error",
      "common.success": "Success",
    };
    return translations[key] || key;
  };

  const loadTranslations = React.useCallback(async () => {
    setLoading(true);
    try {
      // Use our translation service instead of i18n directly
      const response = await fetch(`/api/translations/${selectedLanguage}`);
      if (response.ok) {
        const currentTranslations = await response.json();
        if (currentTranslations) {
          setTranslations(flattenObject(currentTranslations));
        }
      } else {
        // Fallback to empty translations
        setTranslations({});
      }
    } catch (error) {
      console.error("Error loading translations:", error);
      // Fallback to empty translations
      setTranslations({});
    } finally {
      setLoading(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  // Don't render if i18n is not ready - after all hooks
  if (!isI18nReady) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "200px" }}
      >
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading translation manager...</p>
        </div>
      </div>
    );
  }

  const saveTranslations = async () => {
    setLoading(true);
    try {
      const unflattened = unflattenObject(translations);

      // Update translations via API instead of i18n directly
      // The translations will be loaded from the server on next refresh

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
        console.warn("Could not save to server, saved locally:", apiError);
      }

      showAlert(t("translationManager.saved"), "success");
    } catch (error) {
      console.error("Error saving translations:", error);
      showAlert(t("translationManager.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await translationService.exportTranslations(selectedLanguage);
      showAlert(t("common.success"), "success");
    } catch (error) {
      console.error("Export error:", error);
      showAlert(t("common.error"), "error");
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      await translationService.importTranslations(selectedLanguage, file);
      await loadTranslations(); // Reload translations
      showAlert(t("common.success"), "success");
    } catch (error) {
      console.error("Import error:", error);
      showAlert(t("common.error"), "error");
    } finally {
      setLoading(false);
      event.target.value = ""; // Reset file input
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
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue("");
  };

  const handleDelete = (key) => {
    if (window.confirm(t("translationManager.deleteConfirm", { key }))) {
      const newTranslations = { ...translations };
      delete newTranslations[key];
      setTranslations(newTranslations);
    }
  };

  const handleAddNew = () => {
    if (newKey && newValue) {
      if (translations[newKey]) {
        showAlert(t("translationManager.keyExists"), "warning");
        return;
      }
      setTranslations((prev) => ({
        ...prev,
        [newKey]: newValue,
      }));
      setNewKey("");
      setNewValue("");
      setShowAddForm(false);
      showAlert(t("translationManager.added"), "success");
    }
  };

  const filteredTranslations = Object.entries(translations).filter(
    ([key, value]) =>
      key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LanguageIcon className="w-8 h-8 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("translationManager.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t("translationManager.subtitle")}
            </p>
          </div>
        </div>

        {/* Super Admin Only Comment */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              {/* TODO: Restrict to super admin only */}
              {t("translationManager.currentlyDevelopment")}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
              {/* Language Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("settings.language.select")}:
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder={t("translationManager.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-translations"
              />
              <label
                htmlFor="import-translations"
                className="inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                <span>{t("common.import")}</span>
              </label>

              <Button
                onClick={handleExport}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <CloudArrowDownIcon className="w-4 h-4" />
                <span>{t("common.export")}</span>
              </Button>

              <Button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>{t("translationManager.addTranslation")}</span>
              </Button>

              <Button
                onClick={saveTranslations}
                disabled={loading}
                variant="success"
                className="flex items-center space-x-2"
              >
                <CheckIcon className="w-4 h-4" />
                <span>
                  {loading
                    ? t("translationManager.saving")
                    : t("translationManager.saveAll")}
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Translation Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("translationManager.addNew")}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("translationManager.translationKey")}
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={t("translationManager.keyPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("translationManager.translationValue")}
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={t("translationManager.valuePlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              <Button onClick={handleAddNew}>
                {t("translationManager.addTranslation")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Translations List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("translationManager.count", {
              count: filteredTranslations.length,
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {t("translationManager.loading")}
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredTranslations.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  {t("translationManager.noTranslations")}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTranslations.map(([key, value]) => (
                    <div
                      key={key}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {key}
                          </div>
                          {editingKey === key ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) =>
                                  setEditingValue(e.target.value)
                                }
                                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                autoFocus
                              />
                              <Button
                                onClick={handleSaveEdit}
                                size="sm"
                                className="p-1"
                              >
                                <CheckIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={handleCancelEdit}
                                size="sm"
                                variant="secondary"
                                className="p-1"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {value}
                            </div>
                          )}
                        </div>

                        {editingKey !== key && (
                          <div className="flex items-center space-x-1 ml-4">
                            <Button
                              onClick={() => handleEdit(key)}
                              size="sm"
                              variant="secondary"
                              className="p-1"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(key)}
                              size="sm"
                              variant="danger"
                              className="p-1"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationManager;
