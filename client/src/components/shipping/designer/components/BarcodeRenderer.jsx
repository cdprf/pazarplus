import React, { useRef, useEffect, useMemo } from "react";
import bwipjs from "bwip-js/browser";
import { BARCODE_FORMATS } from "../constants/barcodeTypes";

// Standard barcode writer options based on python-barcode specifications
const BARCODE_DEFAULTS = {
  MODULE_WIDTH: 0.2, // mm - width of one barcode module
  MODULE_HEIGHT: 15.0, // mm - height of barcode modules
  QUIET_ZONE: 6.5, // mm - left/right margins
  FONT_SIZE: 10, // pt - text font size
  TEXT_DISTANCE: 5.0, // mm - distance between barcode and text
  BACKGROUND: "transparent",
  FOREGROUND: "#000000",
  CENTER_TEXT: true,
  MIN_ASPECT_RATIO: 2.0, // width:height
  MAX_ASPECT_RATIO: 6.0,
};

const BarcodeRenderer = ({
  content = "1234567890",
  type = "code128",
  showText = true,
  scale = 2, // Scale factor for JsBarcode
  width = 200,
  height = 60,
  // Professional barcode options following JsBarcode documentation
  moduleWidth = null, // Override module width
  moduleHeight = null, // Override module height
  quietZone = null, // Override quiet zone margin
  fontSize = null, // Override font size
  textDistance = null, // Override text distance
  backgroundColor = BARCODE_DEFAULTS.BACKGROUND,
  foregroundColor = BARCODE_DEFAULTS.FOREGROUND,
  centerText = BARCODE_DEFAULTS.CENTER_TEXT,
  barcodeScale = 2.5, // NEW: Barcode scale multiplier (1-5)
  // Additional props to match PDF rendering dimensions
  elementSize = null, // Element size from template (for proper scaling)
  zoom = 1, // Zoom factor from preview
}) => {
  const canvasRef = useRef(null);

  // Using the centralized barcode formats
  const format = BARCODE_FORMATS[type?.toLowerCase()] || "CODE128";
  const validContent = content || "1234567890";

  // Apply the EXACT same logic as the PDF renderer
  // PDF renderer: width/height parameters are already in points, convert to mm for bwip-js
  let adjustedWidth = width;
  let adjustedHeight = height;

  if (elementSize && elementSize.width && elementSize.height) {
    // Use EXACTLY the same constants as PDF renderer
    const PT_TO_MM = 0.352778; // EXACT same as PDF renderer
    const MM_TO_PX = 3.779527559; // Standard 96 DPI conversion

    // Use EXACTLY the same paper dimensions as PDF renderer would calculate
    const paperWidthPt = 595.28; // A4 width in points (same as PDF)
    const paperHeightPt = 841.89; // A4 height in points (same as PDF)

    // Calculate absolute dimensions in points (same as PDF renderer)
    const absoluteWidthPt = (elementSize.width / 100) * paperWidthPt;
    const absoluteHeightPt = (elementSize.height / 100) * paperHeightPt;

    // Convert points to mm (same as PDF renderer does for bwip-js)
    let absoluteWidthMM = absoluteWidthPt * PT_TO_MM;
    let absoluteHeightMM = absoluteHeightPt * PT_TO_MM;

    // IMPORTANT: Apply the SAME aspect ratio constraints as PDF renderer
    const MIN_ASPECT_RATIO = 2.0; // width:height (EXACT same as PDF)
    const MAX_ASPECT_RATIO = 6.0; // (EXACT same as PDF)
    const aspectRatio = absoluteWidthMM / absoluteHeightMM;
    let aspectRatioAdjusted = false;

    if (aspectRatio < MIN_ASPECT_RATIO) {
      absoluteHeightMM = absoluteWidthMM / MIN_ASPECT_RATIO;
      aspectRatioAdjusted = true;
    } else if (aspectRatio > MAX_ASPECT_RATIO) {
      absoluteWidthMM = absoluteHeightMM * MAX_ASPECT_RATIO;
      aspectRatioAdjusted = true;
    }

    // Convert mm to pixels for canvas display
    adjustedWidth = absoluteWidthMM * MM_TO_PX * zoom * barcodeScale;
    adjustedHeight = absoluteHeightMM * MM_TO_PX * zoom * barcodeScale;

    // Apply minimum sizes for visibility
    adjustedWidth = Math.max(adjustedWidth, 60);
    adjustedHeight = Math.max(adjustedHeight, 30);
  } else {
    // Fallback to props with zoom scaling
    adjustedWidth = width * zoom * barcodeScale;
    adjustedHeight = height * zoom * barcodeScale;
  }

  // NOTE: We've already applied aspect ratio constraints above (same as PDF)
  // Remove the duplicate aspect ratio enforcement that was happening here
  let warning = null; // Calculate dimensions using EXACTLY the same logic as PDF renderer
  const barcodeOptions = useMemo(() => {
    // Calculate mm dimensions using EXACTLY the same path as PDF renderer
    let barcodeWidthMM;
    let barcodeHeightMM;

    if (elementSize && elementSize.width && elementSize.height) {
      // Use EXACTLY the same constants as PDF renderer
      const PT_TO_MM = 0.352778; // EXACT same as PDF renderer
      const paperWidthPt = 595.28; // EXACT same as PDF renderer
      const paperHeightPt = 841.89; // EXACT same as PDF renderer

      // Follow EXACT same calculation path as PDF renderer:
      // 1. Convert percentage to points
      const absoluteWidthPt = (elementSize.width / 100) * paperWidthPt;
      const absoluteHeightPt = (elementSize.height / 100) * paperHeightPt;

      // 2. Convert points to mm (exactly like PDF: widthMM = width * PT_TO_MM)
      let absoluteWidthMM = absoluteWidthPt * PT_TO_MM;
      let absoluteHeightMM = absoluteHeightPt * PT_TO_MM;

      // 3. Apply SAME aspect ratio constraints as PDF renderer
      const MIN_ASPECT_RATIO = 2.0; // EXACT same as PDF
      const MAX_ASPECT_RATIO = 6.0; // EXACT same as PDF
      const aspectRatio = absoluteWidthMM / absoluteHeightMM;

      if (aspectRatio < MIN_ASPECT_RATIO) {
        absoluteHeightMM = absoluteWidthMM / MIN_ASPECT_RATIO;
      } else if (aspectRatio > MAX_ASPECT_RATIO) {
        absoluteWidthMM = absoluteHeightMM * MAX_ASPECT_RATIO;
      }

      // Use the aspect-ratio-adjusted dimensions
      barcodeWidthMM = absoluteWidthMM;
      barcodeHeightMM = absoluteHeightMM;
    } else {
      // Fallback: convert pixel dimensions to mm using points as intermediate
      const PT_TO_MM = 0.352778; // Same constant
      barcodeWidthMM = width * PT_TO_MM;
      barcodeHeightMM = height * PT_TO_MM;
    }

    // Since we're now using bwip-js (same as server), we just need to store the dimensions
    return {
      // Rendering dimensions for bwip-js (same as server)
      renderingInfo: {
        barcodeWidthMM,
        barcodeHeightMM,
        elementSize,
        adjustedCanvasSize: { adjustedWidth, adjustedHeight },
      },
    };
  }, [elementSize, adjustedWidth, adjustedHeight, width, height]);

  useEffect(() => {
    const generateBarcode = async () => {
      if (canvasRef.current) {
        try {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          // Set canvas size explicitly
          canvas.width = adjustedWidth;
          canvas.height = adjustedHeight;

          // Clear previous barcode
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Generate barcode using bwip-js (SAME LIBRARY AS SERVER!)
          // Use the exact same parameters that the server uses
          const { renderingInfo } = barcodeOptions;

          // Create a temporary canvas for bwip-js to render to
          const tempCanvas = document.createElement("canvas");

          // Use bwipjs.toCanvas for browser (equivalent to toBuffer on server)
          const bwipOptions = {
            bcid: format.toLowerCase(),
            text: validContent,
            scale: barcodeScale, // Use the actual barcodeScale property directly
            width: renderingInfo.barcodeWidthMM,
            height: renderingInfo.barcodeHeightMM,
            includetext: showText,
            textxalign: centerText ? "center" : "left",
          };

          // Override with specific properties when they have meaningful values
          if (moduleWidth && moduleWidth > 0) {
            bwipOptions.modulwidth = moduleWidth; // Correct bwip-js property name
          }
          if (moduleHeight && moduleHeight > 0) {
            bwipOptions.height = moduleHeight;
          }
          if (quietZone && quietZone > 0) {
            bwipOptions.quietzone = quietZone;
          }
          if (fontSize && fontSize > 0) {
            bwipOptions.textsize = fontSize;
          }
          if (textDistance && textDistance > 0) {
            bwipOptions.textgaps = textDistance;
          }
          if (
            backgroundColor &&
            backgroundColor !== "transparent" &&
            backgroundColor !== "#ffffff"
          ) {
            bwipOptions.backgroundcolor = backgroundColor;
          }
          if (foregroundColor && foregroundColor !== "#000000") {
            bwipOptions.color = foregroundColor;
          }

          await bwipjs.toCanvas(tempCanvas, bwipOptions);

          // Clear the main canvas and draw the barcode from temp canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        } catch (error) {
          // Draw error message on canvas
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ff0000";
          ctx.font = "12px monospace";
          ctx.fillText(`Error: ${error.message}`, 10, 20);
        }
      }
    };

    generateBarcode();
  }, [
    validContent,
    barcodeOptions,
    adjustedWidth,
    adjustedHeight,
    format,
    elementSize,
    zoom,
    width,
    height,
    scale,
    showText,
    barcodeScale,
    moduleWidth,
    moduleHeight,
    quietZone,
    fontSize,
    textDistance,
    backgroundColor,
    foregroundColor,
    centerText,
  ]);

  try {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full overflow-hidden"
        style={{
          minHeight: "50px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Kargo Barkodu Title */}
        <div className="text-xs font-bold text-gray-700 mb-1 text-center">
          Kargo Barkodu
        </div>

        <canvas
          ref={canvasRef}
          width={adjustedWidth}
          height={adjustedHeight}
          style={{
            width: "100%",
            height: "calc(100% - 20px)", // Reserve space for title
            maxWidth: "100%",
            maxHeight: "calc(100% - 20px)",
            objectFit: "contain",
          }}
        />
        {warning && (
          <div className="text-xs text-yellow-600 mt-1 text-center max-w-xs">
            ⚠️ {warning}
          </div>
        )}
      </div>
    );
  } catch (error) {
    // Fallback display if barcode generation fails
    return (
      <div className="flex flex-col items-center justify-center p-2 border border-gray-300 bg-gray-50">
        <div className="text-xs font-bold text-gray-700 mb-1">
          Kargo Barkodu
        </div>
        <div className="text-xs text-gray-500 mb-1">BARCODE ({format})</div>
        <div className="text-xs font-mono">{validContent}</div>
        <div className="text-xs text-gray-400 mt-1">Format: {format}</div>
        {error.message && (
          <div className="text-xs text-red-500 mt-1">
            Error: {error.message}
          </div>
        )}
        <div className="text-xs text-blue-600 mt-1">
          Check format compatibility with data
        </div>
      </div>
    );
  }
};

export default BarcodeRenderer;
