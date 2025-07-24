import logger from "../../utils/logger";
/**
 * Enhanced Shipping Address Display Component
 * Follows Pazar+ Design System patterns with improved layout and functionality
 */

import React from "react";

import {
  MapPin,
  Phone,
  Mail,
  User,
  Home,
  Copy,
  ExternalLink,
} from "lucide-react";

const ShippingAddress = ({
  order,
  className = "",
  showCopyButton = true,
  showMapLink = true,
}) => {
  const shippingAddress = order?.shippingAddress;

  if (!shippingAddress) {
    return (
      <div
        className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-6 ${className}`}
      >
        <div className="text-center">
          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Teslimat adresi bilgisi bulunmuyor
          </p>
        </div>
      </div>
    );
  }

  // Parse address - handle JSON string, object, or plain string
  const parseAddress = (addressData) => {
    if (!addressData) return null;

    // If it's already an object, return it
    if (typeof addressData === "object") {
      return addressData;
    }

    // If it's a string, try to parse as JSON first
    if (typeof addressData === "string") {
      try {
        const parsed = JSON.parse(addressData);
        if (typeof parsed === "object") {
          return parsed;
        }
      } catch (e) {
        // If JSON parsing fails, treat as plain text address
        return { fullAddress: addressData };
      }
    }

    return { fullAddress: String(addressData) };
  };

  const address = parseAddress(shippingAddress);

  // Format complete address string
  const formatCompleteAddress = () => {
    if (!address) return "";

    // If we have a fullAddress field, use it
    if (address.fullAddress) {
      return address.fullAddress;
    }

    // Otherwise, construct from individual fields
    const parts = [
      address.firstName &&
        address.lastName &&
        `${address.firstName} ${address.lastName}`,
      address.street || address.address,
      address.buildingNumber && `No: ${address.buildingNumber}`,
      address.apartment && `Daire: ${address.apartment}`,
      address.neighborhood || address.district,
      address.city,
      address.province || address.state,
      address.postalCode && `${address.postalCode}`,
      address.country &&
      address.country !== "Turkey" &&
      address.country !== "TR"
        ? address.country
        : null,
    ].filter(Boolean);

    return parts.join(", ");
  };

  // Format address for display
  const getDisplayAddress = () => {
    if (!address) return "";

    // If we have a simple fullAddress, return it
    if (address.fullAddress && typeof address.fullAddress === "string") {
      return address.fullAddress;
    }

    // Otherwise, format nicely with line breaks
    const lines = [];

    // Recipient name
    if (address.firstName || address.lastName) {
      lines.push(`${address.firstName || ""} ${address.lastName || ""}`.trim());
    }

    // Street address
    if (address.street || address.address) {
      let streetLine = address.street || address.address;
      if (address.buildingNumber)
        streetLine += ` No: ${address.buildingNumber}`;
      if (address.apartment) streetLine += ` Daire: ${address.apartment}`;
      lines.push(streetLine);
    }

    // Area information
    const areaInfo = [
      address.neighborhood,
      address.district,
      address.city,
      address.province || address.state,
    ].filter(Boolean);

    if (areaInfo.length > 0) {
      lines.push(areaInfo.join(", "));
    }

    // Postal code and country
    const finalInfo = [
      address.postalCode,
      address.country &&
      address.country !== "Turkey" &&
      address.country !== "TR"
        ? address.country
        : null,
    ].filter(Boolean);

    if (finalInfo.length > 0) {
      lines.push(finalInfo.join(" "));
    }

    return lines.join("\n") || formatCompleteAddress();
  };

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(formatCompleteAddress());
      // You could add a toast notification here
    } catch (error) {
      logger.error("Failed to copy address:", error);
    }
  };

  // Open address in maps
  const handleOpenInMaps = () => {
    const query = encodeURIComponent(formatCompleteAddress());
    window.open(`https://www.google.com/maps/search/${query}`, "_blank");
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <MapPin className="h-5 w-5 mr-2 icon-contrast-primary" />
          Teslimat Adresi
        </h4>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {showCopyButton && (
            <button
              onClick={handleCopyAddress}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Adresi kopyala"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}

          {showMapLink && (
            <button
              onClick={handleOpenInMaps}
              className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Haritada aç"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Recipient Information */}
        {(address?.firstName || address?.lastName) && (
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <User className="h-4 w-4 text-gray-500 mr-3" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {address.firstName} {address.lastName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Alıcı
              </div>
            </div>
          </div>
        )}

        {/* Address Details */}
        <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Home className="h-4 w-4 text-gray-500 mr-3 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              Adres
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {getDisplayAddress()}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {(address?.phone || address?.email) && (
          <div className="space-y-2">
            {address.phone && (
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Phone className="h-4 w-4 text-gray-500 mr-3" />
                <div>
                  <div className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {address.phone}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Telefon
                  </div>
                </div>
              </div>
            )}

            {address.email && (
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Mail className="h-4 w-4 text-gray-500 mr-3" />
                <div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {address.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    E-posta
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Notes */}
        {address.notes && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <span className="font-medium">Not: </span>
              {address.notes}
            </div>
          </div>
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
