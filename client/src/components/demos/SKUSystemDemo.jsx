/**
 * SKU System Demo Component
 * Demonstrates the enhanced intelligent barcode/SKU classification system
 */

import React, { useState } from "react";
import { AlertCircle, Info, Zap, Scan, Tag, Settings } from "lucide-react";
import { skuSystemAPI } from "../../services/skuSystemAPI";

const SKUSystemDemo = () => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState("classify");

  // Test codes for demonstration
  const testCodes = {
    barcodes: [
      "8690632021850",
      "123456789012",
      "9781234567890",
      "012345678905",
    ],
    skus: [
      "NIKE-AIR-001",
      "ADIDAS-RUN-002",
      "COMPANYSHOE-NIKE001-BLK",
      "APPLE-IPHONE-256",
      "SAMSUNG-TV-55",
    ],
  };

  const processCode = async (code) => {
    setLoading(true);
    try {
      const response = await skuSystemAPI.processCode(code);
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      processCode(input.trim());
    }
  };

  const handleTestCode = (code) => {
    setInput(code);
    processCode(code);
  };

  const renderClassificationResult = () => {
    if (!result) return null;

    if (!result.success) {
      return (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {result.error}
              </p>
            </div>
          </div>
        </div>
      );
    }

    const { classification, actions } = result;
    const isBarcode = classification.type === "barcode";
    const isSKU = classification.type === "sku";

    return (
      <div className="mt-4 space-y-4">
        {/* Classification Result */}
        <div
          className={`p-4 border rounded-lg ${
            isBarcode
              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
              : isSKU
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {isBarcode ? (
                <Scan className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              ) : isSKU ? (
                <Tag className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <Info className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold ${
                  isBarcode
                    ? "text-yellow-800 dark:text-yellow-200"
                    : isSKU
                    ? "text-green-800 dark:text-green-200"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {isBarcode
                  ? "Barcode Detected"
                  : isSKU
                  ? "SKU Recognized"
                  : "Unknown Pattern"}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  isBarcode
                    ? "text-yellow-700 dark:text-yellow-300"
                    : isSKU
                    ? "text-green-700 dark:text-green-300"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {classification.reason}
              </p>
              <div className="mt-2 text-xs space-y-1">
                <div>
                  Confidence: {Math.round(classification.confidence * 100)}%
                </div>
                <div>Original: {classification.original}</div>
                <div>Normalized: {classification.normalized}</div>
                {classification.pattern && (
                  <div>Pattern: {classification.pattern}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Parsed SKU Components */}
        {isSKU && result.sku?.parsed && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Parsed Components
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="font-medium">Raw:</span>{" "}
                {result.sku.parsed.raw}
              </div>
              <div>
                <span className="font-medium">Prefix:</span>{" "}
                {result.sku.parsed.prefix || "N/A"}
              </div>
              <div>
                <span className="font-medium">Main:</span>{" "}
                {result.sku.parsed.main || "N/A"}
              </div>
              <div>
                <span className="font-medium">Suffix:</span>{" "}
                {result.sku.parsed.suffix || "N/A"}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Suggested Actions
            </h4>
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className={`p-3 rounded text-sm border ${
                    action.priority === "high"
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
                      : action.priority === "medium"
                      ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="font-medium">{action.message}</div>
                  <div className="text-xs mt-1 opacity-75">
                    Priority: {action.priority} | Action: {action.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Intelligent SKU System Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the enhanced barcode detection and SKU classification system
        </p>
      </div>

      {/* Demo Mode Selector */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setDemoMode("classify")}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            demoMode === "classify"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Classification</span>
        </button>
        <button
          onClick={() => setDemoMode("management")}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            demoMode === "management"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Data Management</span>
        </button>
      </div>

      {demoMode === "classify" && (
        <>
          {/* Input Form */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter Code (Barcode or SKU)
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter a barcode or SKU to classify..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors"
              >
                {loading ? "Processing..." : "Classify Code"}
              </button>
            </form>
          </div>

          {/* Test Codes */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sample Barcodes */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Sample Barcodes
              </h3>
              <div className="space-y-2">
                {testCodes.barcodes.map((code, index) => (
                  <button
                    key={index}
                    onClick={() => handleTestCode(code)}
                    className="w-full text-left px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded text-sm font-mono transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample SKUs */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Sample SKUs
              </h3>
              <div className="space-y-2">
                {testCodes.skus.map((code, index) => (
                  <button
                    key={index}
                    onClick={() => handleTestCode(code)}
                    className="w-full text-left px-3 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded text-sm font-mono transition-colors"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {renderClassificationResult()}
        </>
      )}

      {demoMode === "management" && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Data Management
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Data management interface coming soon. This will allow users to:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600 dark:text-gray-400">
            <li>Add and manage brand codes</li>
            <li>Define custom product types</li>
            <li>Create and edit SKU patterns</li>
            <li>Map barcodes to SKUs</li>
            <li>Import data from connected platforms</li>
            <li>Export and backup SKU data</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SKUSystemDemo;
