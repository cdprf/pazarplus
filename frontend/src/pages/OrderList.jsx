/* eslint-disable no-unused-vars */
// frontend/src/pages/OrderList.jsx

import React from 'react';
import OrderDashboard from '../components/dashboard/OrderDashboard';
import ErrorBoundary from '../components/ErrorBoundary';
import { Card } from 'react-bootstrap';

const OrderList = () => {
  return (
    <div className="order-list">
      <h2 className="mb-4">Orders</h2>
      
      <ErrorBoundary fallbackMessage="Failed to load orders dashboard">
        <OrderDashboard />
      </ErrorBoundary>
    </div>
  );
};

export default OrderList;