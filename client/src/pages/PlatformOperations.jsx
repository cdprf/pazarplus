import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  History,
  CloudDownload,
  Schedule,
  Analytics,
} from "@mui/icons-material";
import api from "../services/api";

const PlatformOperations = () => {
  const [connections, setConnections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [orderStats, setOrderStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [fetchMode, setFetchMode] = useState("auto");
  const [duration, setDuration] = useState(30);
  const [stopAtFirst, setStopAtFirst] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const showAlert = (message, type = "info") => {
    setAlert({ show: true, message, type });
    setTimeout(
      () => setAlert({ show: false, message: "", type: "info" }),
      5000
    );
  };

  const loadData = useCallback(async () => {
    try {
      const [connectionsRes, tasksRes, statsRes] = await Promise.all([
        api.get("/platform-operations/connections"),
        api.get("/platform-operations/tasks"),
        api.get("/platform-operations/stats/orders"),
      ]);

      setConnections(connectionsRes.data.data || []);
      setTasks(tasksRes.data.data?.tasks || []);
      setOrderStats(statsRes.data.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      showAlert("Failed to load data", "error");
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  const startOrderFetching = async () => {
    if (!selectedConnection) {
      showAlert("Please select a platform connection", "warning");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        "/platform-operations/tasks/order-fetching",
        {
          platformConnectionId: selectedConnection,
          mode: fetchMode,
          duration: fetchMode === "duration" ? duration : undefined,
          stopAtFirst,
        }
      );

      if (response.data.success) {
        showAlert("Background order fetching started successfully", "success");
        setDialogOpen(false);
        loadData();
      } else {
        showAlert(
          response.data.message || "Failed to start order fetching",
          "error"
        );
      }
    } catch (error) {
      console.error("Error starting order fetching:", error);
      showAlert(
        error.response?.data?.message || "Failed to start order fetching",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const stopTask = async (taskId) => {
    try {
      const response = await api.post(
        `/platform-operations/tasks/${taskId}/stop`
      );
      if (response.data.success) {
        showAlert("Task stopped successfully", "success");
        loadData();
      } else {
        showAlert(response.data.message || "Failed to stop task", "error");
      }
    } catch (error) {
      console.error("Error stopping task:", error);
      showAlert(
        error.response?.data?.message || "Failed to stop task",
        "error"
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "running":
        return "primary";
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "stopped":
        return "warning";
      default:
        return "default";
    }
  };

  const formatProgress = (task) => {
    if (!task.progress) return "No progress data";

    const { currentMonth, totalMonths, ordersProcessed } = task.progress;

    if (totalMonths === "unknown") {
      return `Month ${currentMonth}, ${ordersProcessed} orders processed`;
    }

    return `${currentMonth}/${totalMonths} months, ${ordersProcessed} orders processed`;
  };

  const getProgressValue = (task) => {
    if (!task.progress || task.progress.totalMonths === "unknown") return 0;

    const { currentMonth, totalMonths } = task.progress;
    return totalMonths > 0 ? (currentMonth / totalMonths) * 100 : 0;
  };

  return (
    <Box sx={{ p: 3 }}>
      {alert.show && (
        <Alert severity={alert.type} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Platform Operations
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<CloudDownload />}
            onClick={() => setDialogOpen(true)}
            disabled={connections.length === 0}
          >
            Start Order Fetching
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadData}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Analytics sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6">Active Tasks</Typography>
              </Box>
              <Typography variant="h4">
                {tasks.filter((t) => t.status === "running").length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <CloudDownload sx={{ mr: 1, color: "success.main" }} />
                <Typography variant="h6">Completed</Typography>
              </Box>
              <Typography variant="h4">
                {tasks.filter((t) => t.status === "completed").length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Settings sx={{ mr: 1, color: "info.main" }} />
                <Typography variant="h6">Connections</Typography>
              </Box>
              <Typography variant="h4">{connections.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <History sx={{ mr: 1, color: "warning.main" }} />
                <Typography variant="h6">Total Tasks</Typography>
              </Box>
              <Typography variant="h4">{tasks.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Background Tasks Table */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
          <Typography variant="h6">Background Tasks</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Task Type</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    No background tasks found
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Chip
                        label={task.taskType.replace("_", " ").toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {task.platformConnection?.name || "Unknown"} (
                      {task.platformConnection?.platformType})
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status.toUpperCase()}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 200 }}>
                        {task.status === "running" && (
                          <LinearProgress
                            variant="determinate"
                            value={getProgressValue(task)}
                            sx={{ mb: 1 }}
                          />
                        )}
                        <Typography variant="body2">
                          {formatProgress(task)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(task.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {task.status === "running" && (
                        <Tooltip title="Stop Task">
                          <IconButton
                            color="error"
                            onClick={() => stopTask(task.id)}
                            size="small"
                          >
                            <Stop />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Order Statistics */}
      {orderStats.length > 0 && (
        <Paper>
          <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
            <Typography variant="h6">Order Statistics by Platform</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Platform</TableCell>
                  <TableCell>Total Orders</TableCell>
                  <TableCell>Oldest Order</TableCell>
                  <TableCell>Newest Order</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderStats.map((stat, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip
                        label={
                          stat[
                            "platformConnection.platformType"
                          ]?.toUpperCase() || "Unknown"
                        }
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{stat.totalOrders}</TableCell>
                    <TableCell>
                      {stat.oldestOrder
                        ? new Date(stat.oldestOrder).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {stat.newestOrder
                        ? new Date(stat.newestOrder).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Start Order Fetching Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Start Background Order Fetching</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Platform Connection</InputLabel>
                  <Select
                    value={selectedConnection}
                    onChange={(e) => setSelectedConnection(e.target.value)}
                    label="Select Platform Connection"
                  >
                    {connections.map((conn) => (
                      <MenuItem key={conn.id} value={conn.id}>
                        {conn.name} ({conn.platformType})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Fetch Mode</InputLabel>
                  <Select
                    value={fetchMode}
                    onChange={(e) => setFetchMode(e.target.value)}
                    label="Fetch Mode"
                  >
                    <MenuItem value="auto">
                      Auto - Fetch until first orders on platform
                    </MenuItem>
                    <MenuItem value="duration">
                      Duration - Fetch for specific duration
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {fetchMode === "duration" && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Duration (days)"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    helperText="Number of days to fetch orders for"
                    inputProps={{ min: 1, max: 365 }}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={stopAtFirst}
                      onChange={(e) => setStopAtFirst(e.target.checked)}
                    />
                  }
                  label="Stop when reaching first orders on platform"
                />
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mt: 1 }}
                >
                  Most platforms support only 1 month of records per request.
                  The system will automatically fetch month by month, starting
                  from now and going backwards.
                  {stopAtFirst &&
                    " It will stop when no more orders are found in a month."}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={startOrderFetching}
            disabled={loading || !selectedConnection}
            startIcon={loading ? <Schedule /> : <PlayArrow />}
          >
            {loading ? "Starting..." : "Start Fetching"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlatformOperations;
