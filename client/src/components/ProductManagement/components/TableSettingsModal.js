import React, { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  SortAsc,
  SortDesc,
  RotateCcw,
  Columns,
  Layout,
  Grid,
  List,
  Save,
} from "lucide-react";
import { Button, Modal, Badge } from "../../ui";
import { Card, CardContent } from "../../ui/Card";

// Default table columns configuration
const DEFAULT_COLUMNS = [
  {
    id: "checkbox",
    label: "Seçim",
    visible: true,
    sortable: false,
    sticky: true,
  },
  {
    id: "product",
    label: "Ürün Bilgisi",
    visible: true,
    sortable: true,
    sticky: true,
  },
  { id: "variant", label: "Varyant", visible: true, sortable: false },
  { id: "status", label: "Durum", visible: true, sortable: true },
  { id: "completion", label: "Doluluk Oranı", visible: true, sortable: false },
  { id: "sku", label: "Stok Kodu", visible: true, sortable: true },
  { id: "commission", label: "Komisyon", visible: true, sortable: false },
  { id: "price", label: "Satış Fiyatı", visible: true, sortable: true },
  { id: "stock", label: "Stok", visible: true, sortable: true },
  { id: "buyboxPrice", label: "Buybox Fiyatı", visible: true, sortable: false },
  { id: "buybox", label: "Buybox", visible: true, sortable: false },
  {
    id: "deliveryTime",
    label: "Termin Süresi",
    visible: true,
    sortable: false,
  },
  { id: "category", label: "Kategori", visible: true, sortable: true },
  { id: "brand", label: "Marka", visible: true, sortable: false },
  { id: "platform", label: "Platform", visible: true, sortable: false },
  {
    id: "actions",
    label: "İşlemler",
    visible: true,
    sortable: false,
    sticky: true,
  },
];

const DEFAULT_SETTINGS = {
  columns: DEFAULT_COLUMNS,
  rowHeight: "normal", // compact, normal, comfortable
  showImages: true,
  showVariants: true,
  alternateRowColors: false,
  stickyHeaders: true,
  defaultSort: { field: "name", order: "asc" },
};

const TableSettingsModal = ({
  isOpen,
  onClose,
  settings = DEFAULT_SETTINGS,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleColumnVisibilityChange = (columnId, visible) => {
    setLocalSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, visible } : col
      ),
    }));
  };

  const handleRowHeightChange = (rowHeight) => {
    setLocalSettings((prev) => ({ ...prev, rowHeight }));
  };

  const handleToggleSetting = (settingKey) => {
    setLocalSettings((prev) => ({ ...prev, [settingKey]: !prev[settingKey] }));
  };

  const handleDefaultSortChange = (field, order) => {
    setLocalSettings((prev) => ({
      ...prev,
      defaultSort: { field, order },
    }));
  };

  const resetToDefaults = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  const handleSave = () => {
    onSave?.(localSettings);
    onClose();
  };

  const visibleColumnsCount = localSettings.columns.filter(
    (col) => col.visible
  ).length;
  const totalColumnsCount = localSettings.columns.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tablo Ayarları"
      size="lg"
      closeOnOverlayClick={true}
    >
      <div className="space-y-6">
        {/* Column Visibility */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Columns className="h-5 w-5 text-gray-600" />
                <h3 className="font-medium text-gray-900">Sütun Görünürlüğü</h3>
                <Badge variant="secondary">
                  {visibleColumnsCount}/{totalColumnsCount}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Toggle all columns except sticky ones
                  const allVisible = localSettings.columns
                    .filter((col) => !col.sticky)
                    .every((col) => col.visible);
                  setLocalSettings((prev) => ({
                    ...prev,
                    columns: prev.columns.map((col) =>
                      col.sticky ? col : { ...col, visible: !allVisible }
                    ),
                  }));
                }}
              >
                {localSettings.columns
                  .filter((col) => !col.sticky)
                  .every((col) => col.visible) ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Tümünü Gizle
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Tümünü Göster
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {localSettings.columns.map((column) => (
                <div
                  key={column.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    column.sticky
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={column.visible}
                      onChange={(e) =>
                        handleColumnVisibilityChange(
                          column.id,
                          e.target.checked
                        )
                      }
                      disabled={column.sticky}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span
                      className={`text-sm ${
                        column.sticky
                          ? "text-blue-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {column.label}
                    </span>
                  </div>
                  {column.sticky && (
                    <Badge variant="outline" className="text-xs">
                      Sabit
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Display Options */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Layout className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Görünüm Seçenekleri</h3>
            </div>

            <div className="space-y-4">
              {/* Row Height */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Satır Yüksekliği
                </label>
                <div className="flex space-x-2">
                  {[
                    { value: "compact", label: "Kompakt", icon: Grid },
                    { value: "normal", label: "Normal", icon: List },
                    { value: "comfortable", label: "Rahat", icon: Layout },
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={
                        localSettings.rowHeight === value
                          ? "primary"
                          : "outline"
                      }
                      onClick={() => handleRowHeightChange(value)}
                      className="flex-1"
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Visual Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Ürün Görselleri
                    </span>
                    <p className="text-xs text-gray-500">
                      Tabloda ürün görsellerini göster
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.showImages}
                    onChange={() => handleToggleSetting("showImages")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Varyant Bilgisi
                    </span>
                    <p className="text-xs text-gray-500">
                      Ürün varyantlarını göster
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.showVariants}
                    onChange={() => handleToggleSetting("showVariants")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Alternatif Satır Renkleri
                    </span>
                    <p className="text-xs text-gray-500">
                      Her iki satırda bir farklı renk
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.alternateRowColors}
                    onChange={() => handleToggleSetting("alternateRowColors")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Sabit Başlıklar
                    </span>
                    <p className="text-xs text-gray-500">
                      Kaydırırken başlıkları sabitle
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.stickyHeaders}
                    onChange={() => handleToggleSetting("stickyHeaders")}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Sorting */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <SortAsc className="h-5 w-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">Varsayılan Sıralama</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sıralama Alanı
                </label>
                <select
                  value={localSettings.defaultSort.field}
                  onChange={(e) =>
                    handleDefaultSortChange(
                      e.target.value,
                      localSettings.defaultSort.order
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {localSettings.columns
                    .filter((col) => col.sortable && col.visible)
                    .map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sıralama Yönü
                </label>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={
                      localSettings.defaultSort.order === "asc"
                        ? "primary"
                        : "outline"
                    }
                    onClick={() =>
                      handleDefaultSortChange(
                        localSettings.defaultSort.field,
                        "asc"
                      )
                    }
                    className="flex-1"
                  >
                    <SortAsc className="h-4 w-4 mr-1" />
                    Artan
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      localSettings.defaultSort.order === "desc"
                        ? "primary"
                        : "outline"
                    }
                    onClick={() =>
                      handleDefaultSortChange(
                        localSettings.defaultSort.field,
                        "desc"
                      )
                    }
                    className="flex-1"
                  >
                    <SortDesc className="h-4 w-4 mr-1" />
                    Azalan
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={resetToDefaults} icon={RotateCcw}>
            Varsayılana Sıfırla
          </Button>

          <div className="flex space-x-3">
            <Button onClick={onClose} variant="outline">
              İptal
            </Button>
            <Button onClick={handleSave} variant="primary" icon={Save}>
              Ayarları Kaydet
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TableSettingsModal;
