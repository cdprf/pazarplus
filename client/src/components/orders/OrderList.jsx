import React from 'react';
import { useNavigate } from 'react-router-dom';
import OrderManagement from './OrderManagement';

// This component is now a wrapper around OrderManagement to maintain compatibility
// while consolidating duplicate functionality
const OrderList = () => {
  return <OrderManagement />;
};

export default OrderList;
