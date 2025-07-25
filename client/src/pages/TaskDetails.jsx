import logger from "../utils/logger.js";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Activity,
  Package,
  Play,
  Square,
  RotateCcw,
  X,
  Settings,
  Terminal,
  Download,
} from "lucide-react";
import { Button, Card, CardContent, Badge } from "../components/ui";
import api from "../services/api";
import { useAlert } from "../contexts/AlertContext";
import { useTranslation } from "../i18n/hooks/useTranslation";

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { t } = useTranslation();

  const [task, setTask] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Get status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        icon: Clock,
      },
      running: {
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        icon: Loader2,
      },
      completed: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        icon: CheckCircle,
      },
      failed: {
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        icon: AlertCircle,
      },
      cancelled: {
        color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
        icon: X,
      },
      paused: {
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        icon: Square,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) ||
          t("tasks.unknown")}
      </Badge>
    );
  };

  // Format progress display
  const formatProgress = (task) => {
    if (!task) return t("tasks.noProgressData");

    const { status, progress } = task;

    if (status === "completed") {
      return t("tasks.completed");
    } else if (status === "failed") {
      return progress?.error || t("tasks.failed");
    } else if (status === "cancelled") {
      return t("tasks.cancelled");
    } else if (status === "pending") {
      return t("tasks.waitingToStart");
    } else if (status === "paused") {
      return `${t("tasks.paused")} ${Math.round(progress?.percentage || 0)}%`;
    } else if (status === "running") {
      const percentage = Math.round(progress?.percentage || 0);
      const processed = progress?.processed || 0;
      const total = progress?.total || 0;

      if (total > 0) {
        return `${percentage}% (${processed}/${total})`;
      } else {
        return `${percentage}% ${t("tasks.processed")}`;
      }
    }

    return t("tasks.noProgressData");
  };

  // Format duration
  const formatDuration = (startTime, endTime) => {
    if (!startTime) return t("tasks.notStarted");

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;

    if (diffMs < 1000) return "< 1s";

    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Format runtime info
  const formatRuntimeInfo = (task) => {
    if (!task) return {};

    const runtimeInfo = {
      [t("tasks.taskId")]: task.id,
      [t("tasks.taskType")]:
        task.taskType?.replace(/_/g, " ").toUpperCase() || t("tasks.unknown"),
      [t("tasks.priority")]:
        task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1) ||
        t("tasks.unknown"),
      [t("tasks.status")]:
        task.status?.charAt(0).toUpperCase() + task.status?.slice(1) ||
        t("tasks.unknown"),
      [t("tasks.created")]: task.createdAt
        ? new Date(task.createdAt).toLocaleString()
        : t("tasks.unknown"),
      [t("tasks.started")]: task.startedAt
        ? new Date(task.startedAt).toLocaleString()
        : t("tasks.notStarted"),
      [t("tasks.completed")]: task.completedAt
        ? new Date(task.completedAt).toLocaleString()
        : t("tasks.notCompleted"),
      [t("tasks.duration")]: formatDuration(task.startedAt, task.completedAt),
      [t("tasks.retryCount")]: `${task.retryCount || 0}/${
        task.maxRetries || 3
      }`,
    };

    // Add platform info if available
    if (task.metadata?.platform) {
      runtimeInfo[t("tasks.platform")] =
        task.metadata.platform.charAt(0).toUpperCase() +
        task.metadata.platform.slice(1);
    }

    // Add description if available
    if (task.metadata?.description) {
      runtimeInfo[t("tasks.description")] = task.metadata.description;
    }

    // Add error info if failed
    if (task.status === "failed" && task.progress?.error) {
      runtimeInfo[t("tasks.error")] = task.progress.error;
    }

    return runtimeInfo;
  };

  // Load task details
  const loadTaskDetails = useCallback(async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const response = await api.get(`/background-tasks/${taskId}`);

      if (response.data.success && response.data.data) {
        setTask(response.data.data);

        // Parse logs if they exist
        let logs = [];
        if (response.data.data.logs) {
          logs =
            typeof response.data.data.logs === "string"
              ? JSON.parse(response.data.data.logs)
              : response.data.data.logs;
        }
        setTaskLogs(logs);
      } else {
        throw new Error(
          response.data?.message ||
            t("tasks.failedToLoadTask", { error: "API Error" })
        );
      }
    } catch (error) {
      logger.error("Error loading task details:", error);
      showAlert(
        t("tasks.failedToLoadTask", {
          error: error.response?.data?.message || error.message,
        }),
        "error"
      );
      navigate("/platform-operations");
    } finally {
      setLoading(false);
    }
  }, [taskId, showAlert, navigate, t]);

  // Task action handlers
  const handleTaskAction = async (action) => {
    if (!task) return;

    setActionLoading(true);
    try {
      const response = await api.patch(
        `/background-tasks/${task.id}/${action}`
      );

      if (response.data.success) {
        showAlert(t("tasks.taskActionSuccess", { action }), "success");
        await loadTaskDetails(); // Reload task details
      } else {
        throw new Error(
          response.data?.message ||
            t("tasks.taskActionFailed", { action, error: "API Error" })
        );
      }
    } catch (error) {
      logger.error(`Error ${action} task:`, error);
      showAlert(
        t("tasks.taskActionFailed", {
          action,
          error: error.response?.data?.message || error.message,
        }),
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const startTask = () => handleTaskAction("start");
  const stopTask = () => handleTaskAction("stop");
  const pauseTask = () => handleTaskAction("pause");
  const resumeTask = () => handleTaskAction("resume");
  const cancelTask = () => handleTaskAction("cancel");
  const retryTask = () => handleTaskAction("retry");

  // Load data on mount
  useEffect(() => {
    loadTaskDetails();
  }, [loadTaskDetails]);

  // Auto-refresh for running tasks
  useEffect(() => {
    if (!task) return;

    const shouldAutoRefresh = ["running", "pending"].includes(task.status);
    if (!shouldAutoRefresh) return;

    const interval = setInterval(() => {
      loadTaskDetails(); // This now includes logs
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [task, loadTaskDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-gray-600">{t("tasks.loadingTaskDetails")}</span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("tasks.taskNotFound")}
          </h2>
          <p className="text-gray-600 mb-4">{t("tasks.taskNotFoundMessage")}</p>
          <Button onClick={() => navigate("/platform-operations")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("tasks.backToOperations")}
          </Button>
        </div>
      </div>
    );
  }

  const runtimeInfo = formatRuntimeInfo(task);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => navigate("/platform-operations")}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Package className="h-8 w-8 icon-contrast-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Task Details
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {task.taskType?.replace(/_/g, " ").toUpperCase() ||
                      "Unknown Task"}{" "}
                    - {task.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Action Buttons */}
                {task.status === "pending" && (
                  <>
                    <Button
                      onClick={startTask}
                      disabled={actionLoading}
                      className="flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>Start</span>
                    </Button>
                    <Button
                      onClick={cancelTask}
                      variant="outline"
                      disabled={actionLoading}
                      className="flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </Button>
                  </>
                )}

                {task.status === "running" && (
                  <>
                    <Button
                      onClick={pauseTask}
                      variant="outline"
                      disabled={actionLoading}
                      className="flex items-center space-x-2"
                    >
                      <Square className="h-4 w-4" />
                      <span>Pause</span>
                    </Button>
                    <Button
                      onClick={stopTask}
                      variant="outline"
                      disabled={actionLoading}
                      className="flex items-center space-x-2"
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop</span>
                    </Button>
                  </>
                )}

                {task.status === "paused" && (
                  <>
                    <Button
                      onClick={resumeTask}
                      disabled={actionLoading}
                      className="flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>Resume</span>
                    </Button>
                    <Button
                      onClick={cancelTask}
                      variant="outline"
                      disabled={actionLoading}
                      className="flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </Button>
                  </>
                )}

                {(task.status === "failed" || task.status === "cancelled") && (
                  <Button
                    onClick={retryTask}
                    variant="outline"
                    disabled={actionLoading}
                    className="flex items-center space-x-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Retry</span>
                  </Button>
                )}

                <Button
                  onClick={() => {
                    loadTaskDetails(); // This now includes logs
                  }}
                  variant="outline"
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Task Information
                </h3>
                {getStatusBadge(task.status)}
              </div>

              <div className="space-y-4">
                {Object.entries(runtimeInfo).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-24">
                      {key}:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 text-right flex-1 ml-2">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Progress Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Progress
              </h3>

              <div className="space-y-4">
                {/* Progress Bar */}
                {(task.status === "running" ||
                  task.status === "pending" ||
                  task.status === "paused") && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Completion</span>
                      <span>{Math.round(task.progress?.percentage || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          task.status === "running"
                            ? "bg-blue-600"
                            : task.status === "pending"
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, task.progress?.percentage || 0)
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Progress Details */}
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {formatProgress(task)}
                  </div>
                  {task.progress?.message && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {task.progress.message}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Section */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Terminal className="h-5 w-5 mr-2" />
                Task Logs
              </h3>
              <div className="flex items-center space-x-2">
                {taskLogs.length > 0 && (
                  <Button
                    onClick={() => {
                      const logsText = taskLogs
                        .map(
                          (log) =>
                            `[${new Date(
                              log.timestamp
                            ).toLocaleString()}] ${log.level.toUpperCase()}: ${
                              log.message
                            }`
                        )
                        .join("\n");

                      const blob = new Blob([logsText], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `task-${task.id}-logs.txt`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download</span>
                  </Button>
                )}
                <Button
                  onClick={loadTaskDetails} // This now includes logs
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {taskLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No logs available for this task
                </div>
              ) : (
                <div className="space-y-1">
                  {taskLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-gray-400 text-xs whitespace-nowrap">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={`text-xs uppercase font-bold ${
                          log.level === "error"
                            ? "text-red-400"
                            : log.level === "warn"
                            ? "text-yellow-400"
                            : log.level === "info"
                            ? "text-blue-400"
                            : "text-green-400"
                        }`}
                      >
                        {log.level}:
                      </span>
                      <span className="text-green-400 flex-1">
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskDetails;
