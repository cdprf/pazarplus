import React from "react";
import { ELEMENT_TYPES } from "../constants/elementTypes";
import {
  generatePreviewContent,
  MOCK_PREVIEW_DATA,
} from "../constants/mockPreviewData";
import BarcodeRenderer from "./BarcodeRenderer";
import QRCodeRenderer from "./QRCodeRenderer";
import {
  ensureProperEncoding,
  formatTextForDisplay,
  getOptimalFontStack,
} from "../utils/textEncoding";

// Element renderer component for displaying different element types
const ElementRenderer = ({
  element,
  isSelected = false,
  isPreview = false,
  onClick,
  onPointerDown,
  onDragStart,
  onResizeStart,
  paperDimensions,
  scale = 1,
  isDraggable = false,
  isResizable = false,
}) => {
  const { type, content, style, size, position, options = {} } = element;

  // Use mock data for preview purposes
  const displayContent = generatePreviewContent(
    type,
    content,
    element.dataField
  );

  // Helper function to get comprehensive padding value
  const getPadding = (style) => {
    if (
      style?.paddingTop ||
      style?.paddingBottom ||
      style?.paddingLeft ||
      style?.paddingRight
    ) {
      // Use individual values if any are set
      return `${style?.paddingTop || "4px"} ${style?.paddingRight || "4px"} ${
        style?.paddingBottom || "4px"
      } ${style?.paddingLeft || "4px"}`;
    }
    // Use simple padding value
    return style?.padding || "4px";
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick && !isPreview) {
      onClick(element);
    }
  };

  const handlePointerDown = (e) => {
    if (onPointerDown && !isPreview) {
      onPointerDown(e);
    }
  };

  const handleDragStart = (e) => {
    if (onDragStart && isDraggable && !isPreview) {
      onDragStart(e);
    }
  };

  const handleResizeMouseDown = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();

    if (onResizeStart && isResizable && !isPreview) {
      onResizeStart(element, corner, e);
    }
  };

  // Helper function for date formatting
  const formatDate = (dateString, format = "DD/MM/YYYY") => {
    if (!dateString) {
      return new Date().toLocaleDateString("tr-TR");
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if not a valid date
    }

    // Simple date formatting
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    switch (format) {
      case "DD/MM/YYYY":
        return `${day}/${month}/${year}`;
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      default:
        return date.toLocaleDateString("tr-TR");
    }
  };

  const renderContent = () => {
    // Process display content with proper Turkish encoding
    const processedContent = formatTextForDisplay(displayContent, type);

    switch (type) {
      case ELEMENT_TYPES.TEXT:
      case "text":
        return (
          <div
            className="w-full h-full flex items-start"
            style={{
              fontSize: style.fontSize,
              fontFamily:
                style.fontFamily ||
                getOptimalFontStack(processedContent, style.fontFamily),
              color: style.color,
              textAlign: style.textAlign,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight || "1.4",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              padding: getPadding(style),
            }}
          >
            {ensureProperEncoding(processedContent)}
          </div>
        );

      case ELEMENT_TYPES.IMAGE:
      case "image":
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              padding: getPadding(style),
            }}
          >
            {displayContent ? (
              <img
                src={displayContent}
                alt="Element"
                className="max-w-full max-h-full object-contain"
                style={{ objectFit: style.objectFit }}
              />
            ) : (
              <div className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-xs">
                Resim Yükle
              </div>
            )}
          </div>
        );

      case ELEMENT_TYPES.BARCODE:
      case "barcode":
        // Professional barcode rendering with standardized options
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              padding: getPadding(style),
              width: "100%",
              height: "100%",
            }}
          >
            <BarcodeRenderer
              content={displayContent}
              type={element.barcodeType || "code128"}
              showText={element.showText !== false}
              width={size?.width ? size.width * scale : 200}
              height={size?.height ? size.height * scale : 60}
              moduleWidth={element.moduleWidth}
              moduleHeight={element.moduleHeight}
              quietZone={element.quietZone}
              fontSize={element.fontSize}
              textDistance={element.textDistance}
              backgroundColor={element.backgroundColor || "transparent"}
              foregroundColor={element.foregroundColor || "#000000"}
              centerText={element.centerText !== false}
              barcodeScale={element.barcodeScale || 2.5}
              // Pass element size and scale for proper PDF-matching dimensions
              elementSize={size}
              zoom={scale}
            />
          </div>
        );

      case ELEMENT_TYPES.QR_CODE:
      case "qr_code":
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              padding: getPadding(style),
            }}
          >
            <QRCodeRenderer
              content={displayContent}
              size={Math.min(
                120,
                Math.max(size?.width * 2 || 100, size?.height * 2 || 100)
              )}
              errorCorrectionLevel={element.errorCorrectionLevel || "M"}
              quietZone={element.quietZone || 4}
            />
          </div>
        );

      case ELEMENT_TYPES.LINE:
      case "line":
        return (
          <div
            className="w-full"
            style={{
              height: "2px",
              backgroundColor: style.backgroundColor || "#ddd",
              border: "none",
            }}
          />
        );

      case ELEMENT_TYPES.RECTANGLE:
      case "rectangle":
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: style.backgroundColor || "#f0f0f0",
              border: style.border || "1px solid #ddd",
              borderRadius: style.borderRadius || "4px",
            }}
          />
        );

      case ELEMENT_TYPES.DATE:
      case "date":
        return (
          <div
            className="w-full h-full flex items-center"
            style={{
              fontSize: style.fontSize,
              fontFamily:
                style.fontFamily ||
                getOptimalFontStack(processedContent, style.fontFamily),
              color: style.color,
              textAlign: style.textAlign,
              padding: getPadding(style),
            }}
          >
            {content && content !== "Sample Text" && content !== ""
              ? ensureProperEncoding(formatDate(content, options?.format))
              : ensureProperEncoding(processedContent)}
          </div>
        );

      case ELEMENT_TYPES.TRACKING_NUMBER:
      case "tracking_number":
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              fontSize: style.fontSize,
              fontFamily:
                style.fontFamily ||
                getOptimalFontStack(processedContent, style.fontFamily),
              color: style.color,
              textAlign: style.textAlign,
              backgroundColor: style.backgroundColor,
              border: style.border,
              borderRadius: style.borderRadius,
              fontWeight: style.fontWeight,
              padding: getPadding(style),
            }}
          >
            {ensureProperEncoding(processedContent)}
          </div>
        );

      case ELEMENT_TYPES.RECIPIENT:
      case "recipient":
        return (
          <div
            className="w-full h-full flex flex-col justify-start"
            style={{
              fontSize: `${parseInt(style?.fontSize) || 12}px`,
              fontFamily:
                style?.fontFamily ||
                getOptimalFontStack(processedContent, style?.fontFamily) ||
                "Arial, sans-serif",
              color: style?.color || "#000",
              lineHeight: style?.lineHeight || "1.4",
              letterSpacing: style?.letterSpacing
                ? `${style.letterSpacing}px`
                : "normal",
              textAlign: style?.textAlign || "left",
              padding: getPadding(style),
              wordWrap: "break-word",
              wordBreak: "break-word",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                marginBottom: `${element.lineSpacing || 2}px`,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontWeight: "bold", flexShrink: 0 }}>
                Sipariş No:
              </span>
              <span
                style={{
                  marginLeft: `${element.labelSpacing || 5}px`,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ensureProperEncoding(MOCK_PREVIEW_DATA.order.orderNumber)}
              </span>
            </div>
            <div
              style={{
                marginBottom: `${element.lineSpacing || 2}px`,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontWeight: "bold", flexShrink: 0 }}>
                Alıcı Ad / Soyad:
              </span>
              <span
                style={{
                  marginLeft: `${element.labelSpacing || 5}px`,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ensureProperEncoding(MOCK_PREVIEW_DATA.customer.name)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection:
                  MOCK_PREVIEW_DATA.customer.address.length > 30
                    ? "column"
                    : "row",
                alignItems:
                  MOCK_PREVIEW_DATA.customer.address.length > 30
                    ? "flex-start"
                    : "baseline",
                flex: 1,
                minHeight: 0,
              }}
            >
              <span style={{ fontWeight: "bold", flexShrink: 0 }}>Adres:</span>
              <span
                style={{
                  marginLeft:
                    MOCK_PREVIEW_DATA.customer.address.length > 30
                      ? "10px"
                      : `${element.labelSpacing || 5}px`,
                  marginTop:
                    MOCK_PREVIEW_DATA.customer.address.length > 30
                      ? "2px"
                      : "0",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  whiteSpace: "normal",
                  wordWrap: "break-word",
                }}
              >
                {ensureProperEncoding(MOCK_PREVIEW_DATA.customer.address)}
              </span>
            </div>
          </div>
        );

      default:
        return (
          <div
            className="w-full h-full flex items-start text-xs border border-gray-200 bg-white overflow-hidden"
            style={{
              fontSize: style?.fontSize || "12px",
              fontFamily:
                style?.fontFamily ||
                getOptimalFontStack(processedContent, style?.fontFamily),
              color: style?.color || "#333",
              textAlign: style?.textAlign || "left",
              fontWeight: style?.fontWeight || "normal",
              lineHeight: style?.lineHeight || "1.4",
              whiteSpace: "pre-wrap",
              padding: getPadding(style),
            }}
          >
            {ensureProperEncoding(processedContent)}
          </div>
        );
    }
  };

  return (
    <div
      className={`absolute transition-all ${
        isSelected && !isPreview ? "ring-2 ring-blue-500 ring-opacity-50" : ""
      } ${!isPreview ? "cursor-pointer" : "cursor-default"}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${size.width}%`,
        height: `${size.height}%`,
        zIndex: element.zIndex || 1,
        backgroundColor: style.backgroundColor,
        border: style.border,
        borderRadius: style.borderRadius,
        pointerEvents: isPreview ? "none" : "auto",
        ...style,
      }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onDragStart={handleDragStart}
    >
      {renderContent()}

      {isSelected && !isPreview && isResizable && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Resize handles - Interactive */}
          <div
            className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nw-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "nw")}
          ></div>
          <div
            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-ne-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "ne")}
          ></div>
          <div
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-sw-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
          ></div>
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-se-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "se")}
          ></div>

          {/* Edge handles */}
          <div
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-blue-500 border border-white rounded-sm cursor-n-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "n")}
          ></div>
          <div
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-blue-500 border border-white rounded-sm cursor-s-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "s")}
          ></div>
          <div
            className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-blue-500 border border-white rounded-sm cursor-w-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "w")}
          ></div>
          <div
            className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-3 bg-blue-500 border border-white rounded-sm cursor-e-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeMouseDown(e, "e")}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ElementRenderer;
