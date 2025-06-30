import React, { useState } from "react";
import { X, Download, Printer, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Modal } from "../../../ui/Modal";
import { Button } from "../../../ui/Button";
import ElementRenderer from "./ElementRenderer";
import { getPaperDimensions } from "../utils/designerUtils";

const SimplePreviewModal = ({
  isOpen,
  onClose,
  elements,
  templateConfig,
  paperDimensions,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Use provided paperDimensions or fallback to default
  const actualPaperDimensions =
    paperDimensions || getPaperDimensions(templateConfig?.paperSize || "A4");

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a canvas and render the template for download
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Set canvas size based on paper dimensions
    canvas.width = actualPaperDimensions.width * 3; // Higher resolution
    canvas.height = actualPaperDimensions.height * 3;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // This is a simplified version - in a real implementation,
    // you'd render all elements to the canvas

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateConfig.name || "shipping-slip"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const previewStyle = {
    transform: `scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: "center",
    transition: "transform 0.2s ease-in-out",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Şablon Önizlemesi
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {templateConfig.name || "İsimsiz Şablon"}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-600 pr-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScale(Math.max(0.25, scale - 0.25))}
                disabled={scale <= 0.25}
                title="Uzaklaştır"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setScale(Math.min(3, scale + 0.25))}
                disabled={scale >= 3}
                title="Yakınlaştır"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Controls */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRotation((rotation + 90) % 360)}
              title="90° Döndür"
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              title="PNG olarak İndir"
            >
              <Download className="h-4 w-4 mr-1" />
              İndir
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              title="Yazdır"
            >
              <Printer className="h-4 w-4 mr-1" />
              Yazdır
            </Button>

            <Button size="sm" variant="ghost" onClick={onClose} title="Kapat">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-8">
          <div className="flex items-center justify-center min-h-full">
            <div
              className="bg-white shadow-lg border border-gray-300"
              style={{
                ...previewStyle,
                width: `${actualPaperDimensions.width}px`,
                height: `${actualPaperDimensions.height}px`,
                position: "relative",
              }}
            >
              {/* Render all elements in preview mode */}
              {elements.map((element) => (
                <ElementRenderer
                  key={element.id}
                  element={element}
                  isSelected={false}
                  isPreview={true}
                  paperDimensions={actualPaperDimensions}
                  onSelect={() => {}} // No selection in preview
                  onDragStart={() => {}} // No dragging in preview
                  onResizeStart={() => {}} // No resizing in preview
                />
              ))}

              {/* Preview overlay to prevent interactions */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 1000 }}
              />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Öğe Sayısı: {elements.length}</span>
              <span>
                Boyut: {actualPaperDimensions.width} ×{" "}
                {actualPaperDimensions.height}px
              </span>
              <span>Kağıt: {templateConfig.paperSize || "A4"}</span>
            </div>
            <div>Son Güncelleme: {new Date().toLocaleString("tr-TR")}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SimplePreviewModal;
