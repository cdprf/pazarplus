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

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case "WAITING_FOR_ANSWER":
        return "warning";
      case "ANSWERED":
        return "success";
      case "REJECTED":
        return "error";
      case "AUTO_CLOSED":
        return "default";
      default:
        return "default";
    }
  };

  // Platform color mapping
  const getPlatformColor = (platform) => {
    switch (platform) {
      case "trendyol":
        return "#FF6000";
      case "hepsiburada":
        return "#FF6000";
      case "n11":
        return "#1B365D";
      default:
        return "#666";
    }
  };

  // Priority color mapping
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  // Show snackbar
  const showSnackbar = useCallback((message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Navigate to customer profile
  const navigateToCustomerProfile = useCallback(
    (customerEmail, customerName) => {
      if (customerEmail) {
        navigate(`/customers/${encodeURIComponent(customerEmail)}`);
      } else if (customerName) {
        // If no email, search by name in customer management
        navigate(`/customers?search=${encodeURIComponent(customerName)}`);
      }
    },
    [navigate]
  );

  // Load questions
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page + 1,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value)
        ),
      });

      const response = await api.get(`/customer-questions?${params}`);

      if (response.data.success) {
        setQuestions(response.data.data);
        setPagination((prev) => ({
          ...prev,
          totalItems: response.data.pagination.totalItems,
          totalPages: response.data.pagination.totalPages,
        }));
      }
    } catch (error) {
      showSnackbar("Failed to load questions", "error");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, showSnackbar]);

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await api.get("/customer-questions/stats");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  // Load reply templates
  const loadTemplates = async () => {
    try {
      const response = await api.get("/customer-questions/templates");
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  };

  // Sync questions from platforms
  const syncQuestions = async () => {
    try {
      setSyncing(true);
      const response = await api.post("/customer-questions/sync", {
        start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        end_date: new Date().toISOString(),
      });

      if (response.data.success) {
        showSnackbar(
          `Synced ${response.data.data.totalSynced} questions`,
          "success"
        );
        await loadQuestions();
        await loadStats();
      }
    } catch (error) {
      showSnackbar("Failed to sync questions", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Handle reply to question
  const handleReply = async () => {
    if (!replyText.trim()) {
      showSnackbar("Please enter a reply", "warning");
      return;
    }

    try {
      const response = await api.post(
        `/customer-questions/${selectedQuestion.id}/reply`,
        {
          text: replyText,
          type: replyType,
          template_id: selectedTemplate || undefined,
        }
      );

      if (response.data.success) {
        showSnackbar("Reply sent successfully", "success");
        setReplyDialog(false);
        setReplyText("");
        setSelectedTemplate("");
        await loadQuestions();
      }
    } catch (error) {
      showSnackbar("Failed to send reply", "error");
    }
  };

  // Apply template to reply
  const applyTemplate = (template) => {
    setReplyText(template.content);
    setSelectedTemplate(template.id);
  };

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, page: 0 })); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0,
    }));
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (expireDate) => {
    if (!expireDate) return null;
    const now = new Date();
    const expire = new Date(expireDate);
    const diffTime = expire - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Effects
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadStats();
    loadTemplates();
  }, []);

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
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Müşteri soruları yükleniyor...</span>
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
                  onClick={() => {/* Export functionality */}}
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
                  <p className="text-sm font-medium text-gray-500">Bekleyenler</p>
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
                  <p className="text-sm font-medium text-gray-500">Cevaplanmış</p>
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
                  <p className="text-sm font-medium text-gray-500">Reddedilmiş</p>
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
                  <p className="text-sm font-medium text-gray-500">Otomatik Kapalı</p>
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
                  <p className="text-sm font-medium text-gray-500">Ort. Yanıt</p>
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
                    setFilters((prev) => ({ ...prev, platform: e.target.value }))
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
                  <option value="WAITING_FOR_ANSWER">Cevaplanmayı Bekliyor</option>
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
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadQuestions}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}
            onClick={syncQuestions}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync Questions"}
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Questions
                </Typography>
                <Typography variant="h4">{stats.totalQuestions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Waiting for Answer
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {stats.statusCounts?.find(
                    (s) => s.status === "WAITING_FOR_ANSWER"
                  )?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Answered
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.statusCounts?.find((s) => s.status === "ANSWERED")
                    ?.count || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Frequent Questions
                </Typography>
                <Typography variant="h4" color="info.main">
                  {stats.frequentQuestions?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterList sx={{ mr: 1, verticalAlign: "middle" }} />
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Platform</InputLabel>
                <Select
                  value={filters.platform}
                  onChange={(e) =>
                    handleFilterChange("platform", e.target.value)
                  }
                  label="Platform"
                >
                  <MenuItem value="">All Platforms</MenuItem>
                  <MenuItem value="trendyol">Trendyol</MenuItem>
                  <MenuItem value="hepsiburada">HepsiBurada</MenuItem>
                  <MenuItem value="n11">N11</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="WAITING_FOR_ANSWER">
                    Waiting for Answer
                  </MenuItem>
                  <MenuItem value="ANSWERED">Answered</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="AUTO_CLOSED">Auto Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) =>
                    handleFilterChange("priority", e.target.value)
                  }
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Customer Name"
                value={filters.customer_name}
                onChange={(e) =>
                  handleFilterChange("customer_name", e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() =>
                  setFilters({
                    platform: "",
                    status: "",
                    priority: "",
                    customer_name: "",
                    start_date: "",
                    end_date: "",
                  })
                }
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer & Platform</TableCell>
                <TableCell>Question</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No questions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((question) => {
                  const daysUntilExpiry = getDaysUntilExpiry(
                    question.expire_date
                  );
                  const isOverdue =
                    daysUntilExpiry !== null && daysUntilExpiry < 0;

                  return (
                    <TableRow key={question.id} hover>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: getPlatformColor(question.platform),
                              width: 32,
                              height: 32,
                            }}
                          >
                            <Store fontSize="small" />
                          </Avatar>
                          <Box>
                            <Link
                              component="button"
                              variant="body2"
                              fontWeight="bold"
                              onClick={() =>
                                navigateToCustomerProfile(
                                  question.customer_email,
                                  question.customer_name
                                )
                              }
                              sx={{
                                textDecoration: "none",
                                "&:hover": { textDecoration: "underline" },
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              {question.customer_name || "Unknown"}
                            </Link>
                            <Chip
                              label={question.platform}
                              size="small"
                              sx={{
                                bgcolor: getPlatformColor(question.platform),
                                color: "white",
                                fontSize: "0.7rem",
                              }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {question.question_text}
                        </Typography>
                        {question.similar_questions_count > 0 && (
                          <Chip
                            label={`${question.similar_questions_count} similar`}
                            size="small"
                            color="info"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {question.product_name ? (
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {question.product_name}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No product
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={question.status.replace("_", " ")}
                          color={getStatusColor(question.status)}
                          size="small"
                        />
                        {isOverdue && (
                          <Tooltip title="Overdue">
                            <Schedule color="error" sx={{ ml: 1 }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={question.priority}
                          color={getPriorityColor(question.priority)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(
                            new Date(question.creation_date),
                            "MMM d, yyyy"
                          )}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDistanceToNow(
                            new Date(question.creation_date)
                          )}{" "}
                          ago
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedQuestion(question)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {question.status === "WAITING_FOR_ANSWER" && (
                            <Tooltip title="Reply">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedQuestion(question);
                                  setReplyDialog(true);
                                }}
                              >
                                <Reply />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.totalItems}
          page={pagination.page}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Paper>

      {/* Reply Dialog */}
      <Dialog
        open={replyDialog}
        onClose={() => setReplyDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Reply to Customer Question</DialogTitle>
        <DialogContent>
          {selectedQuestion && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Customer:{" "}
                <Link
                  component="button"
                  variant="subtitle2"
                  onClick={() =>
                    navigateToCustomerProfile(
                      selectedQuestion.customer_email,
                      selectedQuestion.customer_name
                    )
                  }
                  sx={{
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                    cursor: "pointer",
                  }}
                >
                  {selectedQuestion.customer_name}
                </Link>
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Question:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.50", mb: 2 }}>
                <Typography variant="body2">
                  {selectedQuestion.question_text}
                </Typography>
              </Paper>
            </Box>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Reply Type</InputLabel>
            <Select
              value={replyType}
              onChange={(e) => setReplyType(e.target.value)}
              label="Reply Type"
            >
              <MenuItem value="answer">Answer</MenuItem>
              <MenuItem value="reject">Report as Inappropriate</MenuItem>
            </Select>
          </FormControl>

          {templates.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Templates:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {templates.slice(0, 5).map((template) => (
                  <Chip
                    key={template.id}
                    label={template.name}
                    clickable
                    onClick={() => applyTemplate(template)}
                    color={
                      selectedTemplate === template.id ? "primary" : "default"
                    }
                  />
                ))}
              </Box>
            </Box>
          )}

          <TextField
            fullWidth
            multiline
            rows={6}
            label={
              replyType === "answer" ? "Your Answer" : "Reason for Rejection"
            }
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            helperText={`${replyText.length}/2000 characters`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReply}
            disabled={!replyText.trim() || replyText.length > 2000}
          >
            Send Reply
          </Button>
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
};

export default CustomerQuestions;
