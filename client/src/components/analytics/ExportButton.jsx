import React, { useState, useCallback, useMemo } from "react";
import { Button, Dropdown, Alert, Spinner } from "react-bootstrap";
import { 
  DocumentArrowDownIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

const ExportButton = ({
  data,
  filename = "analytics-data",
  title = "Export Data",
  className = "",
  onExportStart,
  onExportComplete,
  onExportError,
  "aria-label": ariaLabel,
  testId,
  maxRetries = 3,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Validate data availability
  const hasData = useMemo(() => {
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'object') return Object.keys(data).length > 0;
    return Boolean(data);
  }, [data]);

  const handleExport = useCallback(async (format, isRetry = false) => {
    try {
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }
      
      setIsExporting(true);
      onExportStart?.(format);

      // Validate data before export
      if (!hasData) {
        throw new Error('No data available to export');
      }

      let content, mimeType, extension;

      if (format === "json") {
        content = JSON.stringify(data, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else if (format === "csv") {
        // Enhanced CSV conversion with better handling
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0] || {});
          const csvContent = [
            headers.join(","),
            ...data.map((row) =>
              headers.map((header) => {
                const value = row[header];
                // Handle special characters and quotes in CSV
                const stringValue = String(value || "").replace(/"/g, '""');
                return `"${stringValue}"`;
              }).join(",")
            ),
          ].join("\n");
          content = csvContent;
        } else {
          // Fallback for non-array data
          const flatData = typeof data === 'object' ? 
            Object.entries(data).map(([key, value]) => ({ key, value })) : 
            [{ data: JSON.stringify(data) }];
          
          const headers = Object.keys(flatData[0] || {});
          const csvContent = [
            headers.join(","),
            ...flatData.map((row) =>
              headers.map((header) => {
                const value = row[header];
                const stringValue = String(value || "").replace(/"/g, '""');
                return `"${stringValue}"`;
              }).join(",")
            ),
          ].join("\n");
          content = csvContent;
        }
        mimeType = "text/csv";
        extension = "csv";
      } else if (format === "xlsx") {
        // For future Excel export functionality
        throw new Error('Excel export not yet implemented');
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.${extension}`;
      link.setAttribute('aria-label', `Download ${filename} as ${format.toUpperCase()}`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onExportComplete?.(format, filename);
      
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = error.message || 'Export failed';
      setError(errorMessage);
      onExportError?.(error, format);
    } finally {
      setIsExporting(false);
    }
  }, [data, filename, hasData, onExportStart, onExportComplete, onExportError]);

  const handleRetry = useCallback((format) => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      handleExport(format, true);
    }
  }, [retryCount, maxRetries, handleExport]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' && error) {
      setError(null);
    }
  }, [error]);

  // If no data available
  if (!hasData) {
    return (
      <Button 
        variant="outline-secondary" 
        disabled 
        className={className}
        aria-label="Export disabled - no data available"
        data-testid={testId}
      >
        <DocumentArrowDownIcon className="h-4 w-4 me-1" aria-hidden="true" />
        No Data to Export
      </Button>
    );
  }

  return (
    <div className={className} onKeyDown={handleKeyDown}>
      {error && (
        <Alert variant="danger" className="mb-2" dismissible onClose={() => setError(null)}>
          <div className="d-flex align-items-center">
            <ExclamationTriangleIcon className="h-4 w-4 me-2" aria-hidden="true" />
            <span className="me-auto">{error}</span>
            {retryCount < maxRetries && (
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => handleRetry('json')}
                aria-label="Retry export"
              >
                <ArrowPathIcon className="h-3 w-3 me-1" aria-hidden="true" />
                Retry
              </Button>
            )}
          </div>
        </Alert>
      )}
      
      <Dropdown>
        <Dropdown.Toggle 
          variant="outline-primary" 
          disabled={isExporting}
          aria-label={ariaLabel || `${title} - choose format`}
          data-testid={testId}
        >
          {isExporting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
              <span className="visually-hidden">Exporting...</span>
              Exporting...
            </>
          ) : (
            <>
              <DocumentArrowDownIcon className="h-4 w-4 me-1" aria-hidden="true" />
              {title}
            </>
          )}
        </Dropdown.Toggle>
        
        <Dropdown.Menu>
          <Dropdown.Item 
            onClick={() => handleExport("json")}
            disabled={isExporting}
            aria-label="Export data as JSON format"
          >
            <span className="d-flex align-items-center">
              📄 Export as JSON
              <small className="text-muted ms-auto">Structured data</small>
            </span>
          </Dropdown.Item>
          
          <Dropdown.Item 
            onClick={() => handleExport("csv")}
            disabled={isExporting}
            aria-label="Export data as CSV format for spreadsheets"
          >
            <span className="d-flex align-items-center">
              📊 Export as CSV
              <small className="text-muted ms-auto">Spreadsheet format</small>
            </span>
          </Dropdown.Item>
          
          <Dropdown.Divider />
          
          <Dropdown.Item disabled className="text-muted">
            <small>📈 Excel format coming soon</small>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default ExportButton;
