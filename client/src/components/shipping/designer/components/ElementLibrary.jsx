import {
  Type,
  Image,
  BarChart3,
  QrCode,
  Square,
  Minus,
  MapPin,
  Package,
  User,
  FileText,
  Calendar,
  Hash,
} from "lucide-react";
import { ELEMENT_TYPES, ELEMENT_CATEGORIES } from "../constants/index.js";

// ElementLibrary Component - Draggable element library
const ElementLibrary = ({ onAddElement, selectedCategory = "all" }) => {
  const elementConfig = {
    [ELEMENT_TYPES.TEXT]: {
      icon: Type,
      label: "Metin",
      category: ELEMENT_CATEGORIES.BASIC,
      description: "Serbest metin alanı",
    },
    [ELEMENT_TYPES.IMAGE]: {
      icon: Image,
      label: "Resim",
      category: ELEMENT_CATEGORIES.BASIC,
      description: "Logo veya resim",
    },
    [ELEMENT_TYPES.BARCODE]: {
      icon: BarChart3,
      label: "Barkod",
      category: ELEMENT_CATEGORIES.CODES,
      description: "Ürün barkodu",
    },
    [ELEMENT_TYPES.QR_CODE]: {
      icon: QrCode,
      label: "QR Kod",
      category: ELEMENT_CATEGORIES.CODES,
      description: "QR kod",
    },
    [ELEMENT_TYPES.LINE]: {
      icon: Minus,
      label: "Çizgi",
      category: ELEMENT_CATEGORIES.BASIC,
      description: "Ayırıcı çizgi",
    },
    [ELEMENT_TYPES.RECTANGLE]: {
      icon: Square,
      label: "Dikdörtgen",
      category: ELEMENT_CATEGORIES.BASIC,
      description: "Dikdörtgen şekil",
    },
    [ELEMENT_TYPES.HEADER]: {
      icon: FileText,
      label: "Başlık",
      category: ELEMENT_CATEGORIES.SHIPPING,
      description: "Şablon başlığı",
    },
    [ELEMENT_TYPES.RECIPIENT]: {
      icon: User,
      label: "Alıcı Bilgileri",
      category: ELEMENT_CATEGORIES.SHIPPING,
      description: "Teslimat adresi",
    },
    [ELEMENT_TYPES.SENDER]: {
      icon: MapPin,
      label: "Gönderici Bilgileri",
      category: ELEMENT_CATEGORIES.SHIPPING,
      description: "Gönderici adresi",
    },
    [ELEMENT_TYPES.ORDER_SUMMARY]: {
      icon: Package,
      label: "Sipariş Özeti",
      category: ELEMENT_CATEGORIES.SHIPPING,
      description: "Sipariş detayları",
    },
    [ELEMENT_TYPES.TRACKING_NUMBER]: {
      icon: Hash,
      label: "Takip Numarası",
      category: ELEMENT_CATEGORIES.SHIPPING,
      description: "Kargo takip kodu",
    },
    [ELEMENT_TYPES.DATE]: {
      icon: Calendar,
      label: "Tarih",
      category: ELEMENT_CATEGORIES.SHIPPING,
      description: "Sipariş/gönderim tarihi",
    },
    [ELEMENT_TYPES.FOOTER]: {
      icon: FileText,
      label: "Alt Bilgi",
      category: ELEMENT_CATEGORIES.SHIPPING,
      description: "Şablon alt bilgisi",
    },
  };

  const categories = [
    { key: "all", label: "Tümü", icon: Square },
    { key: ELEMENT_CATEGORIES.BASIC, label: "Temel", icon: Type },
    { key: ELEMENT_CATEGORIES.SHIPPING, label: "Kargo", icon: Package },
    { key: ELEMENT_CATEGORIES.CODES, label: "Kodlar", icon: QrCode },
  ];

  const filteredElements = Object.entries(elementConfig).filter(
    ([type, config]) =>
      selectedCategory === "all" || config.category === selectedCategory
  );

  const handleDragStart = (e, elementType) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: elementType })
    );
  };

  const handleAddElement = (elementType, e) => {
    e.stopPropagation();
    console.log("ElementLibrary: Adding element", elementType);
    if (onAddElement) {
      console.log("ElementLibrary: onAddElement callback exists, calling it");
      onAddElement(elementType);
    } else {
      console.error("ElementLibrary: onAddElement callback is missing!");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Öğe Kütüphanesi
        </h3>

        {/* Category Filter */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.key}
                className={`p-2 text-xs rounded-md border transition-colors ${
                  selectedCategory === category.key
                    ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="h-4 w-4 mx-auto mb-1" />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredElements.map(([elementType, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={elementType}
                className="group relative cursor-move bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, elementType)}
                onClick={(e) => handleAddElement(elementType, e)}
                title={config.description}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {config.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Add indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredElements.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">
              Bu kategoride öğe bulunamadı
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Öğeleri sürükleyip bırakın veya tıklayın
        </div>
      </div>
    </div>
  );
};

// Export as default instead of named export
export default ElementLibrary;
