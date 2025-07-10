import React, { useState } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Calendar,
  Activity,
  FileText,
  Download,
  Eye,
  BarChart3,
  Timer,
  AlertTriangle,
  Settings,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Modal,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "../ui";
import { useAlert } from "../../contexts/AlertContext";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import api from "../../services/api";

const TaskDetailModal = ({
  task,
  onClose,
  onRefresh,
  taskTypes,
  priorities,
  getStatusText,
  getStatusVariant,
  formatDuration,
}) => {
  const { showAlert } = useAlert();
  const { handleError } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  // Format date helper
  const formatDate = (date) => {
    if (!date) return "—";
    return format(new Date(date), "dd.MM.yyyy HH:mm:ss");
  };

  // Format progress percentage
  const formatProgress = (progress) => {
    if (progress === null || progress === undefined) return "—";
    return `%${progress}`;
  };

  // Get priority icon and color
  const getPriorityConfig = (priority) => {
    const configs = {
      urgent: {
        icon: AlertTriangle,
        color: "text-red-600",
        bgColor: "bg-red-50",
      },
      high: {
        icon: ArrowUp,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      normal: { icon: Minus, color: "text-blue-600", bgColor: "bg-blue-50" },
      low: { icon: ArrowDown, color: "text-gray-600", bgColor: "bg-gray-50" },
    };
    return configs[priority] || configs.normal;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      running: Loader2,
      completed: CheckCircle,
      failed: XCircle,
      cancelled: XCircle,
      paused: Pause,
    };
    return icons[status] || Clock;
  };

  // Task action handlers
  const handleTaskAction = async (action) => {
    try {
      setActionLoading(action);

      switch (action) {
        case "start":
          await api.post(`/api/background-tasks/${task.id}/start`);
          break;
        case "pause":
          await api.post(`/api/background-tasks/${task.id}/pause`);
          break;
        case "resume":
          await api.post(`/api/background-tasks/${task.id}/resume`);
          break;
        case "cancel":
          await api.post(`/api/background-tasks/${task.id}/cancel`);
          break;
        case "retry":
          await api.post(`/api/background-tasks/${task.id}/retry`);
          break;
        case "delete":
          if (window.confirm("Bu görevi silmek istediğinizden emin misiniz?")) {
            await api.delete(`/api/background-tasks/${task.id}`);
            showAlert("Görev başarıyla silindi", "success");
            onClose();
            onRefresh();
            return;
          } else {
            setActionLoading(null);
            return;
          }
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      showAlert(`Görev ${action} işlemi başarılı`, "success");
      onRefresh();
    } catch (error) {
      handleError(error, `Görev ${action} işlemi başarısız`);
    } finally {
      setActionLoading(null);
    }
  };

  // Download logs
  const handleDownloadLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/background-tasks/${task.id}/logs`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `task-${task.id}-logs.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showAlert("Loglar indirildi", "success");
    } catch (error) {
      handleError(error, "Log indirme başarısız");
    } finally {
      setLoading(false);
    }
  };

  // Render action buttons based on task status
  const renderActionButtons = () => {
    const buttons = [];

    if (task.status === "pending" || task.status === "paused") {
      buttons.push(
        <Button
          key="start"
          variant="success"
          size="sm"
          icon={Play}
          loading={actionLoading === "start"}
          onClick={() => handleTaskAction("start")}
        >
          Başlat
        </Button>
      );
    }

    if (task.status === "running") {
      buttons.push(
        <Button
          key="pause"
          variant="warning"
          size="sm"
          icon={Pause}
          loading={actionLoading === "pause"}
          onClick={() => handleTaskAction("pause")}
        >
          Duraklat
        </Button>
      );
    }

    if (task.status === "paused") {
      buttons.push(
        <Button
          key="resume"
          variant="primary"
          size="sm"
          icon={Play}
          loading={actionLoading === "resume"}
          onClick={() => handleTaskAction("resume")}
        >
          Devam Et
        </Button>
      );
    }

    if (["running", "pending", "paused"].includes(task.status)) {
      buttons.push(
        <Button
          key="cancel"
          variant="danger"
          size="sm"
          icon={Square}
          loading={actionLoading === "cancel"}
          onClick={() => handleTaskAction("cancel")}
        >
          İptal Et
        </Button>
      );
    }

    if (["failed", "cancelled"].includes(task.status)) {
      buttons.push(
        <Button
          key="retry"
          variant="primary"
          size="sm"
          icon={RotateCcw}
          loading={actionLoading === "retry"}
          onClick={() => handleTaskAction("retry")}
        >
          Tekrar Dene
        </Button>
      );
    }

    if (["completed", "failed", "cancelled"].includes(task.status)) {
      buttons.push(
        <Button
          key="delete"
          variant="danger"
          size="sm"
          icon={Trash2}
          loading={actionLoading === "delete"}
          onClick={() => handleTaskAction("delete")}
        >
          Sil
        </Button>
      );
    }

    return buttons;
  };

  const StatusIcon = getStatusIcon(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const PriorityIcon = priorityConfig.icon;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="xl"
      title="Görev Detayları"
      className="task-detail-modal"
    >
      <div className="space-y-6">
        {/* Task Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {taskTypes[task.taskType] || task.taskType}
              </h2>
              <Badge variant={getStatusVariant(task.status)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {getStatusText(task.status)}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <PriorityIcon className={`w-4 h-4 ${priorityConfig.color}`} />
                <span>{priorities[task.priority] || task.priority}</span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{task.createdBy || "Sistem"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDistanceToNow(new Date(task.createdAt), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {renderActionButtons()}
          </div>
        </div>

        {/* Progress Bar (for running tasks) */}
        {task.status === "running" && task.progress !== null && (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>İlerleme</span>
                  <span>{formatProgress(task.progress)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Temel Bilgiler</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">ID:</span>
                  <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                    {task.id}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Tip:</span>
                  <div className="mt-1">
                    {taskTypes[task.taskType] || task.taskType}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Durum:</span>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(task.status)}>
                      {getStatusText(task.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Öncelik:</span>
                  <div className="mt-1">
                    <Badge className={priorityConfig.bgColor}>
                      <PriorityIcon
                        className={`w-3 h-3 mr-1 ${priorityConfig.color}`}
                      />
                      {priorities[task.priority] || task.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">İlerleme:</span>
                  <div className="mt-1">{formatProgress(task.progress)}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Süre:</span>
                  <div className="mt-1">{formatDuration(task.duration)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Timer className="w-4 h-4" />
                <span>Zaman Bilgileri</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">
                    Oluşturulma:
                  </span>
                  <div className="mt-1">{formatDate(task.createdAt)}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Başlangıç:</span>
                  <div className="mt-1">{formatDate(task.startedAt)}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Tamamlanma:</span>
                  <div className="mt-1">{formatDate(task.completedAt)}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">
                    Son Güncelleme:
                  </span>
                  <div className="mt-1">{formatDate(task.updatedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {task.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Açıklama</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {task.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        {task.metadata && Object.keys(task.metadata).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Metadata</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(task.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Error Information (for failed tasks) */}
        {task.status === "failed" && task.error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Hata Bilgisi</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <pre className="text-sm text-red-800 whitespace-pre-wrap overflow-x-auto">
                  {task.error}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Loglar</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={handleDownloadLogs}
                  loading={loading}
                >
                  İndir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={showLogs ? Eye : Eye}
                  onClick={() => setShowLogs(!showLogs)}
                >
                  {showLogs ? "Gizle" : "Göster"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          {showLogs && (
            <CardContent>
              {task.logs && task.logs.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {task.logs.map((log, index) => (
                    <div
                      key={index}
                      className="text-xs bg-gray-50 p-2 rounded border-l-2 border-gray-300"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-600">
                          {log.level?.toUpperCase() || "INFO"}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <div className="text-gray-800 whitespace-pre-wrap">
                        {log.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Henüz log kaydı bulunmuyor
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Related Tasks (if parent/child relationships exist) */}
        {(task.parentTaskId ||
          (task.childTasks && task.childTasks.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>İlgili Görevler</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.parentTaskId && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-600">
                    Üst Görev:
                  </span>
                  <div className="mt-1 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                    #{task.parentTaskId}
                  </div>
                </div>
              )}
              {task.childTasks && task.childTasks.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Alt Görevler:
                  </span>
                  <div className="mt-1 space-y-1">
                    {task.childTasks.map((childTask) => (
                      <div
                        key={childTask.id}
                        className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        #{childTask.id} -{" "}
                        {taskTypes[childTask.taskType] || childTask.taskType}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default TaskDetailModal;
