import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Edit,
  Eye,
  Truck,
  RefreshCw,
  Filter,
  MoreHorizontal,
  X,
  CheckCircle,
  Clock,
  Package,
  AlertCircle,
  BarChart3,
  CreditCard,
  CalendarDays,
  ArrowUpDown,
  Loader2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";

const OrderManagement = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const searchInputRef = useRef(null);

  // State management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [recordCount, setRecordCount] = useState(20);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  // Enhanced filters state with validation
  const [filters, setFilters] = useState({
    status: "all",
    platform: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
    invoiceStatus: "all",
    shippingInfo: "all",
    microExport: "all",
    buyNowPayLater: "all",
    pickupPoint: "all",
    logisticsTransferred: "all",
    priceMin: "",
    priceMax: "",
    desiMin: "",
    desiMax: "",
    dateFrom: "",
    dateTo: "",
    store: "all",
  });

  const [filterErrors, setFilterErrors] = useState({});

  // Calculate stats from mapped orders
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    totalRevenue: 0,
  });

  // Date range presets
  const datePresets = [
    { label: "Bugün", value: "today" },
    { label: "Son 7 Gün", value: "7days" },
    { label: "Son 30 Gün", value: "30days" },
    { label: "Bu Ay", value: "thisMonth" },
    { label: "Geçen Ay", value: "lastMonth" },
  ];

  // Map Trendyol status to internal status
  const mapTrendyolStatus = useCallback((trendyolStatus) => {
    const statusMap = {
      Awaiting: "pending",
      Created: "processing",
      Picking: "processing",
      Shipped: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      Returned: "cancelled",
    };

    return statusMap[trendyolStatus] || "pending";
  }, []);

  // Map Trendyol address structure
  const mapTrendyolAddress = useCallback((address) => {
    if (!address) return null;

    return {
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      fullName: address.fullName,
      company: address.company,
      street: address.address1,
      address2: address.address2,
      city: address.city,
      district: address.district,
      neighborhood: address.neighborhood,
      postalCode: address.postalCode,
      country: address.countryCode,
      phone: address.phone,
      fullAddress: address.fullAddress,

      // Turkish specific fields
      cityCode: address.cityCode,
      districtId: address.districtId,
      neighborhoodId: address.neighborhoodId,
      countyId: address.countyId,
      countyName: address.countyName,
    };
  }, []);

  // Map Trendyol line items
  const mapTrendyolLineItem = useCallback((lineItem) => {
    return {
      id: lineItem.id,
      productName: lineItem.productName,
      productCode: lineItem.productCode,
      sku: lineItem.sku || lineItem.merchantSku,
      barcode: lineItem.barcode,
      quantity: lineItem.quantity,
      price: lineItem.price,
      amount: lineItem.amount,
      discount: lineItem.discount,
      tyDiscount: lineItem.tyDiscount,

      // Product details
      productSize: lineItem.productSize,
      productColor: lineItem.productColor,
      productOrigin: lineItem.productOrigin,
      productCategoryId: lineItem.productCategoryId,

      // VAT information
      vatBaseAmount: lineItem.vatBaseAmount,

      // Campaign information
      salesCampaignId: lineItem.salesCampaignId,

      // Delivery options
      fastDeliveryOptions: lineItem.fastDeliveryOptions || [],

      // Status
      status: lineItem.orderLineItemStatusName,

      // Discount details
      discountDetails: lineItem.discountDetails || [],
    };
  }, []);

  // Generate contextual tags for orders
  const generateOrderTags = useCallback((order) => {
    const tags = [];

    if (order.fastDelivery) tags.push("Hızlı Teslimat");
    if (order.commercial) tags.push("Kurumsal");
    if (order.micro) tags.push("Micro");
    if (order.giftBoxRequested) tags.push("Hediye Paketi");
    if (order.groupDeal) tags.push("Grup İndirimi");
    if (order.deliveryAddressType === "CollectionPoint")
      tags.push("Kargo Noktası");
    if (order.totalDiscount > 0) tags.push("İndirimli");
    if (order["3pByTrendyol"]) tags.push("3P by Trendyol");

    return tags;
  }, []);

  // Map Trendyol API response to internal order structure
  const mapTrendyolOrder = useCallback(
    (trendyolOrder) => {
      return {
        id: trendyolOrder.id,
        orderNumber: trendyolOrder.orderNumber,
        platform: "trendyol",

        // Customer information
        customerName: `${trendyolOrder.customerFirstName} ${trendyolOrder.customerLastName}`,
        customerFirstName: trendyolOrder.customerFirstName,
        customerLastName: trendyolOrder.customerLastName,
        customerEmail: trendyolOrder.customerEmail,
        customerId: trendyolOrder.customerId,

        // Status mapping
        status: mapTrendyolStatus(trendyolOrder.status),
        shipmentStatus: trendyolOrder.shipmentPackageStatus,
        orderLineItemStatus: trendyolOrder.lines?.[0]?.orderLineItemStatusName,

        // Financial information
        totalAmount: trendyolOrder.totalPrice || 0,
        grossAmount: trendyolOrder.grossAmount || 0,
        totalDiscount: trendyolOrder.totalDiscount || 0,
        totalTyDiscount: trendyolOrder.totalTyDiscount || 0,
        currency: trendyolOrder.currencyCode || "TRY",

        // Dates
        createdAt: new Date(trendyolOrder.orderDate).toISOString(),
        orderDate: trendyolOrder.orderDate,
        lastModifiedDate: trendyolOrder.lastModifiedDate,
        estimatedDeliveryStartDate: trendyolOrder.estimatedDeliveryStartDate,
        estimatedDeliveryEndDate: trendyolOrder.estimatedDeliveryEndDate,
        agreedDeliveryDate: trendyolOrder.agreedDeliveryDate,

        // Shipping information
        shippingAddress: mapTrendyolAddress(trendyolOrder.shipmentAddress),
        invoiceAddress: mapTrendyolAddress(trendyolOrder.invoiceAddress),
        deliveryType: trendyolOrder.deliveryType,
        deliveryAddressType: trendyolOrder.deliveryAddressType,

        // Cargo information
        cargoTrackingNumber: trendyolOrder.cargoTrackingNumber,
        cargoTrackingLink: trendyolOrder.cargoTrackingLink,
        cargoSenderNumber: trendyolOrder.cargoSenderNumber,
        cargoProviderName: trendyolOrder.cargoProviderName,
        cargoDeci: trendyolOrder.cargoDeci,

        // Order items
        items: (trendyolOrder.lines || []).map(mapTrendyolLineItem),

        // Package history for status timeline
        packageHistories: trendyolOrder.packageHistories || [],

        // Trendyol specific fields
        fastDelivery: trendyolOrder.fastDelivery,
        fastDeliveryType: trendyolOrder.fastDeliveryType,
        commercial: trendyolOrder.commercial,
        micro: trendyolOrder.micro,
        giftBoxRequested: trendyolOrder.giftBoxRequested,
        warehouseId: trendyolOrder.warehouseId,
        groupDeal: trendyolOrder.groupDeal,

        // Compliance information
        identityNumber: trendyolOrder.identityNumber,
        taxNumber: trendyolOrder.taxNumber,

        // Additional metadata
        tags: generateOrderTags(trendyolOrder),
      };
    },
    [
      mapTrendyolStatus,
      mapTrendyolAddress,
      mapTrendyolLineItem,
      generateOrderTags,
    ]
  );

  // Update stats from actual order data
  const updateStatsFromOrders = useCallback((orders) => {
    setStats({
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      totalRevenue: orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      ),
    });
  }, []);

  // Filter validation
  const validateFilters = useCallback((filters) => {
    const errors = {};

    // Price range validation
    if (filters.priceMin && filters.priceMax) {
      if (parseFloat(filters.priceMin) > parseFloat(filters.priceMax)) {
        errors.priceRange = "Minimum fiyat maksimum fiyattan büyük olamaz";
      }
    }

    // Desi range validation
    if (filters.desiMin && filters.desiMax) {
      if (parseFloat(filters.desiMin) > parseFloat(filters.desiMax)) {
        errors.desiRange = "Minimum desi maksimum desiden büyük olamaz";
      }
    }

    // Date range validation
    if (filters.dateFrom && filters.dateTo) {
      if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
        errors.dateRange = "Başlangıç tarihi bitiş tarihinden sonra olamaz";
      }
    }

    return errors;
  }, []);

  // Enhanced status text for Turkish e-commerce
  const getStatusText = useCallback((status) => {
    const statusMap = {
      pending: "Bekleyen",
      processing: "Hazırlanıyor",
      shipped: "Kargoda",
      delivered: "Teslim Edildi",
      cancelled: "İptal Edildi",
    };
    return statusMap[status] || status;
  }, []);

  // Enhanced status icon mapping
  const getStatusIcon = useCallback((status) => {
    const iconMap = {
      pending: Clock,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: AlertCircle,
    };
    return iconMap[status] || Clock;
  }, []);

  // Platform specific badge variant
  const getPlatformVariant = useCallback((platform) => {
    const platformMap = {
      trendyol: "warning", // Orange for Trendyol
      hepsiburada: "info",
      n11: "purple",
      amazon: "success",
      gittigidiyor: "secondary",
    };
    return platformMap[platform?.toLowerCase()] || "secondary";
  }, []);

  // Enhanced currency formatting for Turkish locale
  const formatCurrency = useCallback((amount, currency = "TRY") => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Enhanced date formatting for Turkish locale
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Utility functions
  const getStatusVariant = useCallback((status) => {
    const statusMap = {
      pending: "warning",
      processing: "info",
      shipped: "purple",
      delivered: "success",
      cancelled: "danger",
    };
    return statusMap[status] || "secondary";
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate filters before API call
      const validationErrors = validateFilters(filters);
      if (Object.keys(validationErrors).length > 0) {
        setFilterErrors(validationErrors);
        return;
      }

      setFilterErrors({});

      const params = {
        page: currentPage - 1, // API uses 0-based pagination
        size: recordCount,
        search: searchTerm.trim(),
        ...filters,
      };

      console.log("Fetching orders with params:", params);
      const response = await api.orders.getOrders(params);
      console.log("API Response:", response);

      if (response.success) {
        // Map Trendyol API response to our internal structure
        const mappedOrders = (response.data?.content || []).map(
          mapTrendyolOrder
        );
        console.log("Mapped orders:", mappedOrders);
        setOrders(mappedOrders);
        setTotalPages(response.data?.totalPages || 1);

        // Update stats with actual API data
        updateStatsFromOrders(mappedOrders);
      } else {
        throw new Error(response.message || "Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError(error.message);
      setOrders([]);
      setTotalPages(1);
      showAlert("Siparişler yüklenirken bir hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    filters,
    searchTerm,
    showAlert,
    recordCount,
    mapTrendyolOrder,
    updateStatsFromOrders,
    validateFilters,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Date range presets handler
  const applyDatePreset = useCallback((preset) => {
    const today = new Date();
    let dateFrom, dateTo;

    switch (preset) {
      case "today":
        dateFrom = dateTo = today.toISOString().split("T")[0];
        break;
      case "7days":
        dateFrom = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        dateTo = today.toISOString().split("T")[0];
        break;
      case "30days":
        dateFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        dateTo = today.toISOString().split("T")[0];
        break;
      case "thisMonth":
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        dateTo = today.toISOString().split("T")[0];
        break;
      case "lastMonth":
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        dateFrom = lastMonth.toISOString().split("T")[0];
        dateTo = new Date(today.getFullYear(), today.getMonth(), 0)
          .toISOString()
          .split("T")[0];
        break;
      default:
        return;
    }

    setFilters((prev) => ({ ...prev, dateFrom, dateTo }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: "all",
      platform: "all",
      sortBy: "createdAt",
      sortOrder: "desc",
      invoiceStatus: "all",
      shippingInfo: "all",
      microExport: "all",
      buyNowPayLater: "all",
      pickupPoint: "all",
      logisticsTransferred: "all",
      priceMin: "",
      priceMax: "",
      desiMin: "",
      desiMax: "",
      dateFrom: "",
      dateTo: "",
      store: "all",
    });
    setSearchTerm("");
    setFilterErrors({});
    setCurrentPage(1);
  }, []);

  // Bulk operations
  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelectedOrders(orders.map((order) => order.id));
      } else {
        setSelectedOrders([]);
      }
    },
    [orders]
  );

  const handleSelectOrder = useCallback((orderId, checked) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  }, []);

  const handleBulkStatusUpdate = useCallback(
    async (newStatus) => {
      if (selectedOrders.length === 0) {
        showAlert("Lütfen güncellenecek siparişleri seçin", "warning");
        return;
      }

      try {
        await api.orders.bulkUpdateStatus(selectedOrders, newStatus);
        showAlert(
          `${selectedOrders.length} sipariş durumu güncellendi`,
          "success"
        );
        setSelectedOrders([]);
        fetchOrders();
      } catch (error) {
        showAlert("Toplu durum güncelleme başarısız", "error");
      }
    },
    [selectedOrders, showAlert, fetchOrders]
  );

  const handleViewOrderDetail = useCallback(
    (orderId) => {
      navigate(`/orders/${orderId}`);
    },
    [navigate]
  );

  // Enhanced sync with better UX
  const handleSyncOrders = useCallback(async () => {
    try {
      setSyncing(true);
      await api.orders.syncOrders();
      showAlert("Siparişler başarıyla senkronize edildi", "success");
      await fetchOrders();
    } catch (error) {
      console.error("Error syncing orders:", error);
      showAlert("Senkronizasyon sırasında bir hata oluştu", "error");
    } finally {
      setSyncing(false);
    }
  }, [showAlert, fetchOrders]);

  // Enhanced search with debouncing
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        fetchOrders();
      }
    },
    [fetchOrders]
  );

  // Enhanced sorting
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
    },
    [sortConfig]
  );

  // Modal handlers with accessibility
  const handleCreateOrder = useCallback(() => {
    setSelectedOrder({
      orderNumber: "",
      customerName: "",
      customerEmail: "",
      platform: "",
      status: "pending",
      totalAmount: 0,
      currency: "TRY",
      items: [],
      shippingAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "Turkey",
      },
    });
    setModalMode("create");
    setShowModal(true);
  }, []);

  const handleEditOrder = useCallback((order) => {
    setSelectedOrder(order);
    setModalMode("edit");
    setShowModal(true);
  }, []);

  const handleViewOrder = useCallback((order) => {
    setSelectedOrder(order);
    setModalMode("view");
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedOrder(null);
    // Focus management - return focus to trigger element
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  }, []);

  const handleSaveOrder = useCallback(
    async (orderData) => {
      try {
        if (modalMode === "create") {
          await api.orders.createOrder(orderData);
          showAlert("Sipariş başarıyla oluşturuldu", "success");
        } else {
          await api.orders.updateOrder(selectedOrder.id, orderData);
          showAlert("Sipariş başarıyla güncellendi", "success");
        }

        handleCloseModal();
        fetchOrders();
      } catch (error) {
        console.error("Error saving order:", error);
        showAlert(
          `Sipariş ${
            modalMode === "create" ? "oluşturulurken" : "güncellenirken"
          } bir hata oluştu`,
          "error"
        );
      }
    },
    [modalMode, selectedOrder, handleCloseModal, fetchOrders, showAlert]
  );

  const handleUpdateStatus = useCallback(
    async (orderId, newStatus) => {
      try {
        await api.orders.updateOrderStatus(orderId, newStatus);
        showAlert("Sipariş durumu başarıyla güncellendi", "success");
        fetchOrders();
      } catch (error) {
        console.error("Error updating order status:", error);
        showAlert("Sipariş durumu güncellenirken bir hata oluştu", "error");
      }
    },
    [showAlert, fetchOrders]
  );

  const exportOrders = useCallback(async () => {
    try {
      const response = await api.importExport.exportData("orders", "csv");
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `orders-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert("Siparişler başarıyla dışa aktarıldı", "success");
    } catch (error) {
      console.error("Error exporting orders:", error);
      showAlert("Dışa aktarım sırasında bir hata oluştu", "error");
    }
  }, [showAlert]);

  // Loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Siparişler yükleniyor...</span>
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
            <Button onClick={fetchOrders} variant="primary">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Sipariş Yönetimi
                  </h1>
                  <p className="text-sm text-gray-500">
                    Tüm platform siparişlerinizi tek yerden yönetin
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleSyncOrders}
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
                  onClick={exportOrders}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Dışa Aktar</span>
                </Button>

                <Button
                  onClick={handleCreateOrder}
                  variant="primary"
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Yeni Sipariş</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Toplam Sipariş
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
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
                  <p className="text-sm font-medium text-gray-500">Bekleyen</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Hazırlanıyor
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.processing}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Kargoda</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.shipped}
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
                    Teslim Edildi
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.delivered}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Toplam Gelir
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Sipariş numarası, müşteri adı veya ürün ara..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Bekleyen</option>
                  <option value="processing">Hazırlanıyor</option>
                  <option value="shipped">Kargoda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>

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
                  value={recordCount}
                  onChange={(e) => setRecordCount(parseInt(e.target.value))}
                >
                  <option value={10}>10 kayıt</option>
                  <option value={20}>20 kayıt</option>
                  <option value={50}>50 kayıt</option>
                  <option value={100}>100 kayıt</option>
                </select>

                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Gelişmiş Filtreler</span>
                </Button>

                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Temizle</span>
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Range Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarih Aralığı
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {datePresets.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyDatePreset(preset.value)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Date Range */}
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

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fiyat Aralığı
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={filters.priceMin}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceMin: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={filters.priceMax}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            priceMax: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Errors */}
                {Object.keys(filterErrors).length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Filtre Hataları
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <ul className="list-disc pl-5 space-y-1">
                            {Object.values(filterErrors).map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedOrders.length} sipariş seçildi
                </span>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleBulkStatusUpdate("processing")}
                    size="sm"
                    variant="outline"
                  >
                    Hazırlanıyor Olarak İşaretle
                  </Button>
                  <Button
                    onClick={() => handleBulkStatusUpdate("shipped")}
                    size="sm"
                    variant="outline"
                  >
                    Kargoda Olarak İşaretle
                  </Button>
                  <Button
                    onClick={() => setSelectedOrders([])}
                    size="sm"
                    variant="outline"
                  >
                    Seçimi Temizle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sipariş bulunamadı
                </h3>
                <p className="text-gray-500 mb-4">
                  Henüz hiç sipariş yok veya arama kriterlerinize uygun sipariş
                  bulunamadı.
                </p>
                <Button
                  onClick={handleCreateOrder}
                  variant="primary"
                  className="inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Siparişi Oluştur
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectedOrders.length === orders.length &&
                            orders.length > 0
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("orderNumber")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Sipariş No</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("customerName")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Müşteri</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("totalAmount")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tutar</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Tarih</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => {
                      const StatusIcon = getStatusIcon(order.status);
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={(e) =>
                                handleSelectOrder(order.id, e.target.checked)
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            {order.tags && order.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {order.tags.slice(0, 2).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {order.tags.length > 2 && (
                                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                    +{order.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.customerName}
                            </div>
                            {order.customerEmail && (
                              <div className="text-sm text-gray-500">
                                {order.customerEmail}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={getPlatformVariant(order.platform)}
                              className="capitalize"
                            >
                              {order.platform}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <StatusIcon className="h-4 w-4 mr-2" />
                              <Badge variant={getStatusVariant(order.status)}>
                                {getStatusText(order.status)}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <CalendarDays className="h-4 w-4 mr-1" />
                              {formatDate(order.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => handleViewOrder(order)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleEditOrder(order)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleViewOrderDetail(order.id)}
                                size="sm"
                                variant="ghost"
                                className="p-1"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Sayfa {currentPage} / {totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      size="sm"
                      variant="outline"
                    >
                      Önceki
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      size="sm"
                      variant="outline"
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Modal */}
      {showModal && selectedOrder && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={
            modalMode === "view"
              ? "Sipariş Detayları"
              : modalMode === "edit"
              ? "Sipariş Düzenle"
              : "Yeni Sipariş"
          }
          size="large"
        >
          <OrderForm
            order={selectedOrder}
            mode={modalMode}
            onSave={handleSaveOrder}
            onCancel={handleCloseModal}
            onUpdateStatus={handleUpdateStatus}
            getStatusVariant={getStatusVariant}
            getStatusText={getStatusText}
          />
        </Modal>
      )}
    </div>
  );
};

// Order Form Component
const OrderForm = ({
  order,
  mode,
  onSave,
  onCancel,
  onUpdateStatus,
  getStatusVariant,
  getStatusText,
}) => {
  const [formData, setFormData] = useState(order);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.orderNumber?.trim()) {
      errors.orderNumber = "Sipariş numarası gereklidir";
    }

    if (!formData.customerName?.trim()) {
      errors.customerName = "Müşteri adı gereklidir";
    }

    if (!formData.platform) {
      errors.platform = "Platform seçimi gereklidir";
    }

    if (!formData.totalAmount || formData.totalAmount <= 0) {
      errors.totalAmount = "Geçerli bir tutar giriniz";
    }

    return errors;
  }, [formData]);

  const handleSave = useCallback(
    (e) => {
      e.preventDefault();

      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      setValidationErrors({});
      onSave(formData);
    },
    [formData, validateForm, onSave]
  );

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear validation error when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [validationErrors]
  );

  if (mode === "view") {
    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sipariş Numarası
            </label>
            <p className="mt-1 text-sm text-gray-900">{order.orderNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Platform
            </label>
            <Badge
              variant={
                order.platform === "trendyol"
                  ? "warning"
                  : order.platform === "hepsiburada"
                  ? "info"
                  : "secondary"
              }
              className="mt-1 capitalize"
            >
              {order.platform}
            </Badge>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Müşteri
            </label>
            <p className="mt-1 text-sm text-gray-900">{order.customerName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durum
            </label>
            <div className="mt-1 flex items-center space-x-2">
              <Badge variant={getStatusVariant(order.status)}>
                {getStatusText(order.status)}
              </Badge>
              {mode === "view" && onUpdateStatus && (
                <select
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  value={order.status}
                  onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                >
                  <option value="pending">Bekleyen</option>
                  <option value="processing">Hazırlanıyor</option>
                  <option value="shipped">Kargoda</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Sipariş Ürünleri
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        Adet: {item.quantity}
                        {item.sku && ` • SKU: ${item.sku}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: order.currency || "TRY",
                        }).format(item.amount || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Teslimat Adresi
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">
                {order.shippingAddress.firstName}{" "}
                {order.shippingAddress.lastName}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {order.shippingAddress.street}
              </p>
              <p className="text-sm text-gray-600">
                {order.shippingAddress.district}, {order.shippingAddress.city}
              </p>
              {order.shippingAddress.phone && (
                <p className="text-sm text-gray-600 mt-2">
                  Tel: {order.shippingAddress.phone}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button onClick={onCancel} variant="outline">
            Kapat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sipariş Numarası *
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.orderNumber
                ? "border-red-300"
                : "border-gray-300"
            }`}
            value={formData.orderNumber || ""}
            onChange={(e) => handleInputChange("orderNumber", e.target.value)}
            disabled={mode === "edit"}
          />
          {validationErrors.orderNumber && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.orderNumber}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform *
          </label>
          <select
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.platform ? "border-red-300" : "border-gray-300"
            }`}
            value={formData.platform || ""}
            onChange={(e) => handleInputChange("platform", e.target.value)}
          >
            <option value="">Platform Seçin</option>
            <option value="trendyol">Trendyol</option>
            <option value="hepsiburada">Hepsiburada</option>
            <option value="n11">N11</option>
          </select>
          {validationErrors.platform && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.platform}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Müşteri Adı *
          </label>
          <input
            type="text"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.customerName
                ? "border-red-300"
                : "border-gray-300"
            }`}
            value={formData.customerName || ""}
            onChange={(e) => handleInputChange("customerName", e.target.value)}
          />
          {validationErrors.customerName && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.customerName}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-posta
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={formData.customerEmail || ""}
            onChange={(e) => handleInputChange("customerEmail", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durum
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={formData.status || "pending"}
            onChange={(e) => handleInputChange("status", e.target.value)}
          >
            <option value="pending">Bekleyen</option>
            <option value="processing">Hazırlanıyor</option>
            <option value="shipped">Kargoda</option>
            <option value="delivered">Teslim Edildi</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Toplam Tutar *
          </label>
          <input
            type="number"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              validationErrors.totalAmount
                ? "border-red-300"
                : "border-gray-300"
            }`}
            value={formData.totalAmount || ""}
            onChange={(e) =>
              handleInputChange("totalAmount", parseFloat(e.target.value))
            }
          />
          {validationErrors.totalAmount && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors.totalAmount}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" onClick={onCancel} variant="outline">
          İptal
        </Button>
        <Button type="submit" variant="primary">
          {mode === "create" ? "Oluştur" : "Güncelle"}
        </Button>
      </div>
    </form>
  );
};

export default OrderManagement;
