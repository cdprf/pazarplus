import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Palette,
  Layers,
  Settings,
  Eye,
  Save,
  Grid,
  Ruler,
  RotateCcw,
  RotateCw,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Move,
  Square,
  Type,
  Image as ImageIcon,
  Barcode,
  QrCode,
  Calendar,
  Package,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Maximize2,
  Download,
  Upload,
  FolderOpen,
  History,
  Sparkles,
} from "lucide-react";

// Import modular components
import ElementLibrary from "./designer/components/ElementLibrary";
import ElementRenderer from "./designer/components/ElementRenderer";
import SimplePreviewModal from "./designer/components/SimplePreviewModal";
import PropertyPanel from "./designer/components/PropertyPanel";
import TemplateModal from "./designer/components/TemplateModal";
import TemplateSettingsPanel from "./designer/components/TemplateSettingsPanel";
import DesignerErrorBoundary from "./designer/components/DesignerErrorBoundary";

// Import hooks and utilities
import { useDesignerState } from "./designer/hooks/useDesignerState";
import { getPaperDimensions } from "./designer/utils/designerUtils";

// UI Components and services
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Separator } from "../ui/Separator";
import { Tooltip } from "../ui/Tooltip";
import { Badge } from "../ui/Badge";
import { Switch } from "../ui/Switch";
import { useAlert } from "../../contexts/AlertContext";
import TemplateManager from "../../services/TemplateManager";

// Enhanced ShippingSlipDesigner Component with Modern UI
const EnhancedShippingSlipDesigner = ({
  initialTemplate,
  onSave,
  onCancel,
}) => {
  // Use the custom hook for state management
  const {
    elements,
    selectedElement,
    templateConfig,
    setSelectedElement,
    setTemplateConfig,
    setElements,
    undo,
    redo,
    canUndo,
    canRedo,
    add: addElement,
    update: updateElement,
    remove: removeElement,
    duplicate: duplicateElement,
  } = useDesignerState();

  // Local state for enhanced UI
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);

  // Enhanced UI state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showSnapGuides, setShowSnapGuides] = useState(true);
  const [currentTab, setCurrentTab] = useState("elements"); // elements, layers, templates
  const [selectedCategory, setSelectedCategory] = useState("all"); // Category filter for elements

  const canvasRef = useRef(null);
  const { showAlert } = useAlert();

  // Get paper dimensions (with safety check)
  const paperDimensions = getPaperDimensions(templateConfig?.paperSize || "A4");

  // Quick action functions
  const quickActions = [
    {
      icon: Type,
      label: "Metin Ekle",
      action: () => {
        console.log("Adding text element");
        addElement("text", { x: 10, y: 10 });
      },
      shortcut: "T",
    },
    {
      icon: ImageIcon,
      label: "Resim Ekle",
      action: () => addElement("image", { x: 10, y: 15 }),
      shortcut: "I",
    },
    {
      icon: Square,
      label: "Dikdörtgen",
      action: () => addElement("rectangle", { x: 10, y: 20 }),
      shortcut: "R",
    },
    {
      icon: Barcode,
      label: "Barkod",
      action: () => addElement("barcode", { x: 10, y: 25 }),
      shortcut: "B",
    },
    {
      icon: QrCode,
      label: "QR Kod",
      action: () => addElement("qr_code", { x: 10, y: 30 }),
      shortcut: "Q",
    },
    {
      icon: Calendar,
      label: "Tarih",
      action: () => addElement("date", { x: 10, y: 35 }),
      shortcut: "D",
    },
    {
      icon: Package,
      label: "Takip No",
      action: () => addElement("tracking_number", { x: 10, y: 40 }),
      shortcut: "P",
    },
  ];

  // Enhanced drag operations with improved precision
  const handleDragStart = useCallback(
    (element, event) => {
      if (event.button !== 0 || element.locked) return;
      event.preventDefault();
      event.stopPropagation();

      // Get accurate canvas dimensions including scale
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      setDragInfo({
        elementId: element.id,
        startX: event.clientX,
        startY: event.clientY,
        startPosition: { ...element.position },
        canvasRect: {
          width: canvasRect.width,
          height: canvasRect.height,
          left: canvasRect.left,
          top: canvasRect.top,
        },
        scale: scale,
      });
    },
    [scale]
  );

  const handleDragMove = useCallback(
    (event) => {
      if (!dragInfo || !canvasRef.current) return;

      // Calculate precise movement with scaling consideration
      const deltaX = event.clientX - dragInfo.startX;
      const deltaY = event.clientY - dragInfo.startY;

      // Convert to percentage with proper scaling
      const scaledCanvasWidth = dragInfo.canvasRect.width / dragInfo.scale;
      const scaledCanvasHeight = dragInfo.canvasRect.height / dragInfo.scale;

      const percentX = (deltaX / scaledCanvasWidth) * 100;
      const percentY = (deltaY / scaledCanvasHeight) * 100;

      // Get element dimensions for boundary checking
      const element = elements.find((el) => el.id === dragInfo.elementId);
      const elementWidth = element?.size?.width || 10;
      const elementHeight = element?.size?.height || 10;

      // Calculate new position with proper boundaries
      const maxX = 100 - elementWidth;
      const maxY = 100 - elementHeight;

      const newPosition = {
        x: Math.max(0, Math.min(maxX, dragInfo.startPosition.x + percentX)),
        y: Math.max(0, Math.min(maxY, dragInfo.startPosition.y + percentY)),
      };

      // Apply snap-to-grid if enabled
      if (showSnapGuides && showGrid) {
        const gridSize = 5; // 5% grid
        newPosition.x = Math.round(newPosition.x / gridSize) * gridSize;
        newPosition.y = Math.round(newPosition.y / gridSize) * gridSize;
      }

      updateElement(dragInfo.elementId, { position: newPosition });
    },
    [dragInfo, updateElement, elements, showSnapGuides, showGrid]
  );

  const handleDragEnd = useCallback(() => {
    setDragInfo(null);
  }, []);

  // Element manipulation functions
  const handleCopyElement = useCallback(() => {
    if (selectedElement) {
      duplicateElement(selectedElement);
    }
  }, [selectedElement, duplicateElement]);

  const handleMoveElement = useCallback(
    (direction, distance = 5) => {
      if (!selectedElement) return;

      const newPosition = { ...selectedElement.position };
      switch (direction) {
        case "up":
          newPosition.y = Math.max(0, newPosition.y - distance);
          break;
        case "down":
          newPosition.y = Math.min(95, newPosition.y + distance);
          break;
        case "left":
          newPosition.x = Math.max(0, newPosition.x - distance);
          break;
        case "right":
          newPosition.x = Math.min(95, newPosition.x + distance);
          break;
        default:
          break;
      }
      updateElement(selectedElement.id, { position: newPosition });
    },
    [selectedElement, updateElement]
  );

  // Rotation functions
  const handleRotateElement = useCallback(
    (direction) => {
      if (!selectedElement) return;

      const currentRotation = selectedElement.rotation || 0;
      const newRotation =
        direction === "clockwise"
          ? (currentRotation + 90) % 360
          : (currentRotation - 90 + 360) % 360;

      updateElement(selectedElement.id, { rotation: newRotation });
    },
    [selectedElement, updateElement]
  );

  // Alignment functions
  const handleAlignElements = useCallback(
    (alignment) => {
      if (!selectedElement) return;

      const newPosition = { ...selectedElement.position };
      switch (alignment) {
        case "left":
          newPosition.x = 5;
          break;
        case "center":
          newPosition.x = 50 - (selectedElement.width || 20) / 2;
          break;
        case "right":
          newPosition.x = 95 - (selectedElement.width || 20);
          break;
        default:
          break;
      }
      updateElement(selectedElement.id, { position: newPosition });
    },
    [selectedElement, updateElement]
  );

  // Text formatting functions
  const handleTextFormat = useCallback(
    (format) => {
      if (!selectedElement || selectedElement.type !== "text") return;

      const currentStyle = selectedElement.style || {};
      let newStyle = { ...currentStyle };

      switch (format) {
        case "bold":
          newStyle.fontWeight =
            newStyle.fontWeight === "bold" ? "normal" : "bold";
          break;
        case "italic":
          newStyle.fontStyle =
            newStyle.fontStyle === "italic" ? "normal" : "italic";
          break;
        case "underline":
          newStyle.textDecoration =
            newStyle.textDecoration === "underline" ? "none" : "underline";
          break;
        default:
          break;
      }

      updateElement(selectedElement.id, { style: newStyle });
    },
    [selectedElement, updateElement]
  );

  // Canvas view functions
  const handleToggleMaximize = useCallback(() => {
    setScale(scale === 1 ? 1.5 : 1);
  }, [scale, setScale]);

  const handleExportTemplate = useCallback(async () => {
    try {
      const templateData = {
        name: templateConfig?.name || "Özel Şablon",
        config: templateConfig,
        elements: elements,
        exportedAt: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(templateData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${templateConfig?.name || "template"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert("Template exported successfully!", "success");
    } catch (error) {
      console.error("Error exporting template:", error);
      showAlert("Error exporting template", "error");
    }
  }, [templateConfig, elements, showAlert]);

  const handleImportTemplate = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const templateData = JSON.parse(e.target.result);
          setTemplateConfig(templateData.config);
          setElements(templateData.elements);
          showAlert("Template imported successfully!", "success");
        } catch (error) {
          console.error("Error importing template:", error);
          showAlert("Error importing template", "error");
        }
      };
      reader.readAsText(file);
    },
    [setTemplateConfig, setElements, showAlert]
  );

  // Resize handling functions
  const handleResizeStart = useCallback((element, corner, event) => {
    if (event.button !== 0 || element.locked) return;
    event.preventDefault();
    event.stopPropagation();

    setResizeInfo({
      elementId: element.id,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startSize: { ...element.size },
      startPosition: { ...element.position },
    });
  }, []);

  const handleResizeMove = useCallback(
    (event) => {
      if (!resizeInfo || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const deltaX = event.clientX - resizeInfo.startX;
      const deltaY = event.clientY - resizeInfo.startY;

      const percentDeltaX = (deltaX / canvasRect.width) * 100;
      const percentDeltaY = (deltaY / canvasRect.height) * 100;

      let newSize = { ...resizeInfo.startSize };
      let newPosition = { ...resizeInfo.startPosition };

      switch (resizeInfo.corner) {
        case "se":
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width + percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height + percentDeltaY
          );
          break;
        case "sw":
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width - percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height + percentDeltaY
          );
          newPosition.x = resizeInfo.startPosition.x + percentDeltaX;
          break;
        case "ne":
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width + percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height - percentDeltaY
          );
          newPosition.y = resizeInfo.startPosition.y + percentDeltaY;
          break;
        case "nw":
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width - percentDeltaX
          );
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height - percentDeltaY
          );
          newPosition.x = resizeInfo.startPosition.x + percentDeltaX;
          newPosition.y = resizeInfo.startPosition.y + percentDeltaY;
          break;
        case "n":
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height - percentDeltaY
          );
          newPosition.y = resizeInfo.startPosition.y + percentDeltaY;
          break;
        case "s":
          newSize.height = Math.max(
            3,
            resizeInfo.startSize.height + percentDeltaY
          );
          break;
        case "w":
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width - percentDeltaX
          );
          newPosition.x = resizeInfo.startPosition.x + percentDeltaX;
          break;
        case "e":
          newSize.width = Math.max(
            5,
            resizeInfo.startSize.width + percentDeltaX
          );
          break;
        default:
          console.warn("Unknown resize corner:", resizeInfo.corner);
          return;
      }

      updateElement(resizeInfo.elementId, {
        size: newSize,
        position: newPosition,
      });
    },
    [resizeInfo, updateElement]
  );

  const handleResizeEnd = useCallback(() => {
    setResizeInfo(null);
  }, []);

  // Canvas drop handler for drag and drop from ElementLibrary
  const handleCanvasDrop = useCallback(
    (event) => {
      event.preventDefault();

      try {
        const data = JSON.parse(event.dataTransfer.getData("application/json"));
        if (data.type && canvasRef.current) {
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const x =
            ((event.clientX - canvasRect.left) / canvasRect.width) * 100;
          const y =
            ((event.clientY - canvasRect.top) / canvasRect.height) * 100;

          addElement(data.type, {
            x: Math.max(0, Math.min(90, x)),
            y: Math.max(0, Math.min(90, y)),
          });
        }
      } catch (error) {
        console.error("Error handling canvas drop:", error);
      }
    },
    [addElement]
  );

  const handleCanvasDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Template operations
  const handleSaveTemplate = useCallback(async () => {
    console.log("🔧 DEBUG: handleSaveTemplate called");
    console.log("🔧 DEBUG: templateConfig:", templateConfig);
    console.log("🔧 DEBUG: elements:", elements);
    console.log("🔧 DEBUG: onSave callback:", onSave);

    try {
      setLoading(true);
      const templateData = {
        name: templateConfig?.name || "Özel Şablon",
        config: templateConfig,
        elements: elements,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("🔧 DEBUG: Template data to save:", templateData);

      if (onSave) {
        console.log("🔧 DEBUG: Calling onSave callback");
        await onSave(templateData);
        console.log("🔧 DEBUG: onSave callback completed successfully");
      } else {
        console.log("🔧 DEBUG: No onSave callback, using TemplateManager.save");
        await TemplateManager.save(templateData);
        console.log("🔧 DEBUG: TemplateManager.save completed successfully");
      }

      showAlert("Template saved successfully!", "success");
    } catch (error) {
      console.error("🔧 DEBUG: Error saving template:", error);
      showAlert("Error saving template", "error");
    } finally {
      setLoading(false);
    }
  }, [templateConfig, elements, onSave, showAlert]);

  // Handle template configuration changes
  const handleConfigChange = useCallback(
    (newConfig) => {
      console.log("🔧 DEBUG: handleConfigChange called", newConfig);

      // Check if we need to apply default font to all text elements
      if (newConfig.applyDefaultFontToAll && newConfig.defaultFont) {
        console.log(
          "🔧 DEBUG: Applying default font to all text elements",
          newConfig.defaultFont
        );

        // Find all text-based elements and update them
        const updatedElements = elements.map((element) => {
          // Check if this element has font properties (text-based elements)
          if (
            element.style &&
            (element.style.fontSize || element.type === "text")
          ) {
            const updatedStyle = {
              ...element.style,
              fontFamily:
                newConfig.defaultFont.fontFamily || element.style.fontFamily,
              fontSize:
                newConfig.defaultFont.fontSize || element.style.fontSize,
              fontWeight:
                newConfig.defaultFont.fontWeight || element.style.fontWeight,
              fontStyle:
                newConfig.defaultFont.fontStyle || element.style.fontStyle,
              color: newConfig.defaultFont.color || element.style.color,
              lineHeight:
                newConfig.defaultFont.lineHeight || element.style.lineHeight,
            };

            return {
              ...element,
              style: updatedStyle,
            };
          }
          return element;
        });

        // Update elements and clear the apply flag
        setElements(updatedElements);
        const configWithoutApplyFlag = { ...newConfig };
        delete configWithoutApplyFlag.applyDefaultFontToAll;
        setTemplateConfig(configWithoutApplyFlag);

        showAlert(
          "Varsayılan font ayarları tüm metin öğelerine uygulandı",
          "success"
        );
      } else {
        // Normal config change
        setTemplateConfig(newConfig);
      }
    },
    [elements, setElements, setTemplateConfig, showAlert]
  );

  // Event handlers for mouse events
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (dragInfo) handleDragMove(event);
      if (resizeInfo) handleResizeMove(event);
    };

    const handleMouseUp = () => {
      if (dragInfo) handleDragEnd();
      if (resizeInfo) handleResizeEnd();
    };

    if (dragInfo || resizeInfo) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragInfo,
    resizeInfo,
    handleDragMove,
    handleDragEnd,
    handleResizeMove,
    handleResizeEnd,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case "y":
            e.preventDefault();
            redo();
            break;
          case "s":
            e.preventDefault();
            handleSaveTemplate();
            break;
          case "d":
            e.preventDefault();
            if (selectedElement) {
              duplicateElement(selectedElement);
            }
            break;
          case "c":
            e.preventDefault();
            handleCopyElement();
            break;
          case "e":
            e.preventDefault();
            handleExportTemplate();
            break;
          case "g":
            e.preventDefault();
            setShowGrid(!showGrid);
            break;
          case "r":
            e.preventDefault();
            setShowRulers(!showRulers);
            break;
          default:
            // Handle other keys if needed
            break;
        }
      } else {
        switch (e.key) {
          case "Delete":
          case "Backspace":
            if (selectedElement) {
              removeElement(selectedElement.id);
            }
            break;
          case "ArrowUp":
            e.preventDefault();
            handleMoveElement("up", e.shiftKey ? 1 : 5);
            break;
          case "ArrowDown":
            e.preventDefault();
            handleMoveElement("down", e.shiftKey ? 1 : 5);
            break;
          case "ArrowLeft":
            e.preventDefault();
            handleMoveElement("left", e.shiftKey ? 1 : 5);
            break;
          case "ArrowRight":
            e.preventDefault();
            handleMoveElement("right", e.shiftKey ? 1 : 5);
            break;
          case "b":
            if (selectedElement && selectedElement.type === "text") {
              handleTextFormat("bold");
            }
            break;
          case "i":
            if (selectedElement && selectedElement.type === "text") {
              handleTextFormat("italic");
            }
            break;
          case "u":
            if (selectedElement && selectedElement.type === "text") {
              handleTextFormat("underline");
            }
            break;
          default:
            // Handle other keys if needed
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [
    selectedElement,
    undo,
    redo,
    handleSaveTemplate,
    duplicateElement,
    removeElement,
    handleCopyElement,
    handleExportTemplate,
    handleMoveElement,
    handleTextFormat,
    showGrid,
    showRulers,
    setShowGrid,
    setShowRulers,
  ]);

  // Early return if templateConfig is not initialized
  if (!templateConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Şablon yükleniyor...
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Lütfen bekleyin...
          </div>
        </div>
      </div>
    );
  }

  return (
    <DesignerErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Enhanced Header Toolbar */}
        <Card className="h-16 rounded-none border-x-0 border-t-0 flex items-center justify-between px-4 bg-white dark:bg-gray-900 shadow-sm">
          {/* Left section - Brand and Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Shipping Designer
              </h1>
              <Badge variant="secondary" className="text-xs">
                Pro
              </Badge>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Quick Actions */}
            <div className="flex items-center space-x-1">
              {quickActions.slice(0, 4).map((action, index) => (
                <Tooltip
                  key={index}
                  content={`${action.label} (${action.shortcut})`}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={action.action}
                    className="h-8 w-8 p-0"
                  >
                    <action.icon className="h-4 w-4" />
                  </Button>
                </Tooltip>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Element Tools */}
            <div className="flex items-center space-x-1">
              <Tooltip content="Copy Element (Ctrl+C)">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyElement}
                  disabled={!selectedElement}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Move Tool">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveElement("up")}
                  disabled={!selectedElement}
                  className="h-8 w-8 p-0"
                >
                  <Move className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Rotate Left">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRotateElement("counterclockwise")}
                  disabled={!selectedElement}
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Rotate Right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRotateElement("clockwise")}
                  disabled={!selectedElement}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Alignment Tools */}
            <div className="flex items-center space-x-1">
              <Tooltip content="Align Left">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAlignElements("left")}
                  disabled={!selectedElement}
                  className="h-8 w-8 p-0"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Align Center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAlignElements("center")}
                  disabled={!selectedElement}
                  className="h-8 w-8 p-0"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Align Right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAlignElements("right")}
                  disabled={!selectedElement}
                  className="h-8 w-8 p-0"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Text Formatting Tools */}
            <div className="flex items-center space-x-1">
              <Tooltip content="Bold">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTextFormat("bold")}
                  disabled={!selectedElement || selectedElement.type !== "text"}
                  className="h-8 w-8 p-0"
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Italic">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTextFormat("italic")}
                  disabled={!selectedElement || selectedElement.type !== "text"}
                  className="h-8 w-8 p-0"
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Underline">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTextFormat("underline")}
                  disabled={!selectedElement || selectedElement.type !== "text"}
                  className="h-8 w-8 p-0"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Center section - Template Info */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {templateConfig?.name || "İsimsiz Şablon"}
              </div>
              <div className="text-xs text-gray-500">
                {elements.length} öğe • Son kaydedilme:{" "}
                {new Date().toLocaleTimeString("tr-TR")}
              </div>
            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-2">
            {/* History Controls */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-600 pr-3">
              <Tooltip content="Geri Al (Ctrl+Z)">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={undo}
                  disabled={!canUndo}
                  className="h-8 w-8 p-0"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Yinele (Ctrl+Y)">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={redo}
                  disabled={!canRedo}
                  className="h-8 w-8 p-0"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-600 pr-3">
              <Tooltip content="Uzaklaştır">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScale(Math.max(0.25, scale - 0.25))}
                  disabled={scale <= 0.25}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </Tooltip>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Tooltip content="Yakınlaştır">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScale(Math.min(3, scale + 0.25))}
                  disabled={scale >= 3}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>

            {/* Primary Actions */}
            <div className="flex items-center space-x-2">
              <Tooltip content="Toggle Grid">
                <Button
                  size="sm"
                  variant={showGrid ? "default" : "ghost"}
                  onClick={() => setShowGrid(!showGrid)}
                  className="h-8 w-8 p-0"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Toggle Ruler">
                <Button
                  size="sm"
                  variant={showRulers ? "default" : "ghost"}
                  onClick={() => setShowRulers(!showRulers)}
                  className="h-8 w-8 p-0"
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Maximize View">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleToggleMaximize}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Export Template">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExportTemplate}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Import Template">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    document.getElementById("import-input").click()
                  }
                  className="h-8 w-8 p-0"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Open Templates">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTemplateModal(true)}
                  className="h-8 w-8 p-0"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip content="History">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    /* Show history panel */
                  }}
                  className="h-8 w-8 p-0"
                >
                  <History className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip content="Önizleme (P)">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPreviewModal(true)}
                  className="h-8"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Önizleme
                </Button>
              </Tooltip>

              <Tooltip content="Kaydet (Ctrl+S)">
                <Button
                  size="sm"
                  onClick={() => {
                    console.log("Save button clicked!");
                    alert("Save button clicked - debugging!");
                    handleSaveTemplate();
                  }}
                  disabled={loading}
                  className="h-8"
                >
                  {loading ? (
                    <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Kaydet
                </Button>
              </Tooltip>
            </div>
          </div>
        </Card>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Enhanced Element Library */}
          {leftPanelOpen && (
            <Card className="w-80 rounded-none border-y-0 border-l-0 flex flex-col bg-white dark:bg-gray-800">
              {/* Panel Header */}
              <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Palette className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    Öğeler & Katmanlar
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLeftPanelOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    currentTab === "elements"
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                  onClick={() => setCurrentTab("elements")}
                >
                  Öğeler
                </button>
                <button
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    currentTab === "layers"
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                  onClick={() => setCurrentTab("layers")}
                >
                  Katmanlar
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto">
                {currentTab === "elements" && (
                  <ElementLibrary
                    onAddElement={addElement}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                  />
                )}

                {currentTab === "layers" && (
                  <div className="p-4 space-y-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Katman Listesi ({elements.length})
                    </div>
                    {elements.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Henüz öğe eklenmemiş</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {elements.map((element, index) => (
                          <div
                            key={element.id}
                            className={`flex items-center justify-between p-2 rounded text-sm ${
                              selectedElement?.id === element.id
                                ? "bg-blue-100 dark:bg-blue-900/30"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => setSelectedElement(element)}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-400">
                                {elements.length - index}
                              </span>
                              <span className="capitalize">{element.type}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateElement(element.id, {
                                    locked: !element.locked,
                                  });
                                }}
                                className="h-6 w-6 p-0"
                              >
                                {element.locked ? (
                                  <Lock className="h-3 w-3" />
                                ) : (
                                  <Unlock className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeElement(element.id);
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Toggle button for left panel when closed */}
          {!leftPanelOpen && (
            <div className="w-8 flex flex-col">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLeftPanelOpen(true)}
                className="h-8 w-8 p-0 rounded-none"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
            {/* Canvas Toolbar */}
            <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                    id="show-grid"
                  />
                  <label
                    htmlFor="show-grid"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Izgara
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showRulers}
                    onCheckedChange={setShowRulers}
                    id="show-rulers"
                  />
                  <label
                    htmlFor="show-rulers"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Cetvel
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showSnapGuides}
                    onCheckedChange={setShowSnapGuides}
                    id="show-snap"
                  />
                  <label
                    htmlFor="show-snap"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Hizalama
                  </label>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {paperDimensions.width} × {paperDimensions.height}px •{" "}
                {templateConfig?.paperSize || "A4"}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-8">
              <div className="flex items-center justify-center min-h-full">
                {/* Ruler Container */}
                <div className="relative">
                  {/* Horizontal Ruler */}
                  {showRulers && (
                    <div
                      className="absolute -top-6 bg-gray-100 border border-gray-300"
                      style={{
                        left: showRulers ? "24px" : "0px",
                        width: `${paperDimensions.width * scale}px`,
                        height: "24px",
                        fontSize: "10px",
                      }}
                    >
                      {Array.from(
                        { length: Math.ceil(paperDimensions.width / 50) + 1 },
                        (_, i) => {
                          const position = i * 50;
                          if (position > paperDimensions.width) return null;
                          return (
                            <div
                              key={`h-${i}`}
                              className="absolute flex flex-col items-center text-gray-600"
                              style={{
                                left: `${position * scale - 10}px`,
                                height: "24px",
                              }}
                            >
                              <div className="w-px h-2 bg-gray-400"></div>
                              <span className="text-xs leading-none mt-1">
                                {position}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* Vertical Ruler */}
                  {showRulers && (
                    <div
                      className="absolute -left-6 bg-gray-100 border border-gray-300"
                      style={{
                        top: showRulers ? "24px" : "0px",
                        height: `${paperDimensions.height * scale}px`,
                        width: "24px",
                        fontSize: "10px",
                      }}
                    >
                      {Array.from(
                        { length: Math.ceil(paperDimensions.height / 50) + 1 },
                        (_, i) => {
                          const position = i * 50;
                          if (position > paperDimensions.height) return null;
                          return (
                            <div
                              key={`v-${i}`}
                              className="absolute flex items-center justify-center text-gray-600"
                              style={{
                                top: `${position * scale - 6}px`,
                                width: "24px",
                                height: "12px",
                                transform: "rotate(-90deg)",
                                transformOrigin: "center",
                              }}
                            >
                              <div className="w-px h-2 bg-gray-400 rotate-90"></div>
                              <span className="text-xs leading-none ml-1">
                                {position}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* Corner square for rulers */}
                  {showRulers && (
                    <div
                      className="absolute -top-6 -left-6 bg-gray-200 border border-gray-300"
                      style={{ width: "24px", height: "24px" }}
                    ></div>
                  )}

                  <div
                    ref={canvasRef}
                    className="relative bg-white shadow-xl border border-gray-300"
                    style={{
                      width: `${paperDimensions.width * scale}px`,
                      height: `${paperDimensions.height * scale}px`,
                      transform: `scale(${scale})`,
                      transformOrigin: "center",
                    }}
                    onClick={() => setSelectedElement(null)}
                    onDrop={handleCanvasDrop}
                    onDragOver={handleCanvasDragOver}
                  >
                    {/* Grid overlay */}
                    {showGrid && (
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: `
                          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                        `,
                          backgroundSize: "20px 20px",
                        }}
                      />
                    )}

                    {/* Render all elements */}
                    {elements.map((element) => (
                      <ElementRenderer
                        key={element.id}
                        element={element}
                        isSelected={selectedElement?.id === element.id}
                        onClick={setSelectedElement}
                        onDragStart={(e) => handleDragStart(element, e)}
                        onResizeStart={handleResizeStart}
                        paperDimensions={paperDimensions}
                        scale={scale}
                        isDraggable={true}
                        isResizable={true}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties and Settings */}
          {rightPanelOpen && (
            <Card className="w-80 rounded-none border-y-0 border-r-0 flex flex-col bg-white dark:bg-gray-800">
              {/* Panel Header */}
              <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedElement ? "Öğe Özellikleri" : "Şablon Ayarları"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRightPanelOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
              </div>

              {/* Properties Panel */}
              <div className="flex-1 overflow-auto">
                {selectedElement ? (
                  <PropertyPanel
                    element={selectedElement}
                    onUpdate={updateElement}
                    onRemove={removeElement}
                    onDuplicate={duplicateElement}
                  />
                ) : (
                  <TemplateSettingsPanel
                    config={templateConfig}
                    onConfigChange={handleConfigChange}
                    onSave={handleSaveTemplate}
                    onShowTemplates={() => setShowTemplateModal(true)}
                    savedTemplates={savedTemplates}
                  />
                )}
              </div>
            </Card>
          )}

          {/* Toggle button for right panel when closed */}
          {!rightPanelOpen && (
            <div className="w-8 flex flex-col">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRightPanelOpen(true)}
                className="h-8 w-8 p-0 rounded-none"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        <SimplePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          elements={elements}
          paperDimensions={paperDimensions}
          templateConfig={templateConfig}
        />

        {/* Template Library Modal */}
        <TemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onLoad={(template) => {
            setTemplateConfig(template.config);
            setElements(template.elements);
            setShowTemplateModal(false);
            showAlert("Template loaded successfully!", "success");
          }}
          savedTemplates={savedTemplates}
          setSavedTemplates={setSavedTemplates}
        />

        {/* Hidden file input for template import */}
        <input
          id="import-input"
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleImportTemplate}
        />
      </div>
    </DesignerErrorBoundary>
  );
};

export default EnhancedShippingSlipDesigner;
