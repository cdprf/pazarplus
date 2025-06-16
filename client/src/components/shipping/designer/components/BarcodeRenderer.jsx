import React from "react";
import Barcode from "react-barcode";

const BarcodeRenderer = ({
  content = "1234567890",
  type = "code128",
  showText = true,
  scale = 2,
  width = 200,
  height = 60,
}) => {
  // Map our barcode types to react-barcode format
  const barcodeFormatMap = {
    code128: "CODE128",
    code39: "CODE39",
    code93: "CODE93",
    ean8: "EAN8",
    ean13: "EAN13",
    upca: "UPC",
    upce: "UPC",
    // Add more common formats
    codabar: "codabar",
    itf14: "ITF14",
    msi: "MSI",
  };

  const format = barcodeFormatMap[type?.toLowerCase()] || "CODE128";

  // Clean and validate content based on barcode type
  const cleanContent = (rawContent, barcodeType) => {
    if (!rawContent) return "1234567890";

    // Remove Turkish characters and non-ASCII characters for barcode compatibility
    let cleaned = rawContent
      .replace(/[çÇ]/g, "c")
      .replace(/[ğĞ]/g, "g")
      .replace(/[ıİ]/g, "i")
      .replace(/[öÖ]/g, "o")
      .replace(/[şŞ]/g, "s")
      .replace(/[üÜ]/g, "u")
      .replace(/[^A-Za-z0-9\s\-.]/g, ""); // Keep only alphanumeric, spaces, hyphens, dots

    // Type-specific validation and formatting
    switch (barcodeType.toLowerCase()) {
      case "ean8":
        // EAN-8 requires exactly 7 or 8 digits
        cleaned = cleaned.replace(/\D/g, ""); // Only digits
        if (cleaned.length < 7) {
          cleaned = cleaned.padEnd(7, "0");
        } else if (cleaned.length > 8) {
          cleaned = cleaned.substring(0, 7);
        }
        return cleaned || "1234567";

      case "ean13":
        // EAN-13 requires exactly 12 or 13 digits
        cleaned = cleaned.replace(/\D/g, ""); // Only digits
        if (cleaned.length < 12) {
          cleaned = cleaned.padEnd(12, "0");
        } else if (cleaned.length > 13) {
          cleaned = cleaned.substring(0, 12);
        }
        return cleaned || "123456789012";

      case "upca":
        // UPC-A requires exactly 11 or 12 digits
        cleaned = cleaned.replace(/\D/g, ""); // Only digits
        if (cleaned.length < 11) {
          cleaned = cleaned.padEnd(11, "0");
        } else if (cleaned.length > 12) {
          cleaned = cleaned.substring(0, 11);
        }
        return cleaned || "12345678901";

      case "upce":
        // UPC-E requires exactly 6, 7 or 8 digits
        cleaned = cleaned.replace(/\D/g, ""); // Only digits
        if (cleaned.length < 6) {
          cleaned = cleaned.padEnd(6, "0");
        } else if (cleaned.length > 8) {
          cleaned = cleaned.substring(0, 6);
        }
        return cleaned || "123456";

      case "code39":
        // CODE39 supports A-Z, 0-9, and some special chars
        cleaned = cleaned.toUpperCase().replace(/[^A-Z0-9\-.\s$/+%]/g, "");
        return cleaned || "HELLO123";

      default:
        // CODE128 and others are more flexible
        return cleaned || "1234567890";
    }
  };

  const validContent = cleanContent(content, type);

  try {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Barcode
          value={validContent}
          format={format}
          width={Math.max(1, scale)}
          height={Math.max(20, height * 0.6)}
          displayValue={showText}
          fontSize={Math.max(8, scale * 6)}
          margin={Math.max(2, scale)}
          background="transparent"
          lineColor="#000000"
          textMargin={2}
          textPosition="bottom"
        />
      </div>
    );
  } catch (error) {
    // Fallback display if barcode generation fails
    return (
      <div className="flex flex-col items-center justify-center p-2 border border-gray-300 bg-gray-50">
        <div className="text-xs text-gray-500 mb-1">BARCODE ({format})</div>
        <div className="text-xs font-mono">{validContent}</div>
        <div className="text-xs text-gray-400 mt-1">Scale: {scale}x</div>
        {error.message && (
          <div className="text-xs text-red-500 mt-1">
            Error: {error.message}
          </div>
        )}
      </div>
    );
  }
};

export default BarcodeRenderer;
