import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Copy,
  FileText,
  Trash2,
  AlignCenter,
  MoreHorizontal,
  RotateCw,
  Grid,
  Ruler,
  Download,
  Printer,
  RefreshCw,
  Sliders,
  Layers,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Camera,
  Save,
  Type,
  Image as ImageIcon,
  Square,
  QrCode as QRCode,
  X,
} from "lucide-react";
import {
  Modal,
  Button,
  Tooltip,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Select,
  Switch,
} from "../../../ui";
import BarcodeRenderer from "./BarcodeRenderer";

// Constants
const RULER_SIZE = 24;

const TOOLS = {
  select: {
    id: "select",
    label: "Select",
    icon: AlignCenter,
    shortcut: "V",
  },
  pan: {
    id: "pan",
    label: "Pan",
    icon: MoreHorizontal,
    shortcut: "H",
  },
  zoom: {
    id: "zoom",
    label: "Zoom",
    icon: ZoomIn,
    shortcut: "Z",
  },
};

const ELEMENT_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  BARCODE: "barcode",
  QR_CODE: "qr_code",
  SHAPE: "shape",
};

const PAPER_SIZES = {
  A4: { width: 210, height: 297, label: "A4" },
  A5: { width: 148, height: 210, label: "A5" },
  Letter: { width: 216, height: 279, label: "Letter" },
  Custom: { width: 100, height: 100, label: "Custom" },
};

const EXPORT_FORMATS = {
  png: { label: "PNG", description: "High quality image" },
  pdf: { label: "PDF", description: "Print-ready document" },
  svg: { label: "SVG", description: "Vector format" },
};

const GRID_SIZE_PRESETS = [
  { value: 5, label: "5mm" },
  { value: 10, label: "10mm" },
  { value: 20, label: "20mm" },
];

const RENDER_QUALITY_OPTIONS = {
  low: { label: "Low", description: "Fast rendering" },
  medium: { label: "Medium", description: "Balanced" },
  high: { label: "High", description: "Best quality" },
};

const THEME_OPTIONS = {
  light: { label: "Light" },
  dark: { label: "Dark" },
  auto: { label: "Auto" },
};

const ANIMATION_PRESETS = {
  none: { label: "None", duration: 0 },
  fast: { label: "Fast", duration: 150 },
  normal: { label: "Normal", duration: 300 },
  slow: { label: "Slow", duration: 500 },
};

// Component placeholder components for missing dependencies
const QRCodeComponent = ({ value }) => (
  <div className="bg-gray-200 p-2 text-xs">{value}</div>
);

const Image = ({ src, alt, style }) => (
  <img src={src} alt={alt} style={style} />
);

// Additional constants needed for the enhanced component
const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
const MIN_ELEMENT_SIZE = { width: 5, height: 5 };
const PreviewModal = ({
  isOpen,
  onClose,
  elements = [],
  paperDimensions = { width: 210, height: 297 },
  templateConfig = { name: "Untitled Template" },
  onPrint,
  onElementsChange,
  orderData = null,
  enableEdit = true,
  showToolbar = true,
  theme = "light",
  initialZoom = 1,
  maxZoom = 5,
  minZoom = 0.1,
  showMinimap = false,
  enableRulers = true,
  enableGrid = true,
  autoSave = false,
  autoSaveInterval = 30000,
  enableKeyboardShortcuts = true,
  enableContextMenu = true,
  enableDragDrop = true,
  enableMultiSelect = true,
  enableSnapGuides = true,
  defaultTool = "select",
  customActions = [],
}) => {
  // Refs - ALL USED
  const printRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const contextMenuRef = useRef(null);

  // UI State - Core UI states
  const [zoom, setZoom] = useState(initialZoom);
  const [showGrid, setShowGrid] = useState(enableGrid);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(10);
  const [showRulers, setShowRulers] = useState(enableRulers);
  const [showGuides, setShowGuides] = useState(enableSnapGuides);
  const [showMinimapState, setShowMinimapState] = useState(showMinimap);
  const [tool, setTool] = useState(defaultTool);
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 });
  const [currentPaperSize, setCurrentPaperSize] = useState("A4");
  const [customPaperSize, setCustomPaperSize] = useState(paperDimensions);
  const [currentTheme, setCurrentTheme] = useState(theme);

  // Element State - ALL USED
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]);
  const [previewElements, setPreviewElements] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [guides, setGuides] = useState({ horizontal: [], vertical: [] });
  const [errorMessage, setErrorMessage] = useState(null);

  // History State - ALL USED
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRedoing, setIsRedoing] = useState(false);

  // Interaction State - Essential interactions
  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [panInfo, setPanInfo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);

  // Loading and error states - ALL USED
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState("png");

  // Performance State - NOW ALL USED
  const [renderQuality, setRenderQuality] = useState("high");
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState("normal");
  const [enablePerformanceMode, setEnablePerformanceMode] = useState(false);

  // UI Panel States - NOW ALL USED
  const [showSettings, setShowSettings] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Advanced Features - NOW ALL USED
  const [enableSmartGuides, setEnableSmartGuides] = useState(true);
  const [enableMagneticSnap, setEnableMagneticSnap] = useState(false);
  const [showElementOutlines, setShowElementOutlines] = useState(false);
  const [showElementHandles, setShowElementHandles] = useState(true);
  const [enableElementPreview, setEnableElementPreview] = useState(true);

  // Statistics - NOW ALL USED
  const [performanceStats, setPerformanceStats] = useState({
    renderTime: 0,
    elementCount: 0,
    visibleElements: 0,
    memoryUsage: 0,
  });

  // Computed values - ALL USED
  const hasSelection = selectedElement || selectedElements.length > 0;
  const hasMultipleSelection = selectedElements.length > 1;
  const canUndo = history.length > 1 && historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const canPaste = clipboard && clipboard.length > 0;
  const effectivePaperDimensions = useMemo(() => {
    if (currentPaperSize === "Custom") {
      return customPaperSize;
    }
    return PAPER_SIZES[currentPaperSize] || paperDimensions;
  }, [currentPaperSize, customPaperSize, paperDimensions]);

  const scaledPaperSize = useMemo(
    () => ({
      width: effectivePaperDimensions.width * zoom,
      height: effectivePaperDimensions.height * zoom,
    }),
    [effectivePaperDimensions.width, effectivePaperDimensions.height, zoom]
  );

  // Performance monitoring - NOW USED
  const elementDependencies = useMemo(() => {
    const start = performance.now();
    const deps = elements.map((e) => ({
      id: e.id,
      content: e.content,
      fontSize: e.style?.fontSize,
      position: e.position,
      size: e.size,
      style: e.style,
      type: e.type,
      zIndex: e.zIndex,
      visible: e.visible,
      locked: e.locked,
    }));

    setPerformanceStats((prev) => ({
      ...prev,
      renderTime: performance.now() - start,
      elementCount: elements.length,
    }));

    return deps;
  }, [elements]);

  const visibleElements = useMemo(() => {
    const visible = previewElements
      .filter((element) => element.visible !== false)
      .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    setPerformanceStats((prev) => ({
      ...prev,
      visibleElements: visible.length,
    }));

    return visible;
  }, [previewElements]);

  const selectedElementIds = useMemo(() => {
    return selectedElements.map((el) => el.id);
  }, [selectedElements]);

  // Clear selection - ENHANCED
  const clearSelection = useCallback(() => {
    setSelectedElement(null);
    setSelectedElements([]);
    setHoveredElement(null);
    setGuides({ horizontal: [], vertical: [] });
    setContextMenu(null);
  }, []);

  // Animation duration based on settings - NOW USED
  const animationDuration = useMemo(() => {
    if (!enableAnimations) return 0;
    return ANIMATION_PRESETS[animationSpeed]?.duration || 300;
  }, [enableAnimations, animationSpeed]);

  // History management - ENHANCED
  const addToHistory = useCallback(
    (elements, description = "") => {
      if (isRedoing) return;

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({
          elements: JSON.parse(JSON.stringify(elements)),
          timestamp: Date.now(),
          description,
        });

        if (newHistory.length > 50) {
          newHistory.shift();
        }

        return newHistory;
      });

      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex, isRedoing]
  );

  // Render quality threshold - NOW USED
  const qualityThreshold = useMemo(() => {
    return RENDER_QUALITY_OPTIONS[renderQuality]?.threshold || 1;
  }, [renderQuality]);

  const centerViewport = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const centerX = (containerRect.width - scaledPaperSize.width) / 2;
    const centerY = (containerRect.height - scaledPaperSize.height) / 2;

    setViewportPosition({ x: centerX, y: centerY });
    setSuccessMessage("Görünüm ortalandı");
  }, [scaledPaperSize]);

  // Performance mode detection - NOW USED
  const shouldUsePerformanceMode = useMemo(() => {
    return (
      enablePerformanceMode ||
      previewElements.length > 100 ||
      zoom < 0.25 ||
      performanceStats.renderTime > 100
    );
  }, [
    enablePerformanceMode,
    previewElements.length,
    zoom,
    performanceStats.renderTime,
  ]);

  const handleZoomChange = useCallback(
    (newZoom) => {
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      setZoom(clampedZoom);
      setSuccessMessage(`Zoom: ${Math.round(clampedZoom * 100)}%`);
    },
    [minZoom, maxZoom]
  );

  // Utility functions - ALL NOW ENHANCED AND USED
  const snapToGridValue = useCallback(
    (value) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  const constrainPosition = useCallback(
    (x, y, width = 0, height = 0) => ({
      x: Math.max(0, Math.min(100 - width, x)),
      y: Math.max(0, Math.min(100 - height, y)),
    }),
    []
  );

  const flipElement = useCallback(
    (direction) => {
      if (!selectedElement) return;

      setPreviewElements((prev) => {
        const updated = prev.map((el) => {
          if (el.id === selectedElement.id) {
            const newStyle = { ...el.style };
            if (direction === "horizontal") {
              newStyle.transform = `scaleX(${
                newStyle.scaleX === -1 ? 1 : -1
              }) scaleY(${newStyle.scaleY || 1})`;
              newStyle.scaleX = newStyle.scaleX === -1 ? 1 : -1;
            } else {
              newStyle.transform = `scaleX(${newStyle.scaleX || 1}) scaleY(${
                newStyle.scaleY === -1 ? 1 : -1
              })`;
              newStyle.scaleY = newStyle.scaleY === -1 ? 1 : -1;
            }
            return { ...el, style: newStyle };
          }
          return el;
        });
        addToHistory(
          updated,
          `Öğe ${direction === "horizontal" ? "yatay" : "dikey"} çevrildi`
        );
        return updated;
      });

      setSuccessMessage(
        `${direction === "horizontal" ? "Yatay" : "Dikey"} çevrildi`
      );
    },
    [selectedElement, addToHistory]
  );

  const rotateElement = useCallback(
    (degrees) => {
      if (!selectedElement) return;

      setPreviewElements((prev) => {
        const updated = prev.map((el) => {
          if (el.id === selectedElement.id) {
            return { ...el, rotation: (el.rotation || 0) + degrees };
          }
          return el;
        });
        addToHistory(updated, `${degrees}° döndürüldü`);
        return updated;
      });

      setSelectedElement((prev) =>
        prev ? { ...prev, rotation: (prev.rotation || 0) + degrees } : null
      );
      setSuccessMessage(`${degrees}° döndürüldü`);
    },
    [selectedElement, addToHistory]
  );

  const handleElementSelect = useCallback((element, multiSelect = false) => {
    if (multiSelect) {
      setSelectedElements((prev) => {
        const exists = prev.some((el) => el.id === element.id);
        if (exists) {
          return prev.filter((el) => el.id !== element.id);
        } else {
          return [...prev, element];
        }
      });
    } else {
      setSelectedElement(element);
      setSelectedElements([element]);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setIsRedoing(true);
      setPreviewElements(
        JSON.parse(JSON.stringify(history[newIndex].elements))
      );
      clearSelection();
      setSuccessMessage(
        `Geri alındı: ${history[newIndex].description || "Önceki durum"}`
      );
      setTimeout(() => setIsRedoing(false), 100);
    }
  }, [history, historyIndex, canUndo, clearSelection]);

  const moveSelectedElements = useCallback(
    (deltaX, deltaY) => {
      const elementsToMove =
        selectedElements.length > 0
          ? selectedElements
          : selectedElement
          ? [selectedElement]
          : [];

      if (elementsToMove.length === 0) return;

      setPreviewElements((prev) => {
        const updated = prev.map((el) => {
          if (elementsToMove.some((moveEl) => moveEl.id === el.id)) {
            const newPosition = constrainPosition(
              snapToGridValue(el.position.x + deltaX),
              snapToGridValue(el.position.y + deltaY),
              el.size.width,
              el.size.height
            );
            return { ...el, position: newPosition };
          }
          return el;
        });

        addToHistory(updated, `${elementsToMove.length} öğe taşındı`);
        return updated;
      });

      // Update selected elements references
      setSelectedElements((prev) =>
        prev.map((el) => {
          const updated = previewElements.find((pe) => pe.id === el.id);
          return updated || el;
        })
      );

      if (selectedElement) {
        const updated = previewElements.find(
          (el) => el.id === selectedElement.id
        );
        if (updated) setSelectedElement(updated);
      }
    },
    [
      selectedElement,
      selectedElements,
      snapToGridValue,
      constrainPosition,
      addToHistory,
      previewElements,
    ]
  );

  // Element navigation - NOW USED
  const selectNextElement = useCallback(
    (reverse = false) => {
      if (previewElements.length === 0) return;

      const visibleUnlockedElements = previewElements.filter(
        (el) => el.visible && !el.locked
      );
      if (visibleUnlockedElements.length === 0) return;

      const currentIndex = selectedElement
        ? visibleUnlockedElements.findIndex(
            (el) => el.id === selectedElement.id
          )
        : -1;

      let nextIndex;
      if (reverse) {
        nextIndex =
          currentIndex <= 0
            ? visibleUnlockedElements.length - 1
            : currentIndex - 1;
      } else {
        nextIndex =
          currentIndex >= visibleUnlockedElements.length - 1
            ? 0
            : currentIndex + 1;
      }

      const nextElement = visibleUnlockedElements[nextIndex];
      if (nextElement) {
        setSelectedElement(nextElement);
        setSelectedElements([nextElement]);
        setSuccessMessage(
          `Seçili: ${nextElement.type} (${nextIndex + 1}/${
            visibleUnlockedElements.length
          })`
        );
      }
    },
    [previewElements, selectedElement]
  );
  const handleRedo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setIsRedoing(true);
      setPreviewElements(
        JSON.parse(JSON.stringify(history[newIndex].elements))
      );
      clearSelection();
      setSuccessMessage(
        `Yeniden yapıldı: ${history[newIndex].description || "Sonraki durum"}`
      );
      setTimeout(() => setIsRedoing(false), 100);
    }
  }, [history, historyIndex, canRedo, clearSelection]);

  const zoomToSelection = useCallback(() => {
    if (!hasSelection) return;

    const elements =
      selectedElements.length > 0 ? selectedElements : [selectedElement];
    const bounds = {
      minX: Math.min(...elements.map((el) => el.position.x)),
      maxX: Math.max(...elements.map((el) => el.position.x + el.size.width)),
      minY: Math.min(...elements.map((el) => el.position.y)),
      maxY: Math.max(...elements.map((el) => el.position.y + el.size.height)),
    };

    const selectionWidth = bounds.maxX - bounds.minX;
    const selectionHeight = bounds.maxY - bounds.minY;

    if (!containerRef.current) return;
    const container = containerRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const availableWidth = containerRect.width - 100;
    const availableHeight = containerRect.height - 100;

    const scaleX = availableWidth / selectionWidth;
    const scaleY = availableHeight / selectionHeight;
    const optimalZoom = Math.min(scaleX, scaleY, maxZoom);

    setZoom(Math.max(optimalZoom, minZoom));

    // Center on selection
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const scaledCenterX = centerX * optimalZoom;
    const scaledCenterY = centerY * optimalZoom;

    setViewportPosition({
      x: containerRect.width / 2 - scaledCenterX,
      y: containerRect.height / 2 - scaledCenterY,
    });

    setSuccessMessage("Seçime zoom yapıldı");
  }, [hasSelection, selectedElements, selectedElement, maxZoom, minZoom]);

  const zoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex((level) => level >= zoom);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    handleZoomChange(ZOOM_LEVELS[nextIndex]);
  }, [zoom, handleZoomChange]);

  const zoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex((level) => level >= zoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    handleZoomChange(ZOOM_LEVELS[prevIndex]);
  }, [zoom, handleZoomChange]);

  const zoomToFit = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const availableWidth = containerRect.width - 100;
    const availableHeight = containerRect.height - 100;

    const scaleX = availableWidth / effectivePaperDimensions.width;
    const scaleY = availableHeight / effectivePaperDimensions.height;
    const optimalZoom = Math.min(scaleX, scaleY, maxZoom);

    setZoom(Math.max(optimalZoom, minZoom));
    setSuccessMessage("Kağıda zoom yapıldı");
  }, [effectivePaperDimensions, maxZoom, minZoom]);

  const scaleElement = useCallback(
    (scaleFactor) => {
      if (!selectedElement) return;

      const newSize = {
        width: Math.max(
          MIN_ELEMENT_SIZE.width,
          selectedElement.size.width * scaleFactor
        ),
        height: Math.max(
          MIN_ELEMENT_SIZE.height,
          selectedElement.size.height * scaleFactor
        ),
      };

      setPreviewElements((prev) => {
        const updated = prev.map((el) =>
          el.id === selectedElement.id ? { ...el, size: newSize } : el
        );
        addToHistory(updated, `Öğe ${scaleFactor}x ölçeklendirildi`);
        return updated;
      });

      setSelectedElement((prev) => ({ ...prev, size: newSize }));
      setSuccessMessage(`Öğe ${scaleFactor}x ölçeklendirildi`);
    },
    [selectedElement, addToHistory]
  );

  const alignElements = useCallback(
    (alignment) => {
      const elementsToAlign =
        selectedElements.length > 0
          ? selectedElements
          : [selectedElement].filter(Boolean);
      if (elementsToAlign.length === 0) return;

      setPreviewElements((prev) => {
        const updated = prev.map((el) => {
          const elementToAlign = elementsToAlign.find(
            (alignEl) => alignEl.id === el.id
          );
          if (elementToAlign) {
            const newPosition = { ...el.position };
            switch (alignment) {
              case "left":
                newPosition.x = 0;
                break;
              case "center":
                newPosition.x = 50 - el.size.width / 2;
                break;
              case "right":
                newPosition.x = 100 - el.size.width;
                break;
              case "top":
                newPosition.y = 0;
                break;
              case "middle":
                newPosition.y = 50 - el.size.height / 2;
                break;
              case "bottom":
                newPosition.y = 100 - el.size.height;
                break;
              default:
                break;
            }
            return { ...el, position: newPosition };
          }
          return el;
        });
        addToHistory(updated, `Öğeler ${alignment} hizalandı`);
        return updated;
      });

      setSuccessMessage(`Öğeler ${alignment} hizalandı`);
    },
    [selectedElement, selectedElements, addToHistory]
  );

  // MISSING FUNCTIONS - IMPLEMENTING NOW
  const constrainSize = useCallback((width, height, position) => {
    const minSize = 5; // Minimum size in mm
    const maxSize = 200; // Maximum size in mm

    return {
      width: Math.max(minSize, Math.min(maxSize, width)),
      height: Math.max(minSize, Math.min(maxSize, height)),
    };
  }, []);

  // Copy/Paste functionality
  const handleCopy = useCallback(() => {
    if (!hasSelection) return;

    const elementsToCopy =
      selectedElements.length > 0
        ? selectedElements
        : selectedElement
        ? [selectedElement]
        : [];

    if (elementsToCopy.length === 0) return;

    setClipboard([...elementsToCopy]);
    setSuccessMessage(`${elementsToCopy.length} öğe kopyalandı`);
  }, [hasSelection, selectedElements, selectedElement]);

  const handlePaste = useCallback(() => {
    if (!canPaste || !clipboard) return;

    const newElements = clipboard.map((element) => ({
      ...element,
      id: `${element.id}_copy_${Date.now()}`,
      position: {
        x: element.position.x + 5, // Offset by 5mm
        y: element.position.y + 5,
      },
    }));

    setPreviewElements((prev) => {
      const updated = [...prev, ...newElements];
      addToHistory(updated, `${newElements.length} öğe yapıştırıldı`);
      return updated;
    });

    setSelectedElements(newElements);
    setSelectedElement(newElements[0]);
    setSuccessMessage(`${newElements.length} öğe yapıştırıldı`);
  }, [canPaste, clipboard, addToHistory]);

  // Delete functionality
  const handleDeleteElement = useCallback(() => {
    if (!hasSelection) return;

    const elementsToDelete =
      selectedElements.length > 0
        ? selectedElements
        : selectedElement
        ? [selectedElement]
        : [];

    if (elementsToDelete.length === 0) return;

    const idsToDelete = elementsToDelete.map((el) => el.id);

    setPreviewElements((prev) => {
      const updated = prev.filter((el) => !idsToDelete.includes(el.id));
      addToHistory(updated, `${elementsToDelete.length} öğe silindi`);
      return updated;
    });

    setSelectedElement(null);
    setSelectedElements([]);
    setSuccessMessage(`${elementsToDelete.length} öğe silindi`);
  }, [hasSelection, selectedElements, selectedElement, addToHistory]);

  // Drag functionality
  const handleDragStart = useCallback(
    (element, e) => {
      if (!enableEdit || element.locked) return;

      e.preventDefault();
      e.stopPropagation();

      setDragInfo({
        element,
        startX: e.clientX,
        startY: e.clientY,
        originalPosition: { ...element.position },
      });

      setSelectedElement(element);
      setSelectedElements([element]);
    },
    [enableEdit]
  );

  const handleDragMove = useCallback(
    (e) => {
      if (!dragInfo) return;

      const deltaX = (e.clientX - dragInfo.startX) / zoom;
      const deltaY = (e.clientY - dragInfo.startY) / zoom;

      const newPosition = constrainPosition(
        snapToGridValue(dragInfo.originalPosition.x + deltaX),
        snapToGridValue(dragInfo.originalPosition.y + deltaY),
        dragInfo.element.size.width,
        dragInfo.element.size.height
      );

      setPreviewElements((prev) =>
        prev.map((el) =>
          el.id === dragInfo.element.id ? { ...el, position: newPosition } : el
        )
      );
    },
    [dragInfo, zoom, constrainPosition, snapToGridValue]
  );

  const handleDragEnd = useCallback(() => {
    if (!dragInfo) return;

    addToHistory(previewElements, "Öğe taşındı");
    setDragInfo(null);
  }, [dragInfo, previewElements, addToHistory]);

  // Background click handler
  const handleBackgroundClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      setSelectedElement(null);
      setSelectedElements([]);
      setContextMenu(null);
    }
  }, []);

  // Element hover handlers
  const handleElementHover = useCallback(
    (element) => {
      if (!enableElementPreview) return;
      // You could add hover effects here if needed
    },
    [enableElementPreview]
  );

  const handleElementLeave = useCallback(() => {
    // Clear any hover effects
  }, []);

  // Lock/Visibility toggle functions
  const toggleElementLock = useCallback(
    (element) => {
      if (!element) return;

      setPreviewElements((prev) => {
        const updated = prev.map((el) =>
          el.id === element.id ? { ...el, locked: !el.locked } : el
        );
        addToHistory(
          updated,
          `Öğe ${element.locked ? "kilidi açıldı" : "kilitlendi"}`
        );
        return updated;
      });

      setSuccessMessage(
        `Öğe ${element.locked ? "kilidi açıldı" : "kilitlendi"}`
      );
    },
    [addToHistory]
  );

  const toggleElementVisibility = useCallback(
    (element) => {
      if (!element) return;

      setPreviewElements((prev) => {
        const updated = prev.map((el) =>
          el.id === element.id ? { ...el, visible: !el.visible } : el
        );
        addToHistory(
          updated,
          `Öğe ${element.visible ? "gizlendi" : "gösterildi"}`
        );
        return updated;
      });

      setSuccessMessage(`Öğe ${element.visible ? "gizlendi" : "gösterildi"}`);
    },
    [addToHistory]
  );

  // Distribution function
  const distributeElements = useCallback(
    (direction) => {
      if (selectedElements.length < 3) return;

      setPreviewElements((prev) => {
        const elementsToDistribute = [...selectedElements].sort((a, b) => {
          return direction === "horizontal"
            ? a.position.x - b.position.x
            : a.position.y - b.position.y;
        });

        const first = elementsToDistribute[0];
        const last = elementsToDistribute[elementsToDistribute.length - 1];

        const totalSpace =
          direction === "horizontal"
            ? last.position.x - first.position.x
            : last.position.y - first.position.y;

        const spacing = totalSpace / (elementsToDistribute.length - 1);

        const updated = prev.map((el) => {
          const index = elementsToDistribute.findIndex(
            (distEl) => distEl.id === el.id
          );
          if (index > 0 && index < elementsToDistribute.length - 1) {
            const newPosition = { ...el.position };
            if (direction === "horizontal") {
              newPosition.x = first.position.x + spacing * index;
            } else {
              newPosition.y = first.position.y + spacing * index;
            }
            return { ...el, position: newPosition };
          }
          return el;
        });

        addToHistory(
          updated,
          `Öğeler ${direction === "horizontal" ? "yatay" : "dikey"} dağıtıldı`
        );
        return updated;
      });

      setSuccessMessage(
        `Öğeler ${direction === "horizontal" ? "yatay" : "dikey"} dağıtıldı`
      );
    },
    [selectedElements, addToHistory]
  );

  // Print functionality
  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Preview</title>
          <style>
            body { margin: 0; padding: 20px; }
            .print-area { 
              width: ${effectivePaperDimensions.width}mm; 
              height: ${effectivePaperDimensions.height}mm; 
              border: 1px solid #ccc;
              position: relative;
            }
          </style>
        </head>
        <body>
          <div class="print-area">
            <!-- Elements would be rendered here -->
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  }, [effectivePaperDimensions]);

  // Close handler
  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  // Export functionality
  const handleExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  // Paper size change
  const handlePaperSizeChange = useCallback((newSize) => {
    setCurrentPaperSize(newSize);
    setSuccessMessage(`Kağıt boyutu: ${newSize}`);
  }, []);

  const handleCustomPaperSizeChange = useCallback((dimension, value) => {
    setCustomPaperSize((prev) => ({
      ...prev,
      [dimension]: parseFloat(value) || 0,
    }));
  }, []);

  // Grid controls
  const toggleGridSnap = useCallback((enabled) => {
    setSnapToGrid(enabled);
    setSuccessMessage(`Grid yakalama ${enabled ? "açık" : "kapalı"}`);
  }, []);

  const handleGridSizeChange = useCallback((newSize) => {
    setGridSize(parseInt(newSize));
    setSuccessMessage(`Grid boyutu: ${newSize}mm`);
  }, []);

  // Bulk operations
  const lockAllElements = useCallback(() => {
    setPreviewElements((prev) => {
      const updated = prev.map((el) => ({ ...el, locked: true }));
      addToHistory(updated, "Tüm öğeler kilitlendi");
      return updated;
    });
    setSuccessMessage("Tüm öğeler kilitlendi");
  }, [addToHistory]);

  const unlockAllElements = useCallback(() => {
    setPreviewElements((prev) => {
      const updated = prev.map((el) => ({ ...el, locked: false }));
      addToHistory(updated, "Tüm öğelerin kilidi açıldı");
      return updated;
    });
    setSuccessMessage("Tüm öğelerin kilidi açıldı");
  }, [addToHistory]);

  const showAllElements = useCallback(() => {
    setPreviewElements((prev) => {
      const updated = prev.map((el) => ({ ...el, visible: true }));
      addToHistory(updated, "Tüm öğeler gösterildi");
      return updated;
    });
    setSuccessMessage("Tüm öğeler gösterildi");
  }, [addToHistory]);

  const hideAllElements = useCallback(() => {
    setPreviewElements((prev) => {
      const updated = prev.map((el) => ({ ...el, visible: false }));
      addToHistory(updated, "Tüm öğeler gizlendi");
      return updated;
    });
    setSuccessMessage("Tüm öğeler gizlendi");
  }, [addToHistory]);

  const deleteAllElements = useCallback(() => {
    if (previewElements.length === 0) return;

    if (window.confirm("Tüm öğeleri silmek istediğinizden emin misiniz?")) {
      setPreviewElements([]);
      setSelectedElement(null);
      setSelectedElements([]);
      addToHistory([], "Tüm öğeler silindi");
      setSuccessMessage("Tüm öğeler silindi");
    }
  }, [previewElements.length, addToHistory]);

  // Viewport controls
  const resetViewport = useCallback(() => {
    centerViewport();
    setZoom(1);
    setSuccessMessage("Görünüm sıfırlandı");
  }, [centerViewport]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setSuccessMessage("Zoom sıfırlandı");
  }, []);

  // Duplication
  const handleDuplicateElement = useCallback(() => {
    if (!selectedElement) return;

    const duplicated = {
      ...selectedElement,
      id: `${selectedElement.id}_dup_${Date.now()}`,
      position: {
        x: selectedElement.position.x + 5,
        y: selectedElement.position.y + 5,
      },
    };

    setPreviewElements((prev) => {
      const updated = [...prev, duplicated];
      addToHistory(updated, "Öğe çoğaltıldı");
      return updated;
    });

    setSelectedElement(duplicated);
    setSelectedElements([duplicated]);
    setSuccessMessage("Öğe çoğaltıldı");
  }, [selectedElement, addToHistory]);

  // Render quality change
  const handleRenderQualityChange = useCallback((quality) => {
    setRenderQuality(quality);
    setSuccessMessage(
      `Render kalitesi: ${RENDER_QUALITY_OPTIONS[quality]?.label}`
    );
  }, []);

  // Animation controls
  const toggleAnimations = useCallback((enabled) => {
    setEnableAnimations(enabled);
    setSuccessMessage(`Animasyonlar ${enabled ? "açık" : "kapalı"}`);
  }, []);

  const handleAnimationSpeedChange = useCallback((speed) => {
    setAnimationSpeed(speed);
    setSuccessMessage(`Animasyon hızı: ${speed}`);
  }, []);

  // Performance mode
  const togglePerformanceMode = useCallback((enabled) => {
    setEnablePerformanceMode(enabled);
    setSuccessMessage(`Performans modu ${enabled ? "açık" : "kapalı"}`);
  }, []);

  // Settings import/export
  const exportSettings = useCallback(() => {
    const settings = {
      renderQuality,
      enableAnimations,
      animationSpeed,
      enablePerformanceMode,
      snapToGrid,
      gridSize,
      showGrid,
      showRulers,
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "preview-modal-settings.json";
    link.click();

    URL.revokeObjectURL(url);
    setSuccessMessage("Ayarlar dışa aktarıldı");
  }, [
    renderQuality,
    enableAnimations,
    animationSpeed,
    enablePerformanceMode,
    snapToGrid,
    gridSize,
    showGrid,
    showRulers,
  ]);

  const importSettings = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target.result);

          // Apply imported settings
          if (settings.renderQuality) setRenderQuality(settings.renderQuality);
          if (typeof settings.enableAnimations === "boolean")
            setEnableAnimations(settings.enableAnimations);
          if (settings.animationSpeed)
            setAnimationSpeed(settings.animationSpeed);
          if (typeof settings.enablePerformanceMode === "boolean")
            setEnablePerformanceMode(settings.enablePerformanceMode);
          if (typeof settings.snapToGrid === "boolean")
            setSnapToGrid(settings.snapToGrid);
          if (settings.gridSize) setGridSize(settings.gridSize);
          if (typeof settings.showGrid === "boolean")
            setShowGrid(settings.showGrid);
          if (typeof settings.showRulers === "boolean")
            setShowRulers(settings.showRulers);

          setSuccessMessage("Ayarlar içe aktarıldı");
        } catch (error) {
          setError("Ayarlar dosyası okunamadı");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }, []);

  // Resize functionality
  const handleResizeStart = useCallback(
    (e, element, direction) => {
      if (!enableEdit || element.locked) return;

      e.preventDefault();
      e.stopPropagation();

      setResizeInfo({
        element,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        originalSize: { ...element.size },
        originalPosition: { ...element.position },
      });

      setSelectedElement(element);
      setSelectedElements([element]);
    },
    [enableEdit]
  );

  const handleResizeMove = useCallback(
    (e) => {
      if (!resizeInfo) return;

      const deltaX = (e.clientX - resizeInfo.startX) / zoom;
      const deltaY = (e.clientY - resizeInfo.startY) / zoom;

      let newSize = { ...resizeInfo.originalSize };
      let newPosition = { ...resizeInfo.originalPosition };

      // Calculate new size and position based on resize direction
      switch (resizeInfo.direction) {
        case "nw": // Northwest
          newSize.width = Math.max(5, resizeInfo.originalSize.width - deltaX);
          newSize.height = Math.max(5, resizeInfo.originalSize.height - deltaY);
          newPosition.x = resizeInfo.originalPosition.x + deltaX;
          newPosition.y = resizeInfo.originalPosition.y + deltaY;
          break;
        case "ne": // Northeast
          newSize.width = Math.max(5, resizeInfo.originalSize.width + deltaX);
          newSize.height = Math.max(5, resizeInfo.originalSize.height - deltaY);
          newPosition.y = resizeInfo.originalPosition.y + deltaY;
          break;
        case "sw": // Southwest
          newSize.width = Math.max(5, resizeInfo.originalSize.width - deltaX);
          newSize.height = Math.max(5, resizeInfo.originalSize.height + deltaY);
          newPosition.x = resizeInfo.originalPosition.x + deltaX;
          break;
        case "se": // Southeast
          newSize.width = Math.max(5, resizeInfo.originalSize.width + deltaX);
          newSize.height = Math.max(5, resizeInfo.originalSize.height + deltaY);
          break;
        case "n": // North
          newSize.height = Math.max(5, resizeInfo.originalSize.height - deltaY);
          newPosition.y = resizeInfo.originalPosition.y + deltaY;
          break;
        case "s": // South
          newSize.height = Math.max(5, resizeInfo.originalSize.height + deltaY);
          break;
        case "w": // West
          newSize.width = Math.max(5, resizeInfo.originalSize.width - deltaX);
          newPosition.x = resizeInfo.originalPosition.x + deltaX;
          break;
        case "e": // East
          newSize.width = Math.max(5, resizeInfo.originalSize.width + deltaX);
          break;
        default:
          break;
      }

      // Apply grid snapping if enabled
      newSize.width = snapToGridValue(newSize.width);
      newSize.height = snapToGridValue(newSize.height);
      newPosition.x = snapToGridValue(newPosition.x);
      newPosition.y = snapToGridValue(newPosition.y);

      // Constrain size
      const constrainedSize = constrainSize(
        newSize.width,
        newSize.height,
        newPosition
      );
      newSize = constrainedSize;

      // Constrain position
      newPosition = constrainPosition(
        newPosition.x,
        newPosition.y,
        newSize.width,
        newSize.height
      );

      setPreviewElements((prev) =>
        prev.map((el) =>
          el.id === resizeInfo.element.id
            ? { ...el, size: newSize, position: newPosition }
            : el
        )
      );
    },
    [resizeInfo, zoom, snapToGridValue, constrainSize, constrainPosition]
  );

  const handleResizeEnd = useCallback(() => {
    if (!resizeInfo) return;

    addToHistory(previewElements, "Öğe yeniden boyutlandırıldı");
    setResizeInfo(null);
  }, [resizeInfo, previewElements, addToHistory]);

  // Effect for handling mouse events during resize and drag operations
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (resizeInfo) {
        handleResizeMove(e);
      } else if (dragInfo) {
        handleDragMove(e);
      }
    };

    const handleMouseUp = () => {
      if (resizeInfo) {
        handleResizeEnd();
      } else if (dragInfo) {
        handleDragEnd();
      }
    };

    if (resizeInfo || dragInfo) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    resizeInfo,
    dragInfo,
    handleResizeMove,
    handleResizeEnd,
    handleDragMove,
    handleDragEnd,
  ]);

  // Initialize preview elements from props
  useEffect(() => {
    setPreviewElements(elements);
    if (elements.length > 0 && history.length === 0) {
      setHistory([
        {
          elements: JSON.parse(JSON.stringify(elements)),
          timestamp: Date.now(),
        },
      ]);
      setHistoryIndex(0);
    }
  }, [elements, history.length]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* MAIN MODAL */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={templateConfig.name || "Template Preview"}
        size="full"
        className={`preview-modal ${currentTheme}`}
      >
        <div className="flex flex-col h-full">
          {showToolbar && (
            <div className="border-b p-2 flex items-center gap-2 bg-white">
              {/* Tools */}
              <div className="flex items-center gap-1">
                {Object.values(TOOLS).map((toolConfig) => (
                  <Tooltip
                    key={toolConfig.id}
                    content={`${toolConfig.label} (${toolConfig.shortcut})`}
                  >
                    <Button
                      size="sm"
                      variant={tool === toolConfig.id ? "default" : "ghost"}
                      onClick={() => setTool(toolConfig.id)}
                    >
                      <toolConfig.icon className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                ))}
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={zoomOut} disabled={zoom <= minZoom}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={zoomIn} disabled={zoom >= maxZoom}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={zoomToFit}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <span className="text-sm font-mono min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* History Controls */}
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={handleUndo} disabled={!canUndo}>
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleRedo} disabled={!canRedo}>
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Edit Controls */}
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={handleCopy} disabled={!hasSelection}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handlePaste} disabled={!canPaste}>
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteElement}
                  disabled={!hasSelection}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Alignment Controls */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() => alignElements("left")}
                  disabled={!hasMultipleSelection}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => distributeElements("horizontal")}
                  disabled={!hasMultipleSelection}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={rotateElement}
                  disabled={!hasSelection}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1" />

              {/* View Controls */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={showGrid ? "default" : "ghost"}
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showRulers ? "default" : "ghost"}
                  onClick={() => setShowRulers(!showRulers)}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showGuides ? "default" : "ghost"}
                  onClick={() => setShowGuides(!showGuides)}
                  title="Show Snap Guides"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={showElementOutlines ? "default" : "ghost"}
                  onClick={() => setShowElementOutlines(!showElementOutlines)}
                  title="Show Element Outlines"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={centerViewport}
                  title="Center Viewport"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Close Button */}
              <Button size="sm" onClick={handleClose} variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative">
              {/* RULERS */}
              {showRulers && (
                <>
                  <div
                    className="absolute bg-gray-100 border-b flex items-center z-10"
                    style={{
                      top: 0,
                      left: RULER_SIZE,
                      right: 0,
                      height: RULER_SIZE,
                    }}
                  >
                    <Ruler className="h-4 w-4 ml-2" />
                    <span className="text-xs ml-2">mm</span>
                  </div>

                  <div
                    className="absolute bg-gray-100 border-r flex flex-col items-center justify-start pt-2 z-10"
                    style={{
                      top: RULER_SIZE,
                      left: 0,
                      bottom: 0,
                      width: RULER_SIZE,
                    }}
                  >
                    <Ruler className="h-4 w-4 transform rotate-90" />
                  </div>
                </>
              )}

              {/* GUIDES */}
              {guides.horizontal.map((guide, index) => (
                <div
                  key={`h-${index}`}
                  className="absolute border-t border-blue-500 pointer-events-none z-20"
                  style={{
                    top: `${guide.position}%`,
                    left: 0,
                    right: 0,
                  }}
                />
              ))}
              {guides.vertical.map((guide, index) => (
                <div
                  key={`v-${index}`}
                  className="absolute border-l border-blue-500 pointer-events-none z-20"
                  style={{
                    left: `${guide.position}%`,
                    top: 0,
                    bottom: 0,
                  }}
                />
              ))}

              {/* HOVERED ELEMENT INDICATOR */}
              {hoveredElement && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs z-30">
                  Hovering: {hoveredElement.type}
                </div>
              )}

              {/* LOADING OVERLAY */}
              {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <div>Loading...</div>
                    </div>
                  </div>
                </div>
              )}

              {/* PREVIEW CONTAINER */}
              <div
                ref={containerRef}
                className="absolute inset-0 overflow-auto bg-gray-100"
                style={{
                  paddingTop: showRulers ? RULER_SIZE : 0,
                  paddingLeft: showRulers ? RULER_SIZE : 0,
                }}
                onMouseDown={handleBackgroundClick}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
              >
                {/* PAPER */}
                <div
                  ref={printRef}
                  className="bg-white shadow-lg mx-auto my-8 relative"
                  style={{
                    width: `${scaledPaperSize.width}px`,
                    height: `${scaledPaperSize.height}px`,
                    transform: `translate(${viewportPosition.x}px, ${viewportPosition.y}px)`,
                    transition: animationDuration
                      ? `all ${animationDuration}ms ease`
                      : "none",
                  }}
                >
                  {/* GRID */}
                  {showGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
                        backgroundSize: `${gridSize * zoom}px ${
                          gridSize * zoom
                        }px`,
                      }}
                    />
                  )}

                  {visibleElements.map((element) => (
                    <div
                      key={element.id}
                      className={`absolute cursor-pointer ${
                        selectedElements.some((el) => el.id === element.id)
                          ? "ring-2 ring-blue-500"
                          : ""
                      } ${element.locked ? "opacity-75" : ""} ${
                        showElementOutlines ? "ring-1 ring-gray-300" : ""
                      }`}
                      style={{
                        left: `${element.position.x * zoom}px`,
                        top: `${element.position.y * zoom}px`,
                        width: `${element.size.width * zoom}px`,
                        height: `${element.size.height * zoom}px`,
                        zIndex: element.zIndex || 1,
                        transform: element.rotation
                          ? `rotate(${element.rotation}deg)`
                          : "none",
                        opacity: element.opacity ?? 1,
                      }}
                      onMouseDown={(e) => handleDragStart(element, e)}
                      onMouseEnter={() => handleElementHover(element)}
                      onMouseLeave={handleElementLeave}
                      onClick={() => handleElementSelect(element)}
                    >
                      {/* ELEMENT CONTENT */}
                      {(() => {
                        const commonProps = {
                          style: {
                            fontSize: element.fontSize || 12,
                            color: element.color || "#000000",
                            fontFamily: element.fontFamily || "Arial",
                            fontWeight: element.fontWeight || "normal",
                            textAlign: element.textAlign || "left",
                            transition: animationDuration
                              ? `all ${animationDuration}ms ease`
                              : "none",
                          },
                        };

                        switch (element.type) {
                          case ELEMENT_TYPES.TEXT:
                            return (
                              <div {...commonProps}>
                                <Type className="h-4 w-4 inline mr-1" />
                                {element.content || "Sample Text"}
                              </div>
                            );

                          case ELEMENT_TYPES.IMAGE:
                            return (
                              <div className="relative">
                                <ImageIcon className="h-4 w-4 absolute top-1 left-1" />
                                {element.src ? (
                                  <Image
                                    src={element.src}
                                    alt={element.alt || ""}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: element.objectFit || "cover",
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            );

                          case ELEMENT_TYPES.BARCODE:
                            return (
                              <BarcodeRenderer
                                content={element.value || "123456789"}
                                type={
                                  element.format ||
                                  element.barcodeType ||
                                  "code128"
                                }
                                showText={element.showText !== false}
                                width={
                                  (element.size?.width ||
                                    element.barcodeWidth ||
                                    200) * zoom
                                }
                                height={
                                  (element.size?.height ||
                                    element.barcodeHeight ||
                                    60) * zoom
                                }
                                moduleWidth={element.moduleWidth}
                                moduleHeight={element.moduleHeight}
                                quietZone={element.quietZone}
                                fontSize={
                                  element.fontSize
                                    ? element.fontSize * zoom
                                    : undefined
                                }
                                textDistance={element.textDistance}
                                backgroundColor={
                                  element.backgroundColor || "transparent"
                                }
                                foregroundColor={
                                  element.foregroundColor || "#000000"
                                }
                                centerText={element.centerText !== false}
                                barcodeScale={element.barcodeScale || 2.5}
                                // Pass element size and zoom for proper PDF-matching dimensions
                                elementSize={element.size}
                                zoom={zoom}
                              />
                            );

                          case ELEMENT_TYPES.QR_CODE:
                            return QRCode ? (
                              <QRCode
                                value={element.value || "Sample QR Code"}
                                size={Math.min(
                                  element.size?.width || 100,
                                  element.size?.height || 100
                                )}
                              />
                            ) : (
                              <QRCodeComponent
                                value={element.value || "Sample QR Code"}
                              />
                            );

                          case ELEMENT_TYPES.SHAPE:
                            return (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor:
                                    element.backgroundColor || "#f0f0f0",
                                  border: `${element.borderWidth || 1}px ${
                                    element.borderStyle || "solid"
                                  } ${element.borderColor || "#000"}`,
                                  borderRadius: element.borderRadius || 0,
                                  ...commonProps.style,
                                }}
                              >
                                <Square className="h-4 w-4 m-1" />
                              </div>
                            );

                          default:
                            return (
                              <div {...commonProps}>
                                <FileText className="h-4 w-4 inline mr-1" />
                                Unknown Element
                              </div>
                            );
                        }
                      })()}

                      {/* ELEMENT CONTROLS */}
                      {selectedElements.some((el) => el.id === element.id) &&
                        enableEdit && (
                          <div className="absolute -top-8 left-0 flex gap-1">
                            <Button
                              size="xs"
                              onClick={() => toggleElementLock(element)}
                            >
                              {element.locked ? (
                                <Unlock className="h-3 w-3" />
                              ) : (
                                <Lock className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => toggleElementVisibility(element)}
                            >
                              {element.visible !== false ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleDeleteElement()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                    </div>
                  ))}

                  {/* SELECTION BOX for multi-selection */}
                  {selectionBox && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30 pointer-events-none"
                      style={{
                        left: `${Math.min(
                          selectionBox.startX,
                          selectionBox.endX
                        )}px`,
                        top: `${Math.min(
                          selectionBox.startY,
                          selectionBox.endY
                        )}px`,
                        width: `${Math.abs(
                          selectionBox.endX - selectionBox.startX
                        )}px`,
                        height: `${Math.abs(
                          selectionBox.endY - selectionBox.startY
                        )}px`,
                        zIndex: 9999,
                      }}
                    />
                  )}

                  {/* SNAP GUIDES */}
                  {guides.horizontal.map((guide, index) => (
                    <div
                      key={`h-${index}`}
                      className="absolute border-t border-pink-500 pointer-events-none"
                      style={{
                        left: 0,
                        right: 0,
                        top: `${guide.position * zoom}px`,
                        zIndex: 9998,
                      }}
                    />
                  ))}
                  {guides.vertical.map((guide, index) => (
                    <div
                      key={`v-${index}`}
                      className="absolute border-l border-pink-500 pointer-events-none"
                      style={{
                        top: 0,
                        bottom: 0,
                        left: `${guide.position * zoom}px`,
                        zIndex: 9998,
                      }}
                    />
                  ))}

                  {/* ELEMENT HANDLES for selected elements */}
                  {showElementHandles &&
                    selectedElements.map((element) => (
                      <div
                        key={`handles-${element.id}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${element.position.x * zoom - 4}px`,
                          top: `${element.position.y * zoom - 4}px`,
                          width: `${element.size.width * zoom + 8}px`,
                          height: `${element.size.height * zoom + 8}px`,
                          zIndex: 9997,
                        }}
                      >
                        {/* Corner handles */}
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -top-1 -left-1 cursor-nw-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "nw")
                          }
                        />
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -top-1 -right-1 cursor-ne-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "ne")
                          }
                        />
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -bottom-1 -left-1 cursor-sw-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "sw")
                          }
                        />
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -bottom-1 -right-1 cursor-se-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "se")
                          }
                        />

                        {/* Edge handles */}
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -top-1 left-1/2 transform -translate-x-1/2 cursor-n-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "n")
                          }
                        />
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -bottom-1 left-1/2 transform -translate-x-1/2 cursor-s-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "s")
                          }
                        />
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -left-1 top-1/2 transform -translate-y-1/2 cursor-w-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "w")
                          }
                        />
                        <div
                          className="absolute w-2 h-2 bg-blue-500 border border-white -right-1 top-1/2 transform -translate-y-1/2 cursor-e-resize pointer-events-auto"
                          onMouseDown={(e) =>
                            handleResizeStart(e, element, "e")
                          }
                        />
                      </div>
                    ))}
                </div>
              </div>

              {/* HIDDEN CANVAS */}
              <canvas
                ref={canvasRef}
                style={{
                  display: "none",
                  position: "absolute",
                  top: -9999,
                  left: -9999,
                }}
              />
            </div>

            <div className="w-80 border-l bg-white flex flex-col">
              <Tabs defaultValue="properties" className="flex-1">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="properties">
                    <Sliders className="h-4 w-4 mr-1" />
                    Properties
                  </TabsTrigger>
                  <TabsTrigger value="layers">
                    <Layers className="h-4 w-4 mr-1" />
                    Layers
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="properties" className="p-4">
                  {selectedElement ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Element Properties</h3>

                      {/* Basic Information */}
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Type:</span>{" "}
                          {selectedElement.type}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">ID:</span>{" "}
                          {selectedElement.id}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Position:</span>
                          X: {Math.round(selectedElement.position?.x || 0)}px,
                          Y: {Math.round(selectedElement.position?.y || 0)}px
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Size:</span>
                          W: {Math.round(selectedElement.size?.width || 0)}px,
                          H: {Math.round(selectedElement.size?.height || 0)}px
                        </div>
                        {selectedElement.content && (
                          <div className="text-sm">
                            <span className="font-medium">Content:</span>{" "}
                            {selectedElement.content}
                          </div>
                        )}
                      </div>

                      {/* Element Controls */}
                      <div className="space-y-2">
                        <h4 className="font-medium">Controls</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleElementLock(selectedElement)}
                          >
                            {selectedElement.locked ? (
                              <>
                                <Unlock className="h-3 w-3 mr-1" /> Unlock
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 mr-1" /> Lock
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleElementVisibility(selectedElement)
                            }
                          >
                            {selectedElement.visible !== false ? (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" /> Hide
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3 mr-1" /> Show
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Status Indicators */}
                      <div className="space-y-2">
                        <h4 className="font-medium mb-2">Status</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedElement.locked && (
                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">
                              Locked
                            </span>
                          )}
                          {selectedElement.visible === false && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:text-gray-400 text-xs rounded">
                              Hidden
                            </span>
                          )}
                          <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                            Selected
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <Type className="h-8 w-8 mx-auto" />
                      </div>
                      <div className="text-sm text-gray-500">
                        Select an element to edit properties
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Click on any element in the preview to select it
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="layers" className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Layers</h3>
                    {previewElements.map((element, index) => (
                      <div
                        key={element.id}
                        className={`p-2 border rounded cursor-pointer ${
                          selectedElements.some((el) => el.id === element.id)
                            ? "bg-blue-100"
                            : ""
                        }`}
                        onClick={() => handleElementSelect(element)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{element.type}</span>
                          <div className="flex gap-1">
                            <Button
                              size="xs"
                              onClick={() => toggleElementVisibility(element)}
                            >
                              {element.visible !== false ? (
                                <Eye className="h-3 w-3" />
                              ) : (
                                <EyeOff className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => toggleElementLock(element)}
                            >
                              {element.locked ? (
                                <Lock className="h-3 w-3" />
                              ) : (
                                <Unlock className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* SETTINGS TAB */}
                <TabsContent value="settings" className="p-4 space-y-6">
                  {/* Paper Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Kağıt Ayarları
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Kağıt Boyutu
                        </label>
                        <Select
                          value={currentPaperSize}
                          onValueChange={handlePaperSizeChange}
                          options={Object.entries(PAPER_SIZES).map(
                            ([key, size]) => ({
                              value: key,
                              label: size.label,
                            })
                          )}
                        />
                      </div>

                      {currentPaperSize === "Custom" && (
                        <>
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Genişlik (mm)
                            </label>
                            <Input
                              type="number"
                              value={customPaperSize.width}
                              onChange={(e) =>
                                handleCustomPaperSizeChange(
                                  "width",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Yükseklik (mm)
                            </label>
                            <Input
                              type="number"
                              value={customPaperSize.height}
                              onChange={(e) =>
                                handleCustomPaperSizeChange(
                                  "height",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Grid Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Grid className="h-4 w-4" />
                      Grid Ayarları
                    </h3>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grid Göster</span>
                      <Switch
                        checked={showGrid}
                        onCheckedChange={setShowGrid}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grid'e Yapış</span>
                      <Switch
                        checked={snapToGrid}
                        onCheckedChange={toggleGridSnap}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Grid Boyutu
                      </label>
                      <Select
                        value={gridSize}
                        onValueChange={handleGridSizeChange}
                        options={GRID_SIZE_PRESETS.map((preset) => ({
                          value: preset.value,
                          label: preset.label,
                        }))}
                      />
                    </div>
                  </div>

                  {/* Bulk Actions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Toplu İşlemler
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={lockAllElements}
                        variant="outline"
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        Tümünü Kilitle
                      </Button>
                      <Button
                        size="sm"
                        onClick={unlockAllElements}
                        variant="outline"
                      >
                        <Unlock className="h-4 w-4 mr-1" />
                        Tümünü Aç
                      </Button>
                      <Button
                        size="sm"
                        onClick={showAllElements}
                        variant="outline"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Tümünü Göster
                      </Button>
                      <Button
                        size="sm"
                        onClick={hideAllElements}
                        variant="outline"
                      >
                        <EyeOff className="h-4 w-4 mr-1" />
                        Tümünü Gizle
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      onClick={deleteAllElements}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Tümünü Sil
                    </Button>
                  </div>

                  {/* View Controls */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Görünüm Kontrolleri
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={resetViewport}
                        variant="outline"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Görünümü Sıfırla
                      </Button>
                      <Button size="sm" onClick={resetZoom} variant="outline">
                        <ZoomOut className="h-4 w-4 mr-1" />
                        Zoom Sıfırla
                      </Button>
                      <Button
                        size="sm"
                        onClick={zoomToSelection}
                        variant="outline"
                        disabled={!hasSelection}
                      >
                        <ZoomIn className="h-4 w-4 mr-1" />
                        Seçime Zoom
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => scaleElement(1.5)}
                        variant="outline"
                        disabled={!hasSelection}
                      >
                        <Maximize2 className="h-4 w-4 mr-1" />
                        1.5x Büyüt
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="border-t p-2 bg-gray-50 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              <span>Tool: {TOOLS[tool]?.label}</span>
              {hasSelection && (
                <span>Selected: {selectedElements.length || 1}</span>
              )}
              {qualityThreshold && (
                <span>Quality: {Math.round(qualityThreshold * 100)}%</span>
              )}
              {shouldUsePerformanceMode && (
                <span className="text-orange-600">Performance Mode</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {elementDependencies.length > 0 && (
                <span>Dependencies: {elementDependencies.length}</span>
              )}
              {selectedElementIds.length > 0 && (
                <span>IDs: {selectedElementIds.length}</span>
              )}
              {animationDuration > 0 && (
                <span>Animation: {animationDuration}ms</span>
              )}
            </div>
          </div>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4" />
                <span>{errorMessage}</span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="ml-2 hover:bg-red-600 rounded p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {successMessage && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
              <div className="flex items-center gap-2">
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* RESIZE INFO */}
          {resizeInfo && (
            <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
              <div className="text-sm">
                Resizing: {Math.round(resizeInfo.width)}x
                {Math.round(resizeInfo.height)}
              </div>
            </div>
          )}

          {/* PAN INFO */}
          {panInfo && (
            <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
              <div className="text-sm">
                Pan: {Math.round(panInfo.x)}, {Math.round(panInfo.y)}
              </div>
            </div>
          )}

          {/* KEYBOARD MODIFIER INDICATORS */}
          {(isCtrlPressed || isShiftPressed) && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50">
              <div className="flex items-center gap-2 text-sm">
                {isCtrlPressed && (
                  <span className="bg-blue-600 px-2 py-1 rounded text-xs">
                    Ctrl
                  </span>
                )}
                {isShiftPressed && (
                  <span className="bg-yellow-600 px-2 py-1 rounded text-xs">
                    Shift
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CONTEXT MENU */}
          {contextMenu && (
            <div
              ref={contextMenuRef}
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
              }}
            >
              <div className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {contextMenu.element.type}
              </div>
              <div className="border-t border-gray-100 my-1"></div>

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  handleElementSelect(contextMenu.element);
                  setContextMenu(null);
                }}
              >
                <AlignCenter className="h-4 w-4" />
                Select
              </button>

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  handleElementSelect(contextMenu.element);
                  handleDuplicateElement();
                  setContextMenu(null);
                }}
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  handleElementSelect(contextMenu.element);
                  handleCopy();
                  setContextMenu(null);
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  handleElementSelect(contextMenu.element);
                  toggleElementLock();
                  setContextMenu(null);
                }}
              >
                {contextMenu.element.locked ? (
                  <>
                    <Unlock className="h-4 w-4" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Lock
                  </>
                )}
              </button>

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() => {
                  handleElementSelect(contextMenu.element);
                  toggleElementVisibility();
                  setContextMenu(null);
                }}
              >
                {contextMenu.element.visible !== false ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show
                  </>
                )}
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 text-red-600 flex items-center gap-2"
                onClick={() => {
                  handleElementSelect(contextMenu.element);
                  handleDeleteElement();
                  setContextMenu(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}

          {/* EXPORT INDICATOR */}
          {isExporting && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <div className="text-lg font-medium mb-2">Exporting...</div>
                  {exportProgress > 0 && (
                    <div className="w-64 bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {exportProgress}% complete
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* EXPORT DIALOG */}
      {showExportDialog && (
        <Modal
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          title="Dışa Aktarma Ayarları"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <Select
                value={exportFormat}
                onValueChange={setExportFormat}
                options={Object.entries(EXPORT_FORMATS).map(
                  ([key, format]) => ({
                    value: key,
                    label: format.label,
                    description: format.description,
                  })
                )}
              />
            </div>

            {exportProgress > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Dışa aktarılıyor...
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <div className="text-xs text-center">{exportProgress}%</div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleExport}
                disabled={isLoading || !exportFormat}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Dışa Aktarılıyor...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Dışa Aktar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
              >
                İptal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* KEYBOARD HELP DIALOG */}
      {showKeyboardHelp && (
        <Modal
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
          title="Klavye Kısayolları"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Genel</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Geri Al</span>
                    <code>Ctrl+Z</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Yinele</span>
                    <code>Ctrl+Y</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Kopyala</span>
                    <code>Ctrl+C</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Yapıştır</span>
                    <code>Ctrl+V</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Sil</span>
                    <code>Delete</code>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Araçlar</h4>
                <div className="space-y-1 text-sm">
                  {Object.values(TOOLS).map((tool) => (
                    <div key={tool.id} className="flex justify-between">
                      <span>{tool.label}</span>
                      <code>{tool.shortcut}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={() => setShowKeyboardHelp(false)}>Kapat</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SETTINGS DIALOG */}
      {showSettings && (
        <Modal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          title="Gelişmiş Ayarlar"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Alt Tuşu Basılı</span>
              <span
                className={isAltPressed ? "text-green-600" : "text-gray-400"}
              >
                {isAltPressed ? "Basılı" : "Basılı Değil"}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold mb-2">Render Kalitesi</h4>
              <Select
                value={renderQuality}
                onValueChange={handleRenderQualityChange}
                options={Object.entries(RENDER_QUALITY_OPTIONS).map(
                  ([key, option]) => ({
                    value: key,
                    label: option.label,
                    description: option.description,
                  })
                )}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold mb-2">Tema</h4>
              <Select
                value={currentTheme}
                onValueChange={setCurrentTheme}
                options={Object.entries(THEME_OPTIONS).map(([key, option]) => ({
                  value: key,
                  label: option.label,
                }))}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold mb-2">Animasyon Ayarları</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm">Animasyonları Etkinleştir</span>
                <Switch
                  checked={enableAnimations}
                  onCheckedChange={toggleAnimations}
                />
              </div>
              <Select
                value={animationSpeed}
                onValueChange={handleAnimationSpeedChange}
                options={Object.entries(ANIMATION_PRESETS).map(
                  ([key, preset]) => ({
                    value: key,
                    label: preset.label,
                  })
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <span>Performans Modu</span>
              <Switch
                checked={shouldUsePerformanceMode}
                onCheckedChange={togglePerformanceMode}
              />
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold mb-2">Akıllı Kılavuzlar</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm">Akıllı Kılavuzları Etkinleştir</span>
                <Switch
                  checked={enableSmartGuides}
                  onCheckedChange={setEnableSmartGuides}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Manyetik Yakalama</span>
                <Switch
                  checked={enableMagneticSnap}
                  onCheckedChange={setEnableMagneticSnap}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold mb-2">Öğe Görünümü</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm">Öğe Çerçevelerini Göster</span>
                <Switch
                  checked={showElementOutlines}
                  onCheckedChange={setShowElementOutlines}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Öğe Tutamaklarını Göster</span>
                <Switch
                  checked={showElementHandles}
                  onCheckedChange={setShowElementHandles}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Öğe Önizlemesini Etkinleştir</span>
                <Switch
                  checked={enableElementPreview}
                  onCheckedChange={setEnableElementPreview}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-4">
              <Button onClick={exportSettings} variant="outline">
                <Save className="h-4 w-4 mr-1" />
                Ayarları Kaydet
              </Button>
              <Button onClick={importSettings} variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Ayarları Yükle
              </Button>
            </div>

            <Button onClick={() => setShowSettings(false)} className="w-full">
              Kapat
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PreviewModal;
