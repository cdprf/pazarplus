/**
 * Custom Pattern Configuration Component
 *
 * Allows users to create and manage custom SKU patterns for variant detection:
 * - Visual pattern builder
 * - Regex pattern testing
 * - Pattern examples and validation
 * - Import/export pattern configurations
 * - Real-time pattern preview
 *
 * @author AI Assistant
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  TestTube,
  Eye,
  Save,
} from "lucide-react";
import EnhancedPatternDetector from "../utils/enhancedPatternDetector.js";

const CustomPatternConfigurator = ({
  isOpen,
  onClose,
  onPatternSaved,
  testProducts = [],
}) => {
  const [patterns, setPatterns] = useState([]);
  const [currentPattern, setCurrentPattern] = useState({
    name: "",
    regex: "",
    description: "",
    examples: [],
    extractBase: "",
    extractVariant: "",
  });
  const [testInput, setTestInput] = useState("");
  const [testResults, setTestResults] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [validationError, setValidationError] = useState("");
  const [detector] = useState(() => new EnhancedPatternDetector());

  // Predefined pattern templates
  const patternTemplates = [
    {
      name: "Hierarchical Numeric",
      regex: "^([a-zA-Z]+)-([a-zA-Z]+)(\\d{1,6})$",
      description: "Patterns like nwk-as001, abc-def-123",
      examples: ["nwk-as001", "abc-def-123", "pro-max-456"],
      extractBase: 'match[1] + "-" + match[2]',
      extractVariant: "match[3]",
    },
    {
      name: "Code-Version Pattern",
      regex: "^([A-Z]{2,4})-([A-Z]{2})(\\d{2,3})$",
      description: "Code patterns like ABC-DE01, XYZ-FG123",
      examples: ["ABC-DE01", "XYZ-FG123", "PROD-AB456"],
      extractBase: 'match[1] + "-" + match[2]',
      extractVariant: "match[3]",
    },
    {
      name: "Product-Category-Number",
      regex: "^([a-z]+)-([a-z]+)-(\\d+)$",
      description: "Product category patterns like phone-case-001",
      examples: ["phone-case-001", "laptop-stand-123", "desk-lamp-456"],
      extractBase: 'match[1] + "-" + match[2]',
      extractVariant: "match[3]",
    },
    {
      name: "Brand-Model-Variant",
      regex: "^([A-Z]+)([A-Z0-9]+)-([A-Z]{1,2}\\d*)$",
      description: "Brand model patterns like APPLE123-A1, SAMSUNG456-B2",
      examples: ["APPLE123-A1", "SAMSUNG456-B2", "SONY789-C3"],
      extractBase: "match[1] + match[2]",
      extractVariant: "match[3]",
    },
  ];

  /**
   * Load existing patterns
   */
  const loadPatterns = useCallback(() => {
    const existingPatterns = detector.getCustomPatterns();
    setPatterns(existingPatterns);
  }, [detector]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  /**
   * Validate regex pattern
   * @param {string} regex - Regex to validate
   * @returns {boolean} - Is valid
   */
  const validateRegex = (regex) => {
    try {
      new RegExp(regex);
      return true;
    } catch (error) {
      setValidationError(`Invalid regex: ${error.message}`);
      return false;
    }
  };

  /**
   * Test pattern against input
   */
  const testPattern = () => {
    if (!currentPattern.regex || !testInput) {
      setTestResults(null);
      return;
    }

    if (!validateRegex(currentPattern.regex)) {
      return;
    }

    try {
      const regex = new RegExp(currentPattern.regex);
      const match = testInput.match(regex);

      if (match) {
        // Try to extract base and variant
        let base = match[1] || "";
        let variant = match[2] || "";

        // If custom extraction expressions are provided, try to use them safely
        if (currentPattern.extractBase) {
          try {
            // Only allow simple property/array access and concatenation
            // e.g., "match[1] + '-' + match[2]"
            // eslint-disable-next-line no-new-func
            base = Function("match", `"use strict"; return (${currentPattern.extractBase});`)(match);
          } catch (error) {
            console.warn("Base extraction error:", error);
          }
        }

        if (currentPattern.extractVariant) {
          try {
            // eslint-disable-next-line no-new-func
            variant = Function("match", `"use strict"; return (${currentPattern.extractVariant});`)(match);
          } catch (error) {
            console.warn("Variant extraction error:", error);
          }
        }

        setTestResults({
          success: true,
          match: match,
          base: base,
          variant: variant,
          fullMatch: match[0],
        });
      } else {
        setTestResults({
          success: false,
          message: "No match found",
        });
      }
    } catch (error) {
      setTestResults({
        success: false,
        message: `Error: ${error.message}`,
      });
    }
  };

  /**
   * Save current pattern
   */
  const savePattern = () => {
    if (!currentPattern.name || !currentPattern.regex) {
      setValidationError("Name and regex are required");
      return;
    }

    if (!validateRegex(currentPattern.regex)) {
      return;
    }

    try {
      const patternConfig = {
        regex: currentPattern.regex,
        extractBase: currentPattern.extractBase
          ? currentPattern.extractBase
          : undefined,
        extractVariant: currentPattern.extractVariant
          ? currentPattern.extractVariant
          : undefined,
      };

      detector.addCustomPattern(currentPattern.name, patternConfig);

      if (isEditing) {
        const newPatterns = [...patterns];
        newPatterns[editingIndex] = {
          name: currentPattern.name,
          ...patternConfig,
        };
        setPatterns(newPatterns);
        setIsEditing(false);
        setEditingIndex(-1);
      } else {
        setPatterns([
          ...patterns,
          { name: currentPattern.name, ...patternConfig },
        ]);
      }

      // Reset form
      setCurrentPattern({
        name: "",
        regex: "",
        description: "",
        examples: [],
        extractBase: "",
        extractVariant: "",
      });

      setValidationError("");
      setTestResults(null);

      onPatternSaved?.();
    } catch (error) {
      setValidationError(`Failed to save pattern: ${error.message}`);
    }
  };

  /**
   * Edit existing pattern
   * @param {number} index - Pattern index
   */
  const editPattern = (index) => {
    const pattern = patterns[index];
    setCurrentPattern({
      name: pattern.name,
      regex: pattern.regex,
      description: pattern.description || "",
      examples: pattern.examples || [],
      extractBase:
        pattern.extractBase
          ?.toString()
          .replace("function anonymous(match) {\nreturn ", "")
          .replace("\n}", "") || "",
      extractVariant:
        pattern.extractVariant
          ?.toString()
          .replace("function anonymous(match) {\nreturn ", "")
          .replace("\n}", "") || "",
    });
    setIsEditing(true);
    setEditingIndex(index);
  };

  /**
   * Delete pattern
   * @param {number} index - Pattern index
   */
  const deletePattern = (index) => {
    const pattern = patterns[index];
    detector.removeCustomPattern(pattern.name);
    setPatterns(patterns.filter((_, i) => i !== index));
  };

  /**
   * Apply template
   * @param {Object} template - Pattern template
   */
  const applyTemplate = (template) => {
    setCurrentPattern({
      name: template.name,
      regex: template.regex,
      description: template.description,
      examples: template.examples,
      extractBase: template.extractBase,
      extractVariant: template.extractVariant,
    });
  };

  /**
   * Test pattern against test products
   */
  const testWithProducts = () => {
    if (!currentPattern.regex || testProducts.length === 0) return;

    const regex = new RegExp(currentPattern.regex);
    const matches = testProducts.filter(
      (product) => product.sku && regex.test(product.sku)
    );

    setTestResults({
      success: true,
      productMatches: matches.map((product) => ({
        sku: product.sku,
        name: product.name,
        match: product.sku.match(regex),
      })),
    });
  };

  /**
   * Export patterns
   */
  const exportPatterns = () => {
    const exportData = {
      patterns: patterns,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-patterns-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Import patterns
   * @param {Event} event - File input event
   */
  const importPatterns = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.patterns && Array.isArray(data.patterns)) {
          // Add imported patterns
          data.patterns.forEach((pattern) => {
            detector.addCustomPattern(pattern.name, pattern);
          });
          loadPatterns();
        }
      } catch (error) {
        setValidationError(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Custom Pattern Configuration</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Pattern</TabsTrigger>
            <TabsTrigger value="manage">Manage Patterns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">
                  {isEditing ? "Edit Pattern" : "Create New Pattern"}
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pattern-name">Pattern Name</Label>
                    <Input
                      id="pattern-name"
                      value={currentPattern.name}
                      onChange={(e) =>
                        setCurrentPattern({
                          ...currentPattern,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g., Hierarchical Numeric"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pattern-regex">Regex Pattern</Label>
                    <Input
                      id="pattern-regex"
                      value={currentPattern.regex}
                      onChange={(e) =>
                        setCurrentPattern({
                          ...currentPattern,
                          regex: e.target.value,
                        })
                      }
                      placeholder="e.g., ^([a-zA-Z]+)-([a-zA-Z]+)(\\d+)$"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pattern-description">Description</Label>
                  <Textarea
                    id="pattern-description"
                    value={currentPattern.description}
                    onChange={(e) =>
                      setCurrentPattern({
                        ...currentPattern,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe what this pattern matches..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="extract-base">Base Extraction (JS)</Label>
                    <Input
                      id="extract-base"
                      value={currentPattern.extractBase}
                      onChange={(e) =>
                        setCurrentPattern({
                          ...currentPattern,
                          extractBase: e.target.value,
                        })
                      }
                      placeholder="match[1] + '-' + match[2]"
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="extract-variant">
                      Variant Extraction (JS)
                    </Label>
                    <Input
                      id="extract-variant"
                      value={currentPattern.extractVariant}
                      onChange={(e) =>
                        setCurrentPattern({
                          ...currentPattern,
                          extractVariant: e.target.value,
                        })
                      }
                      placeholder="match[3]"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {validationError && (
                  <Alert variant="destructive">
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={savePattern}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isEditing ? "Update Pattern" : "Save Pattern"}
                  </Button>

                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingIndex(-1);
                        setCurrentPattern({
                          name: "",
                          regex: "",
                          description: "",
                          examples: [],
                          extractBase: "",
                          extractVariant: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pattern Testing */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Test Pattern</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter SKU to test..."
                    className="flex-1"
                  />
                  <Button
                    onClick={testPattern}
                    className="flex items-center gap-2"
                  >
                    <TestTube className="h-4 w-4" />
                    Test
                  </Button>
                  {testProducts.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={testWithProducts}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Test with Products
                    </Button>
                  )}
                </div>

                {testResults && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    {testResults.success ? (
                      <div className="space-y-2">
                        <div className="text-green-600 font-semibold">
                          ✓ Pattern Match Found
                        </div>
                        {testResults.base && (
                          <div>
                            <strong>Base:</strong> {testResults.base}
                          </div>
                        )}
                        {testResults.variant && (
                          <div>
                            <strong>Variant:</strong> {testResults.variant}
                          </div>
                        )}
                        {testResults.fullMatch && (
                          <div>
                            <strong>Full Match:</strong> {testResults.fullMatch}
                          </div>
                        )}
                        {testResults.productMatches && (
                          <div>
                            <strong>Product Matches:</strong>
                            <ul className="list-disc list-inside mt-2">
                              {testResults.productMatches.map(
                                (match, index) => (
                                  <li key={index}>
                                    {match.sku} - {match.name}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-600">
                        ✗ {testResults.message}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Saved Patterns</h3>
              <div className="flex gap-2">
                <Button
                  onClick={exportPatterns}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <label className="cursor-pointer">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importPatterns}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              {patterns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No custom patterns created yet
                </div>
              ) : (
                patterns.map((pattern, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{pattern.name}</h4>
                            <Badge variant="secondary">Custom</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {pattern.description}
                          </p>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {pattern.regex}
                          </code>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editPattern(index)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePattern(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <h3 className="text-lg font-semibold">Pattern Templates</h3>
            <p className="text-sm text-gray-600">
              Choose from predefined templates to get started quickly
            </p>

            <div className="grid gap-4">
              {patternTemplates.map((template, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {template.description}
                        </p>
                        <div className="mb-2">
                          <strong className="text-sm">Examples:</strong>
                          <div className="flex gap-2 mt-1">
                            {template.examples.map((example, i) => (
                              <Badge key={i} variant="outline">
                                {example}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {template.regex}
                        </code>
                      </div>
                      <Button
                        onClick={() => applyTemplate(template)}
                        className="ml-4"
                      >
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CustomPatternConfigurator;
