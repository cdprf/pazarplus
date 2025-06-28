import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  QuestionAnswer,
  Plus,
  Search,
  Download,
  Edit,
  Eye,
  RefreshCw,
  Filter,
  MoreHorizontal,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  ArrowUpDown,
  Loader2,
  AlertTriangle,
  MessageSquare,
  User,
  Calendar,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import api from "../services/api";
import { useAlert } from "../contexts/AlertContext";
import { Button } from "./ui/Button";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Modal } from "./ui/Modal";

const CustomerQuestions = () => {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // State management
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [recordCount, setRecordCount] = useState(20);
  const [sortConfig, setSortConfig] = useState({
    key: "creation_date",
    direction: "desc",
  });

  // Enhanced filters state
  const [filters, setFilters] = useState({
    status: "all",
    platform: "all",
    dateFrom: "",
    dateTo: "",
    priority: "all",
    sortBy: "creation_date",
    sortOrder: "desc",
  });
  const [filterErrors, setFilterErrors] = useState({});

  // Enhanced stats state
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    answered: 0,
    rejected: 0,
    autoClosed: 0,
    avgResponseTime: 0,
  });

  const [templates, setTemplates] = useState([]);
  const [replyDialog, setReplyDialog] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyType, setReplyType] = useState("answer");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // API functions
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage,
        limit: recordCount,
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction,
      });

      if (filters.platform !== "all") {
        params.append("platform", filters.platform);
      }
      if (filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.priority !== "all") {
        params.append("priority", filters.priority);
      }
      if (filters.dateFrom) {
        params.append("start_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("end_date", filters.dateTo);
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await api.get(
        `/customer-questions?${params.toString()}`
      );

      if (response.data.success) {
        setQuestions(response.data.data || []);
        setPagination({
          totalPages: Math.ceil(
            (response.data.pagination?.total || 0) / recordCount
          ),
          total: response.data.pagination?.total || 0,
        });
        setTotalRecords(response.data.pagination?.total || 0);
      } else {
        throw new Error(response.data.message || "Failed to load questions");
      }
    } catch (err) {
      console.error("Error loading questions:", err);
      setError(err.message || "Failed to load questions");
      showAlert("Sorular yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, recordCount, sortConfig, filters, searchTerm, showAlert]);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get("/customer-questions/stats");
      if (response.data.success) {
        const statsData = response.data.data;
        setStats({
          total: statsData.totalQuestions || 0,
          waiting: statsData.openQuestions || 0,
          answered: statsData.answeredQuestions || 0,
          rejected: statsData.rejectedQuestions || 0,
          autoClosed: statsData.autoClosedQuestions || 0,
          avgResponseTime: Math.round(parseFloat(statsData.responseRate) || 0),
        });
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await api.get("/customer-questions/templates");
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (err) {
      console.error("Error loading templates:", err);
    }
  }, []);

  const syncQuestions = useCallback(async () => {
    try {
      setSyncing(true);
      const response = await api.post("/customer-questions/sync", {
        platforms: ["trendyol", "hepsiburada", "n11"],
      });

      if (response.data.success) {
        showAlert(
          `${response.data.data.totalSynced} soru senkronize edildi`,
          "success"
        );
        await loadQuestions();
        await loadStats();
      } else {
        throw new Error(response.data.message || "Sync failed");
      }
    } catch (err) {
      console.error("Error syncing questions:", err);
      showAlert("Senkronizasyon sırasında hata oluştu", "error");
    } finally {
      setSyncing(false);
    }
  }, [loadQuestions, loadStats, showAlert]);

  const handleReply = useCallback(async () => {
    if (!selectedQuestion || !replyText.trim()) return;

    try {
      const response = await api.post(
        `/customer-questions/${selectedQuestion.id}/reply`,
        {
          text: replyText,
          type: replyType,
        }
      );

      if (response.data.success) {
        showAlert("Yanıt başarıyla gönderildi", "success");
        setReplyDialog(false);
        setReplyText("");
        setSelectedQuestion(null);
        await loadQuestions();
        await loadStats();
      } else {
        throw new Error(response.data.message || "Reply failed");
      }
    } catch (err) {
      console.error("Error sending reply:", err);
      showAlert("Yanıt gönderilirken hata oluştu", "error");
    }
  }, [
    selectedQuestion,
    replyText,
    replyType,
    loadQuestions,
    loadStats,
    showAlert,
  ]);

  // Effects
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadStats();
    loadTemplates();
  }, [loadStats, loadTemplates]);

  // Helper functions similar to Orders page
  const getStatusIcon = useCallback((status) => {
    const iconMap = {
      WAITING_FOR_ANSWER: "⏳",
      ANSWERED: "✅",
      REJECTED: "❌",
      AUTO_CLOSED: "🔒",
    };
    return iconMap[status] || "❓";
  }, []);

  const getStatusVariant = useCallback((status) => {
    const variantMap = {
      WAITING_FOR_ANSWER: "warning",
      ANSWERED: "success",
      REJECTED: "danger",
      AUTO_CLOSED: "secondary",
    };
    return variantMap[status] || "secondary";
  }, []);

  const getStatusText = useCallback((status) => {
    const textMap = {
      WAITING_FOR_ANSWER: "Cevaplanmayı Bekliyor",
      ANSWERED: "Cevaplanmış",
      REJECTED: "Reddedilmiş",
      AUTO_CLOSED: "Otomatik Kapatılmış",
    };
    return textMap[status] || status;
  }, []);

  const getPlatformVariant = useCallback((platform) => {
    const variantMap = {
      trendyol: "primary",
      hepsiburada: "warning",
      n11: "info",
    };
    return variantMap[platform] || "secondary";
  }, []);

  const getPlatformText = useCallback((platform) => {
    const textMap = {
      trendyol: "Trendyol",
      hepsiburada: "Hepsiburada",
      n11: "N11",
    };
    return textMap[platform] || platform;
  }, []);

  // Loading and error states
  if (loading && questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">
            Müşteri soruları yükleniyor...
          </span>
        </div>
      </div>
    );
  }

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
            <Button onClick={loadQuestions} variant="primary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tekrar Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Müşteri Soruları
                  </h1>
                  <p className="text-sm text-gray-500">
                    Tüm platform müşteri sorularınızı tek yerden yönetin
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={loadQuestions}
                  variant="outline"
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>Yenile</span>
                </Button>

                <Button
                  onClick={syncQuestions}
                  variant="outline"
                  disabled={syncing}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                  />
                  <span>
                    {syncing ? "Senkronize Ediliyor..." : "Senkronize Et"}
                  </span>
                </Button>

                <Button
                  onClick={() => {
                    /* Export functionality */
                  }}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Dışa Aktar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Toplam</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Bekleyenler
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.waiting}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Cevaplanmış
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.answered}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <X className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Reddedilmiş
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.rejected}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-gray-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Otomatik Kapalı
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.autoClosed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Ort. Yanıt
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.avgResponseTime}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Soru içeriği, müşteri adı veya ürün adı ara..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.platform}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      platform: e.target.value,
                    }))
                  }
                >
                  <option value="all">Tüm Platformlar</option>
                  <option value="trendyol">Trendyol</option>
                  <option value="hepsiburada">Hepsiburada</option>
                  <option value="n11">N11</option>
                </select>

                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="WAITING_FOR_ANSWER">
                    Cevaplanmayı Bekliyor
                  </option>
                  <option value="ANSWERED">Cevaplanmış</option>
                  <option value="REJECTED">Reddedilmiş</option>
                  <option value="AUTO_CLOSED">Otomatik Kapatılmış</option>
                </select>

                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtreler</span>
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Öncelik
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={filters.priority}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          priority: e.target.value,
                        }))
                      }
                    >
                      <option value="all">Tüm Öncelikler</option>
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestions(questions.map((q) => q.id));
                          } else {
                            setSelectedQuestions([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Soru
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Henüz soru bulunamadı
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Platformlardan soruları senkronize etmek için
                          yukarıdaki "Senkronize Et" butonunu kullanın.
                        </p>
                        <Button
                          onClick={syncQuestions}
                          variant="primary"
                          disabled={syncing}
                        >
                          <RefreshCw
                            className={`h-4 w-4 mr-2 ${
                              syncing ? "animate-spin" : ""
                            }`}
                          />
                          {syncing
                            ? "Senkronize Ediliyor..."
                            : "Şimdi Senkronize Et"}
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    questions.map((question) => (
                      <tr key={question.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedQuestions.includes(question.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestions([
                                  ...selectedQuestions,
                                  question.id,
                                ]);
                              } else {
                                setSelectedQuestions(
                                  selectedQuestions.filter(
                                    (id) => id !== question.id
                                  )
                                );
                              }
                            }}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {question.product_name}
                            </p>
                            <p
                              className="text-sm text-gray-500 truncate"
                              title={question.question_text}
                            >
                              {question.question_text}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {question.customer_name || "Bilinmeyen"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={getPlatformVariant(question.platform)}
                          >
                            {getPlatformText(question.platform)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusVariant(question.status)}>
                            <span className="mr-1">
                              {getStatusIcon(question.status)}
                            </span>
                            {getStatusText(question.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(
                              new Date(question.creation_date),
                              "dd/MM/yyyy",
                              { locale: tr }
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDistanceToNow(
                              new Date(question.creation_date),
                              {
                                addSuffix: true,
                                locale: tr,
                              }
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <Button
                              onClick={() => {
                                setSelectedQuestion(question);
                                setShowModal(true);
                                setModalMode("view");
                              }}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {question.status === "WAITING_FOR_ANSWER" && (
                              <Button
                                onClick={() => {
                                  setSelectedQuestion(question);
                                  setReplyDialog(true);
                                  setReplyText("");
                                }}
                                variant="primary"
                                size="sm"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              onClick={() => {
                                if (question.platform_question_url) {
                                  window.open(
                                    question.platform_question_url,
                                    "_blank"
                                  );
                                }
                              }}
                              variant="outline"
                              size="sm"
                              disabled={!question.platform_question_url}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {questions.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Sayfa başına:</span>
                    <select
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      value={recordCount}
                      onChange={(e) => setRecordCount(parseInt(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      {pagination.total} kayıttan{" "}
                      {Math.min(
                        (currentPage - 1) * recordCount + 1,
                        pagination.total
                      )}
                      -{Math.min(currentPage * recordCount, pagination.total)}{" "}
                      arası gösteriliyor
                    </span>

                    <div className="flex space-x-1">
                      <Button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Önceki
                      </Button>
                      <Button
                        onClick={() =>
                          setCurrentPage(
                            Math.min(pagination.totalPages, currentPage + 1)
                          )
                        }
                        disabled={currentPage >= pagination.totalPages}
                        variant="outline"
                        size="sm"
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reply Modal */}
      {replyDialog && selectedQuestion && (
        <Modal
          isOpen={replyDialog}
          onClose={() => setReplyDialog(false)}
          title="Soruya Yanıt Ver"
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Soru:</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {selectedQuestion.question_text}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yanıt Türü
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={replyType}
                onChange={(e) => setReplyType(e.target.value)}
              >
                <option value="answer">Cevap Ver</option>
                <option value="reject">Reddet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yanıt Metni
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Yanıtınızı buraya yazın..."
              />
            </div>

            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hazır Şablon
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    const template = templates.find(
                      (t) => t.id === parseInt(e.target.value)
                    );
                    if (template) {
                      setReplyText(template.content);
                    }
                  }}
                >
                  <option value="">Şablon seçin...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button onClick={() => setReplyDialog(false)} variant="outline">
                İptal
              </Button>
              <Button
                onClick={handleReply}
                variant="primary"
                disabled={!replyText.trim()}
              >
                Yanıt Gönder
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Question Modal */}
      {showModal && selectedQuestion && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Soru Detayları"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Platform
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {getPlatformText(selectedQuestion.platform)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durum
                </label>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(selectedQuestion.status)}>
                    {getStatusText(selectedQuestion.status)}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Müşteri
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedQuestion.customer_name || "Bilinmeyen"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ürün
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedQuestion.product_name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Soru
              </label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                {selectedQuestion.question_text}
              </p>
            </div>

            {/* Display replies if available */}
            {selectedQuestion.replies &&
              selectedQuestion.replies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yanıtlar ({selectedQuestion.replies.length})
                  </label>
                  <div className="space-y-3">
                    {selectedQuestion.replies.map((reply, index) => (
                      <div
                        key={reply.id}
                        className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-medium text-green-600 uppercase">
                            {reply.reply_type === "reject"
                              ? "Reddedildi"
                              : "Yanıtlandı"}
                          </span>
                          <div className="text-xs text-gray-500">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                reply.status === "sent"
                                  ? "bg-green-100 text-green-800"
                                  : reply.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {reply.status === "sent"
                                ? "Gönderildi"
                                : reply.status === "failed"
                                ? "Başarısız"
                                : "Taslak"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-900">
                          {reply.reply_text}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          {reply.sent_date ? (
                            <>
                              Gönderildi:{" "}
                              {format(
                                new Date(reply.sent_date),
                                "dd/MM/yyyy HH:mm",
                                { locale: tr }
                              )}
                            </>
                          ) : (
                            <>
                              Oluşturuldu:{" "}
                              {format(
                                new Date(reply.creation_date),
                                "dd/MM/yyyy HH:mm",
                                { locale: tr }
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Show message if no replies for answered questions */}
            {selectedQuestion.status === "ANSWERED" &&
              (!selectedQuestion.replies ||
                selectedQuestion.replies.length === 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Yanıt
                  </label>
                  <p className="mt-1 text-sm text-gray-500 bg-yellow-50 p-3 rounded">
                    Bu soru yanıtlanmış olarak işaretlenmiş ancak yanıt
                    detayları mevcut değil.
                  </p>
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Soru Tarihi
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {format(
                    new Date(selectedQuestion.creation_date),
                    "dd/MM/yyyy HH:mm",
                    { locale: tr }
                  )}
                </p>
              </div>
              {selectedQuestion.answered_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Yanıtlanma Tarihi
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(
                      new Date(selectedQuestion.answered_date),
                      "dd/MM/yyyy HH:mm",
                      { locale: tr }
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowModal(false)} variant="outline">
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerQuestions;
