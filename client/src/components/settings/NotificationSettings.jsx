import React, { useState, useCallback } from "react";
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

/**
 * NotificationSettings Component
 * Manages email alerts, push notifications, and communication preferences
 */
const NotificationSettings = ({ settings = {}, onChange, isLoading }) => {
  const [localSettings, setLocalSettings] = useState({
    // Email Notifications
    emailOrderUpdates: settings.emailOrderUpdates ?? true,
    emailInventoryAlerts: settings.emailInventoryAlerts ?? true,
    emailPlatformSync: settings.emailPlatformSync ?? false,
    emailWeeklyReports: settings.emailWeeklyReports ?? true,
    emailSystemAlerts: settings.emailSystemAlerts ?? true,
    emailMarketingUpdates: settings.emailMarketingUpdates ?? false,

    // Push Notifications
    pushOrderUpdates: settings.pushOrderUpdates ?? true,
    pushInventoryAlerts: settings.pushInventoryAlerts ?? true,
    pushSystemAlerts: settings.pushSystemAlerts ?? true,
    pushPromotional: settings.pushPromotional ?? false,

    // SMS Notifications
    smsEnabled: settings.smsEnabled ?? false,
    smsOrderUpdates: settings.smsOrderUpdates ?? false,
    smsInventoryAlerts: settings.smsInventoryAlerts ?? false,
    smsPhoneNumber: settings.smsPhoneNumber ?? "",

    // Communication Preferences
    notificationFrequency: settings.notificationFrequency ?? "immediate",
    quietHoursEnabled: settings.quietHoursEnabled ?? false,
    quietHoursStart: settings.quietHoursStart ?? "22:00",
    quietHoursEnd: settings.quietHoursEnd ?? "08:00",

    // Alert Thresholds
    lowStockThreshold: settings.lowStockThreshold ?? 10,
    highOrderVolumeThreshold: settings.highOrderVolumeThreshold ?? 50,

    ...settings,
  });

  // Handle input changes
  const handleChange = useCallback(
    (field, value) => {
      const newSettings = {
        ...localSettings,
        [field]: value,
      };

      setLocalSettings(newSettings);
      onChange?.(newSettings);
    },
    [localSettings, onChange]
  );

  // Handle toggle switch changes
  const handleToggle = useCallback(
    (field) => {
      handleChange(field, !localSettings[field]);
    },
    [localSettings, handleChange]
  );

  // Test notification function
  const handleTestNotification = useCallback((type) => {
    console.log(`Testing ${type} notification...`);
    // In a real app, this would trigger a test notification
    alert(`Test ${type} notification sent!`);
  }, []);

  return (
    <div className="settings-section">
      {/* Email Notifications */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <EnvelopeIcon className="card-title-icon" />
            <h3>Email Notifications</h3>
          </div>
          <p className="card-description">
            Configure which email notifications you want to receive
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            <div className="form-group-grid">
              {/* Order Updates */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.emailOrderUpdates}
                    onChange={() => handleToggle("emailOrderUpdates")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Order Updates</span>
                    <span className="toggle-description">
                      Get notified when orders are placed, updated, or completed
                    </span>
                  </div>
                </label>
              </div>

              {/* Inventory Alerts */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.emailInventoryAlerts}
                    onChange={() => handleToggle("emailInventoryAlerts")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Inventory Alerts</span>
                    <span className="toggle-description">
                      Low stock warnings and inventory sync notifications
                    </span>
                  </div>
                </label>
              </div>

              {/* Platform Sync */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.emailPlatformSync}
                    onChange={() => handleToggle("emailPlatformSync")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Platform Sync Updates</span>
                    <span className="toggle-description">
                      Notifications about platform synchronization status
                    </span>
                  </div>
                </label>
              </div>

              {/* Weekly Reports */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.emailWeeklyReports}
                    onChange={() => handleToggle("emailWeeklyReports")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Weekly Reports</span>
                    <span className="toggle-description">
                      Weekly summary of sales, orders, and performance metrics
                    </span>
                  </div>
                </label>
              </div>

              {/* System Alerts */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.emailSystemAlerts}
                    onChange={() => handleToggle("emailSystemAlerts")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">System Alerts</span>
                    <span className="toggle-description">
                      Important system notifications and maintenance updates
                    </span>
                  </div>
                </label>
              </div>

              {/* Marketing Updates */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.emailMarketingUpdates}
                    onChange={() => handleToggle("emailMarketingUpdates")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Marketing Updates</span>
                    <span className="toggle-description">
                      Product updates, tips, and promotional offers
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleTestNotification("email")}
                disabled={isLoading}
              >
                Send Test Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <DevicePhoneMobileIcon className="card-title-icon" />
            <h3>Push Notifications</h3>
          </div>
          <p className="card-description">
            Configure browser and mobile push notifications
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            <div className="form-group-grid">
              {/* Order Updates */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.pushOrderUpdates}
                    onChange={() => handleToggle("pushOrderUpdates")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Order Updates</span>
                    <span className="toggle-description">
                      Instant notifications for new orders and status changes
                    </span>
                  </div>
                </label>
              </div>

              {/* Inventory Alerts */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.pushInventoryAlerts}
                    onChange={() => handleToggle("pushInventoryAlerts")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Inventory Alerts</span>
                    <span className="toggle-description">
                      Real-time low stock and inventory warnings
                    </span>
                  </div>
                </label>
              </div>

              {/* System Alerts */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.pushSystemAlerts}
                    onChange={() => handleToggle("pushSystemAlerts")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">System Alerts</span>
                    <span className="toggle-description">
                      Critical system notifications and error alerts
                    </span>
                  </div>
                </label>
              </div>

              {/* Promotional */}
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.pushPromotional}
                    onChange={() => handleToggle("pushPromotional")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Promotional Offers</span>
                    <span className="toggle-description">
                      Special offers, discounts, and feature announcements
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleTestNotification("push")}
                disabled={isLoading}
              >
                Send Test Notification
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Preferences */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <CogIcon className="card-title-icon" />
            <h3>Communication Preferences</h3>
          </div>
          <p className="card-description">
            Configure when and how you receive notifications
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            <div className="form-row">
              {/* Notification Frequency */}
              <div className="form-group">
                <label htmlFor="notificationFrequency" className="form-label">
                  Notification Frequency
                </label>
                <select
                  id="notificationFrequency"
                  className="form-select"
                  value={localSettings.notificationFrequency}
                  onChange={(e) =>
                    handleChange("notificationFrequency", e.target.value)
                  }
                  disabled={isLoading}
                >
                  <option value="immediate">Immediate</option>
                  <option value="hourly">Hourly Summary</option>
                  <option value="daily">Daily Summary</option>
                  <option value="weekly">Weekly Summary</option>
                </select>
                <span className="form-hint">
                  How often you want to receive notification summaries
                </span>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={localSettings.quietHoursEnabled}
                  onChange={() => handleToggle("quietHoursEnabled")}
                  disabled={isLoading}
                />
                <span className="toggle-switch" />
                <div className="toggle-content">
                  <span className="toggle-title">Enable Quiet Hours</span>
                  <span className="toggle-description">
                    Disable non-critical notifications during specified hours
                  </span>
                </div>
              </label>
            </div>

            {localSettings.quietHoursEnabled && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quietHoursStart" className="form-label">
                    Quiet Hours Start
                  </label>
                  <input
                    type="time"
                    id="quietHoursStart"
                    className="form-input"
                    value={localSettings.quietHoursStart}
                    onChange={(e) =>
                      handleChange("quietHoursStart", e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="quietHoursEnd" className="form-label">
                    Quiet Hours End
                  </label>
                  <input
                    type="time"
                    id="quietHoursEnd"
                    className="form-input"
                    value={localSettings.quietHoursEnd}
                    onChange={(e) =>
                      handleChange("quietHoursEnd", e.target.value)
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Thresholds */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ExclamationTriangleIcon className="card-title-icon" />
            <h3>Alert Thresholds</h3>
          </div>
          <p className="card-description">
            Configure when to trigger automatic alerts
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lowStockThreshold" className="form-label">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  id="lowStockThreshold"
                  className="form-input"
                  min="1"
                  max="1000"
                  value={localSettings.lowStockThreshold}
                  onChange={(e) =>
                    handleChange("lowStockThreshold", parseInt(e.target.value))
                  }
                  disabled={isLoading}
                />
                <span className="form-hint">
                  Alert when product quantity falls below this number
                </span>
              </div>

              <div className="form-group">
                <label
                  htmlFor="highOrderVolumeThreshold"
                  className="form-label"
                >
                  High Order Volume Threshold
                </label>
                <input
                  type="number"
                  id="highOrderVolumeThreshold"
                  className="form-input"
                  min="1"
                  max="1000"
                  value={localSettings.highOrderVolumeThreshold}
                  onChange={(e) =>
                    handleChange(
                      "highOrderVolumeThreshold",
                      parseInt(e.target.value)
                    )
                  }
                  disabled={isLoading}
                />
                <span className="form-hint">
                  Alert when daily orders exceed this number
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Status */}
      <div className="card card-info">
        <div className="card-content">
          <div className="alert alert-info">
            <InformationCircleIcon className="alert-icon" />
            <div className="alert-content">
              <h4 className="alert-title">Notification Status</h4>
              <p className="alert-description">
                Browser notifications are currently{" "}
                {Notification?.permission === "granted"
                  ? "enabled"
                  : "disabled"}
                .
                {Notification?.permission !== "granted" && (
                  <span>
                    {" "}
                    <button
                      className="alert-link"
                      onClick={() => Notification.requestPermission()}
                    >
                      Enable browser notifications
                    </button>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
