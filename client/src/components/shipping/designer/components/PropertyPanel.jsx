import React, { useState, useRef, useEffect } from "react";
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
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
  const fileInputRef = useRef(null);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePropertyChange = (property, value) => {
    if (!selectedElement) return;

    const updatedElement = {
      ...selectedElement,
      [property]: value,
    };

    onUpdateElement(updatedElement);
  };

  // Initialize missing barcode properties for existing elements
  useEffect(() => {
    if (selectedElement && selectedElement.type === "barcode") {
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
  }, [selectedElement, onUpdateElement]);

  const handleStyleChange = (styleProperty, value) => {
    if (!selectedElement) return;

    const updatedElement = {
      ...selectedElement,
      style: {
        ...selectedElement.style,
        [styleProperty]: value,
      },
    };

    onUpdateElement(updatedElement);
  };

  const handlePositionChange = (positionProperty, value) => {
    if (!selectedElement) return;

    const updatedElement = {
      ...selectedElement,
      position: {
        ...selectedElement.position,
        [positionProperty]: parseFloat(value) || 0,
      },
    };

    onUpdateElement(updatedElement);
  };

  const handleSizeChange = (sizeProperty, value) => {
    if (!selectedElement) return;

    const updatedElement = {
      ...selectedElement,
      size: {
        ...selectedElement.size,
        [sizeProperty]: parseFloat(value) || 0,
      },
    };

    onUpdateElement(updatedElement);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handlePropertyChange("content", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDuplicate = () => {
    if (!selectedElement || !onDuplicate) return;

    onDuplicate(selectedElement);
  };

  // Handle quick size changes with proper state updates
  const handleQuickSizeChange = (width, height) => {
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
  };

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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metin İçeriği
              </label>
              <textarea
                value={selectedElement.content || ""}
                onChange={(e) =>
                  handlePropertyChange("content", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                rows={3}
                placeholder="Metin girin..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Boyutu
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={parseInt(selectedElement.style?.fontSize) || 14}
                    onChange={(e) =>
                      handleStyleChange("fontSize", `${e.target.value}px`)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    min="6"
                    max="144"
                  />
                  <select
                    value={parseInt(selectedElement.style?.fontSize) || 14}
                    onChange={(e) =>
                      handleStyleChange("fontSize", `${e.target.value}px`)
                    }
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
                  Hizalama
                </label>
                <select
                  value={selectedElement.style?.textAlign || "left"}
                  onChange={(e) =>
                    handleStyleChange("textAlign", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="left">Sol</option>
                  <option value="center">Orta</option>
                  <option value="right">Sağ</option>
                  <option value="justify">İki Yana Yaslı</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Ailesi
              </label>
              <select
                value={selectedElement.style?.fontFamily || "Arial"}
                onChange={(e) =>
                  handleStyleChange("fontFamily", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <optgroup label="Sans Serif">
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="'Segoe UI'">Segoe UI</option>
                  <option value="'Open Sans'">Open Sans</option>
                  <option value="'Roboto'">Roboto</option>
                </optgroup>
                <optgroup label="Serif">
                  <option value="'Times New Roman'">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="'Book Antiqua'">Book Antiqua</option>
                  <option value="Garamond">Garamond</option>
                  <option value="'Palatino Linotype'">Palatino</option>
                </optgroup>
                <optgroup label="Monospace">
                  <option value="'Courier New'">Courier New</option>
                  <option value="Monaco">Monaco</option>
                  <option value="'Lucida Console'">Lucida Console</option>
                </optgroup>
              </select>
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
                      handleStyleChange(
                        "fontWeight",
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
                <select
                  value={selectedElement.style?.fontFamily || "Helvetica"}
                  onChange={(e) =>
                    handleStyleChange("fontFamily", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="DejaVuSans">DejaVu Sans</option>
                  <option value="Times-Roman">Times</option>
                  <option value="Courier">Courier</option>
                </select>
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
                  value={parseInt(selectedElement.style?.fontSize) || 12}
                  onChange={(e) =>
                    handleStyleChange("fontSize", e.target.value)
                  }
                  className="w-full"
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
                  onChange={(e) =>
                    handleStyleChange("fontWeight", e.target.value)
                  }
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

              {/* Text Alignment */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Metin Hizalama
                </label>
                <select
                  value={selectedElement.style?.textAlign || "left"}
                  onChange={(e) =>
                    handleStyleChange("textAlign", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="left">Sol</option>
                  <option value="center">Orta</option>
                  <option value="right">Sağ</option>
                  <option value="justify">İki Yana Yasla</option>
                </select>
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
                onChange={(e) => handleStyleChange("color", e.target.value)}
                className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              />
            </div>
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
                    handlePropertyChange("dataField", "custom");
                    handlePropertyChange("content", "");
                  } else {
                    handlePropertyChange("dataField", field);
                    handlePropertyChange("content", field);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="custom">Özel Veri</option>
                <optgroup label="Yaygın Kullanılan">
                  {(selectedElement.type === "barcode"
                    ? COMMON_BARCODE_FIELDS
                    : COMMON_QR_FIELDS
                  ).map((field) => (
                    <option key={field.key} value={field.key}>
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
                  {selectedElement.type === "barcode" ? "Barkod" : "QR Kod"}{" "}
                  Verisi
                </label>
                <input
                  type="text"
                  value={selectedElement.content || ""}
                  onChange={(e) =>
                    handlePropertyChange("content", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder={`${
                    selectedElement.type === "barcode" ? "Barkod" : "QR kod"
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

            {selectedElement.type === "qr_code" && (
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
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {selectedElement.type.toUpperCase()} • ID:{" "}
          {selectedElement.id.slice(-6)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Element Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={handleDuplicate}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              title="Kopyala"
            >
              <Copy className="h-3 w-3 mr-1" />
              Kopyala
            </button>

            <button
              onClick={() => onDeleteElement(selectedElement.id)}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              title="Sil"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Sil
            </button>
          </div>
        </div>

        {/* Position & Size Section */}
        <PropertySection
          title="Konum & Boyut"
          icon={Move}
          isExpanded={expandedSections.position}
          onToggle={() => toggleSection("position")}
        >
          <div className="px-4 pb-4 space-y-4">
            {/* Position Controls */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Konum (%)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    X Konumu
                  </label>
                  <input
                    type="number"
                    value={selectedElement.position.x}
                    onChange={(e) => handlePositionChange("x", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Y Konumu
                  </label>
                  <input
                    type="number"
                    value={selectedElement.position.y}
                    onChange={(e) => handlePositionChange("y", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="0"
                    max="100"
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
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Genişlik
                  </label>
                  <input
                    type="number"
                    value={selectedElement.size.width}
                    onChange={(e) => handleSizeChange("width", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Yükseklik
                  </label>
                  <input
                    type="number"
                    value={selectedElement.size.height}
                    onChange={(e) => handleSizeChange("height", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Quick Size Presets */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hızlı Boyutlar
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickSizeChange(25, 10)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Küçük
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSizeChange(40, 15)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Orta
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSizeChange(60, 20)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Büyük
                </button>
              </div>
            </div>

            {/* Alignment Helper */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hızlı Hizalama
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAlignment(5, 5)}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Sol Üst"
                >
                  ↖
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(50 - selectedElement.size.width / 2, 5)
                  }
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Orta Üst"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(95 - selectedElement.size.width, 5)
                  }
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Sağ Üst"
                >
                  ↗
                </button>

                {/* Middle Row */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(
                      5,
                      50 - selectedElement.size.height / 2
                    )
                  }
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Sol Orta"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(
                      50 - selectedElement.size.width / 2,
                      50 - selectedElement.size.height / 2
                    )
                  }
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  title="Tam Orta"
                >
                  ●
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(
                      95 - selectedElement.size.width,
                      50 - selectedElement.size.height / 2
                    )
                  }
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Sağ Orta"
                >
                  →
                </button>

                {/* Bottom Row */}
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(5, 95 - selectedElement.size.height)
                  }
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Sol Alt"
                >
                  ↙
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(
                      50 - selectedElement.size.width / 2,
                      95 - selectedElement.size.height
                    )
                  }
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Orta Alt"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(
                      95 - selectedElement.size.width,
                      95 - selectedElement.size.height
                    )
                  }
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Sağ Alt"
                >
                  ↘
                </button>
              </div>
            </div>

            {/* Distribution Controls */}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sayfada Konumlandırma
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(0, selectedElement.position.y)
                  }
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Sol Kenar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(
                      100 - selectedElement.size.width,
                      selectedElement.position.y
                    )
                  }
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Sağ Kenar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAlignment(selectedElement.position.x, 0)
                  }
                  className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Üst Kenar
                </button>
                <button
                  type="button"
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
          <div className="px-4 pb-4 space-y-4">
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

                {/* Advanced padding - individual sides */}
                <details className="group">
                  <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 select-none">
                    Gelişmiş Ayarlar
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Üst
                        </label>
                        <input
                          type="number"
                          value={
                            parseInt(selectedElement.style?.paddingTop) || 1
                          }
                          onChange={(e) =>
                            handleStyleChange(
                              "paddingTop",
                              `${e.target.value}px`
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                          min="0"
                          max="50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Alt
                        </label>
                        <input
                          type="number"
                          value={
                            parseInt(selectedElement.style?.paddingBottom) || 1
                          }
                          onChange={(e) =>
                            handleStyleChange(
                              "paddingBottom",
                              `${e.target.value}px`
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                          min="0"
                          max="50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Sol
                        </label>
                        <input
                          type="number"
                          value={
                            parseInt(selectedElement.style?.paddingLeft) || 1
                          }
                          onChange={(e) =>
                            handleStyleChange(
                              "paddingLeft",
                              `${e.target.value}px`
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                          min="0"
                          max="50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Sağ
                        </label>
                        <input
                          type="number"
                          value={
                            parseInt(selectedElement.style?.paddingRight) || 1
                          }
                          onChange={(e) =>
                            handleStyleChange(
                              "paddingRight",
                              `${e.target.value}px`
                            )
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                          min="0"
                          max="50"
                        />
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            {/* Advanced Settings */}
            <details className="border border-gray-200 dark:border-gray-600 rounded-lg">
              <summary className="px-3 py-2 bg-gray-50 dark:bg-gray-800 cursor-pointer flex items-center space-x-2 rounded-t-lg">
                <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gelişmiş Ayarlar
                </span>
              </summary>
              <div className="p-3 space-y-3 bg-white dark:bg-gray-900">
                {/* Z-Index Control */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Katman Sırası (Z-Index)
                  </label>
                  <input
                    type="number"
                    value={selectedElement.zIndex || 1}
                    onChange={(e) =>
                      handlePropertyChange(
                        "zIndex",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Yüksek değerler öğeyi öne getirir
                  </p>
                </div>

                {/* Opacity Control */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şeffaflık
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={parseFloat(selectedElement.style?.opacity) || 1}
                    onChange={(e) =>
                      handleStyleChange("opacity", e.target.value)
                    }
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Şeffaf</span>
                    <span>
                      {Math.round(
                        (parseFloat(selectedElement.style?.opacity) || 1) * 100
                      )}
                      %
                    </span>
                    <span>Opak</span>
                  </div>
                </div>

                {/* Rotation Control */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Döndürme
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={parseInt(selectedElement.style?.rotate) || 0}
                    onChange={(e) =>
                      handleStyleChange("rotate", `${e.target.value}deg`)
                    }
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0°</span>
                    <span>{parseInt(selectedElement.style?.rotate) || 0}°</span>
                    <span>360°</span>
                  </div>
                </div>

                {/* Border Controls */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kenarlık
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Kalınlık
                      </label>
                      <input
                        type="number"
                        value={
                          parseInt(selectedElement.style?.borderWidth) || 0
                        }
                        onChange={(e) =>
                          handleStyleChange(
                            "borderWidth",
                            `${e.target.value}px`
                          )
                        }
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        min="0"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Renk
                      </label>
                      <input
                        type="color"
                        value={selectedElement.style?.borderColor || "#000000"}
                        onChange={(e) =>
                          handleStyleChange("borderColor", e.target.value)
                        }
                        className="w-full h-7 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Border Radius */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Köşe Yuvarlaklığı
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={parseInt(selectedElement.style?.borderRadius) || 0}
                    onChange={(e) =>
                      handleStyleChange("borderRadius", `${e.target.value}px`)
                    }
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Keskin</span>
                    <span>
                      {parseInt(selectedElement.style?.borderRadius) || 0}px
                    </span>
                    <span>Yuvarlak</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </PropertySection>

        {/* Content Section */}
        <PropertySection
          title="İçerik"
          icon={Type}
          isExpanded={expandedSections.content}
          onToggle={() => toggleSection("content")}
        >
          <div className="px-4 pb-4">{renderContentEditor()}</div>
        </PropertySection>

        {/* Barcode Specific Sections */}
        {selectedElement.type === "barcode" && (
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

export default PropertyPanel;
