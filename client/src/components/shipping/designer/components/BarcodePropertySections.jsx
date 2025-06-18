import React from "react";
import {
  Type,
  Settings,
  Layout,
  Palette,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  DATA_FIELDS,
  DATA_FIELD_CATEGORIES,
  getFieldsByCategory,
  BARCODE_FORMATS as COMMON_BARCODE_FIELDS,
} from "../constants/dataFields.js";
import {
  BARCODE_FORMATS,
  getSampleBarcodeContent,
} from "../constants/barcodeTypes";

// Enhanced Section Component for Barcode Properties
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

// Barcode Content and Data Selection Component
export const BarcodeContentSection = ({
  element,
  onPropertyChange,
  isExpanded,
  onToggle,
}) => {
  return (
    <PropertySection
      title="İçerik ve Veri"
      icon={Type}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Data Field Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Veri Kaynağı
          </label>
          <select
            value={element.dataField || "custom"}
            onChange={(e) => {
              const field = e.target.value;
              if (field === "custom") {
                onPropertyChange("dataField", "custom");
                onPropertyChange("content", "");
              } else {
                onPropertyChange("dataField", field);
                onPropertyChange("content", field);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="custom">Özel Veri</option>
            <optgroup label="Yaygın Kullanılan">
              {COMMON_BARCODE_FIELDS.map((field) => (
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
          {element.dataField && element.dataField !== "custom" && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Örnek:{" "}
              {
                Object.values(DATA_FIELDS).find(
                  (f) => f.key === element.dataField
                )?.example
              }
            </div>
          )}
        </div>

        {/* Custom Content Input */}
        {(!element.dataField || element.dataField === "custom") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Barkod Verisi
            </label>
            <input
              type="text"
              value={element.content || ""}
              onChange={(e) => onPropertyChange("content", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="Barkod verisi girin..."
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Sabit bir değer girin veya yukarıdan dinamik veri seçin
            </div>
          </div>
        )}

        {/* Barcode Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Barkod Tipi
          </label>
          <select
            value={element.barcodeType || "code128"}
            onChange={(e) => onPropertyChange("barcodeType", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          >
            {Object.entries(BARCODE_FORMATS).map(([key, value]) => (
              <option key={key} value={key}>
                {value} ({key.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>
    </PropertySection>
  );
};

// Barcode Basic Settings Component
export const BarcodeBasicSection = ({
  element,
  onPropertyChange,
  isExpanded,
  onToggle,
}) => {
  return (
    <PropertySection
      title="Temel Ayarlar"
      icon={Settings}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Barcode Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Barkod Türü
          </label>
          <select
            value={element.barcodeType || "code128"}
            onChange={(e) => {
              const newType = e.target.value;
              onPropertyChange("barcodeType", newType);
              // Update content with appropriate sample if current content is default
              if (!element.content || element.content === "Sample Text") {
                onPropertyChange("content", getSampleBarcodeContent(newType));
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          >
            {Object.keys(BARCODE_FORMATS)
              .sort()
              .map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
          </select>
        </div>

        {/* Barcode Preview */}
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            Önizleme - {element.barcodeType?.toUpperCase() || "CODE128"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Ölçek: {element.barcodeScale || 2.5}x | Metin:{" "}
            {element.showText !== false ? "Açık" : "Kapalı"}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Örnek: {getSampleBarcodeContent(element.barcodeType || "code128")}
          </div>
        </div>

        {/* Barcode Scale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Barkod Ölçeği
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={element.barcodeScale || 2.5}
            onChange={(e) =>
              onPropertyChange("barcodeScale", parseFloat(e.target.value))
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Küçük</span>
            <span>{element.barcodeScale || 2.5}x</span>
            <span>Büyük</span>
          </div>
        </div>

        {/* Module Width & Height */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Modül Genişliği (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="2.0"
              value={element.moduleWidth || ""}
              placeholder="Otomatik"
              onChange={(e) =>
                onPropertyChange(
                  "moduleWidth",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Modül Yüksekliği (mm)
            </label>
            <input
              type="number"
              step="1"
              min="5"
              max="50"
              value={element.moduleHeight || ""}
              placeholder="Otomatik"
              onChange={(e) =>
                onPropertyChange(
                  "moduleHeight",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Quiet Zone */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Sessiz Bölge (mm)
          </label>
          <input
            type="number"
            step="0.5"
            min="1"
            max="20"
            value={element.quietZone || ""}
            placeholder="Otomatik"
            onChange={(e) =>
              onPropertyChange(
                "quietZone",
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>
    </PropertySection>
  );
};

// Barcode Text Properties Component
export const BarcodeTextSection = ({
  element,
  onPropertyChange,
  isExpanded,
  onToggle,
}) => {
  return (
    <PropertySection
      title="Metin Ayarları"
      icon={Type}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Show Text */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="showText"
            checked={element.showText !== false}
            onChange={(e) => onPropertyChange("showText", e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="showText"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Metni Göster
          </label>
        </div>

        {/* Text Size & Distance */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Yazı Boyutu (pt)
            </label>
            <input
              type="number"
              step="1"
              min="6"
              max="24"
              value={element.textSize || ""}
              placeholder="Otomatik"
              onChange={(e) =>
                onPropertyChange(
                  "textSize",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Metin Uzaklığı (mm)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="10"
              value={element.textDistance || ""}
              placeholder="Otomatik"
              onChange={(e) =>
                onPropertyChange(
                  "textDistance",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Text Font */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Yazı Tipi
          </label>
          <select
            value={element.textFont || ""}
            onChange={(e) =>
              onPropertyChange("textFont", e.target.value || null)
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Varsayılan</option>
            <option value="Courier">Courier</option>
            <option value="Times-Roman">Times Roman</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Arial">Arial</option>
          </select>
        </div>

        {/* Alternative Text */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Alternatif Metin
          </label>
          <input
            type="text"
            value={element.altText || ""}
            placeholder="Özel metin (boş bırakılırsa otomatik)"
            onChange={(e) =>
              onPropertyChange("altText", e.target.value || null)
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Text Alignment */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="centerText"
            checked={element.centerText !== false}
            onChange={(e) => onPropertyChange("centerText", e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="centerText"
            className="text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Metni Ortala
          </label>
        </div>
      </div>
    </PropertySection>
  );
};

// Barcode Border Properties Component
export const BarcodeBorderSection = ({
  element,
  onPropertyChange,
  isExpanded,
  onToggle,
}) => {
  return (
    <PropertySection
      title="Kenarlık ve Çerçeve"
      icon={Layout}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Show Border */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="showBorder"
            checked={element.showBorder || false}
            onChange={(e) => onPropertyChange("showBorder", e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="showBorder"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Kenarlık Göster
          </label>
        </div>

        {element.showBorder && (
          <>
            {/* Border Width */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Kenarlık Kalınlığı (pt)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                value={element.borderWidth || 1}
                onChange={(e) =>
                  onPropertyChange("borderWidth", parseFloat(e.target.value))
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Individual Border Sizes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Sol Kenarlık (pt)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={element.borderLeft || ""}
                  placeholder="Otomatik"
                  onChange={(e) =>
                    onPropertyChange(
                      "borderLeft",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Sağ Kenarlık (pt)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={element.borderRight || ""}
                  placeholder="Otomatik"
                  onChange={(e) =>
                    onPropertyChange(
                      "borderRight",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Üst Kenarlık (pt)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={element.borderTop || ""}
                  placeholder="Otomatik"
                  onChange={(e) =>
                    onPropertyChange(
                      "borderTop",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Alt Kenarlık (pt)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={element.borderBottom || ""}
                  placeholder="Otomatik"
                  onChange={(e) =>
                    onPropertyChange(
                      "borderBottom",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </PropertySection>
  );
};

// Barcode Colors and Style Component
export const BarcodeStyleSection = ({
  element,
  onPropertyChange,
  isExpanded,
  onToggle,
}) => {
  return (
    <PropertySection
      title="Renkler ve Stil"
      icon={Palette}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Ön Plan Rengi
            </label>
            <input
              type="color"
              value={element.foregroundColor || "#000000"}
              onChange={(e) =>
                onPropertyChange("foregroundColor", e.target.value)
              }
              className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Arka Plan Rengi
            </label>
            <input
              type="color"
              value={element.backgroundColor || "#ffffff"}
              onChange={(e) =>
                onPropertyChange("backgroundColor", e.target.value)
              }
              className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </PropertySection>
  );
};

// Barcode Advanced Options Component
export const BarcodeAdvancedSection = ({
  element,
  onPropertyChange,
  isExpanded,
  onToggle,
}) => {
  return (
    <PropertySection
      title="Gelişmiş Seçenekler"
      icon={Settings}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Include Check Digit */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="includeCheck"
            checked={element.includeCheck || false}
            onChange={(e) => onPropertyChange("includeCheck", e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="includeCheck"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Kontrol Basamağı Dahil Et
          </label>
        </div>

        {/* Parse FNC */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="parseFNC"
            checked={element.parseFNC || false}
            onChange={(e) => onPropertyChange("parseFNC", e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="parseFNC"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            FNC Karakterlerini Çözümle
          </label>
        </div>

        {/* Ink Spread */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Mürekkep Yayılması (pt)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={element.inkSpread || ""}
            placeholder="0 (kapalı)"
            onChange={(e) =>
              onPropertyChange(
                "inkSpread",
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Yazdırma kalitesini artırmak için çubukları genişletir
          </p>
        </div>
      </div>
    </PropertySection>
  );
};

// Main Barcode Properties Component that combines all sections
export const BarcodePropertiesPanel = ({
  element,
  onPropertyChange,
  expandedSections,
  onToggleSection,
}) => {
  return (
    <div className="space-y-3">
      <BarcodeContentSection
        element={element}
        onPropertyChange={onPropertyChange}
        isExpanded={expandedSections.barcodeContent}
        onToggle={() => onToggleSection("barcodeContent")}
      />

      <BarcodeBasicSection
        element={element}
        onPropertyChange={onPropertyChange}
        isExpanded={expandedSections.barcodeBasic}
        onToggle={() => onToggleSection("barcodeBasic")}
      />

      <BarcodeTextSection
        element={element}
        onPropertyChange={onPropertyChange}
        isExpanded={expandedSections.barcodeText}
        onToggle={() => onToggleSection("barcodeText")}
      />

      <BarcodeStyleSection
        element={element}
        onPropertyChange={onPropertyChange}
        isExpanded={expandedSections.barcodeStyle}
        onToggle={() => onToggleSection("barcodeStyle")}
      />

      <BarcodeBorderSection
        element={element}
        onPropertyChange={onPropertyChange}
        isExpanded={expandedSections.barcodeBorder}
        onToggle={() => onToggleSection("barcodeBorder")}
      />

      <BarcodeAdvancedSection
        element={element}
        onPropertyChange={onPropertyChange}
        isExpanded={expandedSections.barcodeAdvanced}
        onToggle={() => onToggleSection("barcodeAdvanced")}
      />
    </div>
  );
};
