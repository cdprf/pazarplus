import logger from "../../../utils/logger";
import React, { useState, useEffect } from "react";
import {
  Settings,
  PlayCircle,
  PauseCircle,
  Save,
  RefreshCw,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { Button, Card, Badge } from "../../ui";
import { variantDetectionConfigAPI } from "../../../services/variantDetectionConfigAPI";

// Pattern Generator Component
const PatternGenerator = ({ onPatternGenerated }) => {
  const [inputText, setInputText] = useState("");
  const [patternType, setPatternType] = useState("color");
  const [generatedPattern, setGeneratedPattern] = useState("");
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [searchingDB, setSearchingDB] = useState(false);
  const [searchFields, setSearchFields] = useState({
    name: true,
    sku: true,
    description: false,
  });

  // Parse structured pattern notation
  const parseStructuredPattern = (input) => {
    try {
      // Replace pattern notation with regex equivalents
      let pattern = input;

      // Handle field(min-max) notation - range
      pattern = pattern.replace(
        /(\w+)\((\d+)-(\d+)\)/g,
        (match, fieldName, min, max) => {
          return `([A-Za-z0-9]{${min},${max}})`;
        }
      );

      // Handle field(exact) notation - exact length
      pattern = pattern.replace(
        /(\w+)\((\d+)\)/g,
        (match, fieldName, length) => {
          return `([A-Za-z0-9]{${length}})`;
        }
      );

      // Handle digit placeholders (000, 0000, etc.) - any sequence of 0s represents changing digits
      pattern = pattern.replace(/0+/g, (match) => {
        const digitCount = match.length;
        return `(\\d{${digitCount}})`;
      });

      // Escape literal colons that should be matched
      pattern = pattern.replace(/:/g, ":");

      // Add word boundaries to ensure complete match
      pattern = `^${pattern}$`;

      return pattern;
    } catch (error) {
      return `Error parsing pattern: ${error.message}`;
    }
  };

  const generatePattern = () => {
    if (!inputText.trim()) {
      setGeneratedPattern("");
      return;
    }

    let pattern = "";
    const cleanInput = inputText.trim();

    if (patternType === "color") {
      // Generate color pattern
      if (cleanInput.includes(":")) {
        // Handle "color: red" format
        pattern = `(?:color|colour|renk):\\s*${cleanInput
          .split(":")[1]
          .trim()}`;
      } else {
        // Handle standalone color words
        pattern = `(?:^|\\s)(${cleanInput.toLowerCase()})(?:\\s|$)`;
      }
    } else if (patternType === "size") {
      // Generate size pattern
      if (cleanInput.includes(":")) {
        // Handle "size: M" format
        pattern = `(?:size|beden):\\s*${cleanInput.split(":")[1].trim()}`;
      } else {
        // Handle standalone size
        pattern = `(?:^|\\s)(${cleanInput.toUpperCase()})(?:\\s|$)`;
      }
    } else if (patternType === "model") {
      // Generate model pattern
      if (cleanInput.includes(":")) {
        // Handle "model: XYZ" format
        pattern = `(?:model|tip):\\s*${cleanInput.split(":")[1].trim()}`;
      } else {
        // Handle standalone model
        pattern = `(?:^|\\s)(${cleanInput})(?:\\s|$)`;
      }
    } else if (patternType === "structured") {
      // Parse structured pattern like: brand(2)productType(1-4):model(2-8)000:variants
      pattern = parseStructuredPattern(cleanInput);

      // Set default test text if none exists
      if (
        !testText &&
        cleanInput === "brand(2)productType(1-4):model(2-8)000:variants"
      ) {
        setTestText(
          "ABCD:Pro123456:variants\nXYPhone:iPhone12789:variants\nZZTV:Samsung1001:variants\nABCDE:Model999:variants\nInvalidPattern\nABC:Toolong123:variants"
        );
      }
    } else if (patternType === "custom") {
      // For custom patterns, escape special regex characters and create a flexible pattern
      const escaped = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pattern = `(?:^|\\s)(${escaped})(?:\\s|$)`;
    }

    setGeneratedPattern(pattern);
  };

  const testPattern = async () => {
    if (!generatedPattern) {
      setTestResult(null);
      return;
    }

    setSearchingDB(true);
    try {
      const response = await fetch("/api/products/search-by-pattern", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          pattern: generatedPattern,
          searchFields: searchFields,
          limit: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logger.info("Pattern search response:", data); // Debug log
        setTestResult({
          success: true,
          matches: data.data?.matches || data.matches || [],
          matchCount: data.data?.matchCount || data.matchCount || 0,
          totalProducts: data.data?.totalProducts || data.totalProducts || 0,
          searchFields: data.data?.searchFields || data.searchFields || [],
        });
      } else {
        const errorData = await response.json();
        logger.info("Pattern search error:", errorData); // Debug log
        setTestResult({
          success: false,
          error: errorData.message || "Failed to search database",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: "Database search failed: " + error.message,
      });
    } finally {
      setSearchingDB(false);
    }
  };

  const copyPattern = async () => {
    if (generatedPattern) {
      try {
        await navigator.clipboard.writeText(generatedPattern);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        logger.error("Failed to copy pattern:", error);
      }
    }
  };

  const addToConfig = () => {
    if (generatedPattern && onPatternGenerated) {
      onPatternGenerated(generatedPattern, patternType);
      setInputText("");
      setGeneratedPattern("");
      setTestText("");
      setTestResult(null);
    }
  };

  useEffect(() => {
    generatePattern();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, patternType]);

  useEffect(() => {
    if (generatedPattern) {
      testPattern();
    } else {
      setTestResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedPattern, searchFields]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Section */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Type
            </label>
            <select
              value={patternType}
              onChange={(e) => setPatternType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="color">Color Pattern</option>
              <option value="size">Size Pattern</option>
              <option value="model">Model Pattern</option>
              <option value="structured">Structured Pattern</option>
              <option value="custom">Custom Pattern</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input Text
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                patternType === "color"
                  ? 'e.g., "red" or "color: blue"'
                  : patternType === "size"
                  ? 'e.g., "M" or "size: Large"'
                  : patternType === "model"
                  ? 'e.g., "Pro" or "model: iPhone 12"'
                  : patternType === "structured"
                  ? 'e.g., "brand(2)productType(1-4):model(2-8)000:variants" or "SKU-0000-00"'
                  : "Enter text to generate pattern"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Generated Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Generated Regex Pattern
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={generatedPattern}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                placeholder="Pattern will appear here..."
              />
              <Button
                onClick={copyPattern}
                variant="outline"
                size="sm"
                disabled={!generatedPattern}
                icon={copied ? Check : Copy}
                className={copied ? "text-green-600" : ""}
              />
            </div>
          </div>
        </div>

        {/* Test Pattern Results Section */}
        <div className="space-y-3">
          {/* Test Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Text
            </label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to test the pattern against..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 resize-none"
            />
          </div>

          {/* Database Search Section */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Database Fields
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchFields.name}
                    onChange={(e) =>
                      setSearchFields((prev) => ({
                        ...prev,
                        name: e.target.checked,
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Product Names</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchFields.sku}
                    onChange={(e) =>
                      setSearchFields((prev) => ({
                        ...prev,
                        sku: e.target.checked,
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">SKU Codes</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchFields.description}
                    onChange={(e) =>
                      setSearchFields((prev) => ({
                        ...prev,
                        description: e.target.checked,
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Descriptions</span>
                </label>
              </div>

              {/* Test Connection Button */}
              <div className="mt-3">
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/products?limit=5", {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem(
                            "token"
                          )}`,
                        },
                      });
                      const data = await response.json();
                      logger.info("Products API test:", data);

                      if (response.ok && data.data?.products) {
                        alert(
                          `Found ${
                            data.data.total || data.data.products.length
                          } products in database`
                        );
                      } else {
                        alert(
                          "No products found or API error: " +
                            (data.message || "Unknown error")
                        );
                      }
                    } catch (error) {
                      alert("Connection failed: " + error.message);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  🔗 Test DB Connection
                </Button>
              </div>

              {searchingDB && (
                <div className="mt-2 text-sm text-blue-600 flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Searching database...
                </div>
              )}
            </div>

            {/* Database Search Results */}
            {testResult && (
              <div
                className={`p-3 rounded-md ${
                  testResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="text-sm">
                  {testResult.success ? (
                    <div>
                      <div className="font-medium text-green-800 mb-1">
                        Found {testResult.matchCount} match
                        {testResult.matchCount !== 1 ? "es" : ""}
                        {testResult.totalSearched
                          ? ` (searched ${testResult.totalSearched} products)`
                          : testResult.totalProducts
                          ? ` out of ${testResult.totalProducts} products`
                          : ""}
                        {testResult.hasMoreMatches && (
                          <span className="text-amber-600 ml-2">
                            + more matches found
                          </span>
                        )}
                      </div>
                      {testResult.matches.length > 0 ? (
                        <div className="text-green-700">
                          <div className="mb-2">Matches:</div>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {testResult.matches.map((match, i) => (
                              <div
                                key={i}
                                className="bg-green-100 px-2 py-1 rounded text-xs"
                              >
                                <div className="font-mono">
                                  "{match.matchedText}"
                                </div>
                                <div className="text-green-600 text-xs">
                                  {match.productName &&
                                    `Product: ${match.productName}`}
                                  {match.field && ` (${match.field})`}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-yellow-700 mt-2">
                          <div className="font-medium mb-1">
                            No matches found in database
                          </div>
                          <div className="text-xs">
                            <div className="mb-1">
                              Pattern:{" "}
                              <span className="font-mono bg-gray-100 px-1 rounded">
                                {generatedPattern}
                              </span>
                            </div>
                            <div className="mb-1">
                              Searched in:{" "}
                              {Object.entries(searchFields)
                                .filter(([_, enabled]) => enabled)
                                .map(([field, _]) => field)
                                .join(", ")}
                            </div>
                            {testResult.totalProducts === 0 ? (
                              <div className="text-yellow-600">
                                💡 No products found in database.
                                <br />
                                <span className="text-xs">
                                  Click "🔗 Test DB Connection" above to verify
                                  your database connection, or add some products
                                  first.
                                </span>
                              </div>
                            ) : (
                              <div className="text-yellow-600">
                                💡 Try adjusting your pattern or enable more
                                search fields.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Debug Info */}
                      {debugMode && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <div className="font-medium mb-1">Debug Info:</div>
                          <div>Pattern Type: {patternType}</div>
                          <div>
                            Generated Regex:{" "}
                            <span className="font-mono">
                              {generatedPattern}
                            </span>
                          </div>
                          <div>
                            Search Fields:{" "}
                            {Object.entries(searchFields)
                              .filter(([_, enabled]) => enabled)
                              .map(([field, _]) => field)
                              .join(", ")}
                          </div>
                          <div>Total Products: {testResult.totalProducts}</div>
                          <div>
                            Products Searched:{" "}
                            {testResult.totalSearched ||
                              testResult.totalProducts}
                          </div>
                          <div>Matches Found: {testResult.matchCount}</div>
                          {testResult.totalMatching && (
                            <div>
                              Total Matching Products:{" "}
                              {testResult.totalMatching}
                            </div>
                          )}
                          {testResult.usedFallback && (
                            <div className="text-amber-600">
                              Used JavaScript fallback search
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-800">
                      <div className="font-medium mb-1">Search Error</div>
                      <div className="text-red-700">{testResult.error}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Debug Toggle */}
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="debugMode"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="debugMode" className="text-xs text-gray-600">
                Show debug information
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
        <Button
          onClick={addToConfig}
          disabled={!generatedPattern}
          className="bg-green-600 hover:bg-green-700"
        >
          Add to {patternType.charAt(0).toUpperCase() + patternType.slice(1)}{" "}
          Patterns
        </Button>
      </div>

      {/* Examples */}
      <div className="bg-gray-50 p-3 rounded-md">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">Example inputs:</div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <strong>Color:</strong> "red", "color: blue", "renk: siyah"
              </div>
              <div>
                <strong>Size:</strong> "M", "size: Large", "beden: 42"
              </div>
              <div>
                <strong>Model:</strong> "Pro", "model: iPhone 12", "tip:
                Premium"
              </div>
            </div>
            <div className="mt-2 p-2 bg-blue-50 rounded border">
              <div>
                <strong>Structured Pattern Examples:</strong>
              </div>
              <div className="mt-1 space-y-1 text-xs">
                <div className="font-mono">
                  brand(2)productType(1-4):model(2-8)000:variants
                </div>
                <div className="text-gray-600 ml-2">
                  → ABCD:Pro123456:variants, XYPhone:iPhone12789:variants
                </div>

                <div className="font-mono mt-2">SKU-0000-00</div>
                <div className="text-gray-600 ml-2">
                  → SKU-1234-56, SKU-9876-01
                </div>

                <div className="font-mono mt-2">
                  product(3):size(1-2):color(3-10)_000
                </div>
                <div className="text-gray-600 ml-2">
                  → ABC:M:red_123, XYZ:XL:blue_456
                </div>
              </div>
              <div className="mt-2">
                <span className="text-blue-600">Notation:</span>
                <div className="ml-2 mt-1 space-y-1 text-xs">
                  <div>• field(exact) = exactly N characters</div>
                  <div>• field(min-max) = range of characters</div>
                  <div>• 000, 0000 = changing digits (3 digits, 4 digits)</div>
                  <div>• : = literal colon</div>
                  <div>• text = literal text</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VariantDetectionConfigurationPage = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState({
    minConfidenceThreshold: 0.5,
    processOnCreate: true,
    processOnUpdate: true,
    reprocessInterval: 24 * 60 * 60 * 1000, // 24 hours in ms
    batchSize: 10,
    processInterval: 5 * 60 * 1000, // 5 minutes in ms
    maxProcessingTime: 2 * 60 * 1000, // 2 minutes in ms
    enableAutoDetection: true,
    enableSKUAnalysis: true,
    enablePlatformDataAnalysis: true,
    enableTextAnalysis: true,
    colorPatterns: [
      "(?:color|colour|renk):\\s*([^,;]+)",
      "(?:^|\\s)(black|white|red|blue|green|yellow|pink|purple|orange|gray|grey|brown)(?:\\s|$)",
    ],
    sizePatterns: [
      "(?:size|beden):\\s*([^,;]+)",
      "(?:^|\\s)(xs|s|m|l|xl|xxl|xxxl|\\d+)(?:\\s|$)",
    ],
    modelPatterns: ["(?:model|tip):\\s*([^,;]+)"],
    structuredPatterns: [],
    customPatterns: [],
  });
  const [originalConfig, setOriginalConfig] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Load current status and configuration
  useEffect(() => {
    const loadData = async () => {
      await loadStatus();
      await loadConfig();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = async () => {
    try {
      const response = await variantDetectionConfigAPI.getStatus();
      setStatus(response.data);
    } catch (error) {
      logger.error("Error loading status:", error);
      addAlert("Failed to load service status", "error");
    }
  };

  const loadConfig = async () => {
    try {
      const response = await variantDetectionConfigAPI.getConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        setOriginalConfig({ ...response.data });
        logger.info("Loaded configuration from server:", response.data);
      } else {
        logger.warn("Failed to load config from server, using defaults");
        setOriginalConfig({ ...config });
      }
    } catch (error) {
      logger.error("Error loading configuration:", error);
      addAlert("Failed to load configuration, using defaults", "warning");
      setOriginalConfig({ ...config });
    }
  };

  const addAlert = (message, type = "info") => {
    const alert = { id: Date.now(), message, type };
    setAlerts((prev) => [...prev, alert]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }, 5000);
  };

  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayChange = (key, index, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addPattern = (key) => {
    setConfig((prev) => ({
      ...prev,
      [key]: [...prev[key], ""],
    }));
  };

  const removePattern = (key, index) => {
    setConfig((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const startService = async () => {
    setLoading(true);
    try {
      // Always pass current configuration when starting the service
      await variantDetectionConfigAPI.startService(config);
      setOriginalConfig({ ...config });
      addAlert(
        "Background variant detection service started with current settings",
        "success"
      );
      await loadStatus();
    } catch (error) {
      logger.error("Error starting service:", error);
      addAlert("Failed to start service", "error");
    } finally {
      setLoading(false);
    }
  };

  const stopService = async () => {
    setLoading(true);
    try {
      await variantDetectionConfigAPI.stopService();
      addAlert("Background variant detection service stopped", "success");
      await loadStatus();
    } catch (error) {
      logger.error("Error stopping service:", error);
      addAlert("Failed to stop service", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      await variantDetectionConfigAPI.updateConfig(config);
      setOriginalConfig({ ...config });

      if (status?.isRunning) {
        addAlert(
          "Configuration saved. Restart service to apply new settings.",
          "warning"
        );
      } else {
        addAlert("Configuration saved successfully", "success");
      }

      await loadStatus();
    } catch (error) {
      logger.error("Error saving configuration:", error);
      addAlert("Failed to save configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = () => {
    setConfig({ ...originalConfig });
    addAlert("Configuration reset to last saved state", "info");
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Variant Detection Configuration
          </h1>
          <p className="text-gray-600 mt-2">
            Configure automatic variant detection settings and patterns
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {status && (
            <Badge
              variant={status.isRunning ? "success" : "secondary"}
              className="flex items-center gap-2"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  status.isRunning ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {status.isRunning ? "Running" : "Stopped"}
            </Badge>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border ${
            alert.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : alert.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : alert.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {alert.message}
        </div>
      ))}

      {/* Service Control */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Service Control
            </h2>
            <p className="text-gray-600">
              Start or stop the background variant detection service
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={loadStatus}
              variant="outline"
              icon={RefreshCw}
              disabled={loading}
            >
              Refresh Status
            </Button>
            {status?.isRunning ? (
              <Button
                onClick={stopService}
                variant="danger"
                icon={PauseCircle}
                disabled={loading}
              >
                Stop Service
              </Button>
            ) : (
              <Button
                onClick={startService}
                variant="primary"
                icon={PlayCircle}
                disabled={loading}
              >
                Start Service
              </Button>
            )}
          </div>
        </div>

        {/* Warning for unsaved changes while service is running */}
        {hasChanges && status?.isRunning && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-amber-500 mt-0.5">⚠️</div>
              <div>
                <div className="font-medium text-amber-800">
                  Configuration Changes Detected
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  You have unsaved configuration changes. The running service is
                  using the previous settings. Stop and restart the service or
                  click "Start Service" to apply new settings.
                </div>
              </div>
            </div>
          </div>
        )}

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Last Run</div>
              <div className="font-semibold">
                {status.lastRunTime
                  ? new Date(status.lastRunTime).toLocaleString()
                  : "Never"}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Products Processed</div>
              <div className="font-semibold">{status.totalProcessed || 0}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Next Run</div>
              <div className="font-semibold">
                {status.isRunning
                  ? status.nextRunEstimate
                    ? `In ${Math.ceil(
                        (status.nextRunEstimate - Date.now()) / (1000 * 60)
                      )} min`
                    : "In Progress"
                  : "Service Stopped"}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Configuration */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Detection Configuration</h2>
            <p className="text-gray-600">
              Configure how the variant detection algorithm works
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <Button onClick={resetConfig} variant="outline">
                Reset Changes
              </Button>
            )}
            <Button
              onClick={saveConfig}
              variant="primary"
              icon={Save}
              disabled={loading || !hasChanges}
            >
              Save Configuration
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Settings</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Confidence Threshold
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.minConfidenceThreshold}
                onChange={(e) =>
                  handleConfigChange(
                    "minConfidenceThreshold",
                    parseFloat(e.target.value)
                  )
                }
                className="w-full"
              />
              <div className="text-sm text-gray-500 mt-1">
                Current: {Math.round(config.minConfidenceThreshold * 100)}%
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.batchSize}
                onChange={(e) =>
                  handleConfigChange("batchSize", parseInt(e.target.value))
                }
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <div className="text-sm text-gray-500 mt-1">
                Number of products to process at once
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Process Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.processInterval / (60 * 1000)}
                onChange={(e) =>
                  handleConfigChange(
                    "processInterval",
                    parseInt(e.target.value) * 60 * 1000
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <div className="text-sm text-gray-500 mt-1">
                How often to run detection
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Detection Features</h3>

            {[
              {
                key: "enableAutoDetection",
                label: "Enable Auto Detection",
                desc: "Automatically detect variants",
              },
              {
                key: "processOnCreate",
                label: "Process on Create",
                desc: "Analyze new products immediately",
              },
              {
                key: "processOnUpdate",
                label: "Process on Update",
                desc: "Analyze updated products",
              },
              {
                key: "enableSKUAnalysis",
                label: "SKU Analysis",
                desc: "Analyze SKU patterns for variants",
              },
              {
                key: "enablePlatformDataAnalysis",
                label: "Platform Data Analysis",
                desc: "Analyze platform-specific data",
              },
              {
                key: "enableTextAnalysis",
                label: "Text Analysis",
                desc: "Analyze product names and descriptions",
              },
            ].map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex items-center space-x-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={(e) => handleConfigChange(key, e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">{label}</div>
                  <div className="text-sm text-gray-500">{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Pattern Configuration */}
        <div className="mt-8 space-y-6">
          <h3 className="text-lg font-medium">Detection Patterns</h3>

          {[
            {
              key: "colorPatterns",
              label: "Color Patterns",
              desc: "Patterns to detect color variants",
            },
            {
              key: "sizePatterns",
              label: "Size Patterns",
              desc: "Patterns to detect size variants",
            },
            {
              key: "modelPatterns",
              label: "Model Patterns",
              desc: "Patterns to detect model variants",
            },
            {
              key: "structuredPatterns",
              label: "Structured Patterns",
              desc: "Complex structured patterns with field notation",
            },
            {
              key: "customPatterns",
              label: "Custom Patterns",
              desc: "Custom regex patterns for specific use cases",
            },
          ].map(({ key, label, desc }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{label}</h4>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
                <Button
                  onClick={() => addPattern(key)}
                  variant="outline"
                  size="sm"
                >
                  Add Pattern
                </Button>
              </div>

              <div className="space-y-2">
                {config[key] && config[key].length > 0 ? (
                  config[key].map((pattern, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={pattern}
                        onChange={(e) =>
                          handleArrayChange(key, index, e.target.value)
                        }
                        placeholder={
                          key === "structuredPatterns"
                            ? "e.g., brand(2)productType(1-4):model(2-8)000:variants"
                            : "Enter regex pattern..."
                        }
                        className="flex-1 p-2 border border-gray-300 rounded-md font-mono text-sm"
                      />
                      <Button
                        onClick={() => removePattern(key, index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic p-2 border border-dashed border-gray-300 rounded-md">
                    No patterns configured. Use the Pattern Generator below or
                    click "Add Pattern" to create one.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Pattern Configuration Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Use regex patterns to match variant indicators in product data
                </li>
                <li>
                  Color patterns help identify color variants (e.g., "red",
                  "blue")
                </li>
                <li>
                  Size patterns match size indicators (e.g., "S", "M", "L")
                </li>
                <li>Model patterns identify different model variants</li>
                <li>
                  Structured patterns use field notation: field(length) or
                  field(min-max)
                </li>
                <li>
                  Custom patterns for specific business logic and edge cases
                </li>
                <li>
                  Test patterns carefully before applying to large datasets
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Pattern Generator Section */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Pattern Generator
          </h3>
        </div>

        <PatternGenerator
          onPatternGenerated={(pattern, type) => {
            // Add the generated pattern to the appropriate array
            let arrayKey = "";
            switch (type) {
              case "color":
                arrayKey = "colorPatterns";
                break;
              case "size":
                arrayKey = "sizePatterns";
                break;
              case "model":
                arrayKey = "modelPatterns";
                break;
              case "structured":
                arrayKey = "structuredPatterns";
                break;
              case "custom":
                arrayKey = "customPatterns";
                break;
              default:
                arrayKey = "customPatterns"; // fallback
            }

            // Add the pattern directly to the config
            setConfig((prev) => ({
              ...prev,
              [arrayKey]: [...prev[arrayKey], pattern],
            }));

            addAlert(
              `Pattern added to ${type} patterns: ${pattern}`,
              "success"
            );
          }}
        />
      </Card>
    </div>
  );
};

export default VariantDetectionConfigurationPage;
