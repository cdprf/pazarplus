import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Truck,
  Clock,
  Edit,
  Save,
  X
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState({});
  const { showNotification } = useNotification();

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.getOrder(id);
      setOrder(response);
      setEditedOrder(response);
    } catch (error) {
      console.error('Error fetching order:', error);
      showNotification('Error loading order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await api.updateOrderStatus(id, newStatus);
      setOrder(prev => ({ ...prev, orderStatus: newStatus }));
      showNotification('Order status updated successfully', 'success');
    } catch (error) {
      console.error('Error updating order status:', error);
      showNotification('Error updating order status', 'error');
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Add save logic when backend supports order updates
      setOrder(editedOrder);
      setEditing(false);
      showNotification('Order updated successfully', 'success');
    } catch (error) {
      console.error('Error updating order:', error);
      showNotification('Error updating order', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
          <p className="text-gray-500">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/orders')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Order #{order.orderNumber || order.id}
            </h1>
            <p className="text-gray-600">
              Placed on {formatDate(order.orderDate)} • {order.platform}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveEdit}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditedOrder(order);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.productName}</h3>
                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.price)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Total: {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No items found</p>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order Placed</p>
                  <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              
              {order.statusHistory?.map((status, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{status.status}</p>
                    <p className="text-sm text-gray-500">{formatDate(status.updatedAt)}</p>
                  </div>
                </div>
              )) || null}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
            <div className="space-y-2">
              {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={order.status === status}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${order.status === status 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer
            </h2>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900">{order.customerName}</p>
                <p className="text-sm text-gray-500">{order.customerEmail}</p>
                {order.customerPhone && (
                  <p className="text-sm text-gray-500">{order.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Shipping Address
            </h2>
            <div className="text-sm text-gray-600">
              {editing ? (
                <textarea
                  value={editedOrder.shippingAddress || ''}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, shippingAddress: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={4}
                />
              ) : (
                <p>{order.shippingAddress || 'No shipping address provided'}</p>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(order.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-medium">{formatCurrency(order.shippingCost || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">{formatCurrency(order.taxAmount || 0)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-500">
                  Payment Method: {order.paymentMethod || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          {order.trackingNumber && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Shipping
              </h2>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">Carrier:</span>
                  <span className="ml-2 font-medium">{order.shippingCarrier || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Tracking:</span>
                  <span className="ml-2 font-medium">{order.trackingNumber}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;