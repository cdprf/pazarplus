import logger from "../../../../utils/logger.js";
import { useState, useEffect, useCallback, useMemo } from "react";
import { elementDefaults, ELEMENT_TYPES } from "../constants/index.js";
import { generateId } from "../utils/designerUtils.js";

// Custom hook for designer state management
export const useDesignerState = () => {
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateConfig, setTemplateConfig] = useState({
    name: "Özel Şablon",
    paperSize: "A4",
    orientation: "portrait",
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
  });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Save to history for undo/redo
  const saveToHistory = useCallback(
    (newElements) => {
      if (!isInitialized) return;

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...newElements]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex, isInitialized]
  );

  // Initialize with default elements
  useEffect(() => {
    if (elements.length === 0 && !isInitialized) {
      const defaultElements = [
        {
          id: generateId(),
          type: ELEMENT_TYPES.HEADER,
          ...elementDefaults[ELEMENT_TYPES.HEADER],
          position: { x: 0, y: 5 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.RECIPIENT,
          ...elementDefaults[ELEMENT_TYPES.RECIPIENT],
          position: { x: 5, y: 20 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.SENDER,
          ...elementDefaults[ELEMENT_TYPES.SENDER],
          position: { x: 55, y: 20 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.ORDER_SUMMARY,
          ...elementDefaults[ELEMENT_TYPES.ORDER_SUMMARY],
          position: { x: 5, y: 55 },
        },
        {
          id: generateId(),
          type: ELEMENT_TYPES.FOOTER,
          ...elementDefaults[ELEMENT_TYPES.FOOTER],
          position: { x: 0, y: 90 },
        },
      ];

      setElements(defaultElements);
      setHistory([defaultElements]);
      setHistoryIndex(0);
      setIsInitialized(true);
    }
  }, [elements.length, isInitialized]);

  // Centralized element operations
  const elementOperations = useMemo(
    () => ({
      add: (type, position = { x: 10, y: 10 }) => {
        logger.info("useDesignerState: Adding element", type, position);
        
        // Get base element defaults
        const baseDefaults = elementDefaults[type] || {};
        
        // Apply global font settings if this is a text-based element and template has default font
        let elementStyle = { ...baseDefaults.style };
        if (templateConfig.defaultFont && (type === ELEMENT_TYPES.TEXT || baseDefaults.style?.fontSize)) {
          elementStyle = {
            ...elementStyle,
            fontFamily: templateConfig.defaultFont.fontFamily || elementStyle.fontFamily,
            fontSize: templateConfig.defaultFont.fontSize || elementStyle.fontSize,
            fontWeight: templateConfig.defaultFont.fontWeight || elementStyle.fontWeight,
            fontStyle: templateConfig.defaultFont.fontStyle || elementStyle.fontStyle,
            color: templateConfig.defaultFont.color || elementStyle.color,
            lineHeight: templateConfig.defaultFont.lineHeight || elementStyle.lineHeight,
          };
        }
        
        const newElement = {
          id: generateId(),
          type,
          ...baseDefaults,
          style: elementStyle,
          position,
          zIndex: elements.length + 1,
        };
        logger.info("useDesignerState: Created new element", newElement);

        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedElement(newElement);
        saveToHistory(newElements);
        logger.info(
          "useDesignerState: Element added successfully, total elements:",
          newElements.length
        );
      },

      update: (elementOrId, updates) => {
        // Handle both element object and id + updates patterns
        let id, elementUpdates;
        if (typeof elementOrId === 'object' && elementOrId.id) {
          // Called with full element object
          id = elementOrId.id;
          elementUpdates = elementOrId;
        } else {
          // Called with id and updates separately
          id = elementOrId;
          elementUpdates = { ...elements.find(el => el.id === id), ...updates };
        }

        const newElements = elements.map((el) =>
          el.id === id ? elementUpdates : el
        );
        setElements(newElements);
        if (selectedElement?.id === id) {
          setSelectedElement(elementUpdates);
        }
        saveToHistory(newElements);
      },

      remove: (id) => {
        const newElements = elements.filter((el) => el.id !== id);
        setElements(newElements);
        if (selectedElement?.id === id) {
          setSelectedElement(null);
        }
        saveToHistory(newElements);
      },

      duplicate: (element) => {
        const newElement = {
          ...element,
          id: generateId(),
          position: {
            x: element.position.x + 5,
            y: element.position.y + 5,
          },
          zIndex: elements.length + 1,
        };

        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedElement(newElement);
        saveToHistory(newElements);
      },

      toggleVisibility: (id, visible) => {
        const newElements = elements.map((el) =>
          el.id === id ? { ...el, visible } : el
        );
        setElements(newElements);
        saveToHistory(newElements);
      },

      reorder: (activeId, overId) => {
        const oldIndex = elements.findIndex((el) => el.id === activeId);
        const newIndex = elements.findIndex((el) => el.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newElements = [...elements];
          const [movedElement] = newElements.splice(oldIndex, 1);
          newElements.splice(newIndex, 0, movedElement);
          setElements(newElements);
          saveToHistory(newElements);
        }
      },

      bringToFront: (id) => {
        const maxZ = Math.max(...elements.map((el) => el.zIndex || 0));
        const newElements = elements.map((el) =>
          el.id === id ? { ...el, zIndex: maxZ + 1 } : el
        );
        setElements(newElements);
        saveToHistory(newElements);
      },

      sendToBack: (id) => {
        const minZ = Math.min(...elements.map((el) => el.zIndex || 0));
        const newElements = elements.map((el) =>
          el.id === id ? { ...el, zIndex: minZ - 1 } : el
        );
        setElements(newElements);
        saveToHistory(newElements);
      },

      selectElement: (element) => {
        setSelectedElement(element);
      },

      clearSelection: () => {
        setSelectedElement(null);
      },
    }),
    [elements, selectedElement, saveToHistory, templateConfig.defaultFont]
  );

  // Undo/Redo operations
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setElements(history[newIndex]);
      setHistoryIndex(newIndex);
      setSelectedElement(null);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setElements(history[newIndex]);
      setHistoryIndex(newIndex);
      setSelectedElement(null);
    }
  }, [historyIndex, history]);

  // Template operations
  const templateOperations = useMemo(
    () => ({
      saveTemplate: (name) => {
        const template = {
          id: generateId(),
          name,
          config: templateConfig,
          elements,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save to localStorage
        const savedTemplates = JSON.parse(
          localStorage.getItem("shippingTemplates") || "[]"
        );
        savedTemplates.push(template);
        localStorage.setItem(
          "shippingTemplates",
          JSON.stringify(savedTemplates)
        );

        return template;
      },

      loadTemplate: (template) => {
        setTemplateConfig(template.config);
        setElements(template.elements);
        setSelectedElement(null);
        saveToHistory(template.elements);
      },

      exportTemplate: () => {
        return {
          config: templateConfig,
          elements,
          exportedAt: new Date().toISOString(),
          version: "1.0",
        };
      },

      importTemplate: (templateData) => {
        if (templateData.config && templateData.elements) {
          setTemplateConfig(templateData.config);
          setElements(templateData.elements);
          setSelectedElement(null);
          saveToHistory(templateData.elements);
          return true;
        }
        return false;
      },

      resetTemplate: () => {
        setElements([]);
        setSelectedElement(null);
        setIsInitialized(false);
        setHistory([]);
        setHistoryIndex(-1);
      },
    }),
    [templateConfig, elements, saveToHistory]
  );

  return {
    // State
    elements,
    selectedElement,
    templateConfig,

    // State setters
    setSelectedElement,
    setTemplateConfig,
    setElements,

    // History operations
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,

    // Element operations
    ...elementOperations,

    // Template operations
    ...templateOperations,
  };
};
