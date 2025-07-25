import logger from "../../../../utils/logger.js";
/**
 * Enhanced Font Selector Component
 * Provides a dropdown for selecting fonts with validation and preview
 */

import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, AlertTriangle, CheckCircle, Info } from "lucide-react";
import fontService from "../../../../services/fontService";

const FontSelector = ({
  value,
  onChange,
  textContent = "",
  className = "",
  disabled = false,
  showValidation = true,
  placeholder = "Select font...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fontOptions, setFontOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState(null);
  const [groupedOptions, setGroupedOptions] = useState([]);

  // Load available fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        setLoading(true);
        const [options, grouped] = await Promise.all([
          fontService.getFontOptions(),
          fontService.getGroupedFontOptions(),
        ]);
        setFontOptions(options);
        setGroupedOptions(grouped);
      } catch (error) {
        logger.error("Failed to load fonts:", error);
        // Use fallback fonts
        const fallbackFonts = fontService.getFallbackFonts();
        setFontOptions(
          fallbackFonts.map((f) => ({
            value: f.family,
            label: f.name,
            category: f.category,
            unicodeSupport: f.unicodeSupport,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    loadFonts();
  }, []);

  // Validate text with selected font
  const validateText = useCallback(async () => {
    if (!showValidation || !textContent || !value) {
      setValidation(null);
      return;
    }

    try {
      const result = await fontService.validateText(textContent, value);
      setValidation(result);
    } catch (error) {
      logger.error("Text validation failed:", error);
      setValidation(null);
    }
  }, [textContent, value, showValidation]);

  useEffect(() => {
    validateText();
  }, [validateText]);

  const handleFontSelect = (fontFamily) => {
    onChange(fontFamily);
    setIsOpen(false);
  };

  const selectedFont = fontOptions.find((f) => f.value === value);

  const getValidationIcon = () => {
    if (!validation) return null;

    if (validation.hasEncodingIssues) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }

    if (validation.fontChanged) {
      return <Info className="h-4 w-4 text-blue-500" />;
    }

    if (validation.hasComplexUnicode) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    return null;
  };

  const getValidationMessage = () => {
    if (!validation || !validation.suggestions.length) return null;

    const primarySuggestion = validation.suggestions[0];
    return (
      <div
        className={`text-xs mt-1 ${
          primarySuggestion.type === "error"
            ? "text-red-600"
            : primarySuggestion.type === "info"
            ? "text-blue-600"
            : "text-green-600"
        }`}
      >
        {primarySuggestion.message}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Font Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border rounded-md bg-white dark:bg-gray-800 
          ${
            disabled
              ? "border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
              : "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500"
          } transition-colors duration-200 flex items-center justify-between`}
      >
        <div className="flex items-center space-x-2">
          <span
            className={
              selectedFont
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-500"
            }
          >
            {selectedFont ? selectedFont.label : placeholder}
          </span>
          {selectedFont?.unicodeSupport && (
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded">
              Unicode
            </span>
          )}
          {getValidationIcon()}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Validation Message */}
      {getValidationMessage()}

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {groupedOptions.length > 0
            ? groupedOptions.map((group, groupIndex) => (
                <div key={group.label}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    {group.label}
                  </div>
                  {group.options.map((font, fontIndex) => (
                    <button
                      key={font.value}
                      onClick={() => handleFontSelect(font.value)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between
                      ${
                        value === font.value
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "text-gray-900 dark:text-gray-100"
                      }
                    `}
                    >
                      <span style={{ fontFamily: font.value }}>
                        {font.label}
                      </span>
                      {font.unicodeSupport && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded ml-2">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                  {groupIndex < groupedOptions.length - 1 && (
                    <div className="border-b border-gray-200 dark:border-gray-600"></div>
                  )}
                </div>
              ))
            : fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => handleFontSelect(font.value)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between
                  ${
                    value === font.value
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "text-gray-900 dark:text-gray-100"
                  }
                `}
                >
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                  {font.unicodeSupport && (
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded ml-2">
                      Unicode
                    </span>
                  )}
                </button>
              ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default FontSelector;
