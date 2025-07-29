import React, { useState, useCallback } from "react";
import { useTranslation } from "../../i18n/hooks/useTranslation";
import { useAlert } from "../../contexts/AlertContext";
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";

/**
 * Password Strength Indicator - Design System Compliant
 */
const PasswordStrengthIndicator = ({ password, t }) => {
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = [
    t("settings.security.strength.veryWeak"),
    t("settings.security.strength.weak"),
    t("settings.security.strength.fair"),
    t("settings.security.strength.good"),
    t("settings.security.strength.strong"),
  ];

  const strengthColors = [
    "var(--danger-500)",
    "var(--danger-500)",
    "var(--warning-500)",
    "var(--success-500)",
    "var(--success-600)",
  ];

  return (
    <div className="password-strength-indicator">
      <div className="strength-bar">
        <div
          className="strength-fill"
          style={{
            width: `${(strength / 5) * 100}%`,
            background: strengthColors[strength] || strengthColors[0],
          }}
        />
      </div>
      <span className="strength-label">
        {strengthLabels[strength] || strengthLabels[0]}
      </span>
    </div>
  );
};

/**
 * Security Settings Component - Design System Compliant
 * Handles password changes, 2FA, and security preferences
 */
const SecuritySettings = ({ onSettingsChange, onLoadingChange }) => {
  const { t } = useTranslation();
  const { showAlert } = useAlert();

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginNotifications: true,
    ipWhitelist: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const handlePasswordChange = useCallback(
    (field, value) => {
      setPasswordData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear field error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: null,
        }));
      }

      if (!isDirty) {
        setIsDirty(true);
        onSettingsChange?.(true);
      }
    },
    [errors, isDirty, onSettingsChange]
  );

  const handleSecurityChange = useCallback(
    (field, value) => {
      setSecuritySettings((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (!isDirty) {
        setIsDirty(true);
        onSettingsChange?.(true);
      }
    },
    [isDirty, onSettingsChange]
  );

  const togglePasswordVisibility = useCallback((field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  const validatePasswordForm = useCallback(() => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = t(
        "settings.security.validation.currentPasswordRequired"
      );
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = t(
        "settings.security.validation.newPasswordRequired"
      );
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = t(
        "settings.security.validation.passwordTooShort"
      );
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = t(
        "settings.security.validation.confirmPasswordRequired"
      );
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t(
        "settings.security.validation.passwordsDoNotMatch"
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passwordData, t]);

  const handlePasswordSave = useCallback(async () => {
    if (!validatePasswordForm()) return;

    onLoadingChange?.(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsDirty(false);
      onSettingsChange?.(false);
      showAlert(t("settings.security.passwordChangeSuccess"), "success");
    } catch (error) {
      showAlert(t("settings.security.passwordChangeError"), "error");
    } finally {
      onLoadingChange?.(false);
    }
  }, [validatePasswordForm, onLoadingChange, onSettingsChange, showAlert, t]);

  const handleSecuritySave = useCallback(async () => {
    onLoadingChange?.(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsDirty(false);
      onSettingsChange?.(false);
      showAlert(t("settings.security.securitySettingsSuccess"), "success");
    } catch (error) {
      showAlert(t("settings.security.securitySettingsError"), "error");
    } finally {
      onLoadingChange?.(false);
    }
  }, [onLoadingChange, onSettingsChange, showAlert, t]);

  return (
    <div className="settings-tab-content">
      {/* Password Change Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <KeyIcon className="h-5 w-5 mr-2" />
            {t("settings.security.passwordChange.title")}
          </h2>
          <p className="card-subtitle">
            {t("settings.security.passwordChange.description")}
          </p>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">
                {t("settings.security.currentPassword")}
                <span className="form-required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  className={`form-input ${
                    errors.currentPassword ? "form-input-error" : ""
                  }`}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    handlePasswordChange("currentPassword", e.target.value)
                  }
                  placeholder={t(
                    "settings.security.currentPasswordPlaceholder"
                  )}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility("current")}
                  aria-label={
                    showPasswords.current
                      ? t("settings.security.hidePassword")
                      : t("settings.security.showPassword")
                  }
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <div className="form-error">{errors.currentPassword}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                {t("settings.security.newPassword")}
                <span className="form-required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  className={`form-input ${
                    errors.newPassword ? "form-input-error" : ""
                  }`}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    handlePasswordChange("newPassword", e.target.value)
                  }
                  placeholder={t("settings.security.newPasswordPlaceholder")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility("new")}
                  aria-label={
                    showPasswords.new
                      ? t("settings.security.hidePassword")
                      : t("settings.security.showPassword")
                  }
                >
                  {showPasswords.new ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordData.newPassword && (
                <PasswordStrengthIndicator
                  password={passwordData.newPassword}
                  t={t}
                />
              )}
              {errors.newPassword && (
                <div className="form-error">{errors.newPassword}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                {t("settings.security.confirmPassword")}
                <span className="form-required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  className={`form-input ${
                    errors.confirmPassword ? "form-input-error" : ""
                  }`}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    handlePasswordChange("confirmPassword", e.target.value)
                  }
                  placeholder={t(
                    "settings.security.confirmPasswordPlaceholder"
                  )}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility("confirm")}
                  aria-label={
                    showPasswords.confirm
                      ? t("settings.security.hidePassword")
                      : t("settings.security.showPassword")
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="form-error">{errors.confirmPassword}</div>
              )}
            </div>
          </div>
        </div>
        <div className="card-footer">
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePasswordSave}
              disabled={
                !passwordData.currentPassword ||
                !passwordData.newPassword ||
                !passwordData.confirmPassword
              }
            >
              {t("settings.security.changePassword")}
            </button>
          </div>
        </div>
      </section>

      {/* Two-Factor Authentication Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
            {t("settings.security.twoFactor.title")}
          </h2>
          <p className="card-subtitle">
            {t("settings.security.twoFactor.description")}
          </p>
        </div>
        <div className="card-body">
          <div className="setting-toggle">
            <div className="setting-info">
              <h3 className="setting-title">
                {t("settings.security.twoFactor.enable")}
              </h3>
              <p className="setting-description">
                {t("settings.security.twoFactor.enableDescription")}
              </p>
            </div>
            <div className="toggle-wrapper">
              <button
                type="button"
                className={`toggle-switch ${
                  securitySettings.twoFactorEnabled ? "active" : ""
                }`}
                onClick={() =>
                  handleSecurityChange(
                    "twoFactorEnabled",
                    !securitySettings.twoFactorEnabled
                  )
                }
                aria-pressed={securitySettings.twoFactorEnabled}
              >
                <span className="toggle-slider" />
              </button>
            </div>
          </div>

          {securitySettings.twoFactorEnabled && (
            <div className="twofa-setup">
              <div className="alert alert-info">
                <p>{t("settings.security.twoFactor.setupInstructions")}</p>
              </div>
              <button className="btn btn-secondary">
                {t("settings.security.twoFactor.setupNow")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Security Preferences Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <LockClosedIcon className="h-5 w-5 mr-2" />
            {t("settings.security.preferences.title")}
          </h2>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="sessionTimeout" className="form-label">
                {t("settings.security.sessionTimeout")}
              </label>
              <select
                id="sessionTimeout"
                className="form-select"
                value={securitySettings.sessionTimeout}
                onChange={(e) =>
                  handleSecurityChange(
                    "sessionTimeout",
                    parseInt(e.target.value)
                  )
                }
              >
                <option value={15}>15 {t("settings.security.minutes")}</option>
                <option value={30}>30 {t("settings.security.minutes")}</option>
                <option value={60}>1 {t("settings.security.hour")}</option>
                <option value={120}>2 {t("settings.security.hours")}</option>
                <option value={480}>8 {t("settings.security.hours")}</option>
              </select>
            </div>

            <div className="setting-toggle">
              <div className="setting-info">
                <h3 className="setting-title">
                  {t("settings.security.loginNotifications")}
                </h3>
                <p className="setting-description">
                  {t("settings.security.loginNotificationsDescription")}
                </p>
              </div>
              <div className="toggle-wrapper">
                <button
                  type="button"
                  className={`toggle-switch ${
                    securitySettings.loginNotifications ? "active" : ""
                  }`}
                  onClick={() =>
                    handleSecurityChange(
                      "loginNotifications",
                      !securitySettings.loginNotifications
                    )
                  }
                  aria-pressed={securitySettings.loginNotifications}
                >
                  <span className="toggle-slider" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer">
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsDirty(false);
                onSettingsChange?.(false);
              }}
              disabled={!isDirty}
            >
              {t("settings.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSecuritySave}
              disabled={!isDirty}
            >
              {t("settings.save")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SecuritySettings;
