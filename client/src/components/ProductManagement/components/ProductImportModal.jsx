import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Modal,
  Button,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  LoadingSpinner,
} from "../../ui";
import { Upload, AlertTriangle, CheckCircle, Info } from "lucide-react";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";

const ProductImportModal = ({ show, onHide, onSuccess, showAlert }) => {
  // State management
  const [activeTab, setActiveTab] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [importOptions, setImportOptions] = useState({
    classificationMode: "manual",
    variantGrouping: "name",
    createMissing: true,
    updateExisting: false,
    dryRun: false,
  });
  const [availableOptions, setAvailableOptions] = useState(null);
  const [importProgress, setImportProgress] = useState(null); // eslint-disable-line no-unused-vars
  const [mainProductMapping, setMainProductMapping] = useState({});

  const fileInputRef = useRef(null);

  // Reset modal state
  const resetModal = useCallback(() => {
    setActiveTab("upload");
    setLoading(false);
    setUploadedFile(null);
    setPreviewData(null);
    setFieldMappings({});
    setValidationResults(null);
    setImportOptions({
      classificationMode: "manual",
      variantGrouping: "name",
      createMissing: true,
      updateExisting: false,
      dryRun: false,
    });
    setImportProgress(null);
    setMainProductMapping({});
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    resetModal();
    onHide();
  }, [resetModal, onHide]);

  // Default import options when API is not available
  const getDefaultImportOptions = () => ({
    platforms: [
      { id: "trendyol", name: "Trendyol", enabled: true },
      { id: "hepsiburada", name: "Hepsiburada", enabled: true },
      { id: "n11", name: "N11", enabled: true },
    ],
    fileTypes: ["csv", "xlsx", "xls"],
    maxFileSize: 10485760, // 10MB
    supportedFields: [
      "name",
      "description",
      "price",
      "stockQuantity",
      "category",
      "brand",
      "sku",
      "barcode",
      "weight",
      "dimensions",
    ],
    validationRules: {
      required: ["name", "price"],
      numeric: ["price", "stockQuantity", "weight"],
      text: ["name", "description", "category", "brand"],
    },
  });

  const fetchImportOptions = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      console.log(
        "🔑 Token being used for import options:",
        token ? "Token exists" : "No token found"
      );

      const response = await fetch(`${API_BASE_URL}/products/import/options`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📡 Import options response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Import options received:", result);
        setAvailableOptions(result.data);
      } else {
        // Fallback to default options if API is not available
        console.warn("Import options API not available, using defaults");
        setAvailableOptions(getDefaultImportOptions());
      }
    } catch (error) {
      console.error("Error fetching import options:", error);
      // Fallback to default options on error
      console.warn("Using default import options due to API error");
      setAvailableOptions(getDefaultImportOptions());
    }
  }, []);

  // Fetch import options on modal open
  useEffect(() => {
    if (show && !availableOptions) {
      fetchImportOptions();
    }
  }, [show, availableOptions, fetchImportOptions]);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const allowedExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      showAlert("Please select a CSV or Excel file", "error");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showAlert("File size must be less than 10MB", "error");
      return;
    }

    setUploadedFile(file);
    await previewFile(file);
  };

  // Preview uploaded file
  const previewFile = async (file) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/products/import/preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to preview file");
      }

      const result = await response.json();
      setPreviewData(result.data);
      setFieldMappings(result.data.mappingSuggestions.mappings || {});
      setActiveTab("mapping");

      showAlert(
        `File uploaded successfully! Found ${result.data.preview.totalRows} rows.`,
        "success"
      );
    } catch (error) {
      console.error("Error previewing file:", error);
      showAlert("Error previewing file: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Update field mapping
  const updateFieldMapping = (targetField, sourceField) => {
    setFieldMappings((prev) => ({
      ...prev,
      [targetField]: sourceField,
    }));
  };

  // Validate mapped data
  const validateData = async () => {
    if (!previewData) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/products/import/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          parsedData: previewData.preview,
          fieldMappings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to validate data");
      }

      const result = await response.json();
      setValidationResults(result.data);
      setActiveTab("validation");
    } catch (error) {
      console.error("Error validating data:", error);
      showAlert("Error validating data: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Perform import
  const performImport = async () => {
    if (!uploadedFile || !validationResults) return;

    try {
      setLoading(true);
      setImportProgress({ current: 0, total: validationResults.totalRows });

      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("fieldMappings", JSON.stringify(fieldMappings));
      formData.append("classificationMode", importOptions.classificationMode);
      formData.append("variantGrouping", importOptions.variantGrouping);
      formData.append("createMissing", importOptions.createMissing);
      formData.append("updateExisting", importOptions.updateExisting);
      formData.append("dryRun", importOptions.dryRun);
      formData.append("mainProductMapping", JSON.stringify(mainProductMapping));

      const response = await fetch(`${API_BASE_URL}/products/import/csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();

      const message = importOptions.dryRun
        ? `Dry run completed. Would create ${result.data.importResult.created} products.`
        : `Import completed! Created ${result.data.importResult.created} products.`;

      showAlert(message, "success");

      if (onSuccess && !importOptions.dryRun) {
        onSuccess(result.data.importResult);
      }

      if (!importOptions.dryRun) {
        handleClose();
      }
    } catch (error) {
      console.error("Error importing products:", error);
      showAlert("Error importing products: " + error.message, "error");
    } finally {
      setLoading(false);
      setImportProgress(null);
    }
  };

  // Download template
  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log(
        "🔑 Token being used for template download:",
        token ? "Token exists" : "No token found"
      );

      const response = await fetch(`${API_BASE_URL}/products/import/template`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📡 Template download response status:", response.status);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "product_import_template.csv";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showAlert("Template downloaded successfully", "success");
      } else {
        console.error("Template download failed with status:", response.status);
        showAlert(`Template download failed (${response.status})`, "error");
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      showAlert("Error downloading template", "error");
    }
  };

  // Always render this div to test if the component is included
  if (!show) {
    return (
      <div style={{ display: "none" }}>
        ProductImportModal component is included but hidden (show={String(show)}
        )
      </div>
    );
  }

  return (
    <Modal
      isOpen={show}
      onClose={handleClose}
      title="Import Products from CSV/Excel"
      size="xl"
    >
      <div className="min-h-[600px] p-0">
        <div className="px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="upload" className="py-3 px-4">
                1. Upload File
              </TabsTrigger>
              <TabsTrigger
                value="mapping"
                disabled={!previewData}
                className="py-3 px-4"
              >
                2. Field Mapping
              </TabsTrigger>
              <TabsTrigger
                value="validation"
                disabled={!validationResults}
                className="py-3 px-4"
              >
                3. Validation
              </TabsTrigger>
              <TabsTrigger
                value="options"
                disabled={!validationResults}
                className="py-3 px-4"
              >
                4. Import Options
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-8">
              <div className="text-center py-16">
                <Upload className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-4">
                  Upload CSV or Excel File
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Upload your product data file to get started. We support CSV
                  and Excel formats.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />

                <div className="flex justify-center gap-4 mb-8">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Processing...
                      </>
                    ) : (
                      "Choose File"
                    )}
                  </Button>

                  <Button variant="outline" onClick={downloadTemplate}>
                    Download Template
                  </Button>
                </div>

                {uploadedFile && (
                  <Alert className="mb-4">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      File uploaded: {uploadedFile.name} (
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </Alert>
                )}

                <Card className="mt-6 text-left">
                  <CardHeader>
                    <h4 className="text-sm font-medium">Supported Formats:</h4>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• CSV files (.csv)</li>
                      <li>• Excel files (.xlsx, .xls)</li>
                      <li>• Maximum file size: 10MB</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="mapping" className="mt-8">
              {previewData && (
                <div>
                  <Alert className="mb-6">
                    <Info className="h-4 w-4" />
                    <span>
                      Map your file columns to product fields. We've suggested
                      mappings based on your column headers.
                    </span>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-lg font-medium mb-6">
                        Field Mapping
                      </h4>
                      <div className="space-y-6">
                        {previewData.supportedFields?.map((field) => (
                          <div key={field.key}>
                            <Label className="text-sm font-medium">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </Label>
                            <Select
                              value={fieldMappings[field.key] || ""}
                              onValueChange={(value) =>
                                updateFieldMapping(field.key, value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="-- Not Mapped --" />
                              </SelectTrigger>
                              <SelectContent>
                                {previewData.preview.headers.map((header) => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-4">Preview Data</h4>
                      <div className="max-h-96 overflow-y-auto border rounded">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {previewData.preview.headers.map((header) => (
                                <th
                                  key={header}
                                  className="px-3 py-2 text-left font-medium"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.preview.sampleRows
                              .slice(0, 5)
                              .map((row, index) => (
                                <tr key={index} className="border-t">
                                  {previewData.preview.headers.map((header) => (
                                    <td key={header} className="px-3 py-2">
                                      {row[header]
                                        ? String(row[header]).substring(0, 50)
                                        : ""}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Showing first 5 rows of {previewData.preview.totalRows}{" "}
                        total rows
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end mt-8 gap-4">
                    <Button
                      onClick={validateData}
                      disabled={
                        loading || Object.keys(fieldMappings).length === 0
                      }
                    >
                      {loading ? "Validating..." : "Validate Data"}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="validation" className="mt-8">
              {validationResults && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="text-center">
                      <CardContent className="pt-8 pb-6">
                        <div className="text-3xl font-bold text-green-600">
                          {validationResults.totalRows}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Total Rows</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="pt-8 pb-6">
                        <div className="text-3xl font-bold text-green-600">
                          {validationResults.validRows}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Valid Rows</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                          {validationResults.invalidRows}
                        </div>
                        <p className="text-xs text-gray-500">Invalid Rows</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center">
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-yellow-600">
                          {validationResults.validData?.filter(
                            (row) => row.warnings?.length > 0
                          ).length || 0}
                        </div>
                        <p className="text-xs text-gray-500">Warnings</p>
                      </CardContent>
                    </Card>
                  </div>

                  {validationResults.hasErrors && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Some rows have validation errors. Review them below or
                        continue to import only valid rows.
                      </span>
                    </Alert>
                  )}

                  <div className="flex justify-end mt-8">
                    <Button
                      onClick={() => setActiveTab("options")}
                      disabled={validationResults.validRows === 0}
                      className="px-6 py-3"
                    >
                      Configure Import Options
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="options" className="mt-8">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Classification Mode
                      </Label>
                      <Select
                        value={importOptions.classificationMode}
                        onValueChange={(value) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            classificationMode: value,
                          }))
                        }
                      >
                        <SelectTrigger className="py-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="automatic">Automatic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Variant Grouping
                      </Label>
                      <Select
                        value={importOptions.variantGrouping}
                        onValueChange={(value) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            variantGrouping: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">By Name</SelectItem>
                          <SelectItem value="sku">By SKU</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="createMissing"
                        checked={importOptions.createMissing}
                        onChange={(e) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            createMissing: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <Label htmlFor="createMissing" className="text-sm">
                        Create missing main products
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="updateExisting"
                        checked={importOptions.updateExisting}
                        onChange={(e) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            updateExisting: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <Label htmlFor="updateExisting" className="text-sm">
                        Update existing products
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="dryRun"
                        checked={importOptions.dryRun}
                        onChange={(e) =>
                          setImportOptions((prev) => ({
                            ...prev,
                            dryRun: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <Label htmlFor="dryRun" className="text-sm">
                        Dry run (test without importing)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("validation")}
                    className="px-6 py-3"
                  >
                    Back to Validation
                  </Button>

                  <Button
                    onClick={performImport}
                    disabled={loading}
                    className={`px-6 py-3 ${
                      importOptions.dryRun
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : ""
                    }`}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {importOptions.dryRun
                          ? "Running Test..."
                          : "Importing..."}
                      </>
                    ) : importOptions.dryRun ? (
                      "Run Test Import"
                    ) : (
                      "Import Products"
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Modal>
  );
};

export default ProductImportModal;
