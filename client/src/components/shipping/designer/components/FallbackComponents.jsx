import React from "react";

// Try to import react-barcode, fallback to custom implementation
let Barcode;
try {
  Barcode = require("react-barcode").default || require("react-barcode");
} catch (e) {
  console.warn("react-barcode not available, using fallback barcode component");
}

// Try to import react-qr-code, fallback to custom implementation
let QRCode;
try {
  QRCode = require("react-qr-code").default || require("react-qr-code");
} catch (e) {
  console.warn("react-qr-code not available, using fallback QR component");
}

// Fallback Barcode component
export const FallbackBarcode = ({
  value = "1234567890",
  format = "CODE128",
  displayValue = true,
}) => (
  <div className="flex flex-col items-center justify-center h-full bg-gray-50 border border-gray-300 rounded">
    <div className="flex space-x-1 mb-1">
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="bg-black"
          style={{
            width: Math.random() > 0.5 ? "2px" : "1px",
            height: "20px",
          }}
        />
      ))}
    </div>
    {displayValue && (
      <div className="text-xs font-mono text-gray-700">{value}</div>
    )}
  </div>
);

// Fallback QR Code component
export const FallbackQRCode = ({
  value = "https://example.com",
  size = 64,
}) => (
  <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-300 rounded">
    <div
      className="grid grid-cols-8 gap-px"
      style={{ width: size, height: size }}
    >
      {Array.from({ length: 64 }, (_, i) => (
        <div
          key={i}
          className={Math.random() > 0.5 ? "bg-black" : "bg-white"}
          style={{ width: "100%", height: "100%" }}
        />
      ))}
    </div>
  </div>
);

// Export the actual components to use (either real or fallback)
export const BarcodeComponent = Barcode || FallbackBarcode;
export const QRCodeComponent = QRCode || FallbackQRCode;

// Export FallbackComponents object as expected by the imports
export const FallbackComponents = {
  BarcodeComponent,
  QRCodeComponent,
  FallbackBarcode,
  FallbackQRCode,
};
