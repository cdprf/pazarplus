import logger from "../../../../utils/logger.js";
import React, { useState, useRef } from "react";
import { Save, Download, Upload, FolderOpen } from "lucide-react";
import { PAPER_SIZE_PRESETS } from "../constants/paperSizes.js";
import { readJSONFile } from "../utils/designerUtils.js";

// TemplateSettingsPanel Component with design system compliance
const TemplateSettingsPanel = ({
  config,
  onConfigChange,
  onSave,
  onLoad,
  onExport,
  onImport,
  savedTemplates,
  onShowTemplates,
}) => {
  const [showCustomSize, setShowCustomSize] = useState(
    config.paperSize === "CUSTOM"
  );
  const fileInputRef = useRef(null);

  const handlePaperSizeChange = (paperSize) => {
    const newConfig = { ...config, paperSize };
    if (paperSize !== "CUSTOM") {
      setShowCustomSize(false);
    } else {
      setShowCustomSize(true);
      if (!newConfig.customDimensions) {
        newConfig.customDimensions = { width: 210, height: 297 };
      }
    }
    onConfigChange(newConfig);
  };

  const handleCustomDimensionChange = (dimension, value) => {
    onConfigChange({
      ...config,
      customDimensions: {
        ...config.customDimensions,
        [dimension]: parseFloat(value) || 0,
      },
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const templateData = await readJSONFile(file);
        onImport(templateData);
      } catch (error) {
        logger.error("Error importing template:", error);
        alert(
          "Şablon dosyası içe aktarılırken hata oluştu. Lütfen geçerli bir JSON dosyası seçin."
        );
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
          Şablon Ayarları
        </h3>

        <div className="space-y-4">
          <div className="form-group">
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              htmlFor="template-name"
            >
              Şablon Adı
            </label>
            <input
              id="template-name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              value={config.name}
              onChange={(e) =>
                onConfigChange({ ...config, name: e.target.value })
              }
              placeholder="Şablon adını girin..."
            />
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kağıt Boyutu
            </label>
            <select
              value={config.paperSize}
              onChange={(e) => handlePaperSizeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            >
              {Object.entries(PAPER_SIZE_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {showCustomSize && (
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Özel Boyutlar (mm)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Genişlik
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    value={config.customDimensions?.width || 210}
                    onChange={(e) =>
                      handleCustomDimensionChange("width", e.target.value)
                    }
                    placeholder="210"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Yükseklik
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    value={config.customDimensions?.height || 297}
                    onChange={(e) =>
                      handleCustomDimensionChange("height", e.target.value)
                    }
                    placeholder="297"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Yönelim
            </label>
            <select
              value={config.orientation}
              onChange={(e) =>
                onConfigChange({ ...config, orientation: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="portrait">Dikey (Portrait)</option>
              <option value="landscape">Yatay (Landscape)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kenar Boşlukları (mm)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Üst
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  value={config.margins?.top || 10}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      margins: {
                        ...config.margins,
                        top: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Alt
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  value={config.margins?.bottom || 10}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      margins: {
                        ...config.margins,
                        bottom: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sol
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  value={config.margins?.left || 10}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      margins: {
                        ...config.margins,
                        left: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sağ
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  value={config.margins?.right || 10}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      margins: {
                        ...config.margins,
                        right: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Varsayılan Font Ailesi
            </label>
            <select
              value={config.defaultFont?.fontFamily || "Arial"}
              onChange={(e) => {
                const newConfig = {
                  ...config,
                  defaultFont: {
                    ...config.defaultFont,
                    fontFamily: e.target.value,
                  },
                  applyDefaultFontToAll: true, // Auto-apply to all existing elements
                };
                onConfigChange(newConfig);
              }}
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

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Varsayılan Font Boyutu
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="6"
                max="120"
                value={parseInt(config.defaultFont?.fontSize) || 14}
                onChange={(e) => {
                  const newConfig = {
                    ...config,
                    defaultFont: {
                      ...config.defaultFont,
                      fontSize: `${e.target.value}px`,
                    },
                    applyDefaultFontToAll: true,
                  };
                  onConfigChange(newConfig);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
              <select
                value={parseInt(config.defaultFont?.fontSize) || 14}
                onChange={(e) => {
                  const newConfig = {
                    ...config,
                    defaultFont: {
                      ...config.defaultFont,
                      fontSize: `${e.target.value}px`,
                    },
                    applyDefaultFontToAll: true,
                  };
                  onConfigChange(newConfig);
                }}
                className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Varsayılan Font Stili
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="default-bold"
                  checked={config.defaultFont?.fontWeight === "bold"}
                  onChange={(e) => {
                    const newConfig = {
                      ...config,
                      defaultFont: {
                        ...config.defaultFont,
                        fontWeight: e.target.checked ? "bold" : "normal",
                      },
                      applyDefaultFontToAll: true,
                    };
                    onConfigChange(newConfig);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="default-bold"
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300 font-bold"
                >
                  Kalın
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="default-italic"
                  checked={config.defaultFont?.fontStyle === "italic"}
                  onChange={(e) => {
                    const newConfig = {
                      ...config,
                      defaultFont: {
                        ...config.defaultFont,
                        fontStyle: e.target.checked ? "italic" : "normal",
                      },
                      applyDefaultFontToAll: true,
                    };
                    onConfigChange(newConfig);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="default-italic"
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300 italic"
                >
                  İtalik
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Varsayılan Metin Rengi
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={config.defaultFont?.color || "#000000"}
                onChange={(e) => {
                  const newConfig = {
                    ...config,
                    defaultFont: {
                      ...config.defaultFont,
                      color: e.target.value,
                    },
                    applyDefaultFontToAll: true,
                  };
                  onConfigChange(newConfig);
                }}
                className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                value={config.defaultFont?.color || "#000000"}
                onChange={(e) => {
                  const newConfig = {
                    ...config,
                    defaultFont: {
                      ...config.defaultFont,
                      color: e.target.value,
                    },
                    applyDefaultFontToAll: true,
                  };
                  onConfigChange(newConfig);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Varsayılan Satır Yüksekliği
            </label>
            <select
              value={config.defaultFont?.lineHeight || "1.4"}
              onChange={(e) => {
                const newConfig = {
                  ...config,
                  defaultFont: {
                    ...config.defaultFont,
                    lineHeight: e.target.value,
                  },
                  applyDefaultFontToAll: true,
                };
                onConfigChange(newConfig);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="1">1 (Sık)</option>
              <option value="1.2">1.2 (Yakın)</option>
              <option value="1.4">1.4 (Normal)</option>
              <option value="1.6">1.6 (Geniş)</option>
              <option value="2">2 (Çok Geniş)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        <div className="space-y-3">
          <button
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onSave}
          >
            <Save className="h-4 w-4 mr-2" />
            Şablonu Kaydet
          </button>

          <button
            onClick={onShowTemplates}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Kaydedilen Şablonlar ({savedTemplates?.length || 0})
          </button>

          <button
            onClick={onExport}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Şablonu Dışa Aktar
          </button>

          <button
            onClick={handleImportClick}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Şablon İçe Aktar
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default TemplateSettingsPanel;
