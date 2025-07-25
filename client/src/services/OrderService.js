/**
 * Order API Service - Handles all order-related API operations
 */

import api from "./api";
import logger from "../utils/logger.js";

class OrderService {
  // Enhanced sync with platform connection checking
  static async syncOrders(showAlert) {
    try {
      logger.logOperation("Starting order sync", {
        operation: "sync_orders",
      });

      // Check platform connections first
      try {
        const connectionsResponse = await api.platforms.getConnections();
        logger.api.info("Platform connections retrieved", {
          operation: "get_platform_connections",
          success: connectionsResponse.success,
          connectionCount: connectionsResponse.data?.length || 0,
        });

        if (
          !connectionsResponse.success ||
          !connectionsResponse.data ||
          connectionsResponse.data.length === 0
        ) {
          showAlert(
            "❌ Sipariş senkronizasyonu için önce platform bağlantıları kurmanız gerekiyor. Platform Ayarları sayfasından Trendyol, Hepsiburada veya N11 bağlantılarınızı ekleyin.",
            "warning"
          );
          return { success: false, error: "No platform connections" };
        }
      } catch (connectionError) {
        logger.api.warn("Could not check platform connections", {
          operation: "check_platform_connections",
          error: connectionError.message,
        });
        // Continue with sync anyway
      }

      // Proceed with sync
      const syncResponse = await api.orders.syncOrders();
      logger.api.success("Sync response received", {
        operation: "sync_orders_response",
        success: syncResponse.success,
        data: syncResponse,
      });

      if (syncResponse.success) {
        const {
          syncedCount = 0,
          errorCount = 0,
          platforms = [],
        } = syncResponse.data || {};

        if (syncedCount > 0) {
          showAlert(
            `✅ ${syncedCount} sipariş başarıyla senkronize edildi`,
            "success"
          );
        } else if (errorCount > 0) {
          showAlert(
            `⚠️ Senkronizasyon tamamlandı ancak ${errorCount} hata oluştu. Platform bağlantılarınızı kontrol edin.`,
            "warning"
          );
        } else {
          showAlert(
            "ℹ️ Senkronizasyon tamamlandı ancak yeni sipariş bulunamadı. Platform hesaplarınızda sipariş olduğundan emin olun.",
            "info"
          );
        }

        // Log platform-specific results
        platforms.forEach((platform) => {
          logger.info(
            `🏪 ${platform.platformType}: ${
              platform.syncedCount || 0
            } senkronize, ${platform.errorCount || 0} hata`
          );
        });

        return { success: true, data: syncResponse.data };
      } else {
        throw new Error(
          syncResponse.message || "Senkronizasyon başarısız oldu"
        );
      }
    } catch (error) {
      logger.error("❌ Error syncing orders:", error);

      let errorMessage = "Senkronizasyon sırasında bir hata oluştu";

      if (error.response?.status === 401) {
        errorMessage =
          "🔒 Oturum süreniz dolmuş veya giriş yapmanız gerekiyor. Lütfen giriş yapın.";
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else if (error.response?.status === 403) {
        errorMessage = "🚫 Bu işlem için yetkiniz bulunmuyor.";
      } else if (error.response?.status === 404) {
        errorMessage =
          "📡 API endpoint bulunamadı. Sunucu yapılandırmasını kontrol edin.";
      } else if (error.response?.data?.message) {
        errorMessage = `❌ ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `❌ ${error.message}`;
      }

      showAlert(errorMessage, "error");
      return { success: false, error: error.message };
    }
  }

  // Accept order
  static async acceptOrder(orderId, showAlert) {
    try {
      const result = await api.orders.acceptOrder(orderId);

      if (result.success) {
        showAlert("Sipariş başarıyla onaylandı", "success");
        return { success: true };
      } else {
        showAlert(
          result.message || "Sipariş onaylanırken bir hata oluştu",
          "error"
        );
        return { success: false, error: result.message };
      }
    } catch (error) {
      logger.error("Error accepting order:", error);
      showAlert("Sipariş onaylanırken bir hata oluştu", "error");
      return { success: false, error: error.message };
    }
  }

  // Cancel order
  static async cancelOrder(orderId, reason = "", showAlert) {
    try {
      const result = await api.orders.cancelOrder(orderId, reason);
      if (result.success) {
        showAlert("Sipariş başarıyla iptal edildi", "success");
        return { success: true };
      } else {
        showAlert(
          result.message || "Sipariş iptal edilirken hata oluştu",
          "error"
        );
        return { success: false, error: result.message };
      }
    } catch (error) {
      logger.error("Error cancelling order:", error);
      showAlert("Sipariş iptal edilirken hata oluştu", "error");
      return { success: false, error: error.message };
    }
  }

  // Delete order
  static async deleteOrder(orderId, showAlert) {
    const confirmed = window.confirm(
      "Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
    );

    if (!confirmed) {
      return { success: false, cancelled: true };
    }

    try {
      const result = await api.orders.deleteOrder(orderId);
      if (result.success) {
        showAlert("Sipariş başarıyla silindi", "success");
        return { success: true };
      } else {
        showAlert(result.message || "Sipariş silinirken hata oluştu", "error");
        return { success: false, error: result.message };
      }
    } catch (error) {
      logger.error("Error deleting order:", error);
      showAlert("Sipariş silinirken hata oluştu", "error");
      return { success: false, error: error.message };
    }
  }

  // Bulk operations
  static async bulkAccept(selectedOrders, orders, showAlert) {
    try {
      const acceptableOrders = selectedOrders.filter((orderId) => {
        const order = orders.find((o) => o.id === orderId);
        return (
          order &&
          (order.orderStatus === "new" || order.orderStatus === "pending")
        );
      });

      if (acceptableOrders.length === 0) {
        showAlert(
          "Seçilen siparişler arasında onaylanabilir sipariş bulunmuyor",
          "warning"
        );
        return { success: false, error: "No acceptable orders" };
      }

      const results = await Promise.allSettled(
        acceptableOrders.map((orderId) => api.orders.acceptOrder(orderId))
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled" && result.value.success
      ).length;

      const failed = results.length - successful;

      if (successful > 0) {
        showAlert(
          `${successful} sipariş başarıyla onaylandı${
            failed > 0 ? `, ${failed} sipariş onaylanamadı` : ""
          }`,
          failed > 0 ? "warning" : "success"
        );
        return { success: true, successful, failed };
      } else {
        showAlert("Hiçbir sipariş onaylanamadı", "error");
        return { success: false, error: "No orders accepted" };
      }
    } catch (error) {
      logger.error("Error in bulk accept:", error);
      showAlert("Toplu onaylama işlemi sırasında hata oluştu", "error");
      return { success: false, error: error.message };
    }
  }

  static async bulkDelete(selectedOrders, showAlert) {
    if (selectedOrders.length === 0) {
      showAlert("Lütfen silinecek siparişleri seçin", "warning");
      return { success: false, error: "No orders selected" };
    }

    const confirmed = window.confirm(
      `${selectedOrders.length} siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
    );

    if (!confirmed) {
      return { success: false, cancelled: true };
    }

    try {
      const result = await api.orders.bulkDeleteOrders(selectedOrders);
      if (result.success) {
        showAlert(
          `${selectedOrders.length} sipariş başarıyla silindi`,
          "success"
        );
        return { success: true };
      } else {
        showAlert(
          result.message || "Siparişler silinirken hata oluştu",
          "error"
        );
        return { success: false, error: result.message };
      }
    } catch (error) {
      logger.error("Error deleting orders:", error);
      showAlert("Siparişler silinirken hata oluştu", "error");
      return { success: false, error: error.message };
    }
  }

  static async bulkStatusUpdate(selectedOrders, newStatus, showAlert) {
    if (selectedOrders.length === 0) {
      showAlert("Lütfen güncellenecek siparişleri seçin", "warning");
      return { success: false, error: "No orders selected" };
    }

    try {
      await api.orders.bulkUpdateStatus(selectedOrders, newStatus);
      showAlert(
        `${selectedOrders.length} sipariş durumu güncellendi`,
        "success"
      );
      return { success: true };
    } catch (error) {
      showAlert("Toplu durum güncelleme başarısız", "error");
      return { success: false, error: error.message };
    }
  }

  // Enhanced API response processing
  static processOrdersResponse(response) {
    if (!response.success) {
      throw new Error(response.message || "Failed to fetch orders");
    }

    // Handle different response structures from the API
    let ordersData = [];
    let totalCount = 0;
    let totalPagesCalculated = 1;

    if (Array.isArray(response.data)) {
      // Direct array response
      ordersData = response.data;
      totalCount = response.total || ordersData.length;
      totalPagesCalculated = response.totalPages || 1;
    } else if (response.data && Array.isArray(response.data.orders)) {
      // Main API response structure: data.orders with data.pagination
      ordersData = response.data.orders;
      totalCount =
        response.data.pagination?.total ||
        response.data.total ||
        ordersData.length;
      totalPagesCalculated =
        response.data.pagination?.totalPages || Math.ceil(totalCount / 20);
    } else if (response.data && Array.isArray(response.data.data)) {
      // Nested data structure
      ordersData = response.data.data;
      totalCount = response.data.total || response.total || ordersData.length;
      totalPagesCalculated =
        response.data.totalPages ||
        response.totalPages ||
        Math.ceil(totalCount / 20);
    } else if (response.pagination) {
      // Response with pagination object at root level
      ordersData = response.data || [];
      totalCount = response.pagination.total || 0;
      totalPagesCalculated = response.pagination.totalPages || 1;
    } else {
      // Fallback: empty array
      ordersData = [];
      totalCount = 0;
      totalPagesCalculated = 1;
    }

    // Map API response fields to component expected fields
    const mappedOrders = ordersData.map((order) => ({
      ...order,
      id: order.id || order._id || order.orderId,
      status: order.orderStatus || order.status || "pending",
      platform: order.platform || order.platformType || "unknown",
      displayDate: order.orderDate || order.createdAt,
      customerName:
        order.customerName ||
        order.customer?.name ||
        `${order.customer?.firstName || ""} ${
          order.customer?.lastName || ""
        }`.trim() ||
        "Bilinmeyen Müşteri",
      customerEmail: order.customerEmail || order.customer?.email || "",
      totalAmount: order.totalAmount || order.amount || order.total || 0,
      currency: order.currency || order.currencyCode || "TRY",
      orderNumber: order.orderNumber || order.orderNo || order.id || "N/A",
    }));

    return {
      orders: mappedOrders,
      totalCount,
      totalPages: totalPagesCalculated,
    };
  }

  // Save order (create or update)
  static async saveOrder(orderData, isEdit = false) {
    try {
      logger.info(`💾 ${isEdit ? "Updating" : "Creating"} order:`, orderData);

      const response = isEdit
        ? await api.orders.updateOrder(orderData.id, orderData)
        : await api.orders.createOrder(orderData);

      logger.info(
        `✅ Order ${isEdit ? "updated" : "created"} successfully:`,
        response
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: isEdit
            ? "Sipariş başarıyla güncellendi"
            : "Sipariş başarıyla oluşturuldu",
        };
      } else {
        throw new Error(
          response.message || `Failed to ${isEdit ? "update" : "create"} order`
        );
      }
    } catch (error) {
      logger.error(
        `❌ Error ${isEdit ? "updating" : "creating"} order:`,
        error
      );
      return {
        success: false,
        error:
          error.message ||
          `${
            isEdit ? "Sipariş güncellenirken" : "Sipariş oluşturulurken"
          } hata oluştu`,
        message:
          error.message ||
          `${
            isEdit ? "Sipariş güncellenirken" : "Sipariş oluşturulurken"
          } hata oluştu`,
      };
    }
  }

  // Get order by ID for editing
  static async getOrderById(orderId) {
    try {
      logger.info(`🔍 Fetching order by ID: ${orderId}`);

      const response = await api.orders.getOrder(orderId);
      logger.info("✅ Order fetched:", response);

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        throw new Error(response.message || "Order not found");
      }
    } catch (error) {
      logger.error("❌ Error fetching order:", error);
      return {
        success: false,
        error: error.message || "Sipariş yüklenirken hata oluştu",
        message: error.message || "Sipariş yüklenirken hata oluştu",
      };
    }
  }

  // Validate order data before saving
  static validateOrderData(orderData) {
    const errors = [];

    // Required fields validation
    if (!orderData.customerName?.trim()) {
      errors.push("Müşteri adı gereklidir");
    }

    if (!orderData.customerEmail?.trim()) {
      errors.push("Müşteri email adresi gereklidir");
    } else if (!/\S+@\S+\.\S+/.test(orderData.customerEmail)) {
      errors.push("Geçerli bir email adresi giriniz");
    }

    if (!orderData.customerPhone?.trim()) {
      errors.push("Müşteri telefon numarası gereklidir");
    }

    if (!orderData.shippingAddress?.address?.trim()) {
      errors.push("Teslimat adresi gereklidir");
    }

    if (!orderData.shippingAddress?.city?.trim()) {
      errors.push("Teslimat şehri gereklidir");
    }

    if (!orderData.items || orderData.items.length === 0) {
      errors.push("En az bir ürün eklemelisiniz");
    } else {
      // Validate each item
      orderData.items.forEach((item, index) => {
        if (!item.name?.trim()) {
          errors.push(`Ürün ${index + 1}: Ürün adı gereklidir`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Ürün ${index + 1}: Geçerli bir miktar giriniz`);
        }
        if (!item.price || item.price <= 0) {
          errors.push(`Ürün ${index + 1}: Geçerli bir fiyat giriniz`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Fetch orders with filtering, pagination, and search
   * Handles complex API response structures from the legacy implementation
   */
  static async fetchOrders(params = {}) {
    try {
      logger.info("🔍 [OrderService] fetchOrders called with params:", params);
      logger.info("🔍 [OrderService] Search parameter:", params.search);

      const response = await api.orders.getOrders(params);
      logger.info("🔍 [OrderService] API Response:", response);

      if (response.success) {
        // Handle different response structures from the API
        let ordersData = [];
        let paginationInfo = {
          total: 0,
          totalPages: 1,
          currentPage: 1,
          limit: 20,
          hasNext: false,
          hasPrev: false,
        };

        if (Array.isArray(response.data)) {
          // Direct array response (legacy)
          ordersData = response.data;
          paginationInfo.total = response.total || ordersData.length;
          paginationInfo.totalPages =
            response.totalPages ||
            Math.ceil(paginationInfo.total / (params.limit || 20));
          paginationInfo.currentPage = params.page || 1;
          paginationInfo.limit = params.limit || 20;
        } else if (response.data && Array.isArray(response.data.orders)) {
          // Main API response structure: data.orders with data.pagination
          ordersData = response.data.orders;

          if (response.data.pagination) {
            // Use the structured pagination info from the API
            paginationInfo = {
              total: response.data.pagination.total || ordersData.length,
              totalPages:
                response.data.pagination.totalPages ||
                Math.ceil(
                  (response.data.pagination.total || ordersData.length) /
                    (params.limit || 20)
                ),
              currentPage:
                response.data.pagination.currentPage || params.page || 1,
              limit: response.data.pagination.limit || params.limit || 20,
              hasNext: response.data.pagination.hasNext || false,
              hasPrev: response.data.pagination.hasPrev || false,
              showing: response.data.pagination.showing || ordersData.length,
              from: response.data.pagination.from || 1,
              to: response.data.pagination.to || ordersData.length,
            };
          } else {
            // Fallback to legacy structure
            paginationInfo.total = response.total || ordersData.length;
            paginationInfo.totalPages =
              response.totalPages ||
              Math.ceil(paginationInfo.total / (params.limit || 20));
            paginationInfo.currentPage = params.page || 1;
            paginationInfo.limit = params.limit || 20;
          }
        } else if (response.data && Array.isArray(response.data.data)) {
          // Nested data structure
          ordersData = response.data.data;
          paginationInfo.total =
            response.data.total || response.total || ordersData.length;
          paginationInfo.totalPages =
            response.data.totalPages ||
            response.totalPages ||
            Math.ceil(paginationInfo.total / (params.limit || 20));
          paginationInfo.currentPage = params.page || 1;
          paginationInfo.limit = params.limit || 20;
        } else {
          // Fallback: empty array
          logger.warn("Unknown API response structure:", response);
          ordersData = [];
        }

        // Ensure we have valid data
        if (!Array.isArray(ordersData)) {
          logger.warn("Invalid orders data structure:", ordersData);
          ordersData = [];
        }

        // Calculate stats from the orders
        const stats = this.calculateStats(ordersData);

        return {
          success: true,
          data: {
            orders: ordersData,
            pagination: {
              currentPage: paginationInfo.currentPage,
              totalPages: paginationInfo.totalPages,
              totalRecords: paginationInfo.total, // Use totalRecords to match useOrderState
              recordCount: paginationInfo.limit,
              hasNext: paginationInfo.hasNext,
              hasPrev: paginationInfo.hasPrev,
              showing: paginationInfo.showing || ordersData.length,
              from:
                paginationInfo.from ||
                (paginationInfo.currentPage - 1) * paginationInfo.limit + 1,
              to:
                paginationInfo.to ||
                Math.min(
                  paginationInfo.currentPage * paginationInfo.limit,
                  paginationInfo.total
                ),
            },
            stats,
          },
        };
      } else {
        throw new Error(response.message || "Failed to fetch orders");
      }
    } catch (error) {
      logger.error("❌ Error fetching orders:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch orders",
      };
    }
  }

  /**
   * Calculate order statistics from order data
   * Matches the logic from the legacy updateStatsFromOrders function
   */
  static calculateStats(ordersData) {
    if (!Array.isArray(ordersData)) {
      logger.warn("calculateStats: Invalid orders data");
      return {
        total: 0,
        new: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        in_transit: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0,
        failed: 0,
        unknown: 0,
        claimCreated: 0,
        claimApproved: 0,
        claimRejected: 0,
        refunded: 0,
        consolidated: 0,
        inBatch: 0,
        totalRevenue: 0,
      };
    }

    logger.info(`Calculating stats for ALL ${ordersData.length} orders`);

    const stats = {
      total: ordersData.length,
      new: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      failed: 0,
      unknown: 0,
      claimCreated: 0,
      claimApproved: 0,
      claimRejected: 0,
      refunded: 0,
      consolidated: 0,
      inBatch: 0,
      totalRevenue: 0,
    };

    ordersData.forEach((order) => {
      // Fix: properly get the status field from the order
      const status = order.status || order.orderStatus || "pending";

      // Handle status mapping for stats (convert underscore to camelCase for specific statuses)
      let statKey = status;
      if (status === "claim_created") statKey = "claimCreated";
      else if (status === "claim_approved") statKey = "claimApproved";
      else if (status === "claim_rejected") statKey = "claimRejected";
      else if (status === "in_batch") statKey = "inBatch";

      if (stats.hasOwnProperty(statKey)) {
        stats[statKey]++;
      } else if (stats.hasOwnProperty(status)) {
        stats[status]++;
      }

      // Calculate total revenue from all non-cancelled orders
      if (
        status !== "cancelled" &&
        status !== "returned" &&
        status !== "failed" &&
        order.totalAmount
      ) {
        const amount = parseFloat(order.totalAmount) || 0;
        stats.totalRevenue += amount;
        logger.info(
          `Adding revenue: ${amount} for order ${
            order.id || order.orderNumber
          } (status: ${status})`
        );
      }
    });

    logger.info("Final calculated stats:", stats);
    return stats;
  }

  /**
   * Check if any filters are active
   * Returns true if any filters are set to non-default values
   */
  static hasActiveFilters(filters = {}) {
    if (!filters) return false;

    // Check if any non-default filter values are set
    if (filters.status && filters.status !== "all") return true;
    if (filters.platform && filters.platform !== "all") return true;
    if (filters.search && filters.search.trim() !== "") return true;
    if (filters.dateFrom && filters.dateFrom !== "") return true;
    if (filters.dateTo && filters.dateTo !== "") return true;
    if (filters.priceMin && filters.priceMin !== "") return true;
    if (filters.priceMax && filters.priceMax !== "") return true;

    return false;
  }

  /**
   * Validate filters before API call
   * Matches the logic from the legacy validateFilters function
   */
  static validateFilters(filters) {
    const errors = {};

    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);

      if (fromDate > toDate) {
        errors.dateRange = "Başlangıç tarihi bitiş tarihinden sonra olamaz";
      }

      const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        errors.dateRange = "Tarih aralığı 1 yıldan fazla olamaz";
      }
    }

    if (filters.priceMin && filters.priceMax) {
      const minPrice = parseFloat(filters.priceMin);
      const maxPrice = parseFloat(filters.priceMax);

      if (minPrice > maxPrice) {
        errors.priceRange = "Minimum fiyat maksimum fiyattan büyük olamaz";
      }
    }

    return errors;
  }

  /**
   * Fetch all orders statistics without pagination
   * This ensures accurate stats calculation regardless of current page
   */
  static async fetchOrderStats(filters = {}) {
    try {
      logger.info("Fetching order stats for ALL orders");

      // Fetch all orders without pagination for accurate stats
      // Ignore any filters passed in to ensure we get stats for ALL orders
      const params = {
        limit: 10000, // Large number to get all orders
        page: 1,
        statsOnly: true, // Hint to backend that we only need stats
        includeAllOrders: true, // Special flag to indicate we want stats for ALL orders
      };

      const response = await api.orders.getOrders(params);
      logger.info("Stats API Response:", response);

      if (response.success) {
        let ordersData = [];

        // Extract orders from various response structures
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if (response.data && Array.isArray(response.data.orders)) {
          ordersData = response.data.orders;
        } else if (
          response.data &&
          response.data.data &&
          Array.isArray(response.data.data.orders)
        ) {
          ordersData = response.data.data.orders;
        } else if (response.data && Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        }

        // Calculate comprehensive stats from all orders
        const stats = this.calculateStats(ordersData);

        return {
          success: true,
          data: stats,
        };
      } else {
        throw new Error(response.message || "Failed to fetch order stats");
      }
    } catch (error) {
      logger.error("❌ Error fetching order stats:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch order stats",
      };
    }
  }
}

export default OrderService;
