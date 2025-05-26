import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Search,
  Download,
  Edit,
  Eye,
  Calendar,
  Truck,
  RefreshCw,
  Filter,
  SortDesc,
  MoreHorizontal,
  X,
  CheckCircle,
  Clock,
  Package,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";

const OrderManagement = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // 'view', 'edit', 'create'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    platform: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Use useCallback to memoize fetchOrders function
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm,
        ...filters,
      };

      const response = await api.orders.getOrders(params);

      // Handle the server response structure correctly
      if (response.success) {
        setOrders(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
      } else {
        setOrders([]);
        setTotalPages(1);
        showAlert(response.message || "Failed to fetch orders", "error");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
      setTotalPages(1);
      showAlert("Error fetching orders", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, searchTerm, showAlert]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSyncOrders = async () => {
    try {
      setSyncing(true);
      await api.orders.syncOrders();
      showAlert("Orders synced successfully", "success");
      fetchOrders();
    } catch (error) {
      console.error("Error syncing orders:", error);
      showAlert("Error syncing orders", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateOrder = () => {
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
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSaveOrder = async (orderData) => {
    try {
      if (modalMode === "create") {
        await api.orders.createOrder(orderData);
        showAlert("Order created successfully", "success");
      } else {
        await api.orders.updateOrder(selectedOrder.id, orderData);
        showAlert("Order updated successfully", "success");
      }

      setShowModal(false);
      fetchOrders();
    } catch (error) {
      console.error("Error saving order:", error);
      showAlert(
        `Error ${modalMode === "create" ? "creating" : "updating"} order`,
        "error"
      );
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.orders.updateOrderStatus(orderId, newStatus);
      showAlert("Order status updated successfully", "success");
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      showAlert("Error updating order status", "error");
    }
  };

  const exportOrders = async () => {
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
      showAlert("Orders exported successfully", "success");
    } catch (error) {
      console.error("Error exporting orders:", error);
      showAlert("Error exporting orders", "error");
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "processing":
        return "info";
      case "shipped":
        return "purple";
      case "delivered":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return Clock;
      case "processing":
        return Package;
      case "shipped":
        return Truck;
      case "delivered":
        return CheckCircle;
      case "cancelled":
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getPlatformVariant = (platform) => {
    switch (platform?.toLowerCase()) {
      case "trendyol":
        return "warning";
      case "hepsiburada":
        return "info";
      case "n11":
        return "purple";
      case "amazon":
        return "warning";
      default:
        return "secondary";
    }
  };

  const formatCurrency = (amount, currency = "TRY") => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle React Router navigation
  const handleViewOrderDetail = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sipariş Yönetimi</h1>
          <p className="page-subtitle">
            Tüm platformlardan siparişlerinizi yönetin
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSyncOrders}
            disabled={syncing}
            variant="success"
            icon={RefreshCw}
            loading={syncing}
          >
            {syncing ? "Senkronize Ediliyor..." : "Siparişleri Senkronize Et"}
          </Button>
          <Button onClick={exportOrders} variant="outline" icon={Download}>
            Dışa Aktar
          </Button>
          <Button onClick={handleCreateOrder} variant="primary" icon={Plus}>
            Yeni Sipariş
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/20">
                <ShoppingCart className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {orders.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam Sipariş
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {orders.filter((o) => o.status === "pending").length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Bekleyen Siparişler
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {orders.filter((o) => o.status === "delivered").length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Teslim Edilen
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(
                    orders.reduce(
                      (sum, order) => sum + (order.totalAmount || 0),
                      0
                    )
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam Ciro
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Sipariş ID, müşteri veya ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="form-input"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Bekleyen</option>
              <option value="processing">İşleniyor</option>
              <option value="shipped">Kargoya Verildi</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal Edildi</option>
            </select>

            <select
              value={filters.platform}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, platform: e.target.value }))
              }
              className="form-input"
            >
              <option value="all">Tüm Platformlar</option>
              <option value="trendyol">Trendyol</option>
              <option value="hepsiburada">Hepsiburada</option>
              <option value="n11">N11</option>
              <option value="amazon">Amazon</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
              }
              className="form-input"
            >
              <option value="createdAt">Tarihe Göre Sırala</option>
              <option value="orderNumber">Sipariş No'ya Göre</option>
              <option value="totalAmount">Tutara Göre</option>
              <option value="customerName">Müşteriye Göre</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Order List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Siparişler yükleniyor...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-32 w-32 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
              <ShoppingCart className="h-16 w-16 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Sipariş bulunamadı
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Platformlarınızdan siparişleri senkronize ederek başlayın veya
              yeni bir sipariş oluşturun.
            </p>
            <Button onClick={handleCreateOrder} variant="primary" icon={Plus}>
              Yeni Sipariş Oluştur
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sipariş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Toplam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => {
                  const StatusIcon = getStatusIcon(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            #{order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {order.items?.length || 0} ürün
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {order.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getPlatformVariant(order.platform)}>
                          {order.platform}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={getStatusVariant(order.status)}
                          icon={StatusIcon}
                        >
                          {order.status === "pending"
                            ? "Bekleyen"
                            : order.status === "processing"
                            ? "İşleniyor"
                            : order.status === "shipped"
                            ? "Kargoya Verildi"
                            : order.status === "delivered"
                            ? "Teslim Edildi"
                            : order.status === "cancelled"
                            ? "İptal Edildi"
                            : order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            onClick={() => handleViewOrderDetail(order.id)}
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                          />
                          <Button
                            onClick={() => handleEditOrder(order)}
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                          />
                          <Button
                            onClick={() =>
                              handleUpdateStatus(order.id, "shipped")
                            }
                            variant="ghost"
                            size="sm"
                            icon={Truck}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          />
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
          <div className="bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Sayfa {currentPage} / {totalPages}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Önceki
                </Button>
                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Sonraki
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Order Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalMode === "create"
            ? "Yeni Sipariş Ekle"
            : modalMode === "edit"
            ? "Sipariş Düzenle"
            : "Sipariş Detayları"
        }
        size="xl"
      >
        <OrderForm
          order={selectedOrder}
          mode={modalMode}
          onSave={handleSaveOrder}
          onClose={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

// Order Form Component
const OrderForm = ({ order, mode, onSave, onClose }) => {
  const [formData, setFormData] = useState(order || {});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sipariş Numarası *
          </label>
          <input
            type="text"
            value={formData.orderNumber || ""}
            onChange={(e) => updateFormData("orderNumber", e.target.value)}
            disabled={mode === "view"}
            required
            className="form-input"
            placeholder="Sipariş numarasını girin"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Platform *
          </label>
          <select
            value={formData.platform || ""}
            onChange={(e) => updateFormData("platform", e.target.value)}
            disabled={mode === "view"}
            required
            className="form-input"
          >
            <option value="">Platform seçin</option>
            <option value="trendyol">Trendyol</option>
            <option value="hepsiburada">Hepsiburada</option>
            <option value="n11">N11</option>
            <option value="amazon">Amazon</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Durum
          </label>
          <select
            value={formData.status || "pending"}
            onChange={(e) => updateFormData("status", e.target.value)}
            disabled={mode === "view"}
            className="form-input"
          >
            <option value="pending">Bekleyen</option>
            <option value="processing">İşleniyor</option>
            <option value="shipped">Kargoya Verildi</option>
            <option value="delivered">Teslim Edildi</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Müşteri Adı *
          </label>
          <input
            type="text"
            value={formData.customerName || ""}
            onChange={(e) => updateFormData("customerName", e.target.value)}
            disabled={mode === "view"}
            required
            className="form-input"
            placeholder="Müşteri adını girin"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Müşteri E-posta *
          </label>
          <input
            type="email"
            value={formData.customerEmail || ""}
            onChange={(e) => updateFormData("customerEmail", e.target.value)}
            disabled={mode === "view"}
            required
            className="form-input"
            placeholder="Müşteri e-postasını girin"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Toplam Tutar *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.totalAmount || ""}
            onChange={(e) =>
              updateFormData("totalAmount", parseFloat(e.target.value) || 0)
            }
            disabled={mode === "view"}
            required
            className="form-input"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Para Birimi
          </label>
          <select
            value={formData.currency || "TRY"}
            onChange={(e) => updateFormData("currency", e.target.value)}
            disabled={mode === "view"}
            className="form-input"
          >
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      {/* Shipping Address Section */}
      <Card>
        <CardHeader>
          <CardTitle>Teslimat Adresi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sokak Adresi
              </label>
              <input
                type="text"
                value={formData.shippingAddress?.street || ""}
                onChange={(e) =>
                  updateFormData("shippingAddress.street", e.target.value)
                }
                disabled={mode === "view"}
                className="form-input"
                placeholder="Sokak adresini girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Şehir
              </label>
              <input
                type="text"
                value={formData.shippingAddress?.city || ""}
                onChange={(e) =>
                  updateFormData("shippingAddress.city", e.target.value)
                }
                disabled={mode === "view"}
                className="form-input"
                placeholder="Şehir girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Posta Kodu
              </label>
              <input
                type="text"
                value={formData.shippingAddress?.zipCode || ""}
                onChange={(e) =>
                  updateFormData("shippingAddress.zipCode", e.target.value)
                }
                disabled={mode === "view"}
                className="form-input"
                placeholder="Posta kodunu girin"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {mode !== "view" && (
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" onClick={onClose} variant="outline">
            İptal
          </Button>
          <Button type="submit" loading={loading} variant="primary">
            {mode === "create" ? "Sipariş Oluştur" : "Siparişi Güncelle"}
          </Button>
        </div>
      )}
    </form>
  );
};

export default OrderManagement;
