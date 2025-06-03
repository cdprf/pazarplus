import React from "react";
import {
  Undo2,
  Redo2,
  Save,
  Eye,
  ZoomIn,
  ZoomOut,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "../../../ui/Button";

const ElementToolbar = ({
  undo,
  redo,
  canUndo,
  canRedo,
  addElement,
  elements,
  scale,
  setScale,
  selectedElement,
  onPreview,
  onSave,
  onCancel,
  loading,
}) => {
  const handleQuickAdd = (type) => {
    addElement(type, { x: 10, y: 10 });
  };

  return (
    <div className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
      {/* Left section - History and quick actions */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-600 pr-3 mr-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={!canUndo}
            title="Geri Al (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={!canRedo}
            title="Yinele (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleQuickAdd("text")}
            title="Metin Ekle"
          >
            <Plus className="h-4 w-4 mr-1" />
            Metin
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleQuickAdd("image")}
            title="Resim Ekle"
          >
            <Plus className="h-4 w-4 mr-1" />
            Resim
          </Button>
        </div>
      </div>

      {/* Center section - Info */}
      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
        <div>Öğe Sayısı: {elements.length}</div>
        {selectedElement && <div>Seçili: {selectedElement.type}</div>}
      </div>

      {/* Right section - Zoom and actions */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-600 pr-3 mr-3">
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setScale(1)}
            title="Normal Boyut"
          >
            100%
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            title="Önizleme"
          >
            <Eye className="h-4 w-4 mr-1" />
            Önizleme
          </Button>
          <Button size="sm" onClick={onSave} disabled={loading} title="Kaydet">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Kaydet
          </Button>
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel} title="İptal">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElementToolbar;
