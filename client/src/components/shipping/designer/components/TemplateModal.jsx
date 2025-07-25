import logger from "../../../../utils/logger.js";
import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  Search,
  Grid,
  Eye,
  Trash2,
  Copy,
  Calendar,
  Download,
  Star,
  StarOff,
} from "lucide-react";
import {
  formatDate,
  generateId,
  downloadJSON,
} from "../utils/designerUtils.js";
import {
  saveTemplate,
  deleteTemplate,
  fetchTemplates,
} from "../services/templateService.js";
import api from "../../../../services/api";

// TemplateModal Component with design system compliance
const TemplateModal = ({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  savedTemplates,
  setSavedTemplates,
}) => {
  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadTemplates = async () => {
        try {
          const templates = await fetchTemplates();
          setSavedTemplates(templates);
        } catch (error) {
          logger.error("Error loading templates:", error);
        }
      };
      loadTemplates();
    }
  }, [isOpen, setSavedTemplates]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [viewMode, setViewMode] = useState("grid");
  const [defaultTemplateId, setDefaultTemplateId] = useState(null);

  // Load default template when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadDefaultTemplate = async () => {
        try {
          const response = await api.shipping.getDefaultTemplate();
          if (response.success) {
            setDefaultTemplateId(response.data.defaultTemplateId);
          }
        } catch (error) {
          logger.error("Error loading default template:", error);
        }
      };
      loadDefaultTemplate();
    }
  }, [isOpen]);

  const filteredTemplates = useMemo(() => {
    let filtered = savedTemplates.filter((template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "updated":
        default:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });

    return filtered;
  }, [savedTemplates, searchTerm, sortBy]);

  // Handle duplicate template
  const handleDuplicate = async (template) => {
    const duplicatedTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} - Kopya`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Save to database first
      const savedTemplate = await saveTemplate(duplicatedTemplate);

      // Then update local state (with the response from server which might contain additional fields)
      const updatedTemplates = [...savedTemplates, savedTemplate];
      setSavedTemplates(updatedTemplates);
    } catch (error) {
      logger.error("Error duplicating template:", error);
      alert("Template duplication failed. Please try again.");
    }
  };

  const handleExportTemplate = (template) => {
    const exportData = {
      config: template.config,
      elements: template.elements,
      name: template.name,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    downloadJSON(
      exportData,
      `${template.name.replace(/[^a-z0-9]/gi, "_")}.json`
    );
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("Bu şablonu silmek istediğinizden emin misiniz?")) {
      try {
        // Delete from database first
        await deleteTemplate(templateId);

        // Then update local state
        const updatedTemplates = savedTemplates.filter(
          (t) => t.id !== templateId
        );
        setSavedTemplates(updatedTemplates);

        // Clear default if deleted template was default
        if (defaultTemplateId === templateId) {
          setDefaultTemplateId(null);
        }

        if (onDelete) onDelete(templateId);
      } catch (error) {
        logger.error("Error deleting template:", error);
        alert("Template deletion failed. Please try again.");
      }
    }
  };

  const handleSetDefault = async (templateId) => {
    try {
      const newDefaultId = defaultTemplateId === templateId ? null : templateId;
      const response = await api.shipping.setDefaultTemplate(newDefaultId);

      if (response.success) {
        setDefaultTemplateId(newDefaultId);
      } else {
        alert("Varsayılan şablon ayarlanamadı. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      logger.error("Error setting default template:", error);
      alert("Varsayılan şablon ayarlanamadı. Lütfen tekrar deneyin.");
    }
  };

  const handleLoadTemplate = (template) => {
    if (onLoad) {
      onLoad(template);
    } else {
      logger.warn("No onLoad handler provided");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900  dark:text-white">
                Kaydedilen Şablonlar
              </h3>
              <button
                onClick={onClose}
                className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Şablon ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="updated">Son Güncelleme</option>
                  <option value="created">Oluşturma Tarihi</option>
                  <option value="name">İsim</option>
                </select>

                <button
                  onClick={() =>
                    setViewMode(viewMode === "grid" ? "list" : "grid")
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Templates List/Grid */}
            <div className="max-h-96 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">
                    Şablon bulunamadı
                  </div>
                  <div className="text-gray-500 text-sm">
                    {searchTerm
                      ? "Arama kriterlerinize uygun şablon bulunamadı."
                      : "Henüz kaydedilmiş şablon bulunmuyor."}
                  </div>
                </div>
              ) : (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "space-y-2"
                  }
                >
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        viewMode === "list"
                          ? "flex items-center justify-between"
                          : ""
                      }`}
                    >
                      <div className={viewMode === "grid" ? "mb-3" : "flex-1"}>
                        <h4 className="font-medium text-gray-900  dark:text-white mb-1 flex items-center gap-2">
                          {template.name}
                          {defaultTemplateId === template.id && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Varsayılan
                            </span>
                          )}
                        </h4>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(template.updatedAt)}
                          </div>
                          <div>
                            {template.config.paperSize} -{" "}
                            {template.config.orientation === "portrait"
                              ? "Dikey"
                              : "Yatay"}
                          </div>
                          <div>{template.elements?.length || 0} öğe</div>
                        </div>
                      </div>

                      <div
                        className={`flex gap-2 ${
                          viewMode === "grid" ? "justify-center" : ""
                        }`}
                      >
                        <button
                          onClick={() => handleLoadTemplate(template)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Yükle"
                        >
                          <Eye className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(template)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          title="Kopyala"
                        >
                          <Copy className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => handleExportTemplate(template)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          title="Dışa Aktar"
                        >
                          <Download className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => handleSetDefault(template.id)}
                          className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                            defaultTemplateId === template.id
                              ? "text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500"
                              : "text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:ring-yellow-500"
                          } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                          title={
                            defaultTemplateId === template.id
                              ? "Varsayılan'dan Çıkar"
                              : "Varsayılan Yap"
                          }
                        >
                          {defaultTemplateId === template.id ? (
                            <StarOff className="h-3 w-3" />
                          ) : (
                            <Star className="h-3 w-3" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Sil"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
