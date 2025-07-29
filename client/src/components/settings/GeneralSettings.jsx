import React, { useState, useCallback } from "react";
import { useTranslation } from "../../i18n/hooks/useTranslation";
import { useAlert } from "../../contexts/AlertContext";
import {
  BuildingOfficeIcon,
  MapPinIcon,
  EnvelopeIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

/**
 * General Settings Component - Design System Compliant
 * Handles company information, contact details, and basic preferences
 */
const GeneralSettings = ({ onSettingsChange, onLoadingChange }) => {
  const { t } = useTranslation();
  const { showAlert } = useAlert();

  const [settings, setSettings] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Turkey",
    website: "",
    timezone: "Europe/Istanbul",
    language: "tr",
    currency: "TRY",
  });

  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const handleInputChange = useCallback(
    (field, value) => {
      setSettings((prev) => ({
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

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!settings.companyName.trim()) {
      newErrors.companyName = t(
        "settings.general.validation.companyNameRequired"
      );
    }

    if (!settings.contactPerson.trim()) {
      newErrors.contactPerson = t(
        "settings.general.validation.contactPersonRequired"
      );
    }

    if (!settings.email.trim()) {
      newErrors.email = t("settings.general.validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      newErrors.email = t("settings.general.validation.emailInvalid");
    }

    if (!settings.phone.trim()) {
      newErrors.phone = t("settings.general.validation.phoneRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [settings, t]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    onLoadingChange?.(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsDirty(false);
      onSettingsChange?.(false);
      showAlert(t("settings.general.saveSuccess"), "success");
    } catch (error) {
      showAlert(t("settings.general.saveError"), "error");
    } finally {
      onLoadingChange?.(false);
    }
  }, [validateForm, onLoadingChange, onSettingsChange, showAlert, t]);

  return (
    <div className="settings-tab-content">
      {/* Company Information Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            {t("settings.general.companyInfo.title")}
          </h2>
          <p className="card-subtitle">
            {t("settings.general.companyInfo.description")}
          </p>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="companyName" className="form-label">
                {t("settings.general.companyName")}
                <span className="form-required">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                className={`form-input ${
                  errors.companyName ? "form-input-error" : ""
                }`}
                value={settings.companyName}
                onChange={(e) =>
                  handleInputChange("companyName", e.target.value)
                }
                placeholder={t("settings.general.companyNamePlaceholder")}
              />
              {errors.companyName && (
                <div className="form-error">{errors.companyName}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="contactPerson" className="form-label">
                {t("settings.general.contactPerson")}
                <span className="form-required">*</span>
              </label>
              <input
                id="contactPerson"
                type="text"
                className={`form-input ${
                  errors.contactPerson ? "form-input-error" : ""
                }`}
                value={settings.contactPerson}
                onChange={(e) =>
                  handleInputChange("contactPerson", e.target.value)
                }
                placeholder={t("settings.general.contactPersonPlaceholder")}
              />
              {errors.contactPerson && (
                <div className="form-error">{errors.contactPerson}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            {t("settings.general.contactInfo.title")}
          </h2>
          <p className="card-subtitle">
            {t("settings.general.contactInfo.description")}
          </p>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                {t("settings.general.email")}
                <span className="form-required">*</span>
              </label>
              <input
                id="email"
                type="email"
                className={`form-input ${
                  errors.email ? "form-input-error" : ""
                }`}
                value={settings.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder={t("settings.general.emailPlaceholder")}
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                {t("settings.general.phone")}
                <span className="form-required">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                className={`form-input ${
                  errors.phone ? "form-input-error" : ""
                }`}
                value={settings.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder={t("settings.general.phonePlaceholder")}
              />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="website" className="form-label">
                {t("settings.general.website")}
              </label>
              <input
                id="website"
                type="url"
                className="form-input"
                value={settings.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder={t("settings.general.websitePlaceholder")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Address Information Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <MapPinIcon className="h-5 w-5 mr-2" />
            {t("settings.general.addressInfo.title")}
          </h2>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label htmlFor="address" className="form-label">
                {t("settings.general.address")}
              </label>
              <textarea
                id="address"
                className="form-textarea"
                rows="3"
                value={settings.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder={t("settings.general.addressPlaceholder")}
              />
            </div>

            <div className="form-group">
              <label htmlFor="city" className="form-label">
                {t("settings.general.city")}
              </label>
              <input
                id="city"
                type="text"
                className="form-input"
                value={settings.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder={t("settings.general.cityPlaceholder")}
              />
            </div>

            <div className="form-group">
              <label htmlFor="country" className="form-label">
                {t("settings.general.country")}
              </label>
              <select
                id="country"
                className="form-select"
                value={settings.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
              >
                <option value="Turkey">Turkey</option>
                <option value="Germany">Germany</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Settings Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            <GlobeAltIcon className="h-5 w-5 mr-2" />
            {t("settings.general.regionalSettings.title")}
          </h2>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="language" className="form-label">
                {t("settings.general.language")}
              </label>
              <select
                id="language"
                className="form-select"
                value={settings.language}
                onChange={(e) => handleInputChange("language", e.target.value)}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="currency" className="form-label">
                {t("settings.general.currency")}
              </label>
              <select
                id="currency"
                className="form-select"
                value={settings.currency}
                onChange={(e) => handleInputChange("currency", e.target.value)}
              >
                <option value="TRY">Turkish Lira (₺)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">US Dollar ($)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="timezone" className="form-label">
                {t("settings.general.timezone")}
              </label>
              <select
                id="timezone"
                className="form-select"
                value={settings.timezone}
                onChange={(e) => handleInputChange("timezone", e.target.value)}
              >
                <option value="Europe/Istanbul">Istanbul (UTC+3)</option>
                <option value="Europe/Berlin">Berlin (UTC+1)</option>
                <option value="Europe/London">London (UTC+0)</option>
                <option value="America/New_York">New York (UTC-5)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="card-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            // Reset form
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
          onClick={handleSave}
          disabled={!isDirty}
        >
          {t("settings.save")}
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings;
