import React, { useState } from "react";
import { Button, Dropdown } from "react-bootstrap";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";

const ExportButton = ({
  data,
  filename = "analytics-data",
  title = "Export Data",
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format) => {
    try {
      setIsExporting(true);

      let content, mimeType, extension;

      if (format === "json") {
        content = JSON.stringify(data, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else if (format === "csv") {
        // Simple CSV conversion for flat data
        if (Array.isArray(data)) {
          const headers = Object.keys(data[0] || {});
          const csvContent = [
            headers.join(","),
            ...data.map((row) =>
              headers.map((header) => `"${row[header] || ""}"`).join(",")
            ),
          ].join("\n");
          content = csvContent;
        } else {
          content = JSON.stringify(data, null, 2);
        }
        mimeType = "text/csv";
        extension = "csv";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="outline-primary" disabled={isExporting}>
        <DocumentArrowDownIcon className="h-4 w-4 me-1" />
        {isExporting ? "Exporting..." : title}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item onClick={() => handleExport("json")}>
          Export as JSON
        </Dropdown.Item>
        <Dropdown.Item onClick={() => handleExport("csv")}>
          Export as CSV
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ExportButton;
