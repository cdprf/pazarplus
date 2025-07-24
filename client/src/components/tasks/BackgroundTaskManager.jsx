import logger from "../../utils/logger";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNetworkAwareInterval } from "../../hooks/useNetworkStatus";
import {
  Activity,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  Eye,
  Filter,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  BarChart3,
  AlertTriangle,
  User,
  ArrowUpDown,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { Button, Card, CardContent, Badge } from "../ui";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import TaskDetailModal from "./TaskDetailModal";

const BackgroundTaskManager = () => {
  const { showAlert } = useAlert();
  const { handleError } = useErrorHandler();
  const searchInputRef = useRef(null);

  // State management
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [recordCount] = useState(20);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  // Enhanced filters state
  const [filters, setFilters] = useState({
    status: "all",
    taskType: "all",
    priority: "all",
    dateFrom: "",
    dateTo: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    paused: 0,
    avgDuration: 0,
  });

  // Task type definitions
  const taskTypes = {
    order_fetching: "Sipariş Çekme",
    product_sync: "Ürün Senkronizasyonu",
    inventory_sync: "Stok Senkronizasyonu",
    bulk_operation: "Toplu İşlem",
    analytics_update: "Analitik Güncelleme",
    customer_sync: "Müşteri Senkronizasyonu",
    shipping_label_generation: "Kargo Etiketi",
    report_generation: "Rapor Oluşturma",
    data_export: "Veri Dışa Aktarma",
    data_import: "Veri İçe Aktarma",
  };

  // Priority definitions
  const priorities = {
    low: "Düşük",
    normal: "Normal",
    high: "Yüksek",
    urgent: "Acil",
  };

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: recordCount,
        ...filters,
        search: searchTerm.trim(),
      };

      const response = await api.get("/background-tasks", { params });

      if (response.data.success) {
        setTasks(response.data.data || []);
        setPagination(response.data.pagination || { totalPages: 1, total: 0 });
      } else {
        throw new Error(response.data.message || "Failed to load tasks");
      }
    } catch (err) {
      logger.error("Error loading tasks:", err);
      setError(err.message);
      handleError(err, "Görevler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [currentPage, recordCount, filters, searchTerm, handleError]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const response = await api.get("/background-tasks/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      logger.error("Error loading stats:", err);
    }
  }, []);

  // Effects
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Auto-refresh every 30 seconds with network awareness
  useNetworkAwareInterval(() => {
    if (!loading) {
      loadTasks();
      loadStats();
    }
  }, 30000);

  // Helper functions
  const getStatusIcon = useCallback((status) => {
    const iconMap = {
      pending: Clock,
      queued: Clock,
      running: Play,
      paused: Pause,
      completed: CheckCircle,
      failed: XCircle,
      cancelled: Square,
      timeout: AlertTriangle,
    };
    return iconMap[status] || AlertCircle;
  }, []);

  const getStatusVariant = useCallback((status) => {
    const variantMap = {
      pending: "warning",
      queued: "info",
      running: "primary",
      paused: "secondary",
      completed: "success",
      failed: "danger",
      cancelled: "secondary",
      timeout: "danger",
    };
    return variantMap[status] || "secondary";
  }, []);

  const getStatusText = useCallback((status) => {
    const textMap = {
      pending: "Beklemede",
      queued: "Sırada",
      running: "Çalışıyor",
      paused: "Duraklatıldı",
      completed: "Tamamlandı",
      failed: "Başarısız",
      cancelled: "İptal Edildi",
      timeout: "Zaman Aşımı",
    };
    return textMap[status] || status;
  }, []);

  const getPriorityVariant = useCallback((priority) => {
    const variantMap = {
      low: "secondary",
      normal: "info",
      high: "warning",
      urgent: "danger",
    };
    return variantMap[priority] || "secondary";
  }, []);

  const formatDuration = useCallback((seconds) => {
    if (!seconds) return "-";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}s ${minutes}d ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}d ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  const getProgressColor = useCallback((percentage) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-gray-400";
  }, []);

  // Task operations
  const handleStartTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/background-tasks/${taskId}/start`);
        showAlert("Görev başlatıldı", "success");
        loadTasks();
      } catch (error) {
        handleError(error, "Görev başlatılırken hata oluştu");
      }
    },
    [showAlert, handleError, loadTasks]
  );

  const handlePauseTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/background-tasks/${taskId}/pause`);
        showAlert("Görev duraklatıldı", "success");
        loadTasks();
      } catch (error) {
        handleError(error, "Görev duraklatılırken hata oluştu");
      }
    },
    [showAlert, handleError, loadTasks]
  );

  const handleResumeTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/background-tasks/${taskId}/resume`);
        showAlert("Görev devam ettirildi", "success");
        loadTasks();
      } catch (error) {
        handleError(error, "Görev devam ettirilirken hata oluştu");
      }
    },
    [showAlert, handleError, loadTasks]
  );

  const handleCancelTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/background-tasks/${taskId}/cancel`, {
          reason: "Kullanıcı tarafından iptal edildi",
        });
        showAlert("Görev iptal edildi", "success");
        loadTasks();
      } catch (error) {
        handleError(error, "Görev iptal edilirken hata oluştu");
      }
    },
    [showAlert, handleError, loadTasks]
  );

  const handleRetryTask = useCallback(
    async (taskId) => {
      try {
        await api.post(`/background-tasks/${taskId}/retry`);
        showAlert("Görev yeniden başlatıldı", "success");
        loadTasks();
      } catch (error) {
        handleError(error, "Görev yeniden başlatılırken hata oluştu");
      }
    },
    [showAlert, handleError, loadTasks]
  );

  const handleDeleteTask = useCallback(
    async (taskId) => {
      if (!window.confirm("Bu görevi silmek istediğinizden emin misiniz?")) {
        return;
      }

      try {
        await api.delete(`/background-tasks/${taskId}`);
        showAlert("Görev silindi", "success");
        loadTasks();
      } catch (error) {
        handleError(error, "Görev silinirken hata oluştu");
      }
    },
    [showAlert, handleError, loadTasks]
  );

  const handleViewTask = useCallback((task) => {
    setSelectedTask(task);
    setShowModal(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadTasks(), loadStats()]);
    setRefreshing(false);
    showAlert("Veriler güncellendi", "success");
  }, [loadTasks, loadStats, showAlert]);

  // Bulk operations
  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedTasks(tasks.map((task) => task.id));
      } else {
        setSelectedTasks([]);
      }
    },
    [tasks]
  );

  const handleSelectTask = useCallback((taskId, checked) => {
    if (checked) {
      setSelectedTasks((prev) => [...prev, taskId]);
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
    }
  }, []);

  const handleBulkCancel = useCallback(async () => {
    if (selectedTasks.length === 0) {
      showAlert("Lütfen iptal edilecek görevleri seçin", "warning");
      return;
    }

    try {
      await api.post("/background-tasks/bulk", {
        taskIds: selectedTasks,
        operation: "cancel",
        options: { reason: "Toplu iptal" },
      });
      showAlert(`${selectedTasks.length} görev iptal edildi`, "success");
      setSelectedTasks([]);
      loadTasks();
    } catch (error) {
      handleError(error, "Toplu iptal işlemi başarısız");
    }
  }, [selectedTasks, showAlert, handleError, loadTasks]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTasks.length === 0) {
      showAlert("Lütfen silinecek görevleri seçin", "warning");
      return;
    }

    if (
      !window.confirm(
        `${selectedTasks.length} görevi silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      await api.post("/background-tasks/bulk", {
        taskIds: selectedTasks,
        operation: "delete",
      });
      showAlert(`${selectedTasks.length} görev silindi`, "success");
      setSelectedTasks([]);
      loadTasks();
    } catch (error) {
      handleError(error, "Toplu silme işlemi başarısız");
    }
  }, [selectedTasks, showAlert, handleError, loadTasks]);

  // Search and filter handlers
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: "all",
      taskType: "all",
      priority: "all",
      dateFrom: "",
      dateTo: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    setSearchTerm("");
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback(
    (key) => {
      let direction = "asc";
      if (sortConfig.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      }

      setSortConfig({ key, direction });
      setFilters((prev) => ({
        ...prev,
        sortBy: key,
        sortOrder: direction,
      }));
      setCurrentPage(1);
    },
    [sortConfig]
  );

  // Loading state
  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Görevler yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Bir hata oluştu
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadTasks} variant="primary">
              Tekrar Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              Arka Plan Görevleri
            </h1>
            <p className="text-gray-600 mt-1">
              Sistem görevlerini yönetin ve takip edin
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Yenile
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Toplam</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Bekleyen</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Çalışan</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.running}
                </p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Başarısız</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.failed}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">İptal</p>
                <p className="text-2xl font-bold text-gray-600">
                  {stats.cancelled}
                </p>
              </div>
              <Square className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Duraklatılan</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.paused}
                </p>
              </div>
              <Pause className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Ort. Süre</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatDuration(Math.round(stats.avgDuration || 0))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="bg-white mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Görev ara (ID, tür, kullanıcı...)"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <Button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Gelişmiş Filtreler
            </Button>

            {/* Bulk Actions */}
            {selectedTasks.length > 0 && (
              <div className="flex space-x-2">
                <Button onClick={handleBulkCancel} variant="outline" size="sm">
                  <Square className="h-4 w-4 mr-2" />
                  İptal Et ({selectedTasks.length})
                </Button>
                <Button onClick={handleBulkDelete} variant="danger" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil ({selectedTasks.length})
                </Button>
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    <option value="pending">Beklemede</option>
                    <option value="running">Çalışıyor</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="failed">Başarısız</option>
                    <option value="cancelled">İptal</option>
                    <option value="paused">Duraklatıldı</option>
                  </select>
                </div>

                {/* Task Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Görev Türü
                  </label>
                  <select
                    value={filters.taskType}
                    onChange={(e) =>
                      handleFilterChange("taskType", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    {Object.entries(taskTypes).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Öncelik
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) =>
                      handleFilterChange("priority", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tümü</option>
                    {Object.entries(priorities).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Filtreleri Temizle
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card className="bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedTasks.length === tasks.length &&
                        tasks.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("taskType")}
                  >
                    <div className="flex items-center">
                      Görev Türü
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Durum
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("priority")}
                  >
                    <div className="flex items-center">
                      Öncelik
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İlerleme
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center">
                      Oluşturulma
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Süre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => {
                  const StatusIcon = getStatusIcon(task.status);
                  const progress = task.progress || {
                    percentage: 0,
                    current: 0,
                    total: 0,
                    message: "",
                  };

                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={(e) =>
                            handleSelectTask(task.id, e.target.checked)
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {taskTypes[task.taskType] || task.taskType}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          ID: {task.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={getStatusVariant(task.status)}
                          className="inline-flex items-center"
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {getStatusText(task.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={getPriorityVariant(task.priority)}>
                          {priorities[task.priority] || task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-full">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>{progress.percentage}%</span>
                            <span>
                              {progress.current}/{progress.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
                                progress.percentage
                              )}`}
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                          {progress.message && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {progress.message}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDistanceToNow(new Date(task.createdAt), {
                            addSuffix: true,
                            locale: tr,
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {task.actualDuration
                            ? formatDuration(task.actualDuration)
                            : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {task.user?.firstName} {task.user?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            onClick={() => handleViewTask(task)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {task.status === "pending" && (
                            <Button
                              onClick={() => handleStartTask(task.id)}
                              variant="primary"
                              size="sm"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          {task.status === "running" && (
                            <Button
                              onClick={() => handlePauseTask(task.id)}
                              variant="warning"
                              size="sm"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}

                          {task.status === "paused" && (
                            <Button
                              onClick={() => handleResumeTask(task.id)}
                              variant="primary"
                              size="sm"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          {["pending", "running", "paused"].includes(
                            task.status
                          ) && (
                            <Button
                              onClick={() => handleCancelTask(task.id)}
                              variant="danger"
                              size="sm"
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          )}

                          {task.status === "failed" && (
                            <Button
                              onClick={() => handleRetryTask(task.id)}
                              variant="warning"
                              size="sm"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}

                          {["completed", "failed", "cancelled"].includes(
                            task.status
                          ) && (
                            <Button
                              onClick={() => handleDeleteTask(task.id)}
                              variant="danger"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz görev yok
              </h3>
              <p className="text-gray-600">
                Sistem tarafından oluşturulan görevler burada görünecek.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{pagination.total}</span>{" "}
                  sonuçtan{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * recordCount + 1}
                  </span>
                  -{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * recordCount, pagination.total)}
                  </span>{" "}
                  arası gösteriliyor
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Önceki
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Modal */}
      {showModal && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => {
            setShowModal(false);
            setSelectedTask(null);
          }}
          onRefresh={loadTasks}
          taskTypes={taskTypes}
          priorities={priorities}
          getStatusText={getStatusText}
          getStatusVariant={getStatusVariant}
          formatDuration={formatDuration}
        />
      )}
    </div>
  );
};

export default BackgroundTaskManager;
