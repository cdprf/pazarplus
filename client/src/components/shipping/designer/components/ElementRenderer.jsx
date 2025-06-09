import React from "react";
import { ELEMENT_TYPES } from "../constants/elementTypes";

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

  const renderContent = () => {
    switch (type) {
      case ELEMENT_TYPES.TEXT:
      case "text":
        return (
          <div
            className="w-full h-full flex items-center"
            style={{
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              color: style.color,
              textAlign: style.textAlign,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight || "1.4",
            }}
          >
            {content || "Sample Text"}
          </div>
        );

      case ELEMENT_TYPES.IMAGE:
      case "image":
        return (
          <div className="w-full h-full flex items-center justify-center">
            {content ? (
              <img
                src={content}
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
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-xs text-center">
              <div className="mb-1">Barkod: {content}</div>
              <div className="border border-gray-300 p-2 bg-white">
                {/* Barcode placeholder */}
                <div className="flex space-x-1">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div
                      key={i}
                      className="bg-black"
                      style={{
                        width: Math.random() > 0.5 ? "2px" : "1px",
                        height: "30px",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case ELEMENT_TYPES.QR_CODE:
      case "qr_code":
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="border border-gray-300 bg-white p-2">
              <div
                className="grid grid-cols-8 gap-px"
                style={{ width: "60px", height: "60px" }}
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
        const formatDate = (dateString, format = "DD/MM/YYYY") => {
          if (!dateString) return new Date().toLocaleDateString("tr-TR");
          const date = new Date(dateString);
          return date.toLocaleDateString("tr-TR");
        };

        return (
          <div
            className="w-full h-full flex items-center"
            style={{
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              color: style.color,
              textAlign: style.textAlign,
            }}
          >
            {content || formatDate(null, options?.format)}
          </div>
        );

      case ELEMENT_TYPES.TRACKING_NUMBER:
      case "tracking_number":
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              color: style.color,
              textAlign: style.textAlign,
              backgroundColor: style.backgroundColor,
              border: style.border,
              borderRadius: style.borderRadius,
              padding: style.padding,
              fontWeight: style.fontWeight,
            }}
          >
            {content || "TRK123456789"}
          </div>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 border border-dashed border-gray-300 bg-gray-50">
            {type.toUpperCase()}
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
        padding: style.padding,
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
