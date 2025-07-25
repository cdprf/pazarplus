import logger from "../utils/logger.js";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../i18n/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  Square,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Activity,
  BarChart3,
  Settings,
  Package,
  X,
  Play,
  Eye,
  Plus,
  Trash2,
  Pause,
  Calendar,
  Timer,
} from "lucide-react";
import { Button, Card, CardContent, Badge } from "../components/ui";
import api from "../services/api";
import { useAlert } from "../contexts/AlertContext";

const PlatformOperations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [totalTasks, setTotalTasks] = useState(0);
  const [filters, setFilters] = useState({
    status: "all",
    taskType: "all",
    priority: "all",
  });

  // Platform connections for task creation
  const [platformConnections, setPlatformConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Task creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);

  // Focus management for modal accessibility
  const modalRef = useRef(null);
  const createTaskButtonRef = useRef(null);

  const [taskForm, setTaskForm] = useState({
    taskType: "order_fetching",
    priority: "normal",
    platformConnectionId: "",
    maxRetries: 3,
    scheduledFor: "",
    config: {},
    description: "",
    // New interval-based date range options
    dateRangeMode: "manual", // manual, interval
    intervalPeriod: "month", // week, month, quarter, year, custom
    customDays: 30,
    fromDate: "",
    toDate: "",
  });

  // Function to calculate date ranges based on existing order data and selected interval
  const calculateDateRange = useCallback(
    async (platformConnectionId, intervalPeriod, customDays) => {
      try {
        // Get the oldest order date for this platform
        const response = await api.get(
          `/orders/date-range/${platformConnectionId}`
        );

        if (response.data.success && response.data.data?.oldestOrderDate) {
          const oldestDate = new Date(response.data.data.oldestOrderDate);
          let fromDate, toDate;

          switch (intervalPeriod) {
            case "week":
              toDate = new Date(oldestDate);
              fromDate = new Date(toDate);
              fromDate.setDate(fromDate.getDate() - 7);
              break;

            case "month":
              toDate = new Date(oldestDate);
              fromDate = new Date(toDate);
              fromDate.setMonth(fromDate.getMonth() - 1);
              break;

            case "quarter":
              toDate = new Date(oldestDate);
              fromDate = new Date(toDate);
              fromDate.setMonth(fromDate.getMonth() - 3);
              break;

            case "year":
              toDate = new Date(oldestDate);
              fromDate = new Date(toDate);
              fromDate.setFullYear(fromDate.getFullYear() - 1);
              break;

            case "custom":
              toDate = new Date(oldestDate);
              fromDate = new Date(toDate);
              fromDate.setDate(fromDate.getDate() - customDays);
              break;

            default:
              toDate = new Date(oldestDate);
              fromDate = new Date(toDate);
              fromDate.setMonth(fromDate.getMonth() - 1);
          }

          return {
            fromDate: fromDate.toISOString().slice(0, 16), // Format for datetime-local
            toDate: toDate.toISOString().slice(0, 16),
            oldestOrderDate: oldestDate.toISOString().slice(0, 16),
          };
        }
      } catch (error) {
        logger.warn("Could not fetch order date range:", error);
      }

      // Fallback to current date if no order data available
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      return {
        fromDate: oneMonthAgo.toISOString().slice(0, 16),
        toDate: now.toISOString().slice(0, 16),
        oldestOrderDate: null,
      };
    },
    []
  );

  // Handle interval period change and auto-calculate dates
  const handleIntervalChange = useCallback(
    async (intervalPeriod, customDays = null) => {
      if (
        taskForm.platformConnectionId &&
        taskForm.dateRangeMode === "interval"
      ) {
        const dateRange = await calculateDateRange(
          taskForm.platformConnectionId,
          intervalPeriod,
          customDays || taskForm.customDays
        );

        setTaskForm((prev) => ({
          ...prev,
          intervalPeriod,
          ...(customDays && { customDays }),
          fromDate: dateRange.fromDate,
          toDate: dateRange.toDate,
        }));
      } else {
        setTaskForm((prev) => ({
          ...prev,
          intervalPeriod,
          ...(customDays && { customDays }),
        }));
      }
    },
    [
      taskForm.platformConnectionId,
      taskForm.dateRangeMode,
      taskForm.customDays,
      calculateDateRange,
    ]
  );

  const loadPlatformConnections = useCallback(async () => {
    try {
      setLoadingConnections(true);
      const response = await api.get("/platforms/connections");

      if (response.data.success) {
        setPlatformConnections(response.data.data || []);
      } else {
        throw new Error(
          response.data.message || "Failed to load platform connections"
        );
      }
    } catch (error) {
      logger.error("Error loading platform connections:", error);
      showAlert(
        "Failed to load platform connections: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoadingConnections(false);
    }
  }, [showAlert]);

  const loadTasks = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = {
        page: page + 1, // Backend expects 1-based pagination
        limit: rowsPerPage,
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.taskType !== "all" && { taskType: filters.taskType }),
        ...(filters.priority !== "all" && { priority: filters.priority }),
      };

      const response = await api.get("/background-tasks", { params });

      if (response.data.success) {
        setTasks(response.data.data || []);
        setTotalTasks(response.data.pagination?.total || 0);
      } else {
        throw new Error(response.data.message || "Failed to load tasks");
      }
    } catch (error) {
      logger.error("Error loading tasks:", error);
      showAlert(
        "Failed to load tasks: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setRefreshing(false);
    }
  }, [page, rowsPerPage, filters, showAlert]);

  const loadTaskStats = useCallback(async () => {
    try {
      const response = await api.get("/background-tasks/stats");

      if (response.data.success) {
        setTaskStats(response.data.data || {});
      } else {
        throw new Error(response.data.message || "Failed to load task stats");
      }
    } catch (error) {
      logger.error("Error loading task stats:", error);
      showAlert(
        "Failed to load statistics: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    }
  }, [showAlert]);

  useEffect(() => {
    loadTasks();
    loadTaskStats();
    loadPlatformConnections();
  }, [loadTasks, loadTaskStats, loadPlatformConnections]);

  // Silent auto-refresh every 15 seconds (without loading indicators)
  useEffect(() => {
    const silentLoadTasks = async () => {
      try {
        const params = {
          page: page + 1,
          limit: rowsPerPage,
          ...(filters.status !== "all" && { status: filters.status }),
          ...(filters.taskType !== "all" && { taskType: filters.taskType }),
          ...(filters.priority !== "all" && { priority: filters.priority }),
        };

        const response = await api.get("/background-tasks", { params });
        if (response.data.success) {
          setTasks(response.data.data || []);
          setTotalTasks(response.data.pagination?.total || 0);
        }
      } catch (error) {
        // Silent error handling - don't show alerts for auto-refresh failures
        logger.warn("Silent refresh failed:", error);
      }
    };

    const silentLoadTaskStats = async () => {
      try {
        const response = await api.get("/background-tasks/stats");
        if (response.data.success) {
          setTaskStats(response.data.data || {});
        }
      } catch (error) {
        logger.warn("Silent stats refresh failed:", error);
      }
    };

    const interval = setInterval(() => {
      silentLoadTasks();
      silentLoadTaskStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [page, rowsPerPage, filters]);

  const stopTask = async (taskId) => {
    try {
      setLoading(true);
      const response = await api.patch(`/background-tasks/${taskId}/cancel`);

      if (response.data.success) {
        showAlert("Task stopped successfully", "success");
        loadTasks();
      } else {
        throw new Error(response.data.message || "Failed to stop task");
      }
    } catch (error) {
      logger.error("Error stopping task:", error);
      showAlert(
        "Failed to stop task: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const retryTask = async (taskId) => {
    try {
      setLoading(true);
      const response = await api.patch(`/background-tasks/${taskId}/retry`);

      if (response.data.success) {
        showAlert("Task restarted successfully", "success");
        loadTasks();
      } else {
        throw new Error(response.data.message || "Failed to retry task");
      }
    } catch (error) {
      logger.error("Error retrying task:", error);
      showAlert(
        "Failed to retry task: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    try {
      setCreateTaskLoading(true);

      if (!taskForm.platformConnectionId) {
        showAlert("Please select a platform connection", "error");
        return;
      }

      const taskData = {
        taskType: taskForm.taskType,
        priority: taskForm.priority,
        platformConnectionId: taskForm.platformConnectionId,
        maxRetries: taskForm.maxRetries,
        config: {
          ...taskForm.config,
          // Set mode to auto when interval mode is selected for order fetching
          ...(taskForm.taskType === "order_fetching" &&
            taskForm.dateRangeMode === "interval" && {
              mode: "auto",
              intervalPeriod: taskForm.intervalPeriod,
              customDays: taskForm.customDays,
            }),
          // Add date range configuration for order fetching
          ...(taskForm.dateRangeMode === "interval" && {
            dateRangeMode: taskForm.dateRangeMode,
            intervalPeriod: taskForm.intervalPeriod,
            customDays: taskForm.customDays,
            fromDate: taskForm.fromDate,
            toDate: taskForm.toDate,
          }),
          ...(taskForm.dateRangeMode === "manual" && {
            dateRangeMode: taskForm.dateRangeMode,
            fromDate: taskForm.fromDate,
            toDate: taskForm.toDate,
            mode: "duration", // Use duration mode for manual date ranges
          }),
        },
        ...(taskForm.scheduledFor && { scheduledFor: taskForm.scheduledFor }),
        ...(taskForm.description && {
          metadata: { description: taskForm.description },
        }),
      };

      const response = await api.post("/background-tasks", taskData);

      if (response.data.success) {
        showAlert("Task created successfully", "success");
        setShowCreateModal(false);
        resetTaskForm();
        loadTasks();
        loadTaskStats();
      } else {
        throw new Error(response.data.message || "Failed to create task");
      }
    } catch (error) {
      logger.error("Error creating task:", error);
      showAlert(
        "Failed to create task: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      taskType: "order_fetching",
      priority: "normal",
      platformConnectionId: "",
      maxRetries: 3,
      scheduledFor: "",
      config: {},
      description: "",
      // New interval-based date range options
      dateRangeMode: "manual",
      intervalPeriod: "month",
      customDays: 30,
      fromDate: "",
      toDate: "",
    });
  };

  const handleTaskFormChange = (field, value) => {
    setTaskForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    setPage(0); // Reset to first page when filtering
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      running: { variant: "primary", label: "Running", icon: Loader2 },
      completed: { variant: "success", label: "Completed", icon: CheckCircle },
      failed: { variant: "destructive", label: "Failed", icon: AlertCircle },
      cancelled: { variant: "secondary", label: "Cancelled", icon: X },
      pending: { variant: "warning", label: "Pending", icon: Clock },
      timeout: { variant: "destructive", label: "Timeout", icon: Clock },
      paused: { variant: "secondary", label: "Paused", icon: Pause },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatProgress = (task) => {
    if (!task.progress) return "No progress data";

    let progress;
    try {
      // Handle both string and object formats
      progress =
        typeof task.progress === "string"
          ? JSON.parse(task.progress)
          : task.progress;
    } catch (e) {
      return "Invalid progress data";
    }

    // Handle different task statuses
    if (task.status === "pending") {
      return progress.message || "Waiting to start...";
    }

    if (task.status === "completed") {
      return "Completed";
    }

    if (task.status === "failed") {
      return progress.message || "Failed";
    }

    if (task.status === "cancelled") {
      return "Cancelled";
    }

    // Handle progress data formats
    if (progress.percentage !== undefined) {
      return `${Math.round(progress.percentage)}% complete`;
    }

    if (progress.current !== undefined && progress.total !== undefined) {
      const percentage =
        progress.total > 0
          ? Math.round((progress.current / progress.total) * 100)
          : 0;
      return `${progress.current}/${progress.total} (${percentage}%)`;
    }

    if (progress.currentStep && progress.totalSteps) {
      return `Step ${progress.currentStep}/${progress.totalSteps}`;
    }

    if (progress.itemsProcessed !== undefined) {
      return `${progress.itemsProcessed} items processed`;
    }

    return progress.message || "In progress...";
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return "Not started";

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;

    if (diffMs < 1000) return "< 1 second";

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m ${diffSeconds % 60}s`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    } else {
      return `${diffSeconds}s`;
    }
  };

  const startTask = async (taskId) => {
    try {
      setLoading(true);
      const response = await api.patch(`/background-tasks/${taskId}/start`);

      if (response.data.success) {
        showAlert("Task started successfully", "success");
        loadTasks();
      } else {
        throw new Error(response.data.message || "Failed to start task");
      }
    } catch (error) {
      logger.error("Error starting task:", error);
      showAlert(
        "Failed to start task: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelTask = async (taskId) => {
    try {
      setLoading(true);
      const response = await api.patch(`/background-tasks/${taskId}/cancel`);

      if (response.data.success) {
        showAlert("Task cancelled successfully", "success");
        loadTasks();
      } else {
        throw new Error(response.data.message || "Failed to cancel task");
      }
    } catch (error) {
      logger.error("Error cancelling task:", error);
      showAlert(
        "Failed to cancel task: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const resumeTask = async (taskId) => {
    try {
      setLoading(true);
      const response = await api.patch(`/background-tasks/${taskId}/resume`);

      if (response.data.success) {
        showAlert("Task resumed successfully", "success");
        loadTasks();
      } else {
        throw new Error(response.data.message || "Failed to resume task");
      }
    } catch (error) {
      logger.error("Error resuming task:", error);
      showAlert(
        "Failed to resume task: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const viewTaskDetails = (taskId) => {
    navigate(`/platform-operations/tasks/${taskId}`);
  };

  const deleteTask = async (taskId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this task? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/background-tasks/${taskId}`);

      if (response.data.success) {
        showAlert("Task deleted successfully", "success");
        loadTasks();
        loadTaskStats();
      } else {
        throw new Error(response.data.message || "Failed to delete task");
      }
    } catch (error) {
      logger.error("Error deleting task:", error);
      showAlert(
        "Failed to delete task: " +
          (error.response?.data?.message || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 icon-contrast-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t("platformOperations.title", "Platform İşlemleri")}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(
                      "platformOperations.subtitle",
                      "Arka plan görevlerini ve platform işlemlerini izleyin ve yönetin"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  ref={createTaskButtonRef}
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Task</span>
                </Button>
                <Button
                  onClick={() => {
                    loadTasks();
                    loadTaskStats();
                  }}
                  variant="outline"
                  disabled={refreshing}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className="h-8 w-8 icon-contrast-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Running Tasks
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {taskStats.runningTasks || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 icon-contrast-success" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Completed Today
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {taskStats.completedToday || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 icon-contrast-error" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Failed Tasks
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {taskStats.failedTasks || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 icon-contrast-info" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {taskStats.totalTasks || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 icon-contrast-secondary h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-3">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={filters.taskType}
                  onChange={(e) =>
                    handleFilterChange("taskType", e.target.value)
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="order_fetching">Order Fetching</option>
                  <option value="product_sync">Product Sync</option>
                  <option value="inventory_sync">Inventory Sync</option>
                  <option value="bulk_operation">Bulk Operation</option>
                  <option value="analytics_update">Analytics Update</option>
                  <option value="customer_sync">Customer Sync</option>
                  <option value="shipping_label_generation">
                    Shipping Label Generation
                  </option>
                  <option value="report_generation">Report Generation</option>
                  <option value="data_export">Data Export</option>
                  <option value="data_import">Data Import</option>
                </select>

                <select
                  value={filters.priority}
                  onChange={(e) =>
                    handleFilterChange("priority", e.target.value)
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardContent className="p-0">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Background Tasks
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor and manage all background tasks
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Task Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center space-y-3">
                          <Activity className="h-12 w-12 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            No background tasks found
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Tasks will appear here when they are running
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <Package className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {task.taskType
                                  ?.replace(/_/g, " ")
                                  .toUpperCase() || "Unknown Task"}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {task.platformConnection?.platformType && (
                                  <span className="capitalize">
                                    {task.platformConnection.platformType}
                                  </span>
                                )}
                                {task.platformConnection?.name && (
                                  <span> - {task.platformConnection.name}</span>
                                )}
                                {task.metadata?.description && (
                                  <span> • {task.metadata.description}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(task.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="min-w-32">
                            {(task.status === "running" ||
                              task.status === "pending" ||
                              task.status === "paused") && (
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    task.status === "running"
                                      ? "bg-blue-600"
                                      : task.status === "pending"
                                      ? "bg-yellow-500"
                                      : "bg-orange-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        (() => {
                                          try {
                                            const progress =
                                              typeof task.progress === "string"
                                                ? JSON.parse(task.progress)
                                                : task.progress;

                                            if (
                                              progress?.percentage !== undefined
                                            ) {
                                              return progress.percentage;
                                            }

                                            if (
                                              progress?.current !== undefined &&
                                              progress?.total !== undefined &&
                                              progress.total > 0
                                            ) {
                                              return (
                                                (progress.current /
                                                  progress.total) *
                                                100
                                              );
                                            }

                                            return 0;
                                          } catch (e) {
                                            return 0;
                                          }
                                        })()
                                      )
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            )}
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatProgress(task)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDuration(task.createdAt, task.completedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(task.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {task.status === "pending" && (
                              <>
                                <Button
                                  onClick={() => startTask(task.id)}
                                  variant="default"
                                  size="sm"
                                  disabled={loading}
                                  className="flex items-center space-x-1"
                                >
                                  <Play className="h-3 w-3" />
                                  <span>Start</span>
                                </Button>
                                <Button
                                  onClick={() => cancelTask(task.id)}
                                  variant="outline"
                                  size="sm"
                                  disabled={loading}
                                  className="flex items-center space-x-1"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Cancel</span>
                                </Button>
                              </>
                            )}

                            {task.status === "running" && (
                              <Button
                                onClick={() => stopTask(task.id)}
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                className="flex items-center space-x-1"
                              >
                                <Square className="h-3 w-3" />
                                <span>Stop</span>
                              </Button>
                            )}

                            {task.status === "paused" && (
                              <>
                                <Button
                                  onClick={() => resumeTask(task.id)}
                                  variant="default"
                                  size="sm"
                                  disabled={loading}
                                  className="flex items-center space-x-1"
                                >
                                  <Play className="h-3 w-3" />
                                  <span>Resume</span>
                                </Button>
                                <Button
                                  onClick={() => cancelTask(task.id)}
                                  variant="outline"
                                  size="sm"
                                  disabled={loading}
                                  className="flex items-center space-x-1"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Cancel</span>
                                </Button>
                              </>
                            )}

                            {(task.status === "failed" ||
                              task.status === "cancelled") && (
                              <Button
                                onClick={() => retryTask(task.id)}
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                className="flex items-center space-x-1"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Retry</span>
                              </Button>
                            )}

                            {/* View Details button for all tasks */}
                            <Button
                              onClick={() => viewTaskDetails(task.id)}
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Details</span>
                            </Button>

                            {/* Delete button for completed, failed, or cancelled tasks */}
                            {(task.status === "completed" ||
                              task.status === "failed" ||
                              task.status === "cancelled") && (
                              <Button
                                onClick={() => deleteTask(task.id)}
                                variant="destructive"
                                size="sm"
                                disabled={loading}
                                className="flex items-center space-x-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalTasks > 0 && (
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {page * rowsPerPage + 1} to{" "}
                    {Math.min((page + 1) * rowsPerPage, totalTasks)} of{" "}
                    {totalTasks} tasks
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Page {page + 1} of {Math.ceil(totalTasks / rowsPerPage)}
                    </span>
                    <Button
                      onClick={() =>
                        setPage(
                          Math.min(
                            Math.ceil(totalTasks / rowsPerPage) - 1,
                            page + 1
                          )
                        )
                      }
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(totalTasks / rowsPerPage) - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  Create New Task
                </h2>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  size="sm"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task Type
                </label>
                <select
                  value={taskForm.taskType}
                  onChange={(e) =>
                    handleTaskFormChange("taskType", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="order_fetching">Order Fetching</option>
                  <option value="product_sync">Product Sync</option>
                  <option value="inventory_sync">Inventory Sync</option>
                  <option value="bulk_operation">Bulk Operation</option>
                  <option value="analytics_update">Analytics Update</option>
                  <option value="customer_sync">Customer Sync</option>
                  <option value="shipping_label_generation">
                    Shipping Label Generation
                  </option>
                  <option value="report_generation">Report Generation</option>
                  <option value="data_export">Data Export</option>
                  <option value="data_import">Data Import</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    handleTaskFormChange("priority", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Platform Connection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Platform Connection
                </label>
                <select
                  value={taskForm.platformConnectionId}
                  onChange={(e) =>
                    handleTaskFormChange("platformConnectionId", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a platform connection...</option>
                  {platformConnections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name || connection.platformType} (
                      {connection.platformType})
                    </option>
                  ))}
                </select>
                {loadingConnections && (
                  <p className="text-sm text-gray-500 mt-1">
                    Loading platform connections...
                  </p>
                )}
                {!loadingConnections && platformConnections.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No platform connections found. Please set up platform
                    connections first.
                  </p>
                )}
              </div>

              {/* Max Retries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Retries
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={taskForm.maxRetries}
                  onChange={(e) =>
                    handleTaskFormChange(
                      "maxRetries",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date Range Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range Configuration
                </label>
                <select
                  value={taskForm.dateRangeMode}
                  onChange={(e) =>
                    handleTaskFormChange("dateRangeMode", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="manual">Manual Date Selection</option>
                  <option value="interval">Auto-Calculate from Period</option>
                </select>
              </div>

              {/* Interval Period Selection */}
              {taskForm.dateRangeMode === "interval" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Timer className="inline h-4 w-4 mr-1" />
                    Period to Fetch
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={taskForm.intervalPeriod}
                      onChange={(e) => handleIntervalChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="week">1 Week</option>
                      <option value="month">1 Month</option>
                      <option value="quarter">3 Months (Quarter)</option>
                      <option value="year">1 Year</option>
                      <option value="custom">Custom Days</option>
                    </select>

                    {taskForm.intervalPeriod === "custom" && (
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={taskForm.customDays}
                        onChange={(e) => {
                          const days = parseInt(e.target.value) || 1;
                          handleTaskFormChange("customDays", days);
                          handleIntervalChange("custom", days);
                        }}
                        placeholder="Days"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Auto-Fetch Mode:</strong> This will start by
                      finding the oldest order date for the selected platform
                      and begin fetching orders in{" "}
                      {taskForm.intervalPeriod === "custom"
                        ? `${taskForm.customDays} day`
                        : taskForm.intervalPeriod === "week"
                        ? "1 week"
                        : taskForm.intervalPeriod === "month"
                        ? "1 month"
                        : taskForm.intervalPeriod === "quarter"
                        ? "3 month"
                        : "1 year"}{" "}
                      periods going backwards in time. The system will
                      automatically continue fetching older orders until no more
                      orders are found, ensuring complete historical data
                      retrieval.
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Date Range */}
              {taskForm.dateRangeMode === "manual" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      From Date
                    </label>
                    <input
                      type="datetime-local"
                      value={taskForm.fromDate}
                      onChange={(e) =>
                        handleTaskFormChange("fromDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      To Date
                    </label>
                    <input
                      type="datetime-local"
                      value={taskForm.toDate}
                      onChange={(e) =>
                        handleTaskFormChange("toDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Auto-calculated date range display */}
              {taskForm.dateRangeMode === "interval" &&
                taskForm.fromDate &&
                taskForm.toDate && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>Calculated Date Range:</strong>
                      <br />
                      From: {new Date(taskForm.fromDate).toLocaleString()}
                      <br />
                      To: {new Date(taskForm.toDate).toLocaleString()}
                    </p>
                  </div>
                )}

              {/* Schedule For (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule For (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={taskForm.scheduledFor}
                  onChange={(e) =>
                    handleTaskFormChange("scheduledFor", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to start immediately
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) =>
                    handleTaskFormChange("description", e.target.value)
                  }
                  rows={3}
                  placeholder="Enter task description..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                disabled={createTaskLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={createTask}
                disabled={
                  createTaskLoading ||
                  !taskForm.platformConnectionId ||
                  (taskForm.dateRangeMode === "manual" &&
                    (!taskForm.fromDate || !taskForm.toDate))
                }
                className="flex items-center space-x-2"
                ref={createTaskButtonRef}
              >
                {createTaskLoading && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>{createTaskLoading ? "Creating..." : "Create Task"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformOperations;
