import logger from "../../../utils/logger.js";
import React, { useState, useRef } from "react";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";
import "./ProductCreationModalSimple.css";

/**
 * Fully Functional Product Creation Modal
 */
const ProductCreationModalFull = ({ show, onHide, onSuccess }) => {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState("manual");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    baseSku: "",
    description: "",
    category: "",
    brand: "",
    basePrice: "",
    baseCostPrice: "",
    stockQuantity: "",
    minStockLevel: 5,
    weight: "",
    status: "active",
    sourcing: "", // Add sourcing field
  });

  // Import data state
  const [importPreview, setImportPreview] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});

  // Platform data state
  const [platformUrl, setPlatformUrl] = useState("");
  const [platformData, setPlatformData] = useState(null);

  // Form validation errors
  const [errors, setErrors] = useState({});

  // Reset modal state
  const resetModal = () => {
    setActiveTab("manual");
    setFormData({
      name: "",
      baseSku: "",
      description: "",
      category: "",
      brand: "",
      basePrice: "",
      baseCostPrice: "",
      stockQuantity: "",
      minStockLevel: 5,
      weight: "",
      status: "active",
      sourcing: "", // Add sourcing field
    });
    setErrors({});
    setImportPreview(null);
    setFieldMapping({});
    setPlatformUrl("");
    setPlatformData(null);
  };

  // Handle modal close
  const handleClose = () => {
    resetModal();
    onHide();
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Product name is required";
    }
    if (!formData.category?.trim()) {
      newErrors.category = "Category is required";
    }
    if (
      !formData.basePrice ||
      isNaN(formData.basePrice) ||
      parseFloat(formData.basePrice) < 0
    ) {
      newErrors.basePrice = "Valid base price is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle manual form submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/products/main-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create product");
      }

      const result = await response.json();
      showAlert("Product created successfully!", "success");

      if (onSuccess) {
        onSuccess(result);
      }

      handleClose();
    } catch (error) {
      logger.error("Error creating product:", error);
      showAlert("Error creating product: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      showAlert("File size must be less than 10MB", "error");
      return;
    }

    const allowedTypes = ["text/csv", "application/json"];
    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(/\.(csv|json)$/i)
    ) {
      showAlert("Please select a CSV or JSON file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let data;
        if (file.type === "application/json" || file.name.endsWith(".json")) {
          data = JSON.parse(event.target.result);
          if (!Array.isArray(data)) {
            data = [data];
          }
        } else {
          // Parse CSV
          const csvText = event.target.result;
          const lines = csvText.split("\n").filter((line) => line.trim());
          if (lines.length < 2) {
            throw new Error(
              "CSV must have at least a header row and one data row"
            );
          }

          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/"/g, ""));
          data = lines.slice(1).map((line) => {
            const values = line
              .split(",")
              .map((v) => v.trim().replace(/"/g, ""));
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || "";
            });
            return obj;
          });
        }

        setImportPreview({
          fileName: file.name,
          data: data.slice(0, 10),
          totalRows: data.length,
          headers: Object.keys(data[0] || {}),
          fullData: data,
        });

        // Auto-map fields
        const mapping = {};
        const headers = Object.keys(data[0] || {});
        headers.forEach((header) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes("name") || lowerHeader.includes("title")) {
            mapping.name = header;
          } else if (
            lowerHeader.includes("price") &&
            !lowerHeader.includes("cost")
          ) {
            mapping.basePrice = header;
          } else if (lowerHeader.includes("category")) {
            mapping.category = header;
          } else if (lowerHeader.includes("brand")) {
            mapping.brand = header;
          } else if (lowerHeader.includes("description")) {
            mapping.description = header;
          } else if (lowerHeader.includes("sku")) {
            mapping.baseSku = header;
          }
        });
        setFieldMapping(mapping);

        showAlert(
          `Successfully loaded ${data.length} products from ${file.name}`,
          "success"
        );
      } catch (error) {
        logger.error("Error parsing file:", error);
        showAlert("Error parsing file. Please check the format.", "error");
      }
    };

    reader.readAsText(file);
  };

  // Handle bulk import
  const handleBulkImport = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!importPreview?.fullData) {
      showAlert("Please upload a file first", "error");
      return;
    }

    try {
      setLoading(true);

      const mappedData = importPreview.fullData.map((row) => {
        const mappedRow = {};
        Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
          if (sourceField && row[sourceField] !== undefined) {
            mappedRow[targetField] = row[sourceField];
          }
        });

        if (!mappedRow.status) mappedRow.status = "active";
        if (!mappedRow.minStockLevel) mappedRow.minStockLevel = 5;

        return mappedRow;
      });

      const response = await fetch(`${API_BASE_URL}/products/import/csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          csvData: mappedData,
          fieldMapping: fieldMapping,
          fileName: importPreview.fileName,
        }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      showAlert(
        `Successfully imported ${
          result.imported || mappedData.length
        } products!`,
        "success"
      );

      if (onSuccess) {
        onSuccess(result);
      }

      handleClose();
    } catch (error) {
      logger.error("Error importing products:", error);
      showAlert("Error importing products: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle platform URL fetch
  const handlePlatformFetch = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!platformUrl.trim()) {
      showAlert("Please enter a valid product URL", "error");
      return;
    }

    try {
      setLoading(true);

      // First, try to scrape the platform data
      const response = await fetch(`${API_BASE_URL}/products/scrape-platform`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          url: platformUrl,
          platform: detectPlatform(platformUrl),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch platform data");
      }

      const data = await response.json();

      if (data.success && data.data) {
        setPlatformData(data.data);
        showAlert("Platform data fetched successfully!", "success");
      } else {
        throw new Error(data.message || "No data received from platform");
      }
    } catch (error) {
      logger.error("Error fetching platform data:", error);
      showAlert(
        error.message ||
          "Failed to scrape platform data. Please check the URL and try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Detect platform
  const detectPlatform = (url) => {
    if (url.includes("trendyol.com")) return "trendyol";
    if (url.includes("hepsiburada.com")) return "hepsiburada";
    if (url.includes("n11.com")) return "n11";
    return "unknown";
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={handleClose}
    >
      <div
        className="modal-custom"
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          maxWidth: "800px",
          width: "95%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
          position: "relative",
          zIndex: 10000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.5rem 2rem",
            borderBottom: "1px solid #ddd",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>
            Create Product
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0.25rem",
              pointerEvents: "auto",
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ padding: "1rem 2rem 0" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
            {[
              { key: "manual", label: "Manual Entry", icon: "✏️" },
              { key: "import", label: "CSV/JSON Import", icon: "📁" },
              { key: "platform", label: "Platform Copy", icon: "🌐" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab(tab.key);
                }}
                style={{
                  padding: "0.75rem 1rem",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  borderBottom:
                    activeTab === tab.key
                      ? "2px solid #007bff"
                      : "2px solid transparent",
                  color: activeTab === tab.key ? "#007bff" : "#666",
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  pointerEvents: "auto",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ padding: "2rem" }}>
          {activeTab === "manual" && (
            <div>
              <h4 style={{ marginBottom: "1.5rem" }}>Manual Product Entry</h4>
              <form onSubmit={handleManualSubmit}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                      }}
                    >
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder="Enter product name"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: errors.name
                          ? "1px solid red"
                          : "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "1rem",
                      }}
                    />
                    {errors.name && (
                      <div
                        style={{
                          color: "red",
                          fontSize: "0.875rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        {errors.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                      }}
                    >
                      Category *
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        handleInputChange("category", e.target.value)
                      }
                      placeholder="Enter category"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: errors.category
                          ? "1px solid red"
                          : "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "1rem",
                      }}
                    />
                    {errors.category && (
                      <div
                        style={{
                          color: "red",
                          fontSize: "0.875rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        {errors.category}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                      }}
                    >
                      Base Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.basePrice}
                      onChange={(e) =>
                        handleInputChange("basePrice", e.target.value)
                      }
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: errors.basePrice
                          ? "1px solid red"
                          : "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "1rem",
                      }}
                    />
                    {errors.basePrice && (
                      <div
                        style={{
                          color: "red",
                          fontSize: "0.875rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        {errors.basePrice}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                      }}
                    >
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) =>
                        handleInputChange("brand", e.target.value)
                      }
                      placeholder="Enter brand"
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "1rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: 500,
                      }}
                    >
                      Sourcing
                    </label>
                    <select
                      value={formData.sourcing}
                      onChange={(e) =>
                        handleInputChange("sourcing", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "1rem",
                        backgroundColor: "white",
                      }}
                    >
                      <option value="">Select sourcing</option>
                      <option value="local">Local</option>
                      <option value="outsource">Outsource</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    placeholder="Enter product description"
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "1rem",
                      resize: "vertical",
                    }}
                  />
                </div>
              </form>
            </div>
          )}

          {activeTab === "import" && (
            <div>
              <h4 style={{ marginBottom: "1.5rem" }}>
                Import Products from File
              </h4>

              <div
                style={{
                  border: "2px dashed #ddd",
                  borderRadius: "8px",
                  padding: "2rem",
                  textAlign: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📁</div>
                <p style={{ marginBottom: "1rem", color: "#666" }}>
                  Upload a CSV or JSON file containing your product data
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json"
                  style={{ display: "none" }}
                />
                <button
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={loading}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                >
                  {loading ? "Processing..." : "Choose File"}
                </button>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#888",
                    marginTop: "0.5rem",
                  }}
                >
                  Supported formats: CSV, JSON. Maximum file size: 10MB
                </div>
              </div>

              {importPreview && (
                <div
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "1rem",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <strong>Preview: {importPreview.fileName}</strong>
                    <span
                      style={{
                        backgroundColor: "#007bff",
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                      }}
                    >
                      {importPreview.totalRows} products
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: "200px",
                      overflow: "auto",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "white",
                    }}
                  >
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          {importPreview.headers.slice(0, 4).map((header) => (
                            <th
                              key={header}
                              style={{
                                padding: "0.5rem",
                                borderBottom: "1px solid #ddd",
                                textAlign: "left",
                                fontSize: "0.875rem",
                              }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.data.slice(0, 3).map((row, index) => (
                          <tr key={index}>
                            {importPreview.headers.slice(0, 4).map((header) => (
                              <td
                                key={header}
                                style={{
                                  padding: "0.5rem",
                                  borderBottom: "1px solid #eee",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {String(row[header] || "").substring(0, 30)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "platform" && (
            <div>
              <h4 style={{ marginBottom: "1.5rem" }}>
                Copy Product from Platform
              </h4>

              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌐</div>
                <p style={{ color: "#666", marginBottom: "1rem" }}>
                  Enter a product URL from supported platforms to automatically
                  import product data
                </p>
                <div
                  style={{
                    color: "#666",
                    fontSize: "0.875rem",
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
                  }}
                >
                  <strong>🎯 Supported Platforms:</strong> Trendyol,
                  Hepsiburada, N11, GittiGidiyor, Amazon, and generic e-commerce
                  sites
                  <br />
                  <strong>📊 Enhanced Data:</strong> Platform-specific extras,
                  seller info, delivery details, and more
                  <br />
                  <strong>🚀 Real Scraping:</strong> No mock data - all product
                  information is scraped in real-time
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 500,
                  }}
                >
                  Product URL
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="url"
                    value={platformUrl}
                    onChange={(e) => setPlatformUrl(e.target.value)}
                    placeholder="https://www.trendyol.com/product/..."
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "1rem",
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handlePlatformFetch}
                    disabled={loading || !platformUrl.trim()}
                    style={{
                      pointerEvents: "auto",
                      cursor: "pointer",
                      padding: "0.5rem 1rem",
                    }}
                  >
                    {loading ? "..." : "🔍"}
                  </button>
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#888",
                    marginTop: "0.5rem",
                  }}
                >
                  Supported platforms: Trendyol, Hepsiburada, N11 (Coming Soon)
                </div>
              </div>

              {platformData && (
                <div
                  style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "1rem",
                  }}
                >
                  <strong>✅ Scraped Product Data:</strong>
                  <div style={{ marginTop: "0.5rem" }}>
                    <div className="row">
                      <div className="col-md-6">
                        <p>
                          <strong>Name:</strong> {platformData.name}
                        </p>
                        <p>
                          <strong>Price:</strong> {platformData.basePrice}{" "}
                          {platformData.currency || "TRY"}
                        </p>
                        <p>
                          <strong>Brand:</strong> {platformData.brand || "N/A"}
                        </p>
                        <p>
                          <strong>Platform:</strong> {platformData.platform}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p>
                          <strong>Category:</strong>{" "}
                          {platformData.category || "N/A"}
                        </p>
                        <p>
                          <strong>Availability:</strong>{" "}
                          {platformData.availability || "Unknown"}
                        </p>
                        <p>
                          <strong>Scraped:</strong>{" "}
                          {platformData.scrapedAt
                            ? new Date(platformData.scrapedAt).toLocaleString()
                            : "N/A"}
                        </p>
                        {platformData.platformExtras &&
                          Object.keys(platformData.platformExtras).length >
                            0 && (
                            <p>
                              <strong>Platform Extras:</strong> ✅ Available
                            </p>
                          )}
                      </div>
                    </div>
                    {platformData.images && platformData.images.length > 0 && (
                      <div className="mt-2">
                        <strong>🖼️ Images:</strong> {platformData.images.length}{" "}
                        found
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            marginTop: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {platformData.images.slice(0, 3).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="Product"
                              style={{
                                width: "60px",
                                height: "60px",
                                objectFit: "cover",
                                borderRadius: "4px",
                              }}
                            />
                          ))}
                          {platformData.images.length > 3 && (
                            <div
                              style={{
                                width: "60px",
                                height: "60px",
                                backgroundColor: "#eee",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                              }}
                            >
                              +{platformData.images.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <details style={{ marginTop: "1rem" }}>
                      <summary
                        style={{ cursor: "pointer", fontWeight: "bold" }}
                      >
                        🔍 View Raw Data
                      </summary>
                      <pre
                        style={{
                          fontSize: "0.75rem",
                          maxHeight: "200px",
                          overflow: "auto",
                          marginTop: "0.5rem",
                          backgroundColor: "white",
                          padding: "1rem",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      >
                        {JSON.stringify(platformData, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}

              <div
                style={{
                  backgroundColor: "#d1ecf1",
                  border: "1px solid #bee5eb",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginTop: "1rem",
                }}
              >
                <strong>Note:</strong> Platform data scraping is in development.
                Currently supports basic product information extraction.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #ddd",
            padding: "1.5rem 2rem",
            display: "flex",
            justifyContent: "flex-end",
            gap: "1rem",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
            style={{ pointerEvents: "auto", cursor: "pointer" }}
          >
            Cancel
          </button>

          {activeTab === "manual" && (
            <button
              className="btn btn-primary"
              onClick={handleManualSubmit}
              disabled={loading}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
            >
              {loading ? "Creating..." : "Create Product"}
            </button>
          )}

          {activeTab === "import" && importPreview && (
            <button
              className="btn btn-success"
              onClick={handleBulkImport}
              disabled={loading}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
            >
              {loading
                ? "Importing..."
                : `Import ${importPreview.totalRows} Products`}
            </button>
          )}

          {activeTab === "platform" && platformData && (
            <>
              <button
                className="btn btn-success"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  try {
                    setLoading(true);

                    // Use the new scrape-and-import endpoint for direct import
                    const response = await fetch(
                      `${API_BASE_URL}/products/scrape-and-import`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${localStorage.getItem(
                            "token"
                          )}`,
                        },
                        body: JSON.stringify({
                          url: platformUrl,
                          platform: detectPlatform(platformUrl),
                        }),
                      }
                    );

                    if (!response.ok) {
                      throw new Error("Failed to import product directly");
                    }

                    const data = await response.json();

                    if (data.success && data.data.product) {
                      showAlert(
                        `Product "${data.data.product.name}" imported successfully!`,
                        "success"
                      );
                      onSuccess?.(data.data.product);
                      handleClose();
                    } else {
                      throw new Error(data.message || "Import failed");
                    }
                  } catch (error) {
                    logger.error("Error importing product directly:", error);
                    showAlert(
                      error.message || "Failed to import product directly",
                      "error"
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                style={{ pointerEvents: "auto", cursor: "pointer" }}
              >
                {loading ? "Importing..." : "🚀 Import Directly"}
              </button>

              <button
                className="btn btn-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Convert platform data to manual form and switch tabs
                  setFormData((prev) => ({
                    ...prev,
                    name: platformData.name || "",
                    description: platformData.description || "",
                    basePrice:
                      platformData.price || platformData.basePrice || "",
                    category: platformData.category || "",
                    brand: platformData.brand || "",
                    baseSku: platformData.sku || platformData.baseSku || "",
                  }));
                  setActiveTab("manual");
                  showAlert(
                    "Platform data imported to manual form!",
                    "success"
                  );
                }}
                disabled={loading}
                style={{ pointerEvents: "auto", cursor: "pointer" }}
              >
                📝 Use This Data
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCreationModalFull;
