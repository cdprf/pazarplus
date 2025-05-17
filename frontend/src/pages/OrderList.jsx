/* eslint-disable no-unused-vars */
// frontend/src/pages/OrderList.jsx

import React from 'react';
import OrderDashboard from '../components/dashboard/OrderDashboard';
import { Card } from 'react-bootstrap';

const OrderList = () => {
  return (
    <div className="order-list">
      <h2 className="mb-4">Orders</h2>
      
      <OrderDashboard />
    </div>
  );
};

export default OrderList;