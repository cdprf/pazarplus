/**
 * OrderForm - Form component for creating and editing orders
 * Follows Pazar+ Design System patterns for forms and layout
 * Extracted from legacy OrderManagement for modular architecture
 */

import React, { useState, useCallback } from "react";

import { FormField } from "../FormControls";
import { ValidationMessage } from "../ValidationMessage";
import OrderService from "../../services/OrderService";

const OrderForm = ({
  order,
  mode,
  onSave,
  onCancel,
  onUpdateStatus,
  getStatusVariant,
  getStatusText,
  formatCurrency,
  formatDate,
}) => {
  const [formData, setFormData] = useState(order);
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(
    async (e) => {
      e.preventDefault();

      // Use OrderService validation
      const validation = OrderService.validateOrderData(formData);
      if (!validation.isValid) {
        // Convert array of error messages to object format expected by UI
        const errorObj = {};
        validation.errors.forEach((error) => {
          if (error.includes("Müşteri adı")) errorObj.customerName = error;
          else if (error.includes("email")) errorObj.customerEmail = error;
          else if (error.includes("telefon")) errorObj.customerPhone = error;
          else if (error.includes("adresi")) errorObj.shippingAddress = error;
          else if (error.includes("şehri")) errorObj.shippingCity = error;
          else if (error.includes("ürün")) errorObj.items = error;
          else errorObj.general = error;
        });
        setValidationErrors(errorObj);
        return;
      }

      setSaving(true);
      setValidationErrors({});

      try {
        await onSave(formData);
      } finally {
        setSaving(false);
      }
    },
    [formData, onSave]
  );

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear validation error when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [validationErrors]
  );

  if (mode === "view") {
    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="pazar-form-label">Sipariş Numarası</label>
            <p className="mt-1 pazar-text-sm">{order.orderNumber}</p>
          </div>
          <div>
            <label className="pazar-form-label">Platform</label>
            <span
              className={`pazar-badge pazar-badge-${
                order.platform === "trendyol"
                  ? "warning"
                  : order.platform === "hepsiburada"
                  ? "info"
                  : "secondary"
              }`}
            >
              {order.platform}
            </span>
          </div>
          <div>
            <label className="pazar-form-label">Müşteri</label>
            <p className="mt-1 pazar-text-sm">{order.customerName}</p>
          </div>
          <div>
            <label className="pazar-form-label">Durum</label>
            <div className="mt-1 flex items-center space-x-2">
              <span
                className={`pazar-badge pazar-badge-${getStatusVariant(
                  order.status
                )}`}
              >
                {getStatusText(order.status)}
              </span>
            </div>
          </div>
          <div>
            <label className="pazar-form-label">Toplam Tutar</label>
            <p className="mt-1 pazar-text-sm font-bold">
              {formatCurrency(order.totalAmount, order.currency)}
            </p>
          </div>
          <div>
            <label className="pazar-form-label">Sipariş Tarihi</label>
            <p className="mt-1 pazar-text-sm">{formatDate(order)}</p>
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div>
            <h4 className="pazar-heading-lg mb-4">Sipariş Ürünleri</h4>
            <div className="pazar-surface-secondary rounded-lg p-4">
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-surface-300 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium">
                        {item.productName || item.title}
                      </p>
                      <p className="pazar-text-sm text-muted">
                        Adet: {item.quantity}
                        {item.sku && ` • SKU: ${item.sku}`}
                        {item.productColor && ` • Renk: ${item.productColor}`}
                        {item.productSize && ` • Beden: ${item.productSize}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(
                          item.price || item.totalPrice,
                          order.currency
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div>
            <h4 className="pazar-heading-lg mb-4">Teslimat Adresi</h4>
            <div className="pazar-surface-secondary rounded-lg p-4">
              <p className="pazar-text-sm">{order.shippingAddress.fullName}</p>
              <p className="pazar-text-sm">{order.shippingAddress.address}</p>
              <p className="pazar-text-sm">
                {order.shippingAddress.district} / {order.shippingAddress.city}
              </p>
              <p className="pazar-text-sm">
                {order.shippingAddress.postalCode}
              </p>
              {order.shippingAddress.phone && (
                <p className="pazar-text-sm">
                  Tel: {order.shippingAddress.phone}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit/Create form
  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Basic Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField>
          <FormField.Label required>Sipariş Numarası</FormField.Label>
          <FormField.Input
            value={formData.orderNumber || ""}
            onChange={(e) => handleInputChange("orderNumber", e.target.value)}
            error={validationErrors.orderNumber}
            disabled={mode === "edit"} // Order number shouldn't be editable
          />
          {validationErrors.orderNumber && (
            <ValidationMessage
              type="error"
              messages={[validationErrors.orderNumber]}
            />
          )}
        </FormField>

        <FormField>
          <FormField.Label required>Platform</FormField.Label>
          <FormField.Select
            value={formData.platform || ""}
            onChange={(e) => handleInputChange("platform", e.target.value)}
            options={[
              { value: "", label: "Platform Seçin" },
              { value: "trendyol", label: "Trendyol" },
              { value: "hepsiburada", label: "Hepsiburada" },
              { value: "n11", label: "N11" },
              { value: "amazon", label: "Amazon" },
            ]}
            error={validationErrors.platform}
          />
          {validationErrors.platform && (
            <ValidationMessage
              type="error"
              messages={[validationErrors.platform]}
            />
          )}
        </FormField>

        <FormField>
          <FormField.Label required>Müşteri Adı</FormField.Label>
          <FormField.Input
            value={formData.customerName || ""}
            onChange={(e) => handleInputChange("customerName", e.target.value)}
            error={validationErrors.customerName}
          />
          {validationErrors.customerName && (
            <ValidationMessage
              type="error"
              messages={[validationErrors.customerName]}
            />
          )}
        </FormField>

        <FormField>
          <FormField.Label>Müşteri E-posta</FormField.Label>
          <FormField.Input
            type="email"
            value={formData.customerEmail || ""}
            onChange={(e) => handleInputChange("customerEmail", e.target.value)}
            error={validationErrors.customerEmail}
          />
          {validationErrors.customerEmail && (
            <ValidationMessage
              type="error"
              messages={[validationErrors.customerEmail]}
            />
          )}
        </FormField>

        <FormField>
          <FormField.Label required>Toplam Tutar</FormField.Label>
          <FormField.Input
            type="number"
            step="0.01"
            value={formData.totalAmount || ""}
            onChange={(e) =>
              handleInputChange("totalAmount", parseFloat(e.target.value))
            }
            error={validationErrors.totalAmount}
          />
          {validationErrors.totalAmount && (
            <ValidationMessage
              type="error"
              messages={[validationErrors.totalAmount]}
            />
          )}
        </FormField>

        <FormField>
          <FormField.Label>Para Birimi</FormField.Label>
          <FormField.Select
            value={formData.currency || "TRY"}
            onChange={(e) => handleInputChange("currency", e.target.value)}
            options={[
              { value: "TRY", label: "Türk Lirası (TRY)" },
              { value: "USD", label: "Amerikan Doları (USD)" },
              { value: "EUR", label: "Euro (EUR)" },
            ]}
          />
        </FormField>

        <FormField>
          <FormField.Label>Sipariş Durumu</FormField.Label>
          <FormField.Select
            value={formData.status || "pending"}
            onChange={(e) => handleInputChange("status", e.target.value)}
            options={[
              { value: "pending", label: "Beklemede" },
              { value: "confirmed", label: "Onaylandı" },
              { value: "processing", label: "Hazırlanıyor" },
              { value: "shipped", label: "Kargoda" },
              { value: "delivered", label: "Teslim Edildi" },
              { value: "cancelled", label: "İptal Edildi" },
            ]}
          />
        </FormField>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-surface-300">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="pazar-btn pazar-btn-outline"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="pazar-btn pazar-btn-primary"
        >
          {saving
            ? "Kaydediliyor..."
            : mode === "create"
            ? "Oluştur"
            : "Güncelle"}
        </button>
      </div>

      {/* Validation Errors Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <ValidationMessage
          type="error"
          title="Form Hataları"
          messages={Object.values(validationErrors)}
        />
      )}
    </form>
  );
};

export default OrderForm;
