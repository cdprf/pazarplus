import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import {
  Image,
  Move,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Settings,
  Palette,
  Type,
} from "lucide-react";
import {
  DATA_FIELDS,
  DATA_FIELD_CATEGORIES,
  getFieldsByCategory,
  COMMON_QR_FIELDS,
  BARCODE_FORMATS as COMMON_BARCODE_FIELDS,
} from "../constants/dataFields.js";
import { elementDefaults } from "../constants/elementDefaults.js";
import { BarcodePropertiesPanel } from "./BarcodePropertySections.jsx";
import FontSelector from "./FontSelector.jsx";
import TextValidationIndicator from "./TextValidationIndicator.jsx";

// Utility functions for consistent value handling
const parseNumericValue = (value, defaultValue = 0, isFloat = false) => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const numericValue = isFloat ? parseFloat(value) : parseInt(value, 10);
  return isNaN(numericValue) ? defaultValue : numericValue;
};

const parseFontSize = (fontSize, defaultSize = 14) => {
  if (!fontSize) return defaultSize;

  if (typeof fontSize === "string") {
    if (fontSize.includes("px")) {
      return parseNumericValue(fontSize.replace("px", ""), defaultSize);
    }
    return parseNumericValue(fontSize, defaultSize);
  }

  return parseNumericValue(fontSize, defaultSize);
};

const validateNumericInput = (value, min = 0, max = 1000) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue))
    return { isValid: false, error: "Geçersiz sayı formatı" };
  if (numValue < min) return { isValid: false, error: `Minimum değer: ${min}` };
  if (numValue > max)
    return { isValid: false, error: `Maksimum değer: ${max}` };
  return { isValid: true, error: null };
};

const formatFontSizeForDisplay = (fontSize) => {
  return parseFontSize(fontSize);
};

const formatFontSizeForStyle = (fontSize) => {
  const numValue = parseFontSize(fontSize);
  return `${numValue}px`;
};

// Enhanced Section Component
const PropertySection = ({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
  className = "",
}) => {
  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg mb-3 ${className}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
        aria-expanded={isExpanded}
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div className="flex items-center space-x-2">
          {Icon && (
            <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div
          className="p-4 border-t border-gray-200 dark:border-gray-700"
          id={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

PropertySection.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

// Error display component
const ErrorMessage = ({ error, id }) =>
  error ? (
    <div id={id} className="text-red-500 text-xs mt-1" role="alert">
      {error}
    </div>
  ) : null;

ErrorMessage.propTypes = {
  error: PropTypes.string,
  id: PropTypes.string.isRequired,
};

// PropertyPanel Component for editing element properties
const PropertyPanel = ({
  element: selectedElement,
  onUpdate: onUpdateElement,
  onRemove: onDeleteElement,
  onDuplicate,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    position: true,
    layout: false,
    style: true,
    content: true,
    // Barcode-specific sections
    barcodeContent: true,
    barcodeBasic: true,
    barcodeText: false,
    barcodeStyle: false,
    barcodeBorder: false,
    barcodeAdvanced: false,
  });

  const [inputErrors, setInputErrors] = useState({});
  const fileInputRef = useRef(null);

  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const clearInputError = useCallback((field) => {
    setInputErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setInputError = useCallback((field, error) => {
    setInputErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const handlePropertyChange = useCallback(
    (property, value) => {
      if (!selectedElement) return;

      const updatedElement = {
        ...selectedElement,
        [property]: value,
      };

      onUpdateElement(updatedElement);
    },
    [selectedElement, onUpdateElement]
  );

  const handleStyleChange = useCallback(
    (styleProperty, value) => {
      if (!selectedElement) return;

      const updatedElement = {
        ...selectedElement,
        style: {
          ...selectedElement.style,
          [styleProperty]: value,
        },
      };

      onUpdateElement(updatedElement);
    },
    [selectedElement, onUpdateElement]
  );

  const handlePositionChange = useCallback(
    (positionProperty, value) => {
      if (!selectedElement) return;

      const validation = validateNumericInput(value, -1000, 1000);
      const fieldKey = `position_${positionProperty}`;

      if (!validation.isValid) {
        setInputError(fieldKey, validation.error);
        return;
      }

      clearInputError(fieldKey);

      const updatedElement = {
        ...selectedElement,
        position: {
          ...selectedElement.position,
          [positionProperty]: parseFloat(value) || 0,
        },
      };

      onUpdateElement(updatedElement);
    },
    [selectedElement, onUpdateElement, setInputError, clearInputError]
  );

  const handleSizeChange = useCallback(
    (sizeProperty, value) => {
      if (!selectedElement) return;

      const validation = validateNumericInput(value, 1, 2000);
      const fieldKey = `size_${sizeProperty}`;

      if (!validation.isValid) {
        setInputError(fieldKey, validation.error);
        return;
      }

      clearInputError(fieldKey);

      const updatedElement = {
        ...selectedElement,
        size: {
          ...selectedElement.size,
          [sizeProperty]: parseFloat(value) || 0,
        },
      };

      onUpdateElement(updatedElement);
    },
    [selectedElement, onUpdateElement, setInputError, clearInputError]
  );

  const handleFontSizeChange = useCallback(
    (value) => {
      if (!selectedElement) return;

      const validation = validateNumericInput(value, 6, 100);
      const fieldKey = "fontSize";

      if (!validation.isValid) {
        setInputError(fieldKey, validation.error);
        return;
      }

      clearInputError(fieldKey);
      handleStyleChange("fontSize", formatFontSizeForStyle(value));
    },
    [selectedElement, handleStyleChange, setInputError, clearInputError]
  );

  const handleImageUpload = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          handlePropertyChange("content", e.target.result);
        };
        reader.readAsDataURL(file);
      }
    },
    [handlePropertyChange]
  );

  const handleDuplicate = useCallback(() => {
    if (!selectedElement || !onDuplicate) return;
    onDuplicate(selectedElement);
  }, [selectedElement, onDuplicate]);

  const handleQuickSizeChange = useCallback(
    (width, height) => {
      if (!selectedElement) return;

      const updatedElement = {
        ...selectedElement,
        size: {
          ...selectedElement.size,
          width: parseFloat(width) || 0,
          height: parseFloat(height) || 0,
        },
      };

      onUpdateElement(updatedElement);
    },
    [selectedElement, onUpdateElement]
  );

  // Optimized event handlers for better performance
  const handleColorChange = useCallback(
    (colorProperty, value) => {
      handleStyleChange(colorProperty, value);
    },
    [handleStyleChange]
  );

  const handleFontWeightChange = useCallback(
    (value) => {
      handleStyleChange("fontWeight", value);
    },
    [handleStyleChange]
  );

  const handleContentChange = useCallback(
    (value) => {
      handlePropertyChange("content", value);
    },
    [handlePropertyChange]
  );

  const handleDataFieldChange = useCallback(
    (value) => {
      handlePropertyChange("dataField", value);
    },
    [handlePropertyChange]
  );

  const handleFontFamilyChange = useCallback(
    (fontFamily) => {
      handleStyleChange("fontFamily", fontFamily);
    },
    [handleStyleChange]
  );

  // Memoized computed values for performance optimization
  const elementType = useMemo(() => {
    return selectedElement?.type?.toUpperCase() || "UNKNOWN";
  }, [selectedElement?.type]);

  const isTextElement = useMemo(() => {
    return selectedElement?.type === "text";
  }, [selectedElement?.type]);

  const isBarcodeElement = useMemo(() => {
    return selectedElement?.type === "barcode";
  }, [selectedElement?.type]);

  const isImageElement = useMemo(() => {
    return selectedElement?.type === "image";
  }, [selectedElement?.type]);

  const isQRElement = useMemo(() => {
    return selectedElement?.type === "qr_code";
  }, [selectedElement?.type]);

  const currentFontSize = useMemo(() => {
    return formatFontSizeForDisplay(selectedElement?.style?.fontSize) || 14;
  }, [selectedElement?.style?.fontSize]);

  const availableDataFields = useMemo(() => {
    if (isBarcodeElement) {
      return COMMON_BARCODE_FIELDS;
    } else if (isQRElement) {
      return COMMON_QR_FIELDS;
    }

    return Object.values(DATA_FIELD_CATEGORIES)
      .flat()
      .map((field) => ({
        value: field,
        label: DATA_FIELDS[field] || field,
      }));
  }, [isBarcodeElement, isQRElement]);

  // Initialize missing barcode properties for existing elements
  useEffect(() => {
    if (selectedElement && isBarcodeElement) {
      const barcodeDefaults = elementDefaults.barcode || {};
      const missingProperties = [];

      // Check for missing barcode properties
      const requiredProps = [
        "moduleWidth",
        "moduleHeight",
        "quietZone",
        "fontSize",
        "textDistance",
        "backgroundColor",
        "foregroundColor",
        "centerText",
        "barcodeScale",
      ];

      requiredProps.forEach((prop) => {
        if (selectedElement[prop] === undefined) {
          missingProperties.push(prop);
        }
      });

      // If any properties are missing, update the element
      if (missingProperties.length > 0) {
        const updatedElement = {
          ...selectedElement,
          // Add missing properties with defaults
          moduleWidth:
            selectedElement.moduleWidth ?? barcodeDefaults.moduleWidth,
          moduleHeight:
            selectedElement.moduleHeight ?? barcodeDefaults.moduleHeight,
          quietZone: selectedElement.quietZone ?? barcodeDefaults.quietZone,
          fontSize: selectedElement.fontSize ?? barcodeDefaults.fontSize,
          textDistance:
            selectedElement.textDistance ?? barcodeDefaults.textDistance,
          backgroundColor:
            selectedElement.backgroundColor ?? barcodeDefaults.backgroundColor,
          foregroundColor:
            selectedElement.foregroundColor ?? barcodeDefaults.foregroundColor,
          centerText: selectedElement.centerText ?? barcodeDefaults.centerText,
          barcodeScale:
            selectedElement.barcodeScale ?? barcodeDefaults.barcodeScale,
        };

        onUpdateElement(updatedElement);
      }
    }
  }, [selectedElement, onUpdateElement, isBarcodeElement]);

  // Handle quick alignment changes
  const handleQuickAlignment = (x, y) => {
    if (!selectedElement) return;

    const updatedElement = {
      ...selectedElement,
      position: {
        ...selectedElement.position,
        x: parseFloat(x) || 0,
        y: y !== undefined ? parseFloat(y) || 0 : selectedElement.position.y,
      },
    };

    onUpdateElement(updatedElement);
  };

  // Universal alignment controls component
  const renderAlignmentControls = () => (
    <ModernAlignmentControls
      selectedElement={selectedElement}
      onStyleChange={handleStyleChange}
      className="mt-3"
    />
  );

  if (!selectedElement) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <div className="p-6 text-center">
          <div className="text-gray-400 mb-2">
            <Move className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Öğe Seçilmedi
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Düzenlemek için bir öğe seçin
          </p>
        </div>
      </div>
    );
  }

  const renderContentEditor = () => {
    switch (selectedElement.type) {
      case "text":
        return (
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metin İçeriği
              </label>
              <textarea
                value={selectedElement.content || ""}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                rows={3}
                placeholder="Metin girin..."
              />
              {selectedElement.content && (
                <TextValidationIndicator
                  text={selectedElement.content}
                  fontFamily={selectedElement.style?.fontFamily}
                  className="mt-1"
                  inline={true}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Boyutu
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={currentFontSize}
                    onChange={(e) => handleFontSizeChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    min="6"
                    max="144"
                    aria-describedby={
                      inputErrors.fontSize ? "fontSize-error" : undefined
                    }
                  />
                  {inputErrors.fontSize && (
                    <div
                      id="fontSize-error"
                      className="text-red-500 text-xs mt-1"
                    >
                      {inputErrors.fontSize}
                    </div>
                  )}
                  <select
                    value={currentFontSize}
                    onChange={(e) => handleFontSizeChange(e.target.value)}
                    className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  >
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="18">18</option>
                    <option value="20">20</option>
                    <option value="24">24</option>
                    <option value="28">28</option>
                    <option value="32">32</option>
                    <option value="36">36</option>
                    <option value="48">48</option>
                    <option value="72">72</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Ailesi
                </label>
                <FontSelector
                  value={selectedElement.style?.fontFamily || "Arial"}
                  onChange={handleFontFamilyChange}
                  textContent={selectedElement.content}
                  className="w-full"
                  showValidation={true}
                />
              </div>
            </div>

            {/* Font Style Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Stili
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedElement.style?.fontWeight === "bold"}
                    onChange={(e) =>
                      handleFontWeightChange(
                        e.target.checked ? "bold" : "normal"
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 font-bold">
                    Kalın
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedElement.style?.fontStyle === "italic"}
                    onChange={(e) =>
                      handleStyleChange(
                        "fontStyle",
                        e.target.checked ? "italic" : "normal"
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 italic">
                    Italik
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedElement.style?.textDecoration === "underline"
                    }
                    onChange={(e) =>
                      handleStyleChange(
                        "textDecoration",
                        e.target.checked ? "underline" : "none"
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 underline">
                    Altı Çizili
                  </span>
                </label>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Satır Aralığı
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={parseFloat(selectedElement.style?.lineHeight) || 1.4}
                onChange={(e) =>
                  handleStyleChange("lineHeight", e.target.value)
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Sıkışık</span>
                <span>
                  {parseFloat(selectedElement.style?.lineHeight) || 1.4}
                </span>
                <span>Gevşek</span>
              </div>
            </div>

            {/* Padding Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                İç Boşluk (Padding)
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={parseInt(selectedElement.style?.padding) || 1}
                onChange={(e) =>
                  handleStyleChange("padding", `${e.target.value}px`)
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0px</span>
                <span>{parseInt(selectedElement.style?.padding) || 1}px</span>
                <span>20px</span>
              </div>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resim
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Image className="h-4 w-4 inline mr-2" />
                Resim Seç
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {selectedElement.content && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Önizleme
                </label>
                <img
                  src={selectedElement.content}
                  alt="Preview"
                  className="w-full h-20 object-cover rounded border"
                />
              </div>
            )}

            {/* Universal Alignment Controls for Images */}
            {renderAlignmentControls()}
          </div>
        );

      case "recipient":
        return (
          <div className="space-y-4">
            {/* Font Options */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Font Ayarları
              </h4>

              {/* Font Family */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Ailesi
                </label>
                <FontSelector
                  value={selectedElement.style?.fontFamily || "Helvetica"}
                  onChange={(fontFamily) =>
                    handleStyleChange("fontFamily", fontFamily)
                  }
                  textContent={selectedElement.content}
                  className="w-full"
                  showValidation={true}
                />
              </div>

              {/* Font Size */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Boyutu ({selectedElement.style?.fontSize || "12"}pt)
                </label>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={
                    formatFontSizeForDisplay(selectedElement.style?.fontSize) ||
                    12
                  }
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  className="w-full"
                  aria-label="Font boyutu ayarlayıcı"
                />
              </div>

              {/* Line Height */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Satır Yüksekliği ({selectedElement.style?.lineHeight || "1.4"}
                  )
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={parseFloat(selectedElement.style?.lineHeight) || 1.4}
                  onChange={(e) =>
                    handleStyleChange("lineHeight", e.target.value)
                  }
                  className="w-full"
                />
              </div>

              {/* Font Weight */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Kalınlığı
                </label>
                <select
                  value={selectedElement.style?.fontWeight || "normal"}
                  onChange={(e) => handleFontWeightChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Kalın</option>
                </select>
              </div>

              {/* Letter Spacing */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Harf Aralığı ({selectedElement.style?.letterSpacing || "0"}px)
                </label>
                <input
                  type="range"
                  min="-2"
                  max="5"
                  step="0.1"
                  value={parseFloat(selectedElement.style?.letterSpacing) || 0}
                  onChange={(e) =>
                    handleStyleChange("letterSpacing", e.target.value)
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Spacing Options */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Boşluk Ayarları
              </h4>

              {/* Label Spacing */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Etiket Aralığı ({selectedElement.labelSpacing || "5"}px)
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={selectedElement.labelSpacing || 5}
                  onChange={(e) =>
                    handlePropertyChange(
                      "labelSpacing",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>

              {/* Line Spacing */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Satır Aralığı ({selectedElement.lineSpacing || "2"}px)
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={selectedElement.lineSpacing || 2}
                  onChange={(e) =>
                    handlePropertyChange(
                      "lineSpacing",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full"
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metin Rengi
              </label>
              <input
                type="color"
                value={selectedElement.style?.color || "#000000"}
                onChange={(e) => handleColorChange("color", e.target.value)}
                className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                aria-label="Metin rengi seçici"
              />
            </div>

            {/* Universal Alignment Controls */}
            {renderAlignmentControls()}
          </div>
        );

      case "barcode":
      case "qr_code":
        return (
          <div className="space-y-4">
            {/* Data Field Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Veri Kaynağı
              </label>
              <select
                value={selectedElement.dataField || "custom"}
                onChange={(e) => {
                  const field = e.target.value;
                  if (field === "custom") {
                    handleDataFieldChange("custom");
                    handleContentChange("");
                  } else {
                    handleDataFieldChange(field);
                    handleContentChange(field);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="custom">Özel Veri</option>
                <optgroup label="Yaygın Kullanılan">
                  {availableDataFields
                    .slice(
                      0,
                      isBarcodeElement
                        ? COMMON_BARCODE_FIELDS.length
                        : isQRElement
                        ? COMMON_QR_FIELDS.length
                        : 0
                    )
                    .map((field) => (
                      <option
                        key={field.key || field.value}
                        value={field.key || field.value}
                      >
                        {field.label}
                      </option>
                    ))}
                </optgroup>
                {Object.entries(DATA_FIELD_CATEGORIES).map(
                  ([category, categoryLabel]) => (
                    <optgroup key={category} label={categoryLabel}>
                      {getFieldsByCategory(category).map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
              {selectedElement.dataField &&
                selectedElement.dataField !== "custom" && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Örnek:{" "}
                    {
                      Object.values(DATA_FIELDS).find(
                        (f) => f.key === selectedElement.dataField
                      )?.example
                    }
                  </div>
                )}
            </div>

            {/* Custom Content Input (only show when custom is selected) */}
            {(!selectedElement.dataField ||
              selectedElement.dataField === "custom") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isBarcodeElement ? "Barkod" : "QR Kod"} Verisi
                </label>
                <input
                  type="text"
                  value={selectedElement.content || ""}
                  onChange={(e) =>
                    handlePropertyChange("content", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder={`${
                    isBarcodeElement ? "Barkod" : "QR kod"
                  } verisi girin...`}
                />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Sabit bir değer girin veya yukarıdan dinamik veri seçin
                </div>
              </div>
            )}

            {/* Selected Data Field Preview */}
            {selectedElement.dataField &&
              selectedElement.dataField !== "custom" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Seçili Veri:{" "}
                    {
                      Object.values(DATA_FIELDS).find(
                        (f) => f.key === selectedElement.dataField
                      )?.label
                    }
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {
                      Object.values(DATA_FIELDS).find(
                        (f) => f.key === selectedElement.dataField
                      )?.description
                    }
                  </div>
                  <div className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-mono">
                    Dinamik Veri: {selectedElement.dataField}
                  </div>
                </div>
              )}

            {isQRElement && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    QR Kod Boyutu
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={selectedElement.qrSize || 1}
                    onChange={(e) =>
                      handlePropertyChange("qrSize", parseInt(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Küçük</span>
                    <span>{selectedElement.qrSize || 1}</span>
                    <span>Büyük</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    QR Kod Hata Düzeltme Seviyesi
                  </label>
                  <select
                    value={selectedElement.errorCorrectionLevel || "M"}
                    onChange={(e) =>
                      handlePropertyChange(
                        "errorCorrectionLevel",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="L">Düşük (~7%)</option>
                    <option value="M">Orta (~15%)</option>
                    <option value="Q">Yüksek (~25%)</option>
                    <option value="H">Çok Yüksek (~30%)</option>
                  </select>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Yüksek seviye hasarlı QR kodları okuyabilir
                  </div>
                </div>
              </>
            )}

            {/* Universal Alignment Controls for Barcodes/QR Codes */}
            {renderAlignmentControls()}
          </div>
        );

      case "tracking_number":
      case "date":
        return (
          <div className="space-y-4">
            {/* Content/Data Field Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {selectedElement.type === "tracking_number"
                  ? "Takip Numarası"
                  : "Tarih"}{" "}
                İçeriği
              </label>
              <textarea
                value={selectedElement.content || ""}
                onChange={(e) =>
                  handlePropertyChange("content", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                rows={2}
                placeholder={`${
                  selectedElement.type === "tracking_number"
                    ? "Takip numarası"
                    : "Tarih"
                } girin...`}
              />
              {selectedElement.content && (
                <TextValidationIndicator
                  text={selectedElement.content}
                  fontFamily={selectedElement.style?.fontFamily}
                  className="mt-1"
                  inline={true}
                />
              )}
            </div>

            {/* Font Options */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Font Ayarları
              </h4>

              {/* Font Family */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Ailesi
                </label>
                <FontSelector
                  value={selectedElement.style?.fontFamily || "Arial"}
                  onChange={(fontFamily) =>
                    handleStyleChange("fontFamily", fontFamily)
                  }
                  textContent={selectedElement.content}
                  className="w-full"
                  showValidation={true}
                />
              </div>

              {/* Font Size */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Font Boyutu
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={
                        formatFontSizeForDisplay(
                          selectedElement.style?.fontSize
                        ) || 12
                      }
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                      min="6"
                      max="144"
                      aria-describedby={
                        inputErrors.fontSize ? "fontSize-error-2" : undefined
                      }
                    />
                    {inputErrors.fontSize && (
                      <div
                        id="fontSize-error-2"
                        className="text-red-500 text-xs mt-1"
                      >
                        {inputErrors.fontSize}
                      </div>
                    )}
                    <select
                      value={
                        formatFontSizeForDisplay(
                          selectedElement.style?.fontSize
                        ) || 12
                      }
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                    >
                      <option value="8">8</option>
                      <option value="10">10</option>
                      <option value="12">12</option>
                      <option value="14">14</option>
                      <option value="16">16</option>
                      <option value="18">18</option>
                      <option value="20">20</option>
                      <option value="24">24</option>
                    </select>
                  </div>
                </div>

                {/* Font Style Controls */}
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedElement.style?.fontWeight === "bold"}
                      onChange={(e) =>
                        handleFontWeightChange(
                          e.target.checked ? "bold" : "normal"
                        )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Kalın
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedElement.style?.fontStyle === "italic"}
                      onChange={(e) =>
                        handleStyleChange(
                          "fontStyle",
                          e.target.checked ? "italic" : "normal"
                        )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      İtalik
                    </span>
                  </label>
                </div>
              </div>

              {/* Color Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Metin Rengi
                </label>
                <input
                  type="color"
                  value={selectedElement.style?.color || "#000000"}
                  onChange={(e) => handleStyleChange("color", e.target.value)}
                  className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Universal Alignment Controls */}
              {renderAlignmentControls()}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Bu öğe türü için özel ayar bulunmuyor.
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Öğe Özellikleri
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {elementType}
            </div>
            {isTextElement && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Metin
              </span>
            )}
            {isImageElement && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Resim
              </span>
            )}
            {isBarcodeElement && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Barkod
              </span>
            )}
            {isQRElement && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                QR Kod
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onDuplicate && (
              <button
                onClick={handleDuplicate}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                title="Öğeyi Kopyala"
                aria-label="Öğeyi kopyala"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            {onDeleteElement && (
              <button
                onClick={() => onDeleteElement(selectedElement.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                title="Öğeyi Sil"
                aria-label="Öğeyi sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Position & Size Section */}
        <PropertySection
          title="Konum & Boyut"
          icon={Move}
          isExpanded={expandedSections.position}
          onToggle={() => toggleSection("position")}
        >
          <div className="space-y-4">
            {/* Position Controls */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Konum (%)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="position-x"
                    className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                  >
                    X Konumu
                  </label>
                  <input
                    id="position-x"
                    type="number"
                    value={selectedElement.position.x}
                    onChange={(e) => handlePositionChange("x", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="-1000"
                    max="1000"
                    aria-describedby={
                      inputErrors.position_x ? "position-x-error" : undefined
                    }
                  />
                  <ErrorMessage
                    error={inputErrors.position_x}
                    id="position-x-error"
                  />
                </div>
                <div>
                  <label
                    htmlFor="position-y"
                    className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                  >
                    Y Konumu
                  </label>
                  <input
                    id="position-y"
                    type="number"
                    value={selectedElement.position.y}
                    onChange={(e) => handlePositionChange("y", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="-1000"
                    max="1000"
                    aria-describedby={
                      inputErrors.position_y ? "position-y-error" : undefined
                    }
                  />
                  <ErrorMessage
                    error={inputErrors.position_y}
                    id="position-y-error"
                  />
                </div>
              </div>
            </div>

            {/* Size Controls */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Boyut (%)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="size-width"
                    className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                  >
                    Genişlik
                  </label>
                  <input
                    id="size-width"
                    type="number"
                    value={selectedElement.size.width}
                    onChange={(e) => handleSizeChange("width", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="1"
                    max="2000"
                    aria-describedby={
                      inputErrors.size_width ? "size-width-error" : undefined
                    }
                  />
                  <ErrorMessage
                    error={inputErrors.size_width}
                    id="size-width-error"
                  />
                </div>
                <div>
                  <label
                    htmlFor="size-height"
                    className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                  >
                    Yükseklik
                  </label>
                  <input
                    id="size-height"
                    type="number"
                    value={selectedElement.size.height}
                    onChange={(e) => handleSizeChange("height", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="1"
                    max="2000"
                    aria-describedby={
                      inputErrors.size_height ? "size-height-error" : undefined
                    }
                  />
                  <ErrorMessage
                    error={inputErrors.size_height}
                    id="size-height-error"
                  />
                </div>
              </div>
            </div>

            {/* Quick Size Presets */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hızlı Boyut Ayarları
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickSizeChange(25, 10)}
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Küçük boyut (25x10%)"
                >
                  Küçük
                </button>
                <button
                  onClick={() => handleQuickSizeChange(50, 20)}
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Orta boyut (50x20%)"
                >
                  Orta
                </button>
                <button
                  onClick={() => handleQuickSizeChange(75, 30)}
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Büyük boyut (75x30%)"
                >
                  Büyük
                </button>
                <button
                  onClick={() => handleQuickSizeChange(100, 40)}
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Tam boyut (100x40%)"
                >
                  Tam
                </button>
              </div>
            </div>

            {/* Quick Alignment Tools */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hızlı Hizalama
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickAlignment(0)}
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Sol Kenar
                </button>
                <button
                  onClick={() => handleQuickAlignment(50)}
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Orta
                </button>
                <button
                  onClick={() =>
                    handleQuickAlignment(100 - selectedElement.size.width)
                  }
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Sağ Kenar
                </button>
                <button
                  onClick={() =>
                    handleQuickAlignment(selectedElement.position.x, 0)
                  }
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Üst Kenar
                </button>
                <button
                  onClick={() =>
                    handleQuickAlignment(selectedElement.position.x, 50)
                  }
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Dikey Orta
                </button>
                <button
                  onClick={() =>
                    handleQuickAlignment(
                      selectedElement.position.x,
                      100 - selectedElement.size.height
                    )
                  }
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Alt Kenar
                </button>
              </div>
            </div>
          </div>
        </PropertySection>

        {/* Style Section */}
        <PropertySection
          title="Stil"
          icon={Palette}
          isExpanded={expandedSections.style}
          onToggle={() => toggleSection("style")}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Renk
              </label>
              <input
                type="color"
                value={selectedElement.style?.color || "#000000"}
                onChange={(e) => handleStyleChange("color", e.target.value)}
                className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arka Plan Rengi
              </label>
              <input
                type="color"
                value={selectedElement.style?.backgroundColor || "#ffffff"}
                onChange={(e) =>
                  handleStyleChange("backgroundColor", e.target.value)
                }
                className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Çerçeve Genişliği
              </label>
              <input
                type="number"
                value={parseInt(selectedElement.style?.borderWidth) || 0}
                onChange={(e) =>
                  handleStyleChange("borderWidth", `${e.target.value}px`)
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                min="0"
                max="10"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Çerçeve Rengi
              </label>
              <input
                type="color"
                value={selectedElement.style?.borderColor || "#000000"}
                onChange={(e) =>
                  handleStyleChange("borderColor", e.target.value)
                }
                className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
            </div>

            {/* Universal Padding Controls */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                İç Boşluk (Padding)
              </label>
              <div className="space-y-3">
                {/* Simple padding - single value for all sides */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Tüm Yönler
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={parseInt(selectedElement.style?.padding) || 1}
                    onChange={(e) =>
                      handleStyleChange("padding", `${e.target.value}px`)
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0px</span>
                    <span>
                      {parseInt(selectedElement.style?.padding) || 1}px
                    </span>
                    <span>30px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PropertySection>

        {/* Content Section */}
        <PropertySection
          title="İçerik"
          icon={Type}
          isExpanded={expandedSections.content}
          onToggle={() => toggleSection("content")}
        >
          {renderContentEditor()}
        </PropertySection>

        {/* Barcode Specific Sections */}
        {isBarcodeElement && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Barkod Ayarları
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Barkod görünümü ve davranışını özelleştirin
              </p>
            </div>
            <BarcodePropertiesPanel
              element={selectedElement}
              onPropertyChange={handlePropertyChange}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </div>
        )}
      </div>
    </div>
  );
};

PropertyPanel.propTypes = {
  element: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func,
};

// Element-specific alignment properties
// Convert between old verticalAlign and modern CSS properties
const convertToModernAlignment = (style) => {
  const modernStyle = { ...style };

  // Ensure display flex for proper alignment
  modernStyle.display = "flex";
  modernStyle.flexDirection = "column";

  // Convert old verticalAlign to alignItems
  if (style.verticalAlign) {
    switch (style.verticalAlign) {
      case "top":
        modernStyle.alignItems = "flex-start";
        break;
      case "middle":
        modernStyle.alignItems = "center";
        break;
      case "bottom":
        modernStyle.alignItems = "flex-end";
        break;
      default:
        modernStyle.alignItems = "flex-start";
    }
    // Keep old property for backward compatibility in PDF generation
  }

  // Convert old textAlign to justifyContent for flex containers
  if (style.textAlign && !modernStyle.justifyContent) {
    switch (style.textAlign) {
      case "left":
        modernStyle.justifyContent = "flex-start";
        break;
      case "center":
        modernStyle.justifyContent = "center";
        break;
      case "right":
        modernStyle.justifyContent = "flex-end";
        break;
      case "justify":
        modernStyle.justifyContent = "space-between";
        break;
      default:
        modernStyle.justifyContent = "flex-start";
    }
  }

  return modernStyle;
};

// Modern Alignment Controls Component
const ModernAlignmentControls = ({
  selectedElement,
  onStyleChange,
  className = "",
}) => {
  const elementType = selectedElement?.type;
  const style = selectedElement?.style || {};

  // Convert to modern alignment if needed
  const modernStyle = convertToModernAlignment(style);

  const handleAlignmentChange = useCallback(
    (property, value) => {
      const updatedStyle = { ...modernStyle, [property]: value };

      // Ensure flex display for alignment to work
      if (property === "alignItems" || property === "justifyContent") {
        updatedStyle.display = "flex";
        updatedStyle.flexDirection = "column";
      }

      onStyleChange(property, value);
    },
    [modernStyle, onStyleChange]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Modern Hizalama (Flexbox)
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {/* Horizontal Alignment */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              htmlFor="justify-content"
            >
              Yatay Hizalama
            </label>
            <select
              id="justify-content"
              value={modernStyle.justifyContent || "flex-start"}
              onChange={(e) =>
                handleAlignmentChange("justifyContent", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              aria-label="Yatay hizalama seçimi"
            >
              <option value="flex-start">Sol</option>
              <option value="center">Orta</option>
              <option value="flex-end">Sağ</option>
              <option value="space-between">Aralarında Boşluk</option>
              <option value="space-around">Çevresinde Boşluk</option>
              <option value="space-evenly">Eşit Boşluk</option>
            </select>
          </div>

          {/* Vertical Alignment */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              htmlFor="align-items"
            >
              Dikey Hizalama
            </label>
            <select
              id="align-items"
              value={modernStyle.alignItems || "flex-start"}
              onChange={(e) =>
                handleAlignmentChange("alignItems", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              aria-label="Dikey hizalama seçimi"
            >
              <option value="flex-start">Üst</option>
              <option value="center">Orta</option>
              <option value="flex-end">Alt</option>
              <option value="stretch">Uzat</option>
              <option value="baseline">Taban Çizgisi</option>
            </select>
          </div>
        </div>

        {elementType === "image" && (
          <div className="mt-3">
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              htmlFor="object-position"
            >
              Resim Konumu
            </label>
            <select
              id="object-position"
              value={style.objectPosition || "center"}
              onChange={(e) =>
                handleAlignmentChange("objectPosition", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="center">Merkez</option>
              <option value="top">Üst</option>
              <option value="bottom">Alt</option>
              <option value="left">Sol</option>
              <option value="right">Sağ</option>
              <option value="top left">Üst Sol</option>
              <option value="top right">Üst Sağ</option>
              <option value="bottom left">Alt Sol</option>
              <option value="bottom right">Alt Sağ</option>
            </select>
          </div>
        )}

        {/* Display current alignment state for debugging */}
        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
          <div className="text-gray-600 dark:text-gray-400 mb-1">
            Element:{" "}
            <span className="font-mono text-blue-600">{elementType}</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            CSS:{" "}
            <span className="font-mono">
              display: {modernStyle.display || "block"}
            </span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-mono">
              justify-content: {modernStyle.justifyContent || "flex-start"}
            </span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-mono">
              align-items: {modernStyle.alignItems || "flex-start"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
