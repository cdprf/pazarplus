import React from "react";

// Element renderer component for displaying different element types
const ElementRenderer = ({ element, isSelected = false, onClick }) => {
  const { type, content, style, size, position, options = {} } = element;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(element);
    }
  };

  const renderContent = () => {
    switch (type) {
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
      className={`absolute cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-blue-500 ring-opacity-50" : ""
      }`}
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
        ...style,
      }}
      onClick={handleClick}
    >
      {renderContent()}

      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Selection handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default ElementRenderer;
