import logger from "../../../utils/logger.js";
/**
 * Pattern Management Interface
 *
 * A comprehensive interface for managing product variant patterns with:
 * - Analysis dashboard showing statistics and detected patterns
 * - Interactive suggestion review with accept/reject functionality
 * - Custom rule editor for user-defined patterns
 * - Batch operations for applying multiple patterns
 * - Preview mode for grouping results
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Tab,
  Tabs,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Badge,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Snackbar,
} from "@mui/material";
import {
  Analytics,
  TrendingUp,
  Settings,
  Preview,
  CheckCircle,
  Edit,
  Add,
  PlayArrow,
  Visibility,
  ExpandMore,
  Info,
  AutoAwesome,
  GroupWork,
  Speed,
} from "@mui/icons-material";
import IntelligentPatternDetector from "../utils/intelligentPatternDetector";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function PatternManagementInterface({ products = [], onPatternsApplied }) {
  const [tabValue, setTabValue] = useState(0);
  const [detector] = useState(() => new IntelligentPatternDetector());
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPatterns, setSelectedPatterns] = useState(new Set());
  const [previewMode, setPreviewMode] = useState(false);
  const [previewResults, setPreviewResults] = useState(null);
  const [customRuleDialog, setCustomRuleDialog] = useState(false);
  const [patternDetailsDialog, setPatternDetailsDialog] = useState(false);
  const [selectedPatternDetails, setSelectedPatternDetails] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [settings, setSettings] = useState({
    minConfidence: 70,
    minGroupSize: 2,
    maxPatternLength: 4,
    enableAutoDetection: true,
    enableSmartExclusions: true,
  });

  // Custom rule state
  const [customRule, setCustomRule] = useState({
    name: "",
    pattern: "",
    separator: "-",
    variantType: "generic",
    priority: "medium",
  });

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Run initial analysis when products change
  useEffect(() => {
    const runInitialAnalysis = async () => {
      if (products.length > 0) {
        logger.info(
          "DEBUG: Starting initial analysis with",
          products.length,
          "products"
        );
        setLoading(true);
        try {
          const options = {
            minConfidence: settings.minConfidence,
            minGroupSize: settings.minGroupSize,
            maxPatternLength: settings.maxPatternLength,
            enableSmartExclusions: settings.enableSmartExclusions,
          };
          logger.info("DEBUG: Analysis options:", options);

          const result = await detector.analyzeProducts(products, options);
          logger.info("DEBUG: Analysis result:", result);
          setAnalysis(result);
          showSnackbar("Analysis completed successfully", "success");
        } catch (error) {
          logger.error("Pattern analysis failed:", error);
          showSnackbar("Analysis failed: " + error.message, "error");
        } finally {
          setLoading(false);
        }
      } else {
        logger.info("DEBUG: No products available for analysis");
      }
    };

    runInitialAnalysis();
  }, [
    products,
    settings.minConfidence,
    settings.minGroupSize,
    settings.maxPatternLength,
    settings.enableSmartExclusions,
    detector,
  ]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const options = {
        minConfidence: settings.minConfidence,
        minGroupSize: settings.minGroupSize,
        maxPatternLength: settings.maxPatternLength,
        enableSmartExclusions: settings.enableSmartExclusions,
      };

      const result = await detector.analyzeProducts(products, options);
      setAnalysis(result);
      showSnackbar("Analysis completed successfully", "success");
    } catch (error) {
      logger.error("Pattern analysis failed:", error);
      showSnackbar("Analysis failed: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handlePatternSelect = (patternId, selected) => {
    const newSelected = new Set(selectedPatterns);
    if (selected) {
      newSelected.add(patternId);
    } else {
      newSelected.delete(patternId);
    }
    setSelectedPatterns(newSelected);
  };

  const handleSelectAll = () => {
    if (!analysis) return;
    const patterns = Array.isArray(analysis?.suggestions)
      ? analysis.suggestions
      : Array.isArray(analysis?.detectedPatterns)
      ? analysis.detectedPatterns
      : [];
    const allPatternIds = patterns.map((p) => p.id);
    setSelectedPatterns(new Set(allPatternIds));
  };

  const handleDeselectAll = () => {
    setSelectedPatterns(new Set());
  };

  const handlePreview = async () => {
    if (selectedPatterns.size === 0) {
      showSnackbar("Please select patterns to preview", "warning");
      return;
    }

    setPreviewMode(true);
    try {
      const patterns = Array.isArray(analysis?.suggestions)
        ? analysis.suggestions
        : Array.isArray(analysis?.detectedPatterns)
        ? analysis.detectedPatterns
        : [];
      const selectedPatternData = patterns.filter((p) =>
        selectedPatterns.has(p.id)
      );

      const results = await detector.applyPatterns(
        products,
        selectedPatternData
      );
      setPreviewResults(results);
      showSnackbar("Preview generated successfully", "success");
    } catch (error) {
      logger.error("Preview failed:", error);
      showSnackbar("Preview failed: " + error.message, "error");
    }
  };

  const handleApplyPatterns = async () => {
    if (selectedPatterns.size === 0) {
      showSnackbar("Please select patterns to apply", "warning");
      return;
    }

    try {
      const patterns = Array.isArray(analysis?.suggestions)
        ? analysis.suggestions
        : Array.isArray(analysis?.detectedPatterns)
        ? analysis.detectedPatterns
        : [];
      const selectedPatternData = patterns.filter((p) =>
        selectedPatterns.has(p.id)
      );

      const results = await detector.applyPatterns(
        products,
        selectedPatternData
      );

      if (onPatternsApplied) {
        onPatternsApplied(results, selectedPatternData);
      }

      showSnackbar(
        `Successfully applied ${selectedPatterns.size} patterns`,
        "success"
      );
      setSelectedPatterns(new Set());
      setPreviewMode(false);
      setPreviewResults(null);
    } catch (error) {
      logger.error("Apply patterns failed:", error);
      showSnackbar("Failed to apply patterns: " + error.message, "error");
    }
  };

  const handleAddCustomRule = () => {
    // Validate custom rule
    if (!customRule.name.trim() || !customRule.pattern.trim()) {
      showSnackbar("Please fill in all required fields", "error");
      return;
    }

    // Create new custom pattern
    const newPattern = {
      id: `custom-${Date.now()}`,
      type: "custom",
      name: customRule.name,
      pattern: customRule.pattern,
      separator: customRule.separator,
      variantType: customRule.variantType,
      priority: customRule.priority,
      confidence: 100, // Custom rules have 100% confidence
      groupCount: 0,
      variants: [],
      examples: [],
      created: new Date().toISOString(),
    };

    // Add to analysis if it exists
    if (analysis) {
      const updatedAnalysis = {
        ...analysis,
        detectedPatterns: [...(analysis.detectedPatterns || []), newPattern],
      };
      setAnalysis(updatedAnalysis);
    }

    // Reset form and close dialog
    setCustomRule({
      name: "",
      pattern: "",
      separator: "-",
      variantType: "generic",
      priority: "medium",
    });
    setCustomRuleDialog(false);
    showSnackbar("Custom rule added successfully", "success");
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "success";
    if (confidence >= 70) return "warning";
    return "error";
  };

  const getVariantTypeIcon = (type) => {
    const iconMap = {
      color: "🎨",
      size: "📏",
      version: "🔢",
      numeric: "#️⃣",
      generic: "📦",
    };
    return iconMap[type] || "📦";
  };

  const renderAnalyticsDashboard = () => {
    logger.info("DEBUG: renderAnalyticsDashboard called");
    logger.info("DEBUG: analysis state:", analysis);

    if (!analysis) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={300}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Analyzing patterns...
          </Typography>
        </Box>
      );
    }

    const { statistics = {}, detectedPatterns = [] } = analysis;
    // Ensure patterns is always an array with proper null/undefined checks
    const patterns = Array.isArray(analysis?.suggestions)
      ? analysis.suggestions
      : Array.isArray(detectedPatterns)
      ? detectedPatterns
      : [];

    logger.info("DEBUG: analytics dashboard patterns:", patterns);
    logger.info("DEBUG: patterns.length:", patterns?.length);

    return (
      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Analytics color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {statistics.totalProducts || 0}
                  </Typography>
                  <Typography color="textSecondary">Total Products</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <GroupWork color="secondary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">{patterns.length}</Typography>
                  <Typography color="textSecondary">Patterns Found</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Speed color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {Math.round(statistics.averageConfidence || 0)}%
                  </Typography>
                  <Typography color="textSecondary">Avg Confidence</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {statistics.potentialVariants || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    Potential Variants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pattern Distribution Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pattern Distribution by Type
              </Typography>
              {statistics.patternTypes &&
                Object.entries(statistics.patternTypes).map(([type, count]) => (
                  <Box key={type} sx={{ mb: 1 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        {getVariantTypeIcon(type)}{" "}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Typography>
                      <Typography variant="body2">{count}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={
                        patterns.length > 0
                          ? (count / patterns.length) * 100
                          : 0
                      }
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              {!statistics.patternTypes && (
                <Typography variant="body2" color="textSecondary">
                  No pattern data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Confidence Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Confidence Distribution
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="success.main">
                  High (90-100%):{" "}
                  {patterns.filter((p) => p.confidence >= 90).length}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    patterns.length > 0
                      ? (patterns.filter((p) => p.confidence >= 90).length /
                          patterns.length) *
                        100
                      : 0
                  }
                  color="success"
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="warning.main">
                  Medium (70-89%):{" "}
                  {
                    patterns.filter(
                      (p) => p.confidence >= 70 && p.confidence < 90
                    ).length
                  }
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    patterns.length > 0
                      ? (patterns.filter(
                          (p) => p.confidence >= 70 && p.confidence < 90
                        ).length /
                          patterns.length) *
                        100
                      : 0
                  }
                  color="warning"
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="error.main">
                  Low (0-69%):{" "}
                  {patterns.filter((p) => p.confidence < 70).length}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    patterns.length > 0
                      ? (patterns.filter((p) => p.confidence < 70).length /
                          patterns.length) *
                        100
                      : 0
                  }
                  color="error"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderPatternSuggestions = () => {
    logger.info("DEBUG: renderPatternSuggestions called");
    logger.info("DEBUG: products.length:", products.length);
    logger.info("DEBUG: analysis:", analysis);
    logger.info("DEBUG: analysis?.suggestions:", analysis?.suggestions);
    logger.info(
      "DEBUG: analysis?.detectedPatterns:",
      analysis?.detectedPatterns
    );

    // Ensure patterns is always an array with proper null/undefined checks
    let patterns = Array.isArray(analysis?.suggestions)
      ? analysis.suggestions
      : Array.isArray(analysis?.detectedPatterns)
      ? analysis.detectedPatterns
      : [];

    // Clean patterns to remove any function properties that could cause onClick errors
    patterns = patterns.map((pattern) => {
      if (typeof pattern !== "object" || pattern === null) return pattern;

      const cleanPattern = {};
      Object.keys(pattern).forEach((key) => {
        // Only include non-function properties
        if (typeof pattern[key] !== "function") {
          cleanPattern[key] = pattern[key];
        }
      });
      return cleanPattern;
    });

    logger.info("DEBUG: final patterns array length:", patterns.length);

    // Add detailed logging of pattern structure
    if (patterns.length > 0) {
      logger.info("DEBUG: First pattern has:", Object.keys(patterns[0] || {}));
      logger.info(
        "DEBUG: First pattern variants type:",
        typeof patterns[0]?.variants
      );
      if (Array.isArray(patterns[0]?.variants)) {
        logger.info(
          "DEBUG: First pattern variants count:",
          patterns[0].variants.length
        );
        if (patterns[0].variants.length > 0) {
          logger.info(
            "DEBUG: First variant type:",
            typeof patterns[0].variants[0]
          );
          logger.info(
            "DEBUG: First variant preview:",
            String(patterns[0].variants[0]).substring(0, 50)
          );
        }
      }
    }

    if (!patterns || patterns.length === 0) {
      return (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" gutterBottom>
            No patterns detected
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Products available: {products.length}
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Analysis status: {analysis ? "Complete" : "Not started"}
          </Typography>
          {products.length > 0 && (
            <Button variant="outlined" onClick={runAnalysis} sx={{ mt: 2 }}>
              Run Analysis
            </Button>
          )}
        </Box>
      );
    }

    const paginatedPatterns = patterns.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );

    return (
      <Box>
        {/* Actions Bar */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Box>
            <Button variant="outlined" onClick={handleSelectAll} sx={{ mr: 1 }}>
              Select All
            </Button>
            <Button
              variant="outlined"
              onClick={handleDeselectAll}
              sx={{ mr: 1 }}
            >
              Deselect All
            </Button>
            <Badge badgeContent={selectedPatterns.size} color="primary">
              <Button
                variant="contained"
                onClick={handlePreview}
                startIcon={<Visibility />}
                disabled={selectedPatterns.size === 0}
                sx={{ mr: 1 }}
              >
                Preview
              </Button>
            </Badge>
          </Box>
          <Button
            variant="contained"
            color="success"
            onClick={handleApplyPatterns}
            startIcon={<CheckCircle />}
            disabled={selectedPatterns.size === 0}
          >
            Apply Selected ({selectedPatterns.size})
          </Button>
        </Box>

        {/* Pattern Cards */}
        <Grid container spacing={2}>
          {paginatedPatterns.map((pattern) => (
            <Grid item xs={12} md={6} lg={4} key={pattern?.id || Math.random()}>
              <Card
                sx={{
                  border: selectedPatterns.has(pattern?.id) ? 2 : 1,
                  borderColor: selectedPatterns.has(pattern?.id)
                    ? "primary.main"
                    : "divider",
                  "&:hover": { boxShadow: 3 },
                }}
              >
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography variant="h6" component="div">
                      {getVariantTypeIcon(pattern?.variantType)}{" "}
                      {pattern?.basePattern || "Unknown Pattern"}
                    </Typography>
                    <Chip
                      label={`${Math.round(pattern?.confidence || 0)}%`}
                      color={getConfidenceColor(pattern?.confidence || 0)}
                      size="small"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    Type: {pattern?.variantType || "Unknown"} • Separator: "
                    {pattern?.separator || ""}"
                  </Typography>

                  <Typography variant="body2" gutterBottom>
                    Products: {pattern.products?.length || 0} • Variants:{" "}
                    {pattern.variants?.length || 0}
                  </Typography>

                  <Box mt={2}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Sample variants:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {(pattern.variants || [])
                        .slice(0, 3)
                        .map((variant, index) => {
                          // Ensure we always render a string in the Chip label
                          let label = "Unknown";
                          if (typeof variant === "string") {
                            label = variant;
                          } else if (
                            typeof variant === "object" &&
                            variant !== null
                          ) {
                            // If variant is an object, try to extract a meaningful string
                            label =
                              variant.name ||
                              variant.sku ||
                              variant.id ||
                              String(variant).substring(0, 20) + "...";
                          }

                          return (
                            <Chip
                              key={index}
                              label={label}
                              size="small"
                              variant="outlined"
                            />
                          );
                        })}
                      {(pattern.variants?.length || 0) > 3 && (
                        <Chip
                          label={`+${(pattern.variants?.length || 0) - 3} more`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>
                <CardActions>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedPatterns.has(pattern?.id)}
                        onChange={(e) =>
                          handlePatternSelect(pattern?.id, e.target.checked)
                        }
                        color="primary"
                      />
                    }
                    label="Include"
                  />
                  <Button
                    size="small"
                    startIcon={<Info />}
                    onClick={() => {
                      // Open pattern details modal
                      setSelectedPatternDetails(pattern);
                      setPatternDetailsDialog(true);
                      logger.info("Pattern details clicked:", pattern?.id);
                    }}
                  >
                    Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={patterns.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Box>
    );
  };

  const renderCustomRules = () => {
    return (
      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h6">Custom Pattern Rules</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCustomRuleDialog(true)}
          >
            Add Custom Rule
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Custom rules allow you to define specific patterns that the automatic
          detection might miss. These rules will be applied with high priority
          during pattern analysis.
        </Alert>

        {/* Custom Rules List (placeholder) */}
        <Paper>
          <List>
            <ListItem>
              <ListItemText
                primary="No custom rules defined"
                secondary="Click 'Add Custom Rule' to create your first rule"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    );
  };

  const renderSettings = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Pattern Detection Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Detection Parameters
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Minimum Confidence: {settings.minConfidence}%
                  </Typography>
                  <TextField
                    type="number"
                    value={settings.minConfidence}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        minConfidence: parseInt(e.target.value),
                      }))
                    }
                    inputProps={{ min: 0, max: 100 }}
                    fullWidth
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Minimum Group Size: {settings.minGroupSize}
                  </Typography>
                  <TextField
                    type="number"
                    value={settings.minGroupSize}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        minGroupSize: parseInt(e.target.value),
                      }))
                    }
                    inputProps={{ min: 2, max: 10 }}
                    fullWidth
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography gutterBottom>
                    Maximum Pattern Length: {settings.maxPatternLength}
                  </Typography>
                  <TextField
                    type="number"
                    value={settings.maxPatternLength}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        maxPatternLength: parseInt(e.target.value),
                      }))
                    }
                    inputProps={{ min: 1, max: 10 }}
                    fullWidth
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Advanced Options
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableAutoDetection}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          enableAutoDetection: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Enable Automatic Detection"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableSmartExclusions}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          enableSmartExclusions: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Enable Smart Exclusions"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={runAnalysis}
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <PlayArrow />
                }
              >
                {loading ? "Analyzing..." : "Re-run Analysis"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  // Reset all settings to defaults
                  setSettings({
                    minConfidence: 70,
                    minGroupSize: 2,
                    maxPatternLength: 4,
                    enableAutoDetection: true,
                    enableSmartExclusions: true,
                  });
                  showSnackbar("Settings reset to defaults", "success");
                  logger.info("Reset to defaults clicked");
                }}
              >
                Reset to Defaults
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderPreview = () => {
    if (!previewResults) {
      return (
        <Alert severity="info">
          No preview available. Select patterns and click 'Preview' to see the
          grouping results.
        </Alert>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Preview: Pattern Application Results
        </Typography>

        <Alert severity="success" sx={{ mb: 2 }}>
          Preview shows how {selectedPatterns.size} selected patterns will group
          your products. Review the results below and click 'Apply' if
          satisfied.
        </Alert>

        {Object.entries(previewResults.groups).map(([groupId, group]) => (
          <Accordion key={groupId}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">
                {group?.basePattern || "Unknown Pattern"} (
                {group?.products?.length || 0} products)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Variant</TableCell>
                      <TableCell>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(group?.products || []).map((product) => (
                      <TableRow key={product?.id || Math.random()}>
                        <TableCell>{product?.sku || "N/A"}</TableCell>
                        <TableCell>{product?.name || "N/A"}</TableCell>
                        <TableCell>
                          <Chip
                            label={product?.detectedVariant || "Base"}
                            size="small"
                            color={
                              product?.detectedVariant ? "primary" : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {typeof product?.price === "object"
                            ? JSON.stringify(product.price)
                            : String(product?.price || "N/A")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}

        <Box mt={3}>
          <Button
            variant="contained"
            color="success"
            onClick={handleApplyPatterns}
            startIcon={<CheckCircle />}
            sx={{ mr: 2 }}
          >
            Apply These Patterns
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setPreviewMode(false);
              setPreviewResults(null);
            }}
          >
            Cancel Preview
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
          >
            <Tab
              label="Analytics Dashboard"
              icon={<Analytics />}
              iconPosition="start"
            />
            <Tab
              label="Pattern Suggestions"
              icon={<AutoAwesome />}
              iconPosition="start"
            />
            <Tab label="Custom Rules" icon={<Edit />} iconPosition="start" />
            <Tab label="Settings" icon={<Settings />} iconPosition="start" />
            {previewMode && (
              <Tab label="Preview" icon={<Preview />} iconPosition="start" />
            )}
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {renderAnalyticsDashboard()}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderPatternSuggestions()}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {renderCustomRules()}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {renderSettings()}
        </TabPanel>

        {previewMode && (
          <TabPanel value={tabValue} index={4}>
            {renderPreview()}
          </TabPanel>
        )}
      </Paper>

      {/* Custom Rule Dialog */}
      <Dialog
        open={customRuleDialog}
        onClose={() => setCustomRuleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Custom Pattern Rule</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Rule Name"
                value={customRule.name}
                onChange={(e) =>
                  setCustomRule((prev) => ({ ...prev, name: e.target.value }))
                }
                fullWidth
                placeholder="e.g., Color Variants for Clothing"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Pattern"
                value={customRule.pattern}
                onChange={(e) =>
                  setCustomRule((prev) => ({
                    ...prev,
                    pattern: e.target.value,
                  }))
                }
                fullWidth
                placeholder="e.g., {base}-{variant}"
                helperText="Use {base} for the base pattern and {variant} for the variant part"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Separator</InputLabel>
                <Select
                  value={customRule.separator}
                  onChange={(e) =>
                    setCustomRule((prev) => ({
                      ...prev,
                      separator: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="-">Hyphen (-)</MenuItem>
                  <MenuItem value="_">Underscore (_)</MenuItem>
                  <MenuItem value=".">Dot (.)</MenuItem>
                  <MenuItem value=" ">Space ( )</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Variant Type</InputLabel>
                <Select
                  value={customRule.variantType}
                  onChange={(e) =>
                    setCustomRule((prev) => ({
                      ...prev,
                      variantType: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="color">Color</MenuItem>
                  <MenuItem value="size">Size</MenuItem>
                  <MenuItem value="version">Version</MenuItem>
                  <MenuItem value="numeric">Numeric</MenuItem>
                  <MenuItem value="generic">Generic</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomRuleDialog(false)}>Cancel</Button>
          <Button onClick={handleAddCustomRule} variant="contained">
            Add Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pattern Details Dialog */}
      <Dialog
        open={patternDetailsDialog}
        onClose={() => setPatternDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Pattern Details</DialogTitle>
        <DialogContent>
          {selectedPatternDetails && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Typography>
                    <strong>Name:</strong>{" "}
                    {selectedPatternDetails.name || "Unnamed Pattern"}
                  </Typography>
                  <Typography>
                    <strong>Type:</strong>{" "}
                    {selectedPatternDetails.type || "Unknown"}
                  </Typography>
                  <Typography>
                    <strong>Pattern:</strong>{" "}
                    {selectedPatternDetails.pattern || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Confidence:</strong>{" "}
                    {selectedPatternDetails.confidence || 0}%
                  </Typography>
                  <Typography>
                    <strong>Group Count:</strong>{" "}
                    {selectedPatternDetails.groupCount || 0}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Configuration
                  </Typography>
                  <Typography>
                    <strong>Separator:</strong>{" "}
                    {selectedPatternDetails.separator || "-"}
                  </Typography>
                  <Typography>
                    <strong>Variant Type:</strong>{" "}
                    {selectedPatternDetails.variantType || "generic"}
                  </Typography>
                  <Typography>
                    <strong>Priority:</strong>{" "}
                    {selectedPatternDetails.priority || "medium"}
                  </Typography>
                  {selectedPatternDetails.created && (
                    <Typography>
                      <strong>Created:</strong>{" "}
                      {new Date(
                        selectedPatternDetails.created
                      ).toLocaleString()}
                    </Typography>
                  )}
                </Grid>
                {selectedPatternDetails.examples &&
                  selectedPatternDetails.examples.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Examples
                      </Typography>
                      <List dense>
                        {selectedPatternDetails.examples
                          .slice(0, 5)
                          .map((example, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={
                                  typeof example === "string"
                                    ? example
                                    : JSON.stringify(example)
                                }
                              />
                            </ListItem>
                          ))}
                      </List>
                    </Grid>
                  )}
                {selectedPatternDetails.variants &&
                  selectedPatternDetails.variants.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Detected Variants (
                        {selectedPatternDetails.variants.length})
                      </Typography>
                      <List dense>
                        {selectedPatternDetails.variants
                          .slice(0, 10)
                          .map((variant, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={
                                  typeof variant === "string"
                                    ? variant
                                    : variant.value || JSON.stringify(variant)
                                }
                              />
                            </ListItem>
                          ))}
                        {selectedPatternDetails.variants.length > 10 && (
                          <ListItem>
                            <ListItemText
                              primary={`... and ${
                                selectedPatternDetails.variants.length - 10
                              } more`}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Grid>
                  )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPatternDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PatternManagementInterface;
