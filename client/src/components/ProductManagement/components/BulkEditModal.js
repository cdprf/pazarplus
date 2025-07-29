import logger from "../../../utils/logger.js";
import React, { useState } from "react";
import { X, Save, AlertTriangle } from "lucide-react";
import { Button } from "../../ui";
import {
  CATEGORIES,
  STATUS_OPTIONS,
  SOURCING_OPTIONS,
} from "../utils/constants";

/**
 * BulkEditModal Component
 * Allows editing multiple products at once
 */
const BulkEditModal = ({
  isOpen,
  onClose,
  selectedProducts = [],
  onSave,
  products = [],
}) => {
  const [editData, setEditData] = useState({
    price: { enabled: false, value: "", operation: "set", percentage: 10 },
    status: { enabled: false, value: "" },
    category: { enabled: false, value: "" },
    sourcing: { enabled: false, value: "" },
    stock: { enabled: false, value: "", operation: "set", amount: 10 },
  });

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggleField = (field) => {
    setEditData((prev) => ({
      ...prev,
      [field]: { ...prev[field], enabled: !prev[field].enabled },
    }));
  };

  const handleValueChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: { ...prev[field], value },
    }));
  };

  const handleOperationChange = (field, operation) => {
    setEditData((prev) => ({
      ...prev,
      [field]: { ...prev[field], operation },
    }));
  };

  const handleAmountChange = (field, amount) => {
    setEditData((prev) => ({
      ...prev,
      [field]: { ...prev[field], amount: parseFloat(amount) },
    }));
  };

  const handlePercentageChange = (field, percentage) => {
    setEditData((prev) => ({
      ...prev,
      [field]: { ...prev[field], percentage: parseFloat(percentage) },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Prepare data for bulk update
      const updateData = {};

      if (editData.price.enabled) {
        updateData.price = {
          operation: editData.price.operation,
          value:
            editData.price.operation === "set"
              ? parseFloat(editData.price.value)
              : editData.price.percentage,
        };
      }

      if (editData.status.enabled) {
        updateData.status = editData.status.value;
      }

      if (editData.category.enabled) {
        updateData.category = editData.category.value;
      }

      if (editData.stock.enabled) {
        updateData.stock = {
          operation: editData.stock.operation,
          value:
            editData.stock.operation === "set"
              ? parseInt(editData.stock.value)
              : editData.stock.amount,
        };
      }

      await onSave(selectedProducts, updateData);
      onClose();
    } catch (error) {
      logger.error("Error during bulk update:", error);
    } finally {
      setSaving(false);
    }
  };

  // Get selected product names for display
  const selectedProductNames = selectedProducts
    .map((id) => products.find((p) => p.id === id)?.name || `Ürün #${id}`)
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Toplu Düzenleme
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                <span>{selectedProducts.length} ürün seçildi</span>
              </div>
              {selectedProductNames.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedProductNames.join(", ")}
                  {selectedProducts.length > 3 &&
                    ` ve ${selectedProducts.length - 3} ürün daha`}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Price Edit */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData.price.enabled}
                      onChange={() => handleToggleField("price")}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fiyat
                    </span>
                  </label>
                  <div className="flex items-center">
                    <select
                      value={editData.price.operation}
                      onChange={(e) =>
                        handleOperationChange("price", e.target.value)
                      }
                      disabled={!editData.price.enabled}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-md mr-2 px-2 py-1"
                    >
                      <option value="set">Ayarla</option>
                      <option value="increase">Artır (%)</option>
                      <option value="decrease">Azalt (%)</option>
                    </select>
                    {editData.price.operation === "set" ? (
                      <input
                        type="number"
                        value={editData.price.value}
                        onChange={(e) =>
                          handleValueChange("price", e.target.value)
                        }
                        disabled={!editData.price.enabled}
                        placeholder="Fiyat"
                        className="w-24 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={editData.price.percentage}
                          onChange={(e) =>
                            handlePercentageChange("price", e.target.value)
                          }
                          disabled={!editData.price.enabled}
                          placeholder="%"
                          className="w-16 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                          min="0"
                          max="100"
                        />
                        <span className="ml-1 text-sm text-gray-500">%</span>
                      </div>
                    )}
                  </div>
                </div>
                {editData.price.enabled && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {editData.price.operation === "set"
                      ? `Tüm seçili ürünlerin fiyatı ${
                          editData.price.value || 0
                        } ₺ olarak ayarlanacak`
                      : editData.price.operation === "increase"
                      ? `Tüm seçili ürünlerin fiyatı %${
                          editData.price.percentage || 0
                        } artırılacak`
                      : `Tüm seçili ürünlerin fiyatı %${
                          editData.price.percentage || 0
                        } azaltılacak`}
                  </div>
                )}
              </div>

              {/* Status Edit */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData.status.enabled}
                      onChange={() => handleToggleField("status")}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Durum
                    </span>
                  </label>
                  <select
                    value={editData.status.value}
                    onChange={(e) =>
                      handleValueChange("status", e.target.value)
                    }
                    disabled={!editData.status.enabled}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                  >
                    <option value="">Durum Seçin</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Edit */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData.category.enabled}
                      onChange={() => handleToggleField("category")}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Kategori
                    </span>
                  </label>
                  <select
                    value={editData.category.value}
                    onChange={(e) =>
                      handleValueChange("category", e.target.value)
                    }
                    disabled={!editData.category.enabled}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                  >
                    <option value="">Kategori Seçin</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sourcing Edit */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData.sourcing.enabled}
                      onChange={() => handleToggleField("sourcing")}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tedarik Türü
                    </span>
                  </label>
                  <select
                    value={editData.sourcing.value}
                    onChange={(e) =>
                      handleValueChange("sourcing", e.target.value)
                    }
                    disabled={!editData.sourcing.enabled}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                  >
                    {SOURCING_OPTIONS.map((sourcing) => (
                      <option key={sourcing.value} value={sourcing.value}>
                        {sourcing.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock Edit */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData.stock.enabled}
                      onChange={() => handleToggleField("stock")}
                      className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Stok
                    </span>
                  </label>
                  <div className="flex items-center">
                    <select
                      value={editData.stock.operation}
                      onChange={(e) =>
                        handleOperationChange("stock", e.target.value)
                      }
                      disabled={!editData.stock.enabled}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-md mr-2 px-2 py-1"
                    >
                      <option value="set">Ayarla</option>
                      <option value="increase">Artır</option>
                      <option value="decrease">Azalt</option>
                    </select>
                    {editData.stock.operation === "set" ? (
                      <input
                        type="number"
                        value={editData.stock.value}
                        onChange={(e) =>
                          handleValueChange("stock", e.target.value)
                        }
                        disabled={!editData.stock.enabled}
                        placeholder="Stok"
                        className="w-24 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                        min="0"
                      />
                    ) : (
                      <input
                        type="number"
                        value={editData.stock.amount}
                        onChange={(e) =>
                          handleAmountChange("stock", e.target.value)
                        }
                        disabled={!editData.stock.enabled}
                        placeholder="Miktar"
                        className="w-16 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1"
                        min="0"
                      />
                    )}
                  </div>
                </div>
                {editData.stock.enabled && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {editData.stock.operation === "set"
                      ? `Tüm seçili ürünlerin stok miktarı ${
                          editData.stock.value || 0
                        } olarak ayarlanacak`
                      : editData.stock.operation === "increase"
                      ? `Tüm seçili ürünlerin stok miktarı ${
                          editData.stock.amount || 0
                        } adet artırılacak`
                      : `Tüm seçili ürünlerin stok miktarı ${
                          editData.stock.amount || 0
                        } adet azaltılacak`}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={onClose} variant="outline" disabled={saving}>
                  İptal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    saving ||
                    !(
                      editData.price.enabled ||
                      editData.status.enabled ||
                      editData.category.enabled ||
                      editData.stock.enabled
                    )
                  }
                >
                  {saving && <Save className="w-4 h-4 mr-2 animate-spin" />}
                  Değişiklikleri Kaydet
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
