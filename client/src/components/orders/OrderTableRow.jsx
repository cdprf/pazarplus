/**
 * Performance-Optimized OrderTableRow Component
 * Memoized to prevent unnecessary re-renders
 */

import React, { memo, useCallback } from "react";
import { Badge } from "../ui/Badge";
import OrderItems from "./OrderItems";
import OrderActions from "./OrderActions";
import {
  getPlatformIcon,
  getPlatformVariant,
  getStatusIcon,
  getStatusVariant,
  getStatusText,
  formatCurrency,
  formatDate,
} from "../../utils/platformHelpers";

const OrderTableRow = memo(
  ({
    order,
    isSelected,
    onToggleSelection,
    onView,
    onEdit,
    onViewDetail,
    onAccept,
    onCancel,
    onDelete,
    showAlert,
  }) => {
    // Memoize the selection handler to prevent function recreation
    const handleSelectionChange = useCallback(
      (e) => {
        onToggleSelection(order.id, e.target.checked);
      },
      [order.id, onToggleSelection]
    );

    // Pre-calculate values to avoid recalculation on each render
    const {
      platformVariant,
      platformIcon,
      statusVariant,
      statusIcon,
      statusText,
      formattedCurrency,
      formattedDate,
    } = React.useMemo(
      () => ({
        platformVariant: getPlatformVariant(order.platform),
        platformIcon: getPlatformIcon(order.platform),
        statusVariant: getStatusVariant(order.status),
        statusIcon: getStatusIcon(order.status),
        statusText: getStatusText(order.status),
        formattedCurrency: formatCurrency(order.totalAmount, order.currency),
        formattedDate: formatDate(order),
      }),
      [order]
    );

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="rounded border-gray-300 text-blue-600"
          />
        </td>
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900">
            {order.orderNumber}
          </div>
          <div className="text-xs text-gray-500">{formattedDate}</div>
        </td>
        <td className="px-6 py-4">
          <OrderItems order={order} />
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">{order.customerName}</div>
          {order.customerEmail && (
            <div className="text-sm text-gray-500">{order.customerEmail}</div>
          )}
        </td>
        <td className="px-6 py-4">
          <Badge variant={platformVariant}>{platformIcon}</Badge>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center">
            <span className="mr-2">{statusIcon}</span>
            <Badge variant={statusVariant}>{statusText}</Badge>
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">{formattedCurrency}</td>
        <td className="px-6 py-4">
          <OrderActions
            order={order}
            onView={onView}
            onEdit={onEdit}
            onViewDetail={onViewDetail}
            onAccept={onAccept}
            onCancel={onCancel}
            onDelete={onDelete}
            showAlert={showAlert}
          />
        </td>
      </tr>
    );
  }
);

OrderTableRow.displayName = "OrderTableRow";

export default OrderTableRow;
