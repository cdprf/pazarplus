/**
 * Text Validation Indicator Component
 * Shows inline validation messages and encoding issues
 */

import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import fontService from "../../../../services/fontService";

const TextValidationIndicator = ({
  text,
  fontFamily,
  className = "",
  inline = true,
  showDetailsButton = true,
}) => {
  const [validation, setValidation] = useState(null);
  const [showDetails, setShowDetailsState] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const validateText = async () => {
      if (!text || !text.trim()) {
        setValidation(null);
        return;
      }

      setLoading(true);
      try {
        const result = await fontService.validateText(text, fontFamily);
        setValidation(result);
      } catch (error) {
        console.error("Text validation failed:", error);
        setValidation(null);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(validateText, 300); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [text, fontFamily]);

  if (loading || !validation) {
    return null;
  }

  // Don't show anything if validation is perfect
  if (
    validation.isValid &&
    !validation.fontChanged &&
    !validation.hasComplexUnicode
  ) {
    return null;
  }

  const getIcon = () => {
    if (validation.hasEncodingIssues) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (validation.fontChanged) {
      return <Info className="h-4 w-4 text-blue-500" />;
    }
    if (validation.hasComplexUnicode) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Info className="h-4 w-4 text-gray-500" />;
  };

  const getColorClass = () => {
    if (validation.hasEncodingIssues)
      return "border-red-200 bg-red-50 dark:bg-red-900/20";
    if (validation.fontChanged)
      return "border-blue-200 bg-blue-50 dark:bg-blue-900/20";
    if (validation.hasComplexUnicode)
      return "border-green-200 bg-green-50 dark:bg-green-900/20";
    return "border-gray-200 bg-gray-50 dark:bg-gray-900/20";
  };

  const getTextColorClass = () => {
    if (validation.hasEncodingIssues) return "text-red-700 dark:text-red-300";
    if (validation.fontChanged) return "text-blue-700 dark:text-blue-300";
    if (validation.hasComplexUnicode)
      return "text-green-700 dark:text-green-300";
    return "text-gray-700 dark:text-gray-300";
  };

  const primarySuggestion = validation.suggestions[0];
  if (!primarySuggestion) return null;

  if (inline) {
    return (
      <div
        className={`flex items-start space-x-2 text-xs p-2 rounded border ${getColorClass()} ${className}`}
      >
        {getIcon()}
        <div className="flex-1">
          <div className={`font-medium ${getTextColorClass()}`}>
            {primarySuggestion.message}
          </div>
          {validation.fontChanged && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Recommended font: {validation.recommendedFont}
            </div>
          )}
          {validation.hasEncodingIssues &&
            validation.processedText !== text && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span className="font-medium">Original:</span>{" "}
                {text.substring(0, 50)}...
                <br />
                <span className="font-medium">Processed:</span>{" "}
                {validation.processedText.substring(0, 50)}...
              </div>
            )}
        </div>
      </div>
    );
  }

  // Floating indicator
  return (
    <div className={`absolute top-0 right-0 z-10 ${className}`}>
      <button
        onClick={() => setShowDetailsState(!showDetails)}
        className={`p-1 rounded-full border shadow-sm ${getColorClass()} hover:shadow-md transition-shadow`}
        title={primarySuggestion.message}
      >
        {getIcon()}
      </button>

      {showDetails && (
        <div
          className={`absolute top-full right-0 mt-1 w-72 p-3 rounded border shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 z-20`}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Text Validation
            </h4>
            <button
              onClick={() => setShowDetailsState(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {validation.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded ${
                  suggestion.type === "error"
                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    : suggestion.type === "info"
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                }`}
              >
                <div className="flex items-start space-x-2">
                  {suggestion.type === "error" ? (
                    <AlertTriangle className="h-3 w-3 mt-0.5" />
                  ) : suggestion.type === "info" ? (
                    <Info className="h-3 w-3 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-3 w-3 mt-0.5" />
                  )}
                  <span>{suggestion.message}</span>
                </div>
              </div>
            ))}

            {validation.fontChanged && (
              <div className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Font Recommendation:
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Switch to{" "}
                  <span className="font-mono">
                    {validation.recommendedFont}
                  </span>{" "}
                  for better character support
                </div>
              </div>
            )}

            {validation.hasEncodingIssues && (
              <div className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Encoding Issues Detected:
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {validation.issues.map((issue, index) => (
                    <div key={index}>• {issue}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowDetailsState(false)}
        />
      )}
    </div>
  );
};

export default TextValidationIndicator;
