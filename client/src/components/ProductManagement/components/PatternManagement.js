import logger from "../../../utils/logger";
/**
 * Enhanced Pattern Management Interface
 *
 * Advanced pattern detection interface with:
 * - Real-time pattern suggestions
 * - Background service integration
 * - Custom pattern configuration
 * - Batch variant creation
 * - Pattern analytics and insights
 *
 * @author AI Assistant
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Progress,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui";
import {
  Zap,
  Settings,
  TrendingUp,
  Users,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import EnhancedPatternDetector from "../utils/enhancedPatternDetector.js";
import { getBackgroundService } from "../utils/backgroundVariantService.js";
import CustomPatternConfigurator from "./CustomPatternConfigurator.js";

const PatternManagement = ({
  products = [],
  onCreateVariantGroup,
  onPatternApplied,
  isVisible = false,
}) => {
  const [detector] = useState(() => new EnhancedPatternDetector());
  const [backgroundService] = useState(() => getBackgroundService());

  // State management
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({});
  const [realTimeMode, setRealTimeMode] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("suggestions");
  const [showPreview, setShowPreview] = useState(false);
  const [previewGroup, setPreviewGroup] = useState(null);

  // Memoized calculations
  const totalSuggestions = useMemo(
    () => analysisResults?.suggestions?.length || 0,
    [analysisResults]
  );

  const highConfidenceSuggestions = useMemo(
    () =>
      analysisResults?.suggestions?.filter((s) => s.confidence >= 0.8).length ||
      0,
    [analysisResults]
  );

  const potentialVariants = useMemo(
    () =>
      analysisResults?.suggestions?.reduce(
        (sum, s) => sum + (s.products?.length || 0),
        0
      ) || 0,
    [analysisResults]
  );

  /**
   * Perform pattern analysis
   */
  const performAnalysis = useCallback(async () => {
    if (products.length === 0) return;

    setIsAnalyzing(true);

    try {
      // Use background service for analysis
      const results = await backgroundService.forceAnalysis(products, {
        includeNameSimilarity: true,
        includeCustomPatterns: true,
        confidenceThreshold: 0.6,
      });

      setAnalysisResults(results);
    } catch (error) {
      logger.error("Analysis failed:", error);

      // Fallback to direct analysis
      try {
        const results = await detector.analyzeProducts(products);
        setAnalysisResults(results);
      } catch (fallbackError) {
        logger.error("Fallback analysis failed:", fallbackError);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [products, detector, backgroundService]);

  // Initialize background service listeners
  useEffect(() => {
    const handleServiceEvent = (event, data) => {
      switch (event) {
        case "analysis_complete":
          setAnalysisResults(data.results);
          setIsAnalyzing(false);
          break;
        case "analysis_error":
          logger.error("Background analysis error:", data.error);
          setIsAnalyzing(false);
          break;
        case "service_started":
        case "service_stopped":
          setServiceStatus(backgroundService.getStatus());
          break;
        default:
          break;
      }
    };

    backgroundService.addListener(handleServiceEvent);
    setServiceStatus(backgroundService.getStatus());

    return () => {
      backgroundService.removeListener(handleServiceEvent);
    };
  }, [backgroundService]);

  // Auto-analyze when products change (if real-time mode is enabled)
  useEffect(() => {
    if (realTimeMode && products.length > 0 && isVisible) {
      performAnalysis();
    }
  }, [products, realTimeMode, isVisible, performAnalysis]);

  /**
   * Toggle suggestion selection
   * @param {number} index - Suggestion index
   */
  const toggleSuggestion = (index) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  /**
   * Preview suggestion group
   * @param {Object} suggestion - Suggestion to preview
   */
  const previewSuggestion = (suggestion) => {
    setPreviewGroup(suggestion);
    setShowPreview(true);
  };

  /**
   * Apply selected suggestions
   */
  const applySelectedSuggestions = async () => {
    if (!analysisResults?.suggestions || selectedSuggestions.size === 0) return;

    const suggestions = Array.from(selectedSuggestions).map(
      (index) => analysisResults.suggestions[index]
    );

    try {
      for (const suggestion of suggestions) {
        const groupData = {
          name: suggestion.basePattern || `Pattern Group ${Date.now()}`,
          products: suggestion.products,
          pattern: suggestion,
          type: "intelligent",
          confidence: suggestion.confidence,
        };

        await onCreateVariantGroup?.(groupData);
      }

      // Clear selections
      setSelectedSuggestions(new Set());

      // Notify parent
      onPatternApplied?.(suggestions);

      // Re-analyze after applying
      setTimeout(() => performAnalysis(), 1000);
    } catch (error) {
      logger.error("Failed to apply suggestions:", error);
    }
  };

  /**
   * Toggle background service
   */
  const toggleBackgroundService = () => {
    if (serviceStatus.isRunning) {
      backgroundService.stop();
    } else {
      backgroundService.start();
    }
  };

  /**
   * Toggle real-time mode
   */
  const toggleRealTimeMode = () => {
    setRealTimeMode(!realTimeMode);
    if (!realTimeMode && products.length > 0) {
      performAnalysis();
    }
  };

  /**
   * Export analysis results
   */
  const exportResults = () => {
    if (!analysisResults) return;

    const exportData = detector.exportResults(analysisResults);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pattern-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Get confidence color
   * @param {number} confidence - Confidence score
   * @returns {string} - Color class
   */
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return "text-green-600 bg-green-100";
    if (confidence >= 0.7) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  /**
   * Format confidence percentage
   * @param {number} confidence - Confidence score
   * @returns {string} - Formatted percentage
   */
  const formatConfidence = (confidence) => `${Math.round(confidence * 100)}%`;

  if (!isVisible) return null;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Enhanced Pattern Detection</h2>
              <p className="text-sm text-gray-600">
                Advanced variant pattern detection with AI-powered suggestions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRealTimeMode}
                className={realTimeMode ? "bg-blue-50 border-blue-300" : ""}
              >
                <Zap className="h-4 w-4 mr-2" />
                Real-time {realTimeMode ? "ON" : "OFF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfigurator(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button
                onClick={performAnalysis}
                disabled={isAnalyzing || products.length === 0}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`}
                />
                {isAnalyzing ? "Analyzing..." : "Analyze Patterns"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Dashboard */}
      {analysisResults && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{totalSuggestions}</div>
                  <div className="text-sm text-gray-600">Total Suggestions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {highConfidenceSuggestions}
                  </div>
                  <div className="text-sm text-gray-600">High Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{potentialVariants}</div>
                  <div className="text-sm text-gray-600">
                    Potential Variants
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {formatConfidence(
                      analysisResults.confidence?.averageConfidence || 0
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Avg Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="suggestions">
                Suggestions ({totalSuggestions})
              </TabsTrigger>
              <TabsTrigger value="insights">Pattern Insights</TabsTrigger>
              <TabsTrigger value="service">Background Service</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="suggestions" className="space-y-4">
              {isAnalyzing ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                  <p>Analyzing patterns...</p>
                  <Progress value={50} className="w-64 mx-auto mt-2" />
                </div>
              ) : analysisResults?.suggestions?.length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">
                      Pattern Suggestions
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportResults}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        onClick={applySelectedSuggestions}
                        disabled={selectedSuggestions.size === 0}
                        className="flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Apply Selected ({selectedSuggestions.size})
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {analysisResults.suggestions.map((suggestion, index) => (
                      <Card
                        key={index}
                        className="border-l-4 border-l-blue-500"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <input
                                  type="checkbox"
                                  checked={selectedSuggestions.has(index)}
                                  onChange={() => toggleSuggestion(index)}
                                  className="rounded"
                                />
                                <h4 className="font-semibold">
                                  {suggestion.basePattern ||
                                    `Pattern ${index + 1}`}
                                </h4>
                                <Badge
                                  className={getConfidenceColor(
                                    suggestion.confidence
                                  )}
                                >
                                  {formatConfidence(suggestion.confidence)}
                                </Badge>
                                <Badge variant="outline">
                                  {suggestion.type?.replace("_", " ") ||
                                    "Unknown"}
                                </Badge>
                              </div>

                              <p className="text-sm text-gray-600 mb-2">
                                {suggestion.reason}
                              </p>

                              <div className="text-sm">
                                <strong>Products:</strong>{" "}
                                {suggestion.products?.length || 0}
                                {suggestion.products
                                  ?.slice(0, 3)
                                  .map((product) => (
                                    <span
                                      key={product.id}
                                      className="ml-2 text-gray-600"
                                    >
                                      {product.sku}
                                    </span>
                                  ))}
                                {suggestion.products?.length > 3 && (
                                  <span className="ml-2 text-gray-500">
                                    +{suggestion.products.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => previewSuggestion(suggestion)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Patterns Detected
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting the analysis settings or add custom patterns
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {analysisResults?.patternInsights ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pattern Insights</h3>
                  {analysisResults.patternInsights.map((insight, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">{insight.type}</h4>
                            <p className="text-sm text-gray-600">
                              {insight.count} patterns detected
                            </p>
                          </div>
                          {insight.confidence && (
                            <Badge
                              className={getConfidenceColor(insight.confidence)}
                            >
                              {formatConfidence(insight.confidence)}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Run analysis to see pattern insights
                </div>
              )}
            </TabsContent>

            <TabsContent value="service" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Background Service</h3>
                <Button
                  onClick={toggleBackgroundService}
                  variant={serviceStatus.isRunning ? "destructive" : "default"}
                  className="flex items-center gap-2"
                >
                  {serviceStatus.isRunning ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {serviceStatus.isRunning ? "Stop Service" : "Start Service"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Service Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge
                          variant={
                            serviceStatus.isRunning ? "default" : "secondary"
                          }
                        >
                          {serviceStatus.isRunning ? "Running" : "Stopped"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Queue Length:</span>
                        <span>{serviceStatus.queueLength || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Size:</span>
                        <span>{serviceStatus.cacheSize || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Analyses:</span>
                        <span>
                          {serviceStatus.statistics?.totalAnalyses || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Hits:</span>
                        <span>{serviceStatus.statistics?.cacheHits || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Analysis:</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {serviceStatus.lastAnalysis
                            ? new Date(
                                serviceStatus.lastAnalysis
                              ).toLocaleTimeString()
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {analysisResults?.confidence ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Analysis Analytics</h3>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-4">
                        Confidence Distribution
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>High Confidence (≥80%)</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (analysisResults.confidence.distribution
                                      .high /
                                      totalSuggestions) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-sm w-8">
                              {analysisResults.confidence.distribution.high}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span>Medium Confidence (60-80%)</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (analysisResults.confidence.distribution
                                      .medium /
                                      totalSuggestions) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-sm w-8">
                              {analysisResults.confidence.distribution.medium}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span>Low Confidence (≤60%)</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (analysisResults.confidence.distribution
                                      .low /
                                      totalSuggestions) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-sm w-8">
                              {analysisResults.confidence.distribution.low}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Run analysis to see analytics
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Custom Pattern Configurator */}
      <CustomPatternConfigurator
        isOpen={showConfigurator}
        onClose={() => setShowConfigurator(false)}
        onPatternSaved={() => {
          // Re-analyze with new patterns
          performAnalysis();
        }}
        testProducts={products.slice(0, 10)} // Provide sample products for testing
      />

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pattern Preview</DialogTitle>
          </DialogHeader>
          {previewGroup && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {previewGroup.basePattern}
                </h3>
                <Badge className={getConfidenceColor(previewGroup.confidence)}>
                  {formatConfidence(previewGroup.confidence)}
                </Badge>
              </div>

              <p className="text-gray-600">{previewGroup.reason}</p>

              <div className="space-y-2">
                <h4 className="font-semibold">Products in this group:</h4>
                {previewGroup.products?.map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-sm text-gray-600">{product.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${product.price}</div>
                      <div className="text-sm text-gray-600">
                        Stock: {product.stockQuantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatternManagement;
