import React, { useState } from "react";
import { Loader2, DollarSign, Package, Globe } from "lucide-react";
import { Button, Badge } from "../../ui";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";

const BulkOperationsComponent = ({
  selectedVariants = [],
  onSelectionChange,
  onOperationComplete,
  availablePlatforms = [],
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationProgress, setOperationProgress] = useState(null);
  const { showAlert } = useAlert();

  // Bulk operation types
  const operations = [
    {
      id: "publish",
      label: "Bulk Publish",
      icon: Globe,
      description: "Publish selected variants to platforms",
      requiresPlatforms: true,
    },
    {
      id: "updatePrices",
      label: "Update Prices",
      icon: DollarSign,
      description: "Update prices for selected variants",
      requiresValue: true,
      valueLabel: "New Price",
      valueType: "number",
    },
    {
      id: "updateStock",
      label: "Update Stock",
      icon: Package,
      description: "Update stock for selected variants",
      requiresValue: true,
      valueLabel: "New Stock Quantity",
      valueType: "number",
    },
  ];

  const [selectedOperation, setSelectedOperation] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [operationValue, setOperationValue] = useState("");

  const handleSelectAll = () => {
    // This would typically come from the parent component
    // For now, just toggle current selection
    if (selectedVariants.length > 0) {
      onSelectionChange([]);
    }
  };

  const executeBulkOperation = async () => {
    if (!selectedOperation || selectedVariants.length === 0) {
      showAlert("Please select an operation and variants", "error");
      return;
    }

    const operation = operations.find((op) => op.id === selectedOperation);

    // Validate requirements
    if (operation.requiresPlatforms && selectedPlatforms.length === 0) {
      showAlert("Please select at least one platform", "error");
      return;
    }

    if (operation.requiresValue && !operationValue) {
      showAlert(
        `Please enter a ${operation.valueLabel.toLowerCase()}`,
        "error"
      );
      return;
    }

    setIsProcessing(true);
    setOperationProgress({
      total: selectedVariants.length,
      completed: 0,
      status: "processing",
    });

    try {
      let endpoint = "";
      let payload = {};

      switch (selectedOperation) {
        case "publish":
          endpoint = `${API_BASE_URL}/products/bulk/publish`;
          payload = {
            variantIds: selectedVariants.map((v) => v.id),
            platforms: selectedPlatforms,
          };
          break;

        case "updatePrices":
          endpoint = `${API_BASE_URL}/products/bulk/update-prices`;
          payload = {
            updates: selectedVariants.map((v) => ({
              variantId: v.id,
              price: parseFloat(operationValue),
            })),
          };
          break;

        case "updateStock":
          endpoint = `${API_BASE_URL}/products/bulk/update-stock`;
          payload = {
            updates: selectedVariants.map((v) => ({
              mainProductId: v.mainProductId,
              quantity: parseInt(operationValue),
            })),
          };
          break;

        default:
          throw new Error("Unknown operation");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setOperationProgress({
          total: selectedVariants.length,
          completed: selectedVariants.length,
          status: "completed",
        });

        showAlert(
          `${operation.label} completed successfully for ${selectedVariants.length} variants`,
          "success"
        );

        // Clear selections and reset form
        onSelectionChange([]);
        setSelectedOperation("");
        setSelectedPlatforms([]);
        setOperationValue("");

        // Notify parent component
        if (onOperationComplete) {
          onOperationComplete(result);
        }
      } else {
        throw new Error(result.error || "Operation failed");
      }
    } catch (error) {
      console.error("Bulk operation error:", error);
      setOperationProgress({
        total: selectedVariants.length,
        completed: 0,
        status: "error",
        error: error.message,
      });
      showAlert(`${operation.label} failed: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);

      // Clear progress after 3 seconds
      setTimeout(() => {
        setOperationProgress(null);
      }, 3000);
    }
  };

  const selectedOperation_ = operations.find(
    (op) => op.id === selectedOperation
  );

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Bulk Operations</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {selectedVariants.length} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs"
          >
            {selectedVariants.length > 0 ? "Clear All" : "Select All"}
          </Button>
        </div>
      </div>

      {selectedVariants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Select variants to perform bulk operations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Operation Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Operation
            </label>
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose an operation...</option>
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label} - {op.description}
                </option>
              ))}
            </select>
          </div>

          {/* Operation-specific inputs */}
          {selectedOperation_ && (
            <div className="space-y-4">
              {/* Platform selection for publish operation */}
              {selectedOperation_.requiresPlatforms && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Platforms
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availablePlatforms.map((platform) => (
                      <label
                        key={platform.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms([
                                ...selectedPlatforms,
                                platform.id,
                              ]);
                            } else {
                              setSelectedPlatforms(
                                selectedPlatforms.filter(
                                  (p) => p !== platform.id
                                )
                              );
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{platform.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Value input for price/stock operations */}
              {selectedOperation_.requiresValue && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedOperation_.valueLabel}
                  </label>
                  <input
                    type={selectedOperation_.valueType}
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    placeholder={`Enter ${selectedOperation_.valueLabel.toLowerCase()}`}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Execute button */}
              <Button
                onClick={executeBulkOperation}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <selectedOperation_.icon className="w-4 h-4 mr-2" />
                    Execute {selectedOperation_.label}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Progress indicator */}
          {operationProgress && (
            <div
              className={`p-3 rounded-lg ${
                operationProgress.status === "processing"
                  ? "bg-blue-50 border-blue-200"
                  : operationProgress.status === "completed"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              } border`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${
                    operationProgress.status === "processing"
                      ? "text-blue-800"
                      : operationProgress.status === "completed"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {operationProgress.status === "processing" && "Processing..."}
                  {operationProgress.status === "completed" && "Completed!"}
                  {operationProgress.status === "error" && "Error occurred"}
                </span>
                <span
                  className={`text-sm ${
                    operationProgress.status === "processing"
                      ? "text-blue-600"
                      : operationProgress.status === "completed"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {operationProgress.completed}/{operationProgress.total}
                </span>
              </div>
              {operationProgress.status === "error" &&
                operationProgress.error && (
                  <p className="text-red-600 text-sm mt-1">
                    {operationProgress.error}
                  </p>
                )}
            </div>
          )}

          {/* Selected variants preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Selected Variants ({selectedVariants.length})
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedVariants.slice(0, 5).map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                >
                  <span>
                    {variant.platform} - {variant.platformSku}
                  </span>
                  <Badge variant="secondary" size="sm">
                    {variant.status}
                  </Badge>
                </div>
              ))}
              {selectedVariants.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  ... and {selectedVariants.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperationsComponent;
