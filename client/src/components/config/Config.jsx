import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/hooks/useTranslation";
import {
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
  GlobeAltIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BoltIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import { useAlert } from "../../contexts/AlertContext";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { Button } from "../ui/Button";
import logger from "../../utils/logger.js";

const Config = () => {
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  // Application settings state
  const [appSettings, setAppSettings] = useState({
    theme: "auto",
    language: "tr",
    currency: "TRY",
    timezone: "Europe/Istanbul",
    autoSync: true,
    compactMode: false,
    animations: true,
    enableDeveloperMode: false,
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("appSettings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setAppSettings((prev) => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      logger.error("Failed to load app settings:", error);
    }
  }, []);

  const handleAppSettingsUpdate = async () => {
    setLoading(true);

    try {
      // Save to localStorage for now (until backend API is implemented)
      localStorage.setItem("appSettings", JSON.stringify(appSettings));
      showAlert(t("config.settingsUpdated"), "success");

      // Apply theme change immediately if supported
      if (appSettings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (appSettings.theme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        // Auto theme - check system preference
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        if (prefersDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }

      // Apply language change if it changed
      const currentLanguage = localStorage.getItem("i18nextLng") || "tr";
      if (appSettings.language !== currentLanguage) {
        // Save the new language preference first
        localStorage.setItem("i18nextLng", appSettings.language);
        // Add a small delay to prevent rapid reloads
        setTimeout(() => {
          window.location.reload();
        }, 500);
        return; // Exit early to prevent other operations
      }
    } catch (error) {
      logger.error("App settings save error:", error);
      showAlert(t("config.settingsUpdateError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const getThemeIcon = (theme) => {
    switch (theme) {
      case "light":
        return SunIcon;
      case "dark":
        return MoonIcon;
      case "auto":
        return ComputerDesktopIcon;
      default:
        return ComputerDesktopIcon;
    }
  };

  const ThemeIcon = getThemeIcon(appSettings.theme);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center">
            <div className="stat-icon stat-icon-primary mr-4">
              <Cog6ToothIcon className="h-8 w-8" />
            </div>
            {t("config.title")}
          </h1>
          <p className="page-subtitle">{t("config.subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="appearance"
            className="flex items-center space-x-2"
          >
            <SunIcon className="h-4 w-4" />
            <span>{t("config.appearance.title")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="localization"
            className="flex items-center space-x-2"
          >
            <GlobeAltIcon className="h-4 w-4" />
            <span>{t("config.localization.title")}</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center space-x-2">
            <BoltIcon className="h-4 w-4" />
            <span>{t("config.behavior.title")}</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <CommandLineIcon className="h-4 w-4" />
            <span>{t("config.advanced.title")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Configuration */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SunIcon className="w-5 h-5 mr-2 text-yellow-600" />
                {t("config.appearance.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("config.appearance.theme")}
                </label>
                <div className="relative">
                  <select
                    value={appSettings.theme}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        theme: e.target.value,
                      })
                    }
                    className="form-input pl-10"
                  >
                    <option value="light">
                      {t("config.appearance.lightTheme")}
                    </option>
                    <option value="dark">
                      {t("config.appearance.darkTheme")}
                    </option>
                    <option value="auto">
                      {t("config.appearance.autoTheme")}
                    </option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ThemeIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("config.appearance.themeDescription")}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {t("config.appearance.visualSettings")}
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t("config.appearance.compactMode")}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("config.appearance.compactModeDescription")}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appSettings.compactMode}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          compactMode: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t("config.appearance.animations")}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("config.appearance.animationsDescription")}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appSettings.animations}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          animations: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Localization Configuration */}
        <TabsContent value="localization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GlobeAltIcon className="w-5 h-5 mr-2 text-blue-600" />
                {t("config.localization.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("config.localization.language")}
                  </label>
                  <select
                    value={appSettings.language}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        language: e.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("config.localization.languageDescription")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("config.localization.currency")}
                  </label>
                  <div className="relative">
                    <select
                      value={appSettings.currency}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          currency: e.target.value,
                        })
                      }
                      className="form-input pl-10"
                    >
                      <option value="TRY">TRY - Türk Lirası</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("config.localization.currencyDescription")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("config.localization.timezone")}
                  </label>
                  <div className="relative">
                    <select
                      value={appSettings.timezone}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          timezone: e.target.value,
                        })
                      }
                      className="form-input pl-10"
                    >
                      <option value="Europe/Istanbul">
                        Europe/Istanbul (GMT+3)
                      </option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York">
                        America/New_York (GMT-5)
                      </option>
                      <option value="Europe/London">
                        Europe/London (GMT+0)
                      </option>
                      <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("config.localization.timezoneDescription")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Configuration */}
        <TabsContent value="behavior">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BoltIcon className="w-5 h-5 mr-2 text-green-600" />
                {t("config.behavior.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t("config.behavior.systemBehavior")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t("config.behavior.autoSync")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("config.behavior.autoSyncDescription")}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appSettings.autoSync}
                        onChange={(e) =>
                          setAppSettings({
                            ...appSettings,
                            autoSync: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Configuration */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CommandLineIcon className="w-5 h-5 mr-2 text-purple-600" />
                {t("config.advanced.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("config.advanced.developerMode")}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("config.advanced.developerModeDescription")}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appSettings.enableDeveloperMode}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        enableDeveloperMode: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleAppSettingsUpdate}
          variant="primary"
          icon={CheckIcon}
          loading={loading}
        >
          {t("config.saveSettings")}
        </Button>
      </div>
    </div>
  );
};

export default Config;
