import React, { useState, useRef } from "react";
import {
  Image,
  Move,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// PropertyPanel Component for editing element properties
const PropertyPanel = ({
  element: selectedElement,
  onUpdate: onUpdateElement,
  onRemove: onDeleteElement,
  onDuplicate,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    position: true,
    style: true,
    content: true,
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
                <input
                  type="number"
                  value={parseInt(selectedElement.style?.fontSize) || 14}
                  onChange={(e) =>
                    handleStyleChange("fontSize", `${e.target.value}px`)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  min="8"
                  max="72"
                />
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
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
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

      case "barcode":
      case "qr_code":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {selectedElement.type === "barcode" ? "Barkod" : "QR Kod"} Verisi
            </label>
            <input
              type="text"
              value={selectedElement.content || ""}
              onChange={(e) => handlePropertyChange("content", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder={`${
                selectedElement.type === "barcode" ? "Barkod" : "QR kod"
              } verisi girin...`}
            />
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
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection("position")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              Konum & Boyut
            </span>
            {expandedSections.position ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {expandedSections.position && (
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    X (%)
                  </label>
                  <input
                    type="number"
                    value={selectedElement.position.x}
                    onChange={(e) => handlePositionChange("x", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Y (%)
                  </label>
                  <input
                    type="number"
                    value={selectedElement.position.y}
                    onChange={(e) => handlePositionChange("y", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Genişlik (%)
                  </label>
                  <input
                    type="number"
                    value={selectedElement.size.width}
                    onChange={(e) => handleSizeChange("width", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Yükseklik (%)
                  </label>
                  <input
                    type="number"
                    value={selectedElement.size.height}
                    onChange={(e) => handleSizeChange("height", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection("content")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              İçerik
            </span>
            {expandedSections.content ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {expandedSections.content && (
            <div className="px-4 pb-4">{renderContentEditor()}</div>
          )}
        </div>

        {/* Style Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toggleSection("style")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              Stil
            </span>
            {expandedSections.style ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {expandedSections.style && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;
