/**
 * OrderTimeline - Enhanced order status tracking component
 * Shows complete order lifecycle with timestamps and actions
 */

import React from "react";
import {
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  CreditCard,
  MapPin,
} from "lucide-react";
import { formatDate } from "../../utils/platformHelpers";

const OrderTimeline = ({ order }) => {
  // Generate timeline events from order data
  const generateTimelineEvents = (order) => {
    const events = [];

    // Order created
    events.push({
      id: "created",
      type: "created",
      title: "Sipariş Oluşturuldu",
      description: `Platform: ${order.platform}`,
      timestamp: order.createdAt || order.orderDate,
      icon: Package,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      completed: true,
    });

    // Payment (if available)
    if (order.paymentStatus && order.paymentStatus !== "pending") {
      events.push({
        id: "payment",
        type: "payment",
        title: "Ödeme Alındı",
        description: `${order.totalAmount} ${order.currency}`,
        timestamp: order.paymentDate || order.createdAt,
        icon: CreditCard,
        iconColor: "text-green-600",
        bgColor: "bg-green-100",
        completed: order.paymentStatus === "paid",
      });
    }

    // Order statuses
    const statusMapping = {
      new: {
        title: "Yeni Sipariş",
        description: "Sipariş sisteme kaydedildi",
        icon: AlertCircle,
        iconColor: "text-yellow-600",
        bgColor: "bg-yellow-100",
      },
      confirmed: {
        title: "Sipariş Onaylandı",
        description: "Sipariş onaylandı ve işleme alındı",
        icon: CheckCircle,
        iconColor: "text-green-600",
        bgColor: "bg-green-100",
      },
      processing: {
        title: "Hazırlanıyor",
        description: "Sipariş hazırlanıyor",
        icon: Package,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      shipped: {
        title: "Kargoya Verildi",
        description: order.trackingNumber
          ? `Takip No: ${order.trackingNumber}`
          : "Kargo sürecinde",
        icon: Truck,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-100",
      },
      delivered: {
        title: "Teslim Edildi",
        description: "Sipariş başarıyla teslim edildi",
        icon: CheckCircle,
        iconColor: "text-green-600",
        bgColor: "bg-green-100",
      },
      cancelled: {
        title: "İptal Edildi",
        description: order.cancelReason || "Sipariş iptal edildi",
        icon: XCircle,
        iconColor: "text-red-600",
        bgColor: "bg-red-100",
      },
      returned: {
        title: "İade Edildi",
        description: order.returnReason || "Sipariş iade edildi",
        icon: AlertCircle,
        iconColor: "text-orange-600",
        bgColor: "bg-orange-100",
      },
    };

    const currentStatus = order.orderStatus || order.status;
    if (statusMapping[currentStatus]) {
      const statusInfo = statusMapping[currentStatus];
      events.push({
        id: currentStatus,
        type: "status",
        title: statusInfo.title,
        description: statusInfo.description,
        timestamp: order.statusUpdatedAt || order.updatedAt,
        icon: statusInfo.icon,
        iconColor: statusInfo.iconColor,
        bgColor: statusInfo.bgColor,
        completed: true,
      });
    }

    // Shipping address (if available)
    if (order.shippingAddress) {
      events.push({
        id: "shipping",
        type: "shipping",
        title: "Teslimat Adresi",
        description: `${order.shippingDetail.city}, ${order.shippingDetail.state}`,
        timestamp: order.createdAt,
        icon: MapPin,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-100",
        completed: true,
      });
    }

    // Custom events from order history
    if (order.history && Array.isArray(order.history)) {
      order.history.forEach((event, index) => {
        events.push({
          id: `history-${index}`,
          type: "history",
          title: event.action || "Güncelleme",
          description: event.description || event.details,
          timestamp: event.timestamp || event.createdAt,
          icon: Clock,
          iconColor: "text-gray-600",
          bgColor: "bg-gray-100",
          completed: true,
          user: event.user,
        });
      });
    }

    // Sort events by timestamp (newest first)
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const timelineEvents = generateTimelineEvents(order);

  if (!timelineEvents || timelineEvents.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Henüz zaman çizelgesi bilgisi bulunmuyor
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
        <Clock className="h-5 w-5 mr-2 icon-contrast-primary" />
        Sipariş Zaman Çizelgesi
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

        <div className="space-y-6">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div key={event.id} className="relative flex items-start">
                {/* Timeline dot */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full ${event.bgColor} flex items-center justify-center relative z-10`}
                >
                  <Icon className={`h-6 w-6 ${event.iconColor}`} />
                </div>

                {/* Event content */}
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {event.title}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate({ displayDate: event.timestamp })}
                    </span>
                  </div>

                  {event.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {event.description}
                    </p>
                  )}

                  {event.user && (
                    <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <User className="h-3 w-3 mr-1" />
                      {event.user}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order summary at bottom */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">
              Sipariş No
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {order.orderNumber}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">
              Platform
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {order.platform}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">
              Durum
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {order.orderStatus || order.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">
              Tutar
            </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {order.totalAmount} {order.currency || "TRY"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;
