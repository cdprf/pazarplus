/**
 * Order Items Display Component
 * Follows Pazar+ Design System patterns for text and layout
 */

import React from "react";
import { formatCurrency } from "../../utils/platformHelpers";
import { createSafeKeyFromFields } from "../../utils/reactHelpers";

const OrderItems = ({ order, className = "" }) => {
  if (!order.items || order.items.length === 0) {
    return (
      <div className={`pazar-text-sm text-muted ${className}`}>
        Ürün bilgisi yok
      </div>
    );
  }

  // Single item display
  if (order.items.length === 1) {
    const item = order.items[0];
    return (
      <div className={`pazar-text-sm ${className}`}>
        <div className="font-medium">
          {item.title || item.productName || "Bilinmiyor"} ×{" "}
          {item.quantity || 1}
        </div>
        {item.sku && (
          <div className="pazar-text-xs text-muted mt-1">SKU: {item.sku}</div>
        )}
        {(item.productColor || item.productSize) && (
          <div className="pazar-text-xs text-muted mt-1">
            {item.productColor && `Renk: ${item.productColor}`}
            {item.productColor && item.productSize && " • "}
            {item.productSize && `Beden: ${item.productSize}`}
          </div>
        )}
      </div>
    );
  }

  // Multiple items display
  return (
    <div className={`pazar-text-sm ${className}`}>
      {order.items.slice(0, 2).map((item, idx) => (
        <div
          key={createSafeKeyFromFields(
            item,
            ["id", "sku"],
            "preview-item",
            idx
          )}
          className="mb-1"
        >
          <div className="font-medium">
            {item.title || item.productName || "Bilinmiyor"} ×{" "}
            {item.quantity || 1}
          </div>
          {item.sku && (
            <div className="pazar-text-xs text-muted">SKU: {item.sku}</div>
          )}
        </div>
      ))}
      {order.items.length > 2 && (
        <div className="pazar-text-xs text-muted">
          +{order.items.length - 2} ürün daha
        </div>
      )}
    </div>
  );
};

// Detailed order items for modal/detail view
export const OrderItemsDetailed = ({ order, className = "" }) => {
  if (!order.items || order.items.length === 0) {
    return (
      <div className={`pazar-text-sm text-muted ${className}`}>
        Ürün bilgisi yok
      </div>
    );
  }

  return (
    <div className={className}>
      <h4 className="pazar-heading-lg mb-4">Sipariş Ürünleri</h4>
      <div className="pazar-surface-secondary rounded-lg p-4">
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div
              key={createSafeKeyFromFields(
                item,
                ["id", "sku"],
                "detailed-item",
                index
              )}
              className="flex justify-between items-center py-2 border-b border-surface-300 last:border-b-0"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {item.title || item.productName || "Bilinmiyor"}
                </p>
                <div className="pazar-text-sm text-muted mt-1">
                  <span>Adet: {item.quantity || 1}</span>
                  {item.sku && <span> • SKU: {item.sku}</span>}
                  {item.productColor && (
                    <span> • Renk: {item.productColor}</span>
                  )}
                  {item.productSize && (
                    <span> • Beden: {item.productSize}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {formatCurrency(
                    item.amount || item.totalPrice || 0,
                    order.currency
                  )}
                </p>
                {item.unitPrice && (
                  <p className="pazar-text-sm text-muted">
                    Birim: {formatCurrency(item.unitPrice, order.currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderItems;
