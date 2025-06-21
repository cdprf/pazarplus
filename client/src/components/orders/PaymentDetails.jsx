/**
 * Enhanced Payment Details Display Component
 * Shows comprehensive payment information with status indicators
 */

import React from "react";
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
  Calendar,
  Banknote,
  Smartphone,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/platformHelpers";

const PaymentDetails = ({ order, className = "" }) => {
  if (!order) {
    return (
      <div
        className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-6 ${className}`}
      >
        <div className="text-center">
          <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Ödeme bilgisi bulunmuyor
          </p>
        </div>
      </div>
    );
  }

  // Payment status mapping
  const getPaymentStatusInfo = (status) => {
    const statusMap = {
      paid: {
        icon: CheckCircle,
        text: "Ödendi",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
      },
      pending: {
        icon: Clock,
        text: "Beklemede",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
      },
      failed: {
        icon: XCircle,
        text: "Başarısız",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
      },
      refunded: {
        icon: AlertCircle,
        text: "İade Edildi",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
        borderColor: "border-purple-200 dark:border-purple-800",
      },
      cancelled: {
        icon: XCircle,
        text: "İptal Edildi",
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-700",
        borderColor: "border-gray-200 dark:border-gray-600",
      },
    };

    return statusMap[status] || statusMap.pending;
  };

  // Payment method icon mapping
  const getPaymentMethodIcon = (method) => {
    const methodLower = method?.toLowerCase();
    switch (methodLower) {
      case "credit_card":
      case "creditcard":
      case "kredi kartı":
        return CreditCard;
      case "bank_transfer":
      case "havale":
      case "eft":
        return Banknote;
      case "mobile_payment":
      case "mobil ödeme":
        return Smartphone;
      case "cash":
      case "nakit":
        return DollarSign;
      default:
        return CreditCard;
    }
  };

  const paymentStatusInfo = getPaymentStatusInfo(
    order.paymentStatus || "pending"
  );
  const PaymentIcon = paymentStatusInfo.icon;
  const PaymentMethodIcon = getPaymentMethodIcon(order.paymentMethod);

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-6">
        <Receipt className="h-5 w-5 mr-2 icon-contrast-primary" />
        Ödeme Bilgileri
      </h4>

      <div className="space-y-4">
        {/* Payment Status */}
        <div
          className={`p-4 rounded-lg border ${paymentStatusInfo.bgColor} ${paymentStatusInfo.borderColor}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <PaymentIcon
                className={`h-5 w-5 mr-2 ${paymentStatusInfo.color}`}
              />
              <span className={`font-medium ${paymentStatusInfo.color}`}>
                {paymentStatusInfo.text}
              </span>
            </div>

            {order.paymentDate && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(order.paymentDate)}
              </div>
            )}
          </div>
        </div>

        {/* Payment Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Toplam Tutar
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>

          {order.paidAmount && order.paidAmount !== order.totalAmount && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600 dark:text-green-400">
                  Ödenen Tutar
                </span>
                <span className="text-lg font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(order.paidAmount, order.currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method */}
        {order.paymentMethod && (
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <PaymentMethodIcon className="h-4 w-4 text-gray-500 mr-3" />
            <div>
              <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                {order.paymentMethod}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Ödeme Yöntemi
              </div>
            </div>
          </div>
        )}

        {/* Transaction Details */}
        {(order.transactionId || order.paymentReference) && (
          <div className="space-y-2">
            {order.transactionId && (
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Receipt className="h-4 w-4 text-gray-500 mr-3" />
                <div className="flex-1">
                  <div className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {order.transactionId}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    İşlem Numarası
                  </div>
                </div>
              </div>
            )}

            {order.paymentReference &&
              order.paymentReference !== order.transactionId && (
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Receipt className="h-4 w-4 text-gray-500 mr-3" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                      {order.paymentReference}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Ödeme Referansı
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Platform Fee Information */}
        {(order.platformFee || order.commissionFee) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Platform Ücretleri
            </h5>
            <div className="space-y-2">
              {order.platformFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Platform Ücreti
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatCurrency(order.platformFee, order.currency)}
                  </span>
                </div>
              )}

              {order.commissionFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Komisyon
                  </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatCurrency(order.commissionFee, order.currency)}
                  </span>
                </div>
              )}

              {(order.platformFee || order.commissionFee) && (
                <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-gray-100">
                    Net Tutar
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(
                      order.totalAmount -
                        (order.platformFee || 0) -
                        (order.commissionFee || 0),
                      order.currency
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Notes */}
        {order.paymentNotes && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Not: </span>
              {order.paymentNotes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetails;
