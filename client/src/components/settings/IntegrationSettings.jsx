import React, { useState, useCallback } from "react";
import {
  CogIcon,
  LinkIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

/**
 * IntegrationSettings Component
 * Manages platform connections, API management, and third-party services
 */
const IntegrationSettings = ({ settings = {}, onChange, isLoading }) => {
  const [localSettings, setLocalSettings] = useState({
    // Platform Integrations
    trendyolEnabled: settings.trendyolEnabled ?? false,
    trendyolApiKey: settings.trendyolApiKey ?? "",
    trendyolSecretKey: settings.trendyolSecretKey ?? "",
    trendyolSupplierId: settings.trendyolSupplierId ?? "",
    trendyolAutoSync: settings.trendyolAutoSync ?? true,

    hepsiburadaEnabled: settings.hepsiburadaEnabled ?? false,
    hepsiburadaUsername: settings.hepsiburadaUsername ?? "",
    hepsiburadaPassword: settings.hepsiburadaPassword ?? "",
    hepsiburadaMerchantId: settings.hepsiburadaMerchantId ?? "",
    hepsiburadaAutoSync: settings.hepsiburadaAutoSync ?? true,

    n11Enabled: settings.n11Enabled ?? false,
    n11ApiKey: settings.n11ApiKey ?? "",
    n11SecretKey: settings.n11SecretKey ?? "",
    n11AutoSync: settings.n11AutoSync ?? true,

    // Sync Settings
    syncInterval: settings.syncInterval ?? 30,
    enableRealTimeSync: settings.enableRealTimeSync ?? false,
    enableStockSync: settings.enableStockSync ?? true,
    enablePriceSync: settings.enablePriceSync ?? true,
    enableOrderSync: settings.enableOrderSync ?? true,

    // Webhook Settings
    webhookEnabled: settings.webhookEnabled ?? false,
    webhookUrl: settings.webhookUrl ?? "",
    webhookSecret: settings.webhookSecret ?? "",

    ...settings,
  });

  const [showSecrets, setShowSecrets] = useState({});
  const [connectionStatus, setConnectionStatus] = useState({
    trendyol: "disconnected",
    hepsiburada: "disconnected",
    n11: "disconnected",
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

  // Toggle secret visibility
  const toggleSecretVisibility = useCallback((field) => {
    setShowSecrets((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  // Test platform connection
  const testConnection = useCallback(
    async (platform) => {
      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: "testing",
      }));

      try {
        // Simulate API test
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mock connection result based on whether credentials are provided
        const hasCredentials =
          platform === "trendyol"
            ? localSettings.trendyolApiKey && localSettings.trendyolSecretKey
            : platform === "hepsiburada"
            ? localSettings.hepsiburadaUsername &&
              localSettings.hepsiburadaPassword
            : localSettings.n11ApiKey && localSettings.n11SecretKey;

        setConnectionStatus((prev) => ({
          ...prev,
          [platform]: hasCredentials ? "connected" : "error",
        }));

        if (hasCredentials) {
          alert(`${platform} connection successful!`);
        } else {
          alert(
            `${platform} connection failed. Please check your credentials.`
          );
        }
      } catch (error) {
        setConnectionStatus((prev) => ({
          ...prev,
          [platform]: "error",
        }));
        alert(`Failed to test ${platform} connection: ${error.message}`);
      }
    },
    [localSettings]
  );

  // Sync data manually
  const triggerSync = useCallback(async (platform) => {
    try {
      console.log(`Triggering sync for ${platform}...`);
      // In a real app, this would trigger platform sync
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(`${platform} sync completed successfully!`);
    } catch (error) {
      alert(`Failed to sync ${platform}: ${error.message}`);
    }
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return <CheckCircleIcon className="status-icon status-success" />;
      case "testing":
        return <ClockIcon className="status-icon status-warning" />;
      case "error":
        return <XCircleIcon className="status-icon status-error" />;
      default:
        return <XCircleIcon className="status-icon status-neutral" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "testing":
        return "Testing...";
      case "error":
        return "Connection Error";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="settings-section">
      {/* Trendyol Integration */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="platform-badge platform-trendyol">
              <span className="platform-logo">T</span>
              <span>Trendyol</span>
            </div>
            <div className="card-status">
              {getStatusIcon(connectionStatus.trendyol)}
              <span className="status-text">
                {getStatusText(connectionStatus.trendyol)}
              </span>
            </div>
          </div>
          <p className="card-description">
            Connect your Trendyol seller account to sync products, orders, and
            inventory
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            {/* Enable Toggle */}
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={localSettings.trendyolEnabled}
                  onChange={() => handleToggle("trendyolEnabled")}
                  disabled={isLoading}
                />
                <span className="toggle-switch" />
                <div className="toggle-content">
                  <span className="toggle-title">
                    Enable Trendyol Integration
                  </span>
                  <span className="toggle-description">
                    Activate automatic synchronization with Trendyol platform
                  </span>
                </div>
              </label>
            </div>

            {localSettings.trendyolEnabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="trendyolApiKey" className="form-label">
                      API Key *
                    </label>
                    <div className="form-input-group">
                      <input
                        type={showSecrets.trendyolApiKey ? "text" : "password"}
                        id="trendyolApiKey"
                        className="form-input"
                        value={localSettings.trendyolApiKey}
                        onChange={(e) =>
                          handleChange("trendyolApiKey", e.target.value)
                        }
                        placeholder="Enter your Trendyol API Key"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="form-input-addon"
                        onClick={() => toggleSecretVisibility("trendyolApiKey")}
                      >
                        {showSecrets.trendyolApiKey ? (
                          <EyeSlashIcon className="form-icon" />
                        ) : (
                          <EyeIcon className="form-icon" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="trendyolSecretKey" className="form-label">
                      Secret Key *
                    </label>
                    <div className="form-input-group">
                      <input
                        type={
                          showSecrets.trendyolSecretKey ? "text" : "password"
                        }
                        id="trendyolSecretKey"
                        className="form-input"
                        value={localSettings.trendyolSecretKey}
                        onChange={(e) =>
                          handleChange("trendyolSecretKey", e.target.value)
                        }
                        placeholder="Enter your Trendyol Secret Key"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="form-input-addon"
                        onClick={() =>
                          toggleSecretVisibility("trendyolSecretKey")
                        }
                      >
                        {showSecrets.trendyolSecretKey ? (
                          <EyeSlashIcon className="form-icon" />
                        ) : (
                          <EyeIcon className="form-icon" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="trendyolSupplierId" className="form-label">
                      Supplier ID
                    </label>
                    <input
                      type="text"
                      id="trendyolSupplierId"
                      className="form-input"
                      value={localSettings.trendyolSupplierId}
                      onChange={(e) =>
                        handleChange("trendyolSupplierId", e.target.value)
                      }
                      placeholder="Enter your Supplier ID"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      className="toggle-input"
                      checked={localSettings.trendyolAutoSync}
                      onChange={() => handleToggle("trendyolAutoSync")}
                      disabled={isLoading}
                    />
                    <span className="toggle-switch" />
                    <div className="toggle-content">
                      <span className="toggle-title">Auto Sync</span>
                      <span className="toggle-description">
                        Automatically sync data at regular intervals
                      </span>
                    </div>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => testConnection("trendyol")}
                    disabled={
                      isLoading || connectionStatus.trendyol === "testing"
                    }
                  >
                    {connectionStatus.trendyol === "testing" ? (
                      <>
                        <ArrowPathIcon className="btn-icon animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="btn-icon" />
                        Test Connection
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => triggerSync("trendyol")}
                    disabled={
                      isLoading || connectionStatus.trendyol !== "connected"
                    }
                  >
                    <ArrowPathIcon className="btn-icon" />
                    Sync Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hepsiburada Integration */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="platform-badge platform-hepsiburada">
              <span className="platform-logo">H</span>
              <span>Hepsiburada</span>
            </div>
            <div className="card-status">
              {getStatusIcon(connectionStatus.hepsiburada)}
              <span className="status-text">
                {getStatusText(connectionStatus.hepsiburada)}
              </span>
            </div>
          </div>
          <p className="card-description">
            Connect your Hepsiburada merchant account for seamless integration
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            {/* Enable Toggle */}
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={localSettings.hepsiburadaEnabled}
                  onChange={() => handleToggle("hepsiburadaEnabled")}
                  disabled={isLoading}
                />
                <span className="toggle-switch" />
                <div className="toggle-content">
                  <span className="toggle-title">
                    Enable Hepsiburada Integration
                  </span>
                  <span className="toggle-description">
                    Activate automatic synchronization with Hepsiburada platform
                  </span>
                </div>
              </label>
            </div>

            {localSettings.hepsiburadaEnabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="hepsiburadaUsername" className="form-label">
                      Username *
                    </label>
                    <input
                      type="text"
                      id="hepsiburadaUsername"
                      className="form-input"
                      value={localSettings.hepsiburadaUsername}
                      onChange={(e) =>
                        handleChange("hepsiburadaUsername", e.target.value)
                      }
                      placeholder="Enter your Hepsiburada username"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="hepsiburadaPassword" className="form-label">
                      Password *
                    </label>
                    <div className="form-input-group">
                      <input
                        type={
                          showSecrets.hepsiburadaPassword ? "text" : "password"
                        }
                        id="hepsiburadaPassword"
                        className="form-input"
                        value={localSettings.hepsiburadaPassword}
                        onChange={(e) =>
                          handleChange("hepsiburadaPassword", e.target.value)
                        }
                        placeholder="Enter your password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="form-input-addon"
                        onClick={() =>
                          toggleSecretVisibility("hepsiburadaPassword")
                        }
                      >
                        {showSecrets.hepsiburadaPassword ? (
                          <EyeSlashIcon className="form-icon" />
                        ) : (
                          <EyeIcon className="form-icon" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label
                      htmlFor="hepsiburadaMerchantId"
                      className="form-label"
                    >
                      Merchant ID
                    </label>
                    <input
                      type="text"
                      id="hepsiburadaMerchantId"
                      className="form-input"
                      value={localSettings.hepsiburadaMerchantId}
                      onChange={(e) =>
                        handleChange("hepsiburadaMerchantId", e.target.value)
                      }
                      placeholder="Enter your Merchant ID"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      className="toggle-input"
                      checked={localSettings.hepsiburadaAutoSync}
                      onChange={() => handleToggle("hepsiburadaAutoSync")}
                      disabled={isLoading}
                    />
                    <span className="toggle-switch" />
                    <div className="toggle-content">
                      <span className="toggle-title">Auto Sync</span>
                      <span className="toggle-description">
                        Automatically sync data at regular intervals
                      </span>
                    </div>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => testConnection("hepsiburada")}
                    disabled={
                      isLoading || connectionStatus.hepsiburada === "testing"
                    }
                  >
                    {connectionStatus.hepsiburada === "testing" ? (
                      <>
                        <ArrowPathIcon className="btn-icon animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="btn-icon" />
                        Test Connection
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => triggerSync("hepsiburada")}
                    disabled={
                      isLoading || connectionStatus.hepsiburada !== "connected"
                    }
                  >
                    <ArrowPathIcon className="btn-icon" />
                    Sync Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* N11 Integration */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <div className="platform-badge platform-n11">
              <span className="platform-logo">N11</span>
            </div>
            <div className="card-status">
              {getStatusIcon(connectionStatus.n11)}
              <span className="status-text">
                {getStatusText(connectionStatus.n11)}
              </span>
            </div>
          </div>
          <p className="card-description">
            Connect your N11 store for product and order synchronization
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            {/* Enable Toggle */}
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={localSettings.n11Enabled}
                  onChange={() => handleToggle("n11Enabled")}
                  disabled={isLoading}
                />
                <span className="toggle-switch" />
                <div className="toggle-content">
                  <span className="toggle-title">Enable N11 Integration</span>
                  <span className="toggle-description">
                    Activate automatic synchronization with N11 platform
                  </span>
                </div>
              </label>
            </div>

            {localSettings.n11Enabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="n11ApiKey" className="form-label">
                      API Key *
                    </label>
                    <div className="form-input-group">
                      <input
                        type={showSecrets.n11ApiKey ? "text" : "password"}
                        id="n11ApiKey"
                        className="form-input"
                        value={localSettings.n11ApiKey}
                        onChange={(e) =>
                          handleChange("n11ApiKey", e.target.value)
                        }
                        placeholder="Enter your N11 API Key"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="form-input-addon"
                        onClick={() => toggleSecretVisibility("n11ApiKey")}
                      >
                        {showSecrets.n11ApiKey ? (
                          <EyeSlashIcon className="form-icon" />
                        ) : (
                          <EyeIcon className="form-icon" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="n11SecretKey" className="form-label">
                      Secret Key *
                    </label>
                    <div className="form-input-group">
                      <input
                        type={showSecrets.n11SecretKey ? "text" : "password"}
                        id="n11SecretKey"
                        className="form-input"
                        value={localSettings.n11SecretKey}
                        onChange={(e) =>
                          handleChange("n11SecretKey", e.target.value)
                        }
                        placeholder="Enter your N11 Secret Key"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="form-input-addon"
                        onClick={() => toggleSecretVisibility("n11SecretKey")}
                      >
                        {showSecrets.n11SecretKey ? (
                          <EyeSlashIcon className="form-icon" />
                        ) : (
                          <EyeIcon className="form-icon" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      className="toggle-input"
                      checked={localSettings.n11AutoSync}
                      onChange={() => handleToggle("n11AutoSync")}
                      disabled={isLoading}
                    />
                    <span className="toggle-switch" />
                    <div className="toggle-content">
                      <span className="toggle-title">Auto Sync</span>
                      <span className="toggle-description">
                        Automatically sync data at regular intervals
                      </span>
                    </div>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => testConnection("n11")}
                    disabled={isLoading || connectionStatus.n11 === "testing"}
                  >
                    {connectionStatus.n11 === "testing" ? (
                      <>
                        <ArrowPathIcon className="btn-icon animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="btn-icon" />
                        Test Connection
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => triggerSync("n11")}
                    disabled={isLoading || connectionStatus.n11 !== "connected"}
                  >
                    <ArrowPathIcon className="btn-icon" />
                    Sync Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ArrowPathIcon className="card-title-icon" />
            <h3>Synchronization Settings</h3>
          </div>
          <p className="card-description">
            Configure how and when data is synchronized between platforms
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="syncInterval" className="form-label">
                  Sync Interval (minutes)
                </label>
                <select
                  id="syncInterval"
                  className="form-select"
                  value={localSettings.syncInterval}
                  onChange={(e) =>
                    handleChange("syncInterval", parseInt(e.target.value))
                  }
                  disabled={isLoading}
                >
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                  <option value={180}>Every 3 hours</option>
                  <option value={360}>Every 6 hours</option>
                  <option value={720}>Every 12 hours</option>
                  <option value={1440}>Daily</option>
                </select>
                <span className="form-hint">
                  How often automatic synchronization should run
                </span>
              </div>
            </div>

            <div className="form-group-grid">
              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.enableRealTimeSync}
                    onChange={() => handleToggle("enableRealTimeSync")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Real-time Sync</span>
                    <span className="toggle-description">
                      Instantly sync critical changes like orders and stock
                      updates
                    </span>
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.enableStockSync}
                    onChange={() => handleToggle("enableStockSync")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Stock Synchronization</span>
                    <span className="toggle-description">
                      Sync inventory quantities across all platforms
                    </span>
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.enablePriceSync}
                    onChange={() => handleToggle("enablePriceSync")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Price Synchronization</span>
                    <span className="toggle-description">
                      Sync product prices and promotional offers
                    </span>
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    className="toggle-input"
                    checked={localSettings.enableOrderSync}
                    onChange={() => handleToggle("enableOrderSync")}
                    disabled={isLoading}
                  />
                  <span className="toggle-switch" />
                  <div className="toggle-content">
                    <span className="toggle-title">Order Synchronization</span>
                    <span className="toggle-description">
                      Sync order status and tracking information
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Settings */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <KeyIcon className="card-title-icon" />
            <h3>Webhook Configuration</h3>
          </div>
          <p className="card-description">
            Configure webhooks for real-time notifications and integrations
          </p>
        </div>

        <div className="card-content">
          <div className="form-section">
            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={localSettings.webhookEnabled}
                  onChange={() => handleToggle("webhookEnabled")}
                  disabled={isLoading}
                />
                <span className="toggle-switch" />
                <div className="toggle-content">
                  <span className="toggle-title">Enable Webhooks</span>
                  <span className="toggle-description">
                    Receive real-time notifications about order and inventory
                    changes
                  </span>
                </div>
              </label>
            </div>

            {localSettings.webhookEnabled && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="webhookUrl" className="form-label">
                      Webhook URL *
                    </label>
                    <input
                      type="url"
                      id="webhookUrl"
                      className="form-input"
                      value={localSettings.webhookUrl}
                      onChange={(e) =>
                        handleChange("webhookUrl", e.target.value)
                      }
                      placeholder="https://your-domain.com/webhook"
                      disabled={isLoading}
                    />
                    <span className="form-hint">
                      The URL where webhook notifications will be sent
                    </span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="webhookSecret" className="form-label">
                      Webhook Secret
                    </label>
                    <div className="form-input-group">
                      <input
                        type={showSecrets.webhookSecret ? "text" : "password"}
                        id="webhookSecret"
                        className="form-input"
                        value={localSettings.webhookSecret}
                        onChange={(e) =>
                          handleChange("webhookSecret", e.target.value)
                        }
                        placeholder="Enter webhook secret for verification"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="form-input-addon"
                        onClick={() => toggleSecretVisibility("webhookSecret")}
                      >
                        {showSecrets.webhookSecret ? (
                          <EyeSlashIcon className="form-icon" />
                        ) : (
                          <EyeIcon className="form-icon" />
                        )}
                      </button>
                    </div>
                    <span className="form-hint">
                      Optional secret key for webhook signature verification
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Integration Status Overview */}
      <div className="card card-info">
        <div className="card-content">
          <div className="alert alert-info">
            <InformationCircleIcon className="alert-icon" />
            <div className="alert-content">
              <h4 className="alert-title">Integration Status</h4>
              <div className="integration-status-grid">
                <div className="status-item">
                  <span className="status-label">Active Platforms:</span>
                  <span className="status-value">
                    {
                      [
                        localSettings.trendyolEnabled,
                        localSettings.hepsiburadaEnabled,
                        localSettings.n11Enabled,
                      ].filter(Boolean).length
                    }{" "}
                    / 3
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Next Sync:</span>
                  <span className="status-value">
                    {localSettings.syncInterval} minutes
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Real-time Sync:</span>
                  <span className="status-value">
                    {localSettings.enableRealTimeSync ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings;
