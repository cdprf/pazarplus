import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import logger from "../../utils/logger";

const ImportExport = () => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importType, setImportType] = useState("orders");
  const fileInputRef = useRef(null);
  const { showNotification } = useAlert();

  const supportedTypes = [
    {
      value: "orders",
      label: "Orders",
      description: "Import order data from CSV/Excel",
    },
    {
      value: "customers",
      label: "Customers",
      description: "Import customer information",
    },
    {
      value: "products",
      label: "Products",
      description: "Import product catalog",
    },
  ];

  const exportFormats = [
    { value: "csv", label: "CSV", description: "Comma-separated values" },
    { value: "xlsx", label: "Excel", description: "Microsoft Excel format" },
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedTypes.includes(file.type)) {
        showNotification("Please select a CSV or Excel file", "error");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification("File size must be less than 10MB", "error");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showNotification("Please select a file to import", "error");
      return;
    }

    try {
      setImporting(true);
      setImportResults(null);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", importType);

      const response = await api.importExport.importData(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          logger.debug(`Upload progress: ${percentCompleted}%`);
        },
      });

      setImportResults(response);
      showNotification(
        `Successfully imported ${response.successful || 0} records`,
        "success"
      );

      // Clear the selected file
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      logger.error("Import error:", error);
      const errorMessage = error.response?.data?.message || "Import failed";
      showNotification(errorMessage, "error");

      // If there are validation errors, show them
      if (error.response?.data?.errors) {
        setImportResults({
          successful: 0,
          failed: error.response.data.errors.length,
          errors: error.response.data.errors,
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);

      const response = await api.importExport.exportData(importType, format);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const timestamp = new Date().toISOString().split("T")[0];
      const extension = format === "xlsx" ? "xlsx" : "csv";
      link.setAttribute(
        "download",
        `${importType}-export-${timestamp}.${extension}`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showNotification(`${importType} exported successfully`, "success");
    } catch (error) {
      logger.error("Export error:", error);
      showNotification("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.importExport.downloadTemplate(importType);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${importType}-template.csv`);

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showNotification("Template downloaded successfully", "success");
    } catch (error) {
      logger.error("Template download error:", error);
      showNotification("Failed to download template", "error");
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <Upload className="mr-3" />
          Import & Export
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Import data from CSV/Excel files or export your data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Import Data
          </h2>

          {/* Data Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Type
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {supportedTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {supportedTypes.find((t) => t.value === importType)?.description}
            </p>
          </div>

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {selectedFile ? selectedFile.name : "Choose a file"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  CSV, Excel files up to 10MB
                </p>
              </label>
            </div>
          </div>

          {/* Template Download */}
          <div className="mb-4">
            <button
              onClick={downloadTemplate}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center justify-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center justify-center"
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </>
            )}
          </button>

          {/* Import Results */}
          {importResults && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                {importResults.successful > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                )}
                <h3 className="font-medium">Import Results</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-600 font-medium">
                    Successful:
                  </span>
                  <span className="ml-2">{importResults.successful || 0}</span>
                </div>
                <div>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Failed:
                  </span>
                  <span className="ml-2">{importResults.failed || 0}</span>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    Errors:
                  </h4>
                  <div className="max-h-32 overflow-y-auto">
                    {importResults.errors.slice(0, 5).map((error, index) => (
                      <p
                        key={index}
                        className="text-xs text-red-600 dark:text-red-400 mb-1"
                      >
                        Row {error.row}: {error.message}
                      </p>
                    ))}
                    {importResults.errors.length > 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        And {importResults.errors.length - 5} more errors...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Export Data
          </h2>

          {/* Data Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Type
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {supportedTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Export Format Buttons */}
          <div className="space-y-3">
            {exportFormats.map((format) => (
              <button
                key={format.value}
                onClick={() => handleExport(format.value)}
                disabled={exporting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center justify-center"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export as {format.label}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Export Info */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Export Information
            </h3>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>
                • All data will be exported based on your current permissions
              </li>
              <li>• Large datasets may take some time to process</li>
              <li>• Exported files will include all relevant fields</li>
              <li>• File will be downloaded automatically when ready</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Import Instructions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              1. Prepare Your File
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Download the template for your data type and fill it with your
              data. Ensure all required fields are included.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              2. Upload & Import
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Select your file and click import. The system will validate your
              data and show any errors that need to be fixed.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              3. Review Results
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              Check the import results to see how many records were successfully
              imported and fix any errors if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;
