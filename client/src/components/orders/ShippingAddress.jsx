/**
 * Shipping Address Display Component
 * Follows Pazar+ Design System patterns for layout and typography
 */

import React from "react";
import "../../styles/design-system.css";
import { MapPin, Phone } from "lucide-react";

const ShippingAddress = ({ address, className = "" }) => {
  if (!address) {
    return (
      <div className={`pazar-text-sm text-muted ${className}`}>
        Adres bilgisi yok
      </div>
    );
  }

  return (
    <div className={className}>
      <h4 className="pazar-heading-lg mb-4 flex items-center">
        <MapPin className="h-5 w-5 mr-2 text-muted" />
        Teslimat Adresi
      </h4>
      <div className="pazar-surface-secondary rounded-lg p-4">
        {(address.firstName || address.lastName) && (
          <p className="font-medium">
            {address.firstName} {address.lastName}
          </p>
        )}

        {address.street && (
          <p className="pazar-text-sm text-muted mt-1">{address.street}</p>
        )}

        <p className="pazar-text-sm text-muted">
          {address.neighborhood && `${address.neighborhood}, `}
          {address.district && `${address.district}, `}
          {address.city}
        </p>

        {address.postalCode && (
          <p className="pazar-text-sm text-muted">
            Posta Kodu: {address.postalCode}
          </p>
        )}

        {address.phone && (
          <p className="pazar-text-sm text-muted mt-2 flex items-center">
            <Phone className="h-4 w-4 mr-1" />
            {address.phone}
          </p>
        )}
      </div>
    </div>
  );
};

// Compact address display for table view
export const ShippingAddressCompact = ({ address, className = "" }) => {
  if (!address) {
    return (
      <span className={`pazar-text-sm text-muted ${className}`}>Adres yok</span>
    );
  }

  const addressParts = [address.district, address.city].filter(Boolean);

  return (
    <div className={`pazar-text-sm ${className}`}>
      {(address.firstName || address.lastName) && (
        <div className="font-medium">
          {address.firstName} {address.lastName}
        </div>
      )}
      {addressParts.length > 0 && (
        <div className="text-muted">{addressParts.join(", ")}</div>
      )}
    </div>
  );
};

export default ShippingAddress;
