import { useCallback } from "react";

// Enhanced keyboard navigation utilities for settings
export const useSettingsKeyboardNavigation = () => {
  const handleTabKeydown = useCallback((e, tabId, setActiveTab, tabIds) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const currentIndex = tabIds.indexOf(tabId);
      let newIndex;

      if (e.key === "ArrowLeft") {
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1;
      } else {
        newIndex = currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0;
      }

      setActiveTab(tabIds[newIndex]);
      // Focus the new tab
      setTimeout(() => {
        const newTab = document.querySelector(
          `[data-tab-id="${tabIds[newIndex]}"]`
        );
        if (newTab) newTab.focus();
      }, 0);
    }
  }, []);

  const handleFormKeydown = useCallback((e) => {
    // Save with Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      const submitButton = document.querySelector('form button[type="submit"]');
      if (submitButton && !submitButton.disabled) {
        submitButton.click();
      }
    }
  }, []);

  return {
    handleTabKeydown,
    handleFormKeydown,
  };
};

// Settings validation utilities
export const validateSettings = {
  profile: (data, t) => {
    const errors = [];

    if (!data.fullName?.trim()) {
      errors.push(t("settings.profile.errors.fullNameRequired"));
    }

    if (!data.email?.trim()) {
      errors.push(t("settings.profile.errors.emailRequired"));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push(t("settings.profile.errors.invalidEmail"));
    }

    if (!data.username?.trim()) {
      errors.push(t("settings.profile.errors.usernameRequired"));
    } else if (data.username.length < 3) {
      errors.push(t("settings.profile.errors.usernameMinLength"));
    }

    return errors;
  },

  password: (data, t) => {
    const errors = [];

    if (!data.currentPassword) {
      errors.push(t("settings.security.errors.currentPasswordRequired"));
    }

    if (!data.newPassword) {
      errors.push(t("settings.security.errors.newPasswordRequired"));
    } else {
      if (data.newPassword.length < 8) {
        errors.push(t("settings.security.errors.passwordMinLength"));
      }
      if (!/(?=.*[a-z])/.test(data.newPassword)) {
        errors.push(t("settings.security.errors.passwordLowercase"));
      }
      if (!/(?=.*[A-Z])/.test(data.newPassword)) {
        errors.push(t("settings.security.errors.passwordUppercase"));
      }
      if (!/(?=.*\d)/.test(data.newPassword)) {
        errors.push(t("settings.security.errors.passwordNumber"));
      }
      if (data.newPassword === data.currentPassword) {
        errors.push(t("settings.security.errors.passwordSame"));
      }
    }

    if (data.newPassword !== data.confirmPassword) {
      errors.push(t("settings.security.errors.passwordMismatch"));
    }

    return errors;
  },
};

// Settings accessibility announcements
export const announceSettingsChange = (message, priority = "polite") => {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Settings section priority levels for visual indicators
export const SETTINGS_PRIORITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

// Enhanced settings save with optimistic updates
export const createOptimisticSave = (updateFn, revertFn, apiCall) => {
  return async (data) => {
    // Apply changes immediately for better UX
    updateFn(data);

    try {
      // Attempt to save
      const result = await apiCall(data);
      return result;
    } catch (error) {
      // Revert on failure
      revertFn();
      throw error;
    }
  };
};
