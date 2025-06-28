/**
 * OrderManagement - Enhanced with Pazar+ Design System
 * Follows comprehensive design patterns for consistency, accessibility, and performance
 * Implements proper theming, responsive design, and enhanced UX patterns
 */

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  RefreshCw,
  Download,
  Plus,
  AlertTriangle,
  Inbox,
  ArrowUpDown,
} from "lucide-react";

// Core components (keeping only used ones)
// Enhanced UI components with design system
import OrderStatsCards from "./OrderStatsCards";
import OrderFilters from "./OrderFilters";
import BulkActions from "./BulkActions";
import OrderActions from "./OrderActions";
import OrderItems from "./OrderItems";
import ShippingAddress from "./ShippingAddress";
import PaymentDetails from "./PaymentDetails";
import OrderForm from "./OrderForm";
import OrderTimeline from "./OrderTimeline";
import OrderProductLinks from "./OrderProductLinks";
import EnhancedPagination from "../ui/EnhancedPagination";

// Hooks and utilities
import { useOrderState } from "../../hooks/useOrderState";

// Services and utilities
import OrderService from "../../services/OrderService";
import { exportOrders } from "../../utils/exportHelpers";
import {
  getPlatformVariant,
  getStatusVariant,
  getStatusText,
  formatCurrency,
  formatDate,
} from "../../utils/platformHelpers";

// Context
import { useAlert } from "../../contexts/AlertContext";

// Design system styles

// Enhanced table header component with design system patterns
const TableHeader = React.memo(({ onSort, onSelectAll }) => (
  <thead className="table-header">
    <tr>
      <th className="table-th">
        <input
          type="checkbox"
          onChange={(e) => onSelectAll(e.target.checked)}
          className="form-checkbox"
          aria-label="Tüm siparişleri seç"
        />
      </th>
      <th
        className="table-th table-th-sortable"
        onClick={() => onSort("orderNumber")}
        role="columnheader"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSort("orderNumber");
          }
        }}
      >
        <div className="flex items-center space-x-1">
          <span>Sipariş No</span>
          <ArrowUpDown className="table-sort-icon" />
        </div>
      </th>
      <th className="table-th">Ürün</th>
      <th
        className="table-th table-th-sortable"
        onClick={() => onSort("customerName")}
        role="columnheader"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSort("customerName");
          }
        }}
      >
        <div className="flex items-center space-x-1">
          <span>Müşteri</span>
          <ArrowUpDown className="table-sort-icon" />
        </div>
      </th>
      <th className="table-th">Platform</th>
      <th className="table-th">Durum</th>
      <th
        className="table-th table-th-sortable"
        onClick={() => onSort("totalAmount")}
        role="columnheader"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSort("totalAmount");
          }
        }}
      >
        <div className="flex items-center space-x-1">
          <span>Tutar</span>
          <ArrowUpDown className="table-sort-icon" />
        </div>
      </th>
      <th className="table-th">İşlemler</th>
    </tr>
  </thead>
));
TableHeader.displayName = "TableHeader";

// Enhanced OrderManagement component with performance optimizations
const OrderManagementRefactored = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  // Ref for focus management
  const searchInputRef = useRef(null);

  // State management using custom hooks
  const {
    dispatch,
    orders,
    stats,
    loading,
    error,
    syncing,
    selectedOrders,
    currentPage,
    pagination,
    validationErrors,
    filters,
    sortConfig,
  } = useOrderState();

  // Force initial data loading
  useEffect(() => {
    console.log("Component mounted, forcing data refresh");
    dispatch({ type: "REFRESH_ORDERS" });
  }, [dispatch]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Performance optimizations with memoization
  // Memoize selectedOrders set for O(1) lookup instead of O(n) array.includes()
  const selectedOrdersSet = useMemo(
    () => new Set(selectedOrders),
    [selectedOrders]
  );

  // Memoize the current page orders to avoid recalculation on every render
  const currentPageOrders = useMemo(() => {
    // For API-based pagination, we return all orders since they're already paginated
    // For client-side pagination, we would slice the orders array
    console.log("Orders debug:", {
      totalOrders: orders.length,
      currentPage,
      recordCount: pagination.recordCount,
      orders: orders,
    });
    return orders; // Return all orders since API handles pagination
  }, [orders, currentPage, pagination.recordCount]);

  // Optimized selection handlers
  const handleToggleOrderSelection = useCallback(
    (orderId, selected) => {
      dispatch({
        type: "TOGGLE_ORDER_SELECTION",
        payload: { orderId, selected },
      });
    },
    [dispatch]
  );

  const handleSelectAll = useCallback(
    (selected) => {
      dispatch({ type: "SELECT_ALL", payload: selected });
    },
    [dispatch]
  );

  // Sync orders using the service
  const handleSyncOrders = useCallback(async () => {
    dispatch({ type: "SET_SYNCING", payload: true });
    const result = await OrderService.syncOrders(showAlert);
    if (result.success) {
      dispatch({ type: "SYNC_SUCCESS", payload: result.data });
    }
    dispatch({ type: "SET_SYNCING", payload: false });
  }, [dispatch, showAlert]);

  // Export orders
  const handleExportOrders = useCallback(async () => {
    try {
      setExporting(true);
      await exportOrders(showAlert);
    } catch (error) {
      console.error("Export error:", error);
      showAlert("Eksport işlemi başarısız", "error");
    } finally {
      setExporting(false);
    }
  }, [showAlert]);

  // Order operations
  const handleAcceptOrder = useCallback(
    async (orderId) => {
      const result = await OrderService.acceptOrder(orderId, showAlert);
      if (result.success) {
        dispatch({ type: "REFRESH_ORDERS" });
      }
    },
    [dispatch, showAlert]
  );

  const handleCancelOrder = useCallback(
    async (orderId, reason) => {
      const result = await OrderService.cancelOrder(orderId, reason, showAlert);
      if (result.success) {
        dispatch({ type: "REFRESH_ORDERS" });
      }
    },
    [dispatch, showAlert]
  );

  const handleDeleteOrder = useCallback(
    async (orderId) => {
      const result = await OrderService.deleteOrder(orderId, showAlert);
      if (result.success) {
        dispatch({ type: "REFRESH_ORDERS" });
      }
    },
    [dispatch, showAlert]
  );

  // Add missing view and edit handlers
  const handleViewOrder = useCallback((order) => {
    setSelectedOrder(order);
    setModalMode("view");
    setShowModal(true);
  }, []);

  const handleEditOrder = useCallback((order) => {
    setSelectedOrder(order);
    setModalMode("edit");
    setShowModal(true);
  }, []);

  const handleViewOrderDetail = useCallback(
    (orderId) => {
      navigate(`/orders/${orderId}`);
    },
    [navigate]
  );

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedOrder(null);
    setModalMode("view");
  }, []);

  // Create order handler
  const handleCreateOrder = useCallback(() => {
    setSelectedOrder({
      orderNumber: "",
      customerName: "",
      customerEmail: "",
      platform: "",
      orderStatus: "pending",
      totalAmount: 0,
      currency: "TRY",
      items: [],
    });
    setModalMode("create");
    setShowModal(true);
  }, []);

  // Sort handler
  const handleSort = useCallback(
    (field) => {
      dispatch({
        type: "SORT_ORDERS",
        payload: {
          field,
          direction: sortConfig.direction === "asc" ? "desc" : "asc",
        },
      });
    },
    [dispatch, sortConfig]
  );

  // Save order handler
  const handleSaveOrder = useCallback(
    async (orderData) => {
      try {
        const isEdit = modalMode === "edit";
        const result = await OrderService.saveOrder(orderData, isEdit);

        if (result.success) {
          showAlert(result.message, "success");
          handleCloseModal();
          dispatch({ type: "REFRESH_ORDERS" });
        } else {
          showAlert(
            result.error || "Sipariş kaydedilirken hata oluştu",
            "error"
          );
        }
      } catch (error) {
        console.error("Error saving order:", error);
        showAlert("Sipariş kaydedilirken hata oluştu", "error");
      }
    },
    [modalMode, showAlert, handleCloseModal, dispatch]
  );

  // Update status handler
  const handleUpdateStatus = useCallback(
    async (orderId, newStatus) => {
      const result = await OrderService.updateOrderStatus(
        orderId,
        newStatus,
        showAlert
      );
      if (result.success) {
        dispatch({ type: "REFRESH_ORDERS" });
      }
    },
    [showAlert, dispatch]
  );

  // Bulk operations
  const handleBulkAccept = useCallback(async () => {
    const result = await OrderService.bulkAccept(
      selectedOrders,
      orders,
      showAlert
    );
    if (result.success) {
      dispatch({ type: "CLEAR_SELECTION" });
      dispatch({ type: "REFRESH_ORDERS" });
    }
  }, [selectedOrders, orders, dispatch, showAlert]);

  const handleBulkDelete = useCallback(async () => {
    const result = await OrderService.bulkDelete(selectedOrders, showAlert);
    if (result.success) {
      dispatch({ type: "CLEAR_SELECTION" });
      dispatch({ type: "REFRESH_ORDERS" });
    }
  }, [selectedOrders, dispatch, showAlert]);

  const handleBulkStatusUpdate = useCallback(
    async (newStatus) => {
      const result = await OrderService.bulkStatusUpdate(
        selectedOrders,
        newStatus,
        showAlert
      );
      if (result.success) {
        dispatch({ type: "CLEAR_SELECTION" });
        dispatch({ type: "REFRESH_ORDERS" });
      }
    },
    [selectedOrders, dispatch, showAlert]
  );

  // Unified bulk action handler for BulkActions component
  const handleBulkAction = useCallback(
    async (actionKey) => {
      switch (actionKey) {
        case "accept":
          await handleBulkAccept();
          break;
        case "process":
          await handleBulkStatusUpdate("processing");
          break;
        case "ship":
          await handleBulkStatusUpdate("shipped");
          break;
        case "delete":
          await handleBulkDelete();
          break;
        default:
          console.warn(`Unknown bulk action: ${actionKey}`);
      }
    },
    [handleBulkAccept, handleBulkStatusUpdate, handleBulkDelete]
  );

  // Loading state with enhanced design system
  if (loading) {
    console.log("Component is in loading state");
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="space-y-2">
                <div className="text-lg font-medium text-gray-900">
                  Siparişler yükleniyor...
                </div>
                <div className="text-sm text-gray-600">Lütfen bekleyiniz</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with enhanced design system
  if (error) {
    console.log("Component has error:", error);
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="error-page">
            <div className="error-content">
              <div className="error-state-icon mb-6">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
              </div>
              <h1 className="error-title">Bir hata oluştu</h1>
              <p className="error-description">{error}</p>
              <div className="error-actions">
                <button
                  onClick={() => dispatch({ type: "REFRESH_ORDERS" })}
                  className="btn btn-primary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tekrar Dene
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log("Component rendering main view, orders:", orders?.length || 0);

  return (
    <div className="page-container-full">
      {/* Enhanced Header with Design System */}
      <div className="page-header">
        <div className="page-header-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {" "}
          <div className="flex items-center">
            <div className="page-header-icon">
              <ShoppingCart className="h-6 w-6 icon-contrast-primary" />
            </div>
            <div>
              <h1 className="page-title">Sipariş Yönetimi</h1>
              <p className="page-subtitle">
                Tüm siparişlerinizi tek yerden yönetin
              </p>
            </div>
          </div>
          <div className="page-actions">
            <button
              onClick={handleSyncOrders}
              disabled={syncing}
              className="btn btn-secondary"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
              />
              <span>
                {syncing ? "Senkronize Ediliyor..." : "Senkronize Et"}
              </span>
            </button>

            <button
              onClick={handleExportOrders}
              disabled={exporting}
              className="btn btn-secondary"
            >
              <Download
                className={`h-4 w-4 mr-2 ${exporting ? "animate-pulse" : ""}`}
              />
              <span>{exporting ? "Dışa Aktarılıyor..." : "Dışa Aktar"}</span>
            </button>

            <button onClick={handleCreateOrder} className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              <span>Yeni Sipariş</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content with Enhanced Layout */}
      <div className="page-content-full px-4 sm:px-6 lg:px-8 max-w-none">
        {/* Stats Cards Section */}
        <section className="section-bg w-full max-w-7xl mx-auto">
          <div className="section-container">
            {/* Add info text when filters are active but stats show all orders */}
            {OrderService.hasActiveFilters(filters) && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-center text-blue-700 dark:text-blue-300">
                  <span className="text-sm">
                    İstatistikler tüm siparişleri göstermektedir. Aşağıdaki
                    liste filtrelerinize göre sınırlandırılmıştır.
                  </span>
                </div>
              </div>
            )}
            <OrderStatsCards
              stats={stats}
              className="w-full animate-fade-in"
              isGlobalStats={true}
            />
          </div>
        </section>

        {/* Filters Section */}
        <section className="section-bg max-w-7xl mx-auto">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">Filtreler ve Arama</h2>
              <p className="section-subtitle">
                Siparişlerinizi filtreleyerek aradığınızı kolayca bulun
              </p>
            </div>
            <OrderFilters
              filters={filters}
              searchInputRef={searchInputRef}
              onFiltersChange={(filters) =>
                dispatch({ type: "SET_FILTERS", payload: filters })
              }
              recordCount={pagination.recordCount}
              onRecordCountChange={(count) =>
                dispatch({ type: "SET_RECORD_COUNT", payload: count })
              }
              errors={validationErrors}
              onClearFilters={() => dispatch({ type: "CLEAR_FILTERS" })}
              className="animate-slide-in-left"
            />
          </div>
        </section>

        {/* Bulk Actions Section */}
        {selectedOrders.length > 0 && (
          <section className="section-bg max-w-7xl mx-auto">
            <div className="section-container">
              <BulkActions
                selectedCount={selectedOrders.length}
                onBulkAction={handleBulkAction}
                onClearSelection={() => dispatch({ type: "CLEAR_SELECTION" })}
                className="animate-slide-up"
              />
            </div>
          </section>
        )}

        {/* Orders Table Section */}
        <section className="section-bg-table w-full">
          <div className="section-container-full px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
              {orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Inbox className="h-16 w-16 text-gray-400" />
                  </div>
                  <h3 className="empty-state-title">Sipariş bulunamadı</h3>
                  <p className="empty-state-description">
                    Henüz hiç sipariş yok veya arama kriterlerinize uygun
                    sipariş bulunamadı.
                  </p>
                  <div className="empty-state-actions">
                    <button
                      onClick={handleCreateOrder}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      İlk Siparişi Oluştur
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-container w-full">
                  <table className="table w-full">
                    <TableHeader
                      onSort={handleSort}
                      onSelectAll={handleSelectAll}
                    />
                    <tbody className="table-body">
                      {currentPageOrders.map((order) => (
                        <tr key={order.id} className="table-row">
                          <td className="table-td">
                            <input
                              type="checkbox"
                              checked={selectedOrdersSet.has(order.id)}
                              onChange={(e) =>
                                handleToggleOrderSelection(
                                  order.id,
                                  e.target.checked
                                )
                              }
                              className="form-checkbox"
                            />
                          </td>
                          <td className="table-td">
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">
                                {order.orderNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(order)}
                              </div>
                            </div>
                          </td>
                          <td className="table-td">
                            <OrderItems order={order} />
                          </td>
                          <td className="table-td">
                            <div className="space-y-1">
                              {order.customerEmail ? (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/customers/${encodeURIComponent(
                                        order.customerEmail
                                      )}`
                                    )
                                  }
                                  className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:underline text-left"
                                >
                                  {order.customerName || order.customerEmail}
                                </button>
                              ) : (
                                <div className="font-medium text-gray-900">
                                  {order.customerName || "İsimsiz Müşteri"}
                                </div>
                              )}
                              {order.customerEmail && (
                                <div className="text-sm text-gray-500">
                                  {order.customerEmail}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="table-td">
                            <span
                              className={`badge ${
                                getPlatformVariant(order.platform) ===
                                "trendyol"
                                  ? "badge-trendyol"
                                  : getPlatformVariant(order.platform) ===
                                    "hepsiburada"
                                  ? "badge-hepsiburada"
                                  : getPlatformVariant(order.platform) === "n11"
                                  ? "badge-n11"
                                  : "badge-info"
                              }`}
                            >
                              {order.platform}
                            </span>
                          </td>
                          <td className="table-td">
                            <span
                              className={`badge ${
                                getStatusVariant(order.status) === "success"
                                  ? "badge-delivered"
                                  : getStatusVariant(order.status) === "warning"
                                  ? "badge-processing"
                                  : getStatusVariant(order.status) === "error"
                                  ? "badge-cancelled"
                                  : "badge-pending"
                              }`}
                            >
                              {getStatusText(order.status)}
                            </span>
                          </td>
                          <td className="table-td">
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(
                                order.totalAmount,
                                order.currency
                              )}
                            </div>
                          </td>
                          <td className="table-td">
                            <OrderActions
                              order={order}
                              onView={handleViewOrder}
                              onEdit={handleEditOrder}
                              onViewDetail={handleViewOrderDetail}
                              onAccept={handleAcceptOrder}
                              onCancel={handleCancelOrder}
                              onDelete={handleDeleteOrder}
                              showAlert={showAlert}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Enhanced Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <EnhancedPagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  totalRecords={pagination.totalRecords}
                  recordCount={pagination.recordCount}
                  onPageChange={(page) =>
                    dispatch({ type: "SET_PAGE", payload: page })
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Enhanced Order Modal with Design System */}
      {showModal && selectedOrder && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className="modal-backdrop"
              onClick={handleCloseModal}
              aria-hidden="true"
            ></div>

            <div className="modal-container">
              {/* Modal Header */}
              <div className="modal-header">
                <h3 id="modal-title" className="modal-title">
                  {modalMode === "view"
                    ? "Sipariş Detayları"
                    : modalMode === "edit"
                    ? "Sipariş Düzenle"
                    : "Yeni Sipariş"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="modal-close"
                  aria-label="Modalı kapat"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="modal-body">
                {modalMode === "view" ? (
                  <div className="space-y-8">
                    {/* Enhanced Order Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sipariş Numarası
                          </label>
                          <p className="text-base font-semibold text-gray-900">
                            {selectedOrder.orderNumber}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Platform
                          </label>
                          <span
                            className={`badge ${
                              getPlatformVariant(selectedOrder.platform) ===
                              "trendyol"
                                ? "badge-trendyol"
                                : getPlatformVariant(selectedOrder.platform) ===
                                  "hepsiburada"
                                ? "badge-hepsiburada"
                                : getPlatformVariant(selectedOrder.platform) ===
                                  "n11"
                                ? "badge-n11"
                                : "badge-info"
                            }`}
                          >
                            {selectedOrder.platform}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Müşteri
                          </label>
                          <div className="space-y-1">
                            {selectedOrder.customerEmail ? (
                              <button
                                onClick={() => {
                                  handleCloseModal();
                                  navigate(
                                    `/customers/${encodeURIComponent(
                                      selectedOrder.customerEmail
                                    )}`
                                  );
                                }}
                                className="text-base font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:underline text-left"
                              >
                                {selectedOrder.customerName ||
                                  selectedOrder.customerEmail}
                              </button>
                            ) : (
                              <p className="text-base font-medium text-gray-900">
                                {selectedOrder.customerName ||
                                  "İsimsiz Müşteri"}
                              </p>
                            )}
                            {selectedOrder.customerEmail && (
                              <p className="text-sm text-gray-600">
                                {selectedOrder.customerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Durum
                          </label>
                          <span
                            className={`badge ${
                              getStatusVariant(selectedOrder.status) ===
                              "success"
                                ? "badge-delivered"
                                : getStatusVariant(selectedOrder.status) ===
                                  "warning"
                                ? "badge-processing"
                                : getStatusVariant(selectedOrder.status) ===
                                  "error"
                                ? "badge-cancelled"
                                : "badge-pending"
                            }`}
                          >
                            {getStatusText(selectedOrder.status)}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Toplam Tutar
                          </label>
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(
                              selectedOrder.totalAmount,
                              selectedOrder.currency
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sipariş Tarihi
                          </label>
                          <p className="text-base text-gray-900">
                            {formatDate(selectedOrder)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Product Links */}
                    <OrderProductLinks
                      order={selectedOrder}
                      onProductClick={(product) => {
                        // Close modal and navigate to product
                        handleCloseModal();
                        window.open(`/products/${product.id}`, "_blank");
                      }}
                    />

                    {/* Enhanced Timeline */}
                    <OrderTimeline order={selectedOrder} />

                    {/* Shipping Address with Enhanced Design */}
                    <ShippingAddress order={selectedOrder} />

                    {/* Payment Details */}
                    <PaymentDetails order={selectedOrder} />
                  </div>
                ) : (
                  // Order form for create/edit modes
                  <OrderForm
                    order={selectedOrder}
                    mode={modalMode}
                    onSave={handleSaveOrder}
                    onCancel={handleCloseModal}
                    onUpdateStatus={handleUpdateStatus}
                    getStatusVariant={getStatusVariant}
                    getStatusText={getStatusText}
                    formatCurrency={formatCurrency}
                    formatDate={formatDate}
                  />
                )}
              </div>

              {/* Modal Footer - Only for view mode */}
              {modalMode === "view" && (
                <div className="modal-footer">
                  <button
                    onClick={handleCloseModal}
                    className="btn btn-secondary"
                  >
                    Kapat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementRefactored;
