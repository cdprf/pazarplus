import React, { useState, useEffect, useCallback } from "react";
import {
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  LanguageIcon,
} from "@heroicons/react/24/outline";
import "./SettingsScoped.css";

// Individual setting components
import GeneralSettings from "./GeneralSettings";
import SecuritySettings from "./SecuritySettings";
import NotificationSettings from "./NotificationSettings";
import IntegrationSettings from "./IntegrationSettings";
import InvoiceSettings from "./InvoiceSettings";
import DeveloperSettings from "./DeveloperSettings";
import TranslationManager from "./TranslationManager";

// Translation and alert hooks
const useTranslation = () => ({
  t: (key) => {
    const translations = {
      "settings.title": "Settings",
      "settings.description": "Manage your account settings and preferences",
      "settings.tabs.general": "General",
      "settings.tabs.security": "Security",
      "settings.tabs.notifications": "Notifications",
      "settings.tabs.integrations": "Integrations",
      "settings.tabs.invoice": "Invoice Settings",
      "settings.tabs.developer": "Developer",
      "settings.tabs.translation": "Translations",
      "settings.unsavedChanges": "You have unsaved changes",
      "common.save": "Save Changes",
      "common.saving": "Saving...",
      "common.discard": "Discard Changes",
      "common.cancel": "Cancel",
    };
    return translations[key] || key;
  },
});

const useAlert = () => ({
  showAlert: (message, type) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // In a real app, this would show a toast notification
  },
});

/**
 * Enhanced Settings Wrapper Component
 * Implements comprehensive design system standards and accessibility best practices
 */
const SettingsWrapper = () => {
  const { t } = useTranslation();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({});

  // Settings tabs configuration with enhanced descriptions
  const tabs = [
    {
      id: "general",
      name: t("settings.tabs.general"),
      icon: UserIcon,
      component: GeneralSettings,
      description:
        "Company information, regional settings, and basic preferences",
    },
    {
      id: "security",
      name: t("settings.tabs.security"),
      icon: ShieldCheckIcon,
      component: SecuritySettings,
      description:
        "Password management, two-factor authentication, and security settings",
    },
    {
      id: "notifications",
      name: t("settings.tabs.notifications"),
      icon: BellIcon,
      component: NotificationSettings,
      description:
        "Email alerts, push notifications, and communication preferences",
    },
    {
      id: "integrations",
      name: t("settings.tabs.integrations"),
      icon: CogIcon,
      component: IntegrationSettings,
      description:
        "Platform connections, API management, and third-party services",
    },
    {
      id: "invoice",
      name: t("settings.tabs.invoice"),
      icon: DocumentTextIcon,
      component: InvoiceSettings,
      description:
        "Invoice templates, numbering systems, and financial settings",
    },
    {
      id: "developer",
      name: t("settings.tabs.developer"),
      icon: CodeBracketIcon,
      component: DeveloperSettings,
      description:
        "API keys, webhooks, debugging tools, and developer resources",
    },
    {
      id: "translation",
      name: t("settings.tabs.translation"),
      icon: LanguageIcon,
      component: TranslationManager,
      description:
        "Language settings, translation management, and localization",
    },
  ];

  // Get active component
  const activeTabData = tabs.find((tab) => tab.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  // Handle settings changes with validation
  const handleSettingsChange = useCallback(
    (newSettings) => {
      setSettings((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          ...newSettings,
        },
      }));
      setHasUnsavedChanges(true);
    },
    [activeTab]
  );

  // Save settings with proper error handling
  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call with realistic delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Validate settings before saving
      const currentSettings = settings[activeTab] || {};
      if (Object.keys(currentSettings).length === 0) {
        throw new Error("No changes to save");
      }

      setHasUnsavedChanges(false);
      showAlert("Settings saved successfully!", "success");

      // Announce to screen readers
      const announcement = `Settings saved successfully in ${activeTabData?.name} section`;
      const liveRegion =
        document.querySelector(".sr-live-region") ||
        document.createElement("div");
      liveRegion.className = "sr-live-region";
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.textContent = announcement;
      if (!document.querySelector(".sr-live-region")) {
        document.body.appendChild(liveRegion);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      showAlert(
        error.message || "Failed to save settings. Please try again.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, activeTabData, settings, showAlert]);

  // Discard changes with confirmation
  const handleDiscard = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to discard all unsaved changes?"
    );

    if (confirmed) {
      setSettings((prev) => ({
        ...prev,
        [activeTab]: {},
      }));
      setHasUnsavedChanges(false);
      showAlert("Changes discarded", "info");
    }
  }, [activeTab, showAlert]);

  // Handle tab change with unsaved changes warning
  const handleTabChange = useCallback(
    (tabId) => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(
          "You have unsaved changes. Do you want to discard them and switch tabs?"
        );
        if (!confirmed) return;
        setHasUnsavedChanges(false);
      }
      setActiveTab(tabId);

      // Update URL for better UX
      const url = new URL(window.location);
      url.searchParams.set("tab", tabId);
      window.history.replaceState({}, "", url);
    },
    [hasUnsavedChanges]
  );

  // Enhanced keyboard navigation for tabs
  const handleTabKeyDown = useCallback(
    (e, tabId) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleTabChange(tabId);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
        const nextIndex =
          e.key === "ArrowDown"
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
        handleTabChange(tabs[nextIndex].id);
      } else if (e.key === "Home") {
        e.preventDefault();
        handleTabChange(tabs[0].id);
      } else if (e.key === "End") {
        e.preventDefault();
        handleTabChange(tabs[tabs.length - 1].id);
      }
    },
    [activeTab, handleTabChange, tabs]
  );

  // Initialize from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl && tabs.some((tab) => tab.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  // Focus management for better accessibility
  useEffect(() => {
    const tabElement = document.querySelector(`[data-tab="${activeTab}"]`);
    if (tabElement && document.activeElement?.tagName !== "INPUT") {
      // Only focus if user isn't typing in an input field
      setTimeout(() => tabElement.focus(), 100);
    }
  }, [activeTab]);

  // Prevent data loss on page unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="settings-container">
      {/* Skip link for accessibility */}
      <a href="#settings-main" className="skip-link">
        Skip to main content
      </a>

      {/* Settings Header */}
      <header className="settings-header">
        <div className="settings-title">
          <CogIcon className="settings-title-icon" aria-hidden="true" />
          <div>
            <h1 className="settings-title-text">{t("settings.title")}</h1>
            <p className="settings-subtitle">{t("settings.description")}</p>
          </div>
        </div>

        {/* Quick save button in header */}
        {hasUnsavedChanges && (
          <div className="settings-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={isLoading}
              title="Save current changes"
            >
              {isLoading ? (
                <>
                  <div className="btn-spinner" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="btn-icon" aria-hidden="true" />
                  Quick Save
                </>
              )}
            </button>
          </div>
        )}
      </header>

      <div className="settings-content">
        {/* Settings Navigation Sidebar */}
        <aside className="settings-sidebar" role="complementary">
          <nav
            className="settings-nav"
            role="tablist"
            aria-label="Settings navigation"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`settings-panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`settings-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                  title={tab.description}
                >
                  <Icon className="settings-nav-icon" aria-hidden="true" />
                  <div className="settings-nav-content">
                    <span className="settings-nav-title">{tab.name}</span>
                    <span className="settings-nav-description">
                      {tab.description}
                    </span>
                  </div>
                  {isActive && (
                    <div
                      className="settings-nav-indicator"
                      aria-hidden="true"
                    />
                  )}
                  {/* Unsaved changes indicator */}
                  {hasUnsavedChanges && isActive && (
                    <div
                      className="settings-nav-changes"
                      aria-label="Has unsaved changes"
                      title="This tab has unsaved changes"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Settings Content */}
        <main id="settings-main" className="settings-main" role="main">
          {/* Breadcrumb navigation */}
          <nav className="settings-breadcrumb" aria-label="Settings breadcrumb">
            <ol className="breadcrumb-list">
              <li className="breadcrumb-item">
                <span>Settings</span>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {activeTabData?.name}
              </li>
            </ol>
          </nav>

          {/* Tab panel */}
          <div
            className="settings-panel"
            role="tabpanel"
            id={`settings-panel-${activeTab}`}
            aria-labelledby={`settings-tab-${activeTab}`}
            tabIndex="0"
          >
            {/* Tab description */}
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">{activeTabData?.name}</h2>
              <p className="settings-panel-description">
                {activeTabData?.description}
              </p>
            </div>

            {/* Component content */}
            <div className="settings-panel-content">
              {ActiveComponent ? (
                <ActiveComponent
                  settings={settings[activeTab] || {}}
                  onChange={handleSettingsChange}
                  isLoading={isLoading}
                />
              ) : (
                <div className="settings-error">
                  <ExclamationTriangleIcon className="settings-error-icon" />
                  <h3>Component not found</h3>
                  <p>The requested settings component could not be loaded.</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => window.location.reload()}
                  >
                    Reload Page
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Unsaved Changes Actions */}
          {hasUnsavedChanges && (
            <div
              className="settings-actions"
              role="region"
              aria-label="Unsaved changes"
            >
              <div className="settings-actions-content">
                <div className="settings-actions-info">
                  <InformationCircleIcon
                    className="settings-actions-icon"
                    aria-hidden="true"
                  />
                  <div className="settings-actions-text">
                    <strong>{t("settings.unsavedChanges")}</strong>
                    <span>
                      Your changes will be lost if you navigate away without
                      saving.
                    </span>
                  </div>
                </div>
                <div className="settings-actions-buttons">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDiscard}
                    disabled={isLoading}
                  >
                    {t("common.discard")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="btn-spinner" aria-hidden="true" />
                        {t("common.saving")}
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon
                          className="btn-icon"
                          aria-hidden="true"
                        />
                        {t("common.save")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Screen reader live region for announcements */}
      <div className="sr-live-region" aria-live="polite" aria-atomic="true" />
    </div>
  );
};

export default SettingsWrapper;
