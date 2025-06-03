import React, { useState, useRef, useEffect, useCallback } from "react";

// Import modular components from designer subfolder
import ElementLibrary from "./designer/components/ElementLibrary";
import ElementRenderer from "./designer/components/ElementRenderer";
import ElementToolbar from "./designer/components/ElementToolbar";
import PreviewModal from "./designer/components/PreviewModal";
import PropertyPanel from "./designer/components/PropertyPanel";
import TemplateModal from "./designer/components/TemplateModal";
import TemplateSettingsPanel from "./designer/components/TemplateSettingsPanel";

// Import hooks and utilities
import { useDesignerState } from "./designer/hooks/useDesignerState";
import { getPaperDimensions } from "./designer/utils/designerUtils";

// UI Components and services
import { useAlert } from "../../contexts/AlertContext";
import TemplateManager from "../../services/TemplateManager";
import def from "ajv/dist/vocabularies/discriminator";

// Main ShippingSlipDesigner Component
const ShippingSlipDesigner = ({ initialTemplate, onSave, onCancel }) => {
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

  // Local state
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [filteredElements, setFilteredElements] = useState(elements);
  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);

  const canvasRef = useRef(null);
  const { showAlert } = useAlert();

  // Initialize with template if provided
  useEffect(() => {
    if (initialTemplate) {
      setTemplateConfig(initialTemplate.config || templateConfig);
      setElements(initialTemplate.elements || []);
    }
  }, [initialTemplate, setTemplateConfig, setElements, templateConfig]);

  // Update filtered elements when elements change
  useEffect(() => {
    setFilteredElements(elements);
  }, [elements]);

  // Load saved templates
  useEffect(() => {
    const loadSavedTemplates = async () => {
      try {
        const templates = await TemplateManager.getTemplates();
        setSavedTemplates(templates);
      } catch (error) {
        console.error("Error loading templates:", error);
      }
    };
    loadSavedTemplates();
  }, []);

  // Calculate paper dimensions
  const paperDimensions = getPaperDimensions(templateConfig);

  // Handle element selection
  const handleElementSelect = useCallback(
    (element, event) => {
      event?.stopPropagation();
      setSelectedElement(element);
    },
    [setSelectedElement]
  );

  // Handle background click to deselect
  const handleCanvasClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) {
        setSelectedElement(null);
      }
    },
    [setSelectedElement]
  );

  // Handle drag operations
  const handleDragStart = useCallback((element, event) => {
    if (event.button !== 0 || element.locked) return;

    event.preventDefault();
    event.stopPropagation();

    setDragInfo({
      elementId: element.id,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: { ...element.position },
    });
  }, []);

  const handleDragMove = useCallback(
    (event) => {
      if (!dragInfo || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const deltaX = event.clientX - dragInfo.startX;
      const deltaY = event.clientY - dragInfo.startY;

      const percentX = (deltaX / canvasRect.width) * 100;
      const percentY = (deltaY / canvasRect.height) * 100;

      const newPosition = {
        x: Math.max(0, Math.min(95, dragInfo.startPosition.x + percentX)),
        y: Math.max(0, Math.min(95, dragInfo.startPosition.y + percentY)),
      };

      updateElement(dragInfo.elementId, { position: newPosition });
    },
    [dragInfo, updateElement]
  );

  const handleDragEnd = useCallback(() => {
    setDragInfo(null);
  }, []);

  // Handle resize operations
  const handleResizeStart = useCallback((element, corner, event) => {
    if (element.locked) return;

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
    handleResizeMove,
    handleDragEnd,
    handleResizeEnd,
  ]);

  // Template operations
  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      const templateData = {
        name: templateConfig.name,
        config: templateConfig,
        elements: elements,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(templateData);
      } else {
        await TemplateManager.saveTemplate(templateData);
      }

      showAlert("Template saved successfully!", "success");
    } catch (error) {
      console.error("Error saving template:", error);
      showAlert("Error saving template", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = (template) => {
    setTemplateConfig(template.config);
    setElements(template.elements);
    setShowTemplateModal(false);
    showAlert("Template loaded successfully!", "success");
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await TemplateManager.deleteTemplate(templateId);
      setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
      showAlert("Template deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting template:", error);
      showAlert("Error deleting template", "error");
    }
  };

  const handleExportTemplate = () => {
    const templateData = {
      name: templateConfig.name,
      config: templateConfig,
      elements: elements,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(templateData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${templateConfig.name
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}_template.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <ElementToolbar
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        addElement={addElement}
        elements={elements}
        scale={scale}
        setScale={setScale}
        selectedElement={selectedElement}
        onPreview={() => setShowPreviewModal(true)}
        onSave={handleSaveTemplate}
        onCancel={onCancel}
        loading={loading}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Element Library */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <ElementLibrary onAddElement={addElement} />
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-8">
            <div className="flex justify-center">
              <div
                ref={canvasRef}
                className="relative bg-white shadow-lg"
                style={{
                  width: `${paperDimensions.width * scale}px`,
                  height: `${paperDimensions.height * scale}px`,
                  transformOrigin: "top left",
                }}
                onClick={handleCanvasClick}
              >
                {/* Grid/Guidelines could be added here */}

                {/* Render Elements */}
                {filteredElements
                  .filter((element) => element.visible !== false)
                  .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
                  .map((element) => (
                    <ElementRenderer
                      key={element.id}
                      element={element}
                      isSelected={selectedElement?.id === element.id}
                      onPointerDown={(e) => handleElementSelect(element, e)}
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

        {/* Right Sidebar - Properties and Settings */}
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
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
              onConfigChange={setTemplateConfig}
              onSave={handleSaveTemplate}
              onExport={handleExportTemplate}
              onShowTemplates={() => setShowTemplateModal(true)}
              savedTemplates={savedTemplates}
            />
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        elements={elements}
        paperDimensions={paperDimensions}
        templateConfig={templateConfig}
        onElementsChange={setElements}
      />

      {/* Template Library Modal */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onLoad={handleLoadTemplate}
        onDelete={handleDeleteTemplate}
        savedTemplates={savedTemplates}
        setSavedTemplates={setSavedTemplates}
      />
    </div>
  );
};

export default ShippingSlipDesigner;
