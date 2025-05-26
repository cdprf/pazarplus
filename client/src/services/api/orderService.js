import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/orders`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization header interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const orderService = {
  // Get all orders with optional filters
  getOrders: async (params = {}) => {
    const response = await api.get('/', { params });
    return response.data;
  },
  
  // Get order by ID
  getOrderById: async (id) => {
    const response = await api.get(`/${id}`);
    return response.data;
  },
  
  // Create new order
  createOrder: async (orderData) => {
    const response = await api.post('/', orderData);
    return response.data;
  },
  
  // Update existing order
  updateOrder: async (id, orderData) => {
    const response = await api.put(`/${id}`, orderData);
    return response.data;
  },
  
  // Delete order
  deleteOrder: async (id) => {
    const response = await api.delete(`/${id}`);
    return response.data;
  },
  
  // Export orders to CSV
  exportToCSV: async (filters = {}) => {
    const response = await api.get('/export/csv', { 
      params: filters,
      responseType: 'blob' 
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Set download filename from header or default
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'orders-export.csv';
    
    if (contentDisposition) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  
  // Export orders to PDF
  exportToPDF: async (orderId) => {
    const response = await api.get(`/export/pdf${orderId ? `/${orderId}` : ''}`, { 
      responseType: 'blob' 
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Set download filename from header or default
    const contentDisposition = response.headers['content-disposition'];
    let filename = orderId ? `order-${orderId}.pdf` : 'orders-export.pdf';
    
    if (contentDisposition) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

export default orderService;
