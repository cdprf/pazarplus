/* eslint-disable no-unused-vars */
// frontend/src/pages/OrderList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Button, 
  Badge, 
  Form, 
  InputGroup, 
  Dropdown, 
  DropdownButton,
  Pagination
} from 'react-bootstrap';
import OrderDashboard from '../components/dashboard/OrderDashboard';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingState from '../components/shared/LoadingState';
import AccessibleTable from '../components/shared/AccessibleTable';
import { useOrders, useOrderAction } from '../hooks/useOrders';
import { usePlatformConnections } from '../hooks/usePlatforms';
import { useContext } from 'react';
import { AlertContext } from '../context/AlertContext';
import { FaSearch, FaFilter, FaSort, FaDownload, FaSync, FaEye, FaPrint, FaEllipsisV } from 'react-icons/fa';

const OrderList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useContext(AlertContext);
  
  // Parse URL query parameters
  const queryParams = useMemo(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: queryParams.get('status') || '',
    platform: queryParams.get('platform') || '',
    search: queryParams.get('search') || '',
    dateFrom: queryParams.get('dateFrom') || '',
    dateTo: queryParams.get('dateTo') || '',
    page: parseInt(queryParams.get('page') || '1', 10),
    limit: parseInt(queryParams.get('limit') || '10', 10),
    sort: queryParams.get('sort') || 'createdAt',
    direction: queryParams.get('direction') || 'desc'
  });
  
  const [showDashboard, setShowDashboard] = useState(true);
  
  // Effect to update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [filters, navigate, location.pathname]);
  
  // Fetch orders with current filters
  const { 
    data: ordersData, 
    isLoading: ordersLoading, 
    error: ordersError,
    refetch
  } = useOrders(filters);
  
  // Fetch available platforms for filtering
  const { data: platformConnectionsData } = usePlatformConnections();
  
  // Order action mutation (for status updates, etc.)
  const { mutate: performAction, isLoading: actionLoading } = useOrderAction();
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ 
      ...prev, 
      [name]: value,
      // Reset to page 1 when filters change
      ...(name !== 'page' && { page: 1 })
    }));
  };
  
  // Handle order status change
  const handleStatusChange = (orderId, newStatus) => {
    performAction({ 
      id: orderId, 
      action: 'updateStatus', 
      data: { status: newStatus } 
    }, {
      onSuccess: (data) => {
        if (data.success) {
          success(`Order status updated to ${newStatus}`);
          refetch();
        } else {
          showError(data.message || 'Failed to update order status');
        }
      },
      onError: (err) => {
        showError(err.message || 'Error updating order status');
      }
    });
  };
  
  // Generate status badge with appropriate color
  const getStatusBadge = (status) => {
    const statusMap = {
      new: { variant: 'info', label: 'New' },
      processing: { variant: 'primary', label: 'Processing' },
      shipped: { variant: 'warning', label: 'Shipped' },
      delivered: { variant: 'success', label: 'Delivered' },
      cancelled: { variant: 'danger', label: 'Cancelled' },
      returned: { variant: 'secondary', label: 'Returned' },
      failed: { variant: 'danger', label: 'Failed' }
    };
    
    const statusInfo = statusMap[status] || { variant: 'light', label: status };
    
    return (
      <Badge bg={statusInfo.variant} className="py-1 px-2">
        {statusInfo.label}
      </Badge>
    );
  };
  
  // Handle sorting column click
  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sort: column,
      direction: prev.sort === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: '',
      platform: '',
      search: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
      limit: filters.limit,
      sort: 'createdAt',
      direction: 'desc'
    });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Format currency for display
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };
  
  // Generate pagination items
  const renderPagination = () => {
    if (!ordersData || !ordersData.pagination) return null;
    
    const { page, pages, total } = ordersData.pagination;
    const currentPage = parseInt(page, 10);
    const totalPages = parseInt(pages, 10);
    
    // Don't render pagination if there's only one page
    if (totalPages <= 1) return null;
    
    // Calculate range of pages to show
    let startPage = Math.max(currentPage - 2, 1);
    let endPage = Math.min(startPage + 4, totalPages);
    
    // Adjust if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(endPage - 4, 1);
    }
    
    const items = [];
    
    // Previous button
    items.push(
      <Pagination.Prev 
        key="prev"
        disabled={currentPage === 1}
        onClick={() => handleFilterChange('page', currentPage - 1)}
      />
    );
    
    // First page and ellipsis if needed
    if (startPage > 1) {
      items.push(
        <Pagination.Item 
          key={1} 
          onClick={() => handleFilterChange('page', 1)}
        >
          1
        </Pagination.Item>
      );
      
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
      }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => handleFilterChange('page', i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Last page and ellipsis if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
      }
      
      items.push(
        <Pagination.Item 
          key={totalPages} 
          onClick={() => handleFilterChange('page', totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Next button
    items.push(
      <Pagination.Next 
        key="next"
        disabled={currentPage === totalPages}
        onClick={() => handleFilterChange('page', currentPage + 1)}
      />
    );
    
    return (
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted">
          Showing {ordersData.orders.length} of {total} orders
        </div>
        <Pagination>{items}</Pagination>
      </div>
    );
  };

  // Define table columns
  const columns = [
    {
      key: 'orderNumber',
      header: (
        <div 
          className="cursor-pointer d-flex align-items-center"
          onClick={() => handleSort('orderNumber')}
          role="button"
          tabIndex={0}
          aria-label={`Sort by Order ID ${filters.sort === 'orderNumber' ? (filters.direction === 'asc' ? 'descending' : 'ascending') : ''}`}
        >
          Order ID
          {filters.sort === 'orderNumber' ? (
            <span className="ms-1" aria-hidden="true">
              {filters.direction === 'asc' ? '↑' : '↓'}
            </span>
          ) : null}
        </div>
      ),
      render: (order) => (
        <Link to={`/orders/${order.id}`} className="text-primary fw-bold">
          #{order.orderNumber || order.id.substr(0, 8)}
        </Link>
      )
    },
    {
      key: 'customerName',
      header: (
        <div 
          className="cursor-pointer d-flex align-items-center"
          onClick={() => handleSort('customerName')}
          role="button"
          tabIndex={0}
          aria-label={`Sort by Customer ${filters.sort === 'customerName' ? (filters.direction === 'asc' ? 'descending' : 'ascending') : ''}`}
        >
          Customer
          {filters.sort === 'customerName' ? (
            <span className="ms-1" aria-hidden="true">
              {filters.direction === 'asc' ? '↑' : '↓'}
            </span>
          ) : null}
        </div>
      ),
      render: (order) => order.customerName || 'N/A'
    },
    {
      key: 'orderDate',
      header: (
        <div 
          className="cursor-pointer d-flex align-items-center"
          onClick={() => handleSort('orderDate')}
          role="button"
          tabIndex={0}
          aria-label={`Sort by Order Date ${filters.sort === 'orderDate' ? (filters.direction === 'asc' ? 'descending' : 'ascending') : ''}`}
        >
          Order Date
          {filters.sort === 'orderDate' ? (
            <span className="ms-1" aria-hidden="true">
              {filters.direction === 'asc' ? '↑' : '↓'}
            </span>
          ) : null}
        </div>
      ),
      render: (order) => formatDate(order.orderDate || order.createdAt)
    },
    {
      key: 'totalAmount',
      header: (
        <div 
          className="cursor-pointer d-flex align-items-center"
          onClick={() => handleSort('totalAmount')}
          role="button"
          tabIndex={0}
          aria-label={`Sort by Total ${filters.sort === 'totalAmount' ? (filters.direction === 'asc' ? 'descending' : 'ascending') : ''}`}
        >
          Total
          {filters.sort === 'totalAmount' ? (
            <span className="ms-1" aria-hidden="true">
              {filters.direction === 'asc' ? '↑' : '↓'}
            </span>
          ) : null}
        </div>
      ),
      render: (order) => formatCurrency(order.totalAmount, order.currency)
    },
    {
      key: 'platformType',
      header: 'Platform',
      render: (order) => (
        <Badge bg="light" text="dark">
          {order.platformType || 'Manual'}
        </Badge>
      )
    },
    {
      key: 'status',
      header: (
        <div 
          className="cursor-pointer d-flex align-items-center"
          onClick={() => handleSort('status')}
          role="button"
          tabIndex={0}
          aria-label={`Sort by Status ${filters.sort === 'status' ? (filters.direction === 'asc' ? 'descending' : 'ascending') : ''}`}
        >
          Status
          {filters.sort === 'status' ? (
            <span className="ms-1" aria-hidden="true">
              {filters.direction === 'asc' ? '↑' : '↓'}
            </span>
          ) : null}
        </div>
      ),
      render: (order) => getStatusBadge(order.status)
    }
  ];

  // Define row actions
  const actions = [
    {
      text: '',
      icon: <FaEye />,
      onClick: (order) => navigate(`/orders/${order.id}`),
      variant: 'outline-primary',
      label: 'View order'
    },
    {
      text: '',
      icon: <FaPrint />,
      onClick: (order) => navigate(`/orders/${order.id}/print`),
      variant: 'outline-secondary',
      label: 'Print order'
    },
    {
      text: '',
      icon: <FaEllipsisV />,
      onClick: (order) => {
        // Handle status change via dropdown
        // This is a placeholder - in reality you'd need to add a more complex dropdown UI here
        const newStatus = window.prompt('Change status to: (processing, shipped, delivered, cancelled)');
        if (newStatus && ['processing', 'shipped', 'delivered', 'cancelled'].includes(newStatus)) {
          handleStatusChange(order.id, newStatus);
        }
      },
      variant: 'outline-secondary',
      label: 'More actions'
    }
  ];
  
  return (
    <div className="order-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h2">Orders</h1>
        
        <div>
          <Button 
            variant="outline-secondary" 
            className="me-2"
            onClick={() => setShowDashboard(!showDashboard)}
          >
            {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
          </Button>
          
          <Button 
            variant="primary"
            onClick={() => navigate('/import-csv')}
          >
            Import Orders
          </Button>
        </div>
      </div>
      
      {showDashboard && (
        <ErrorBoundary fallbackMessage="Failed to load orders dashboard">
          <OrderDashboard />
        </ErrorBoundary>
      )}
      
      <Card className="mb-4 mt-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <h2 className="h5 mb-0">Order List</h2>
            
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="me-2"
                onClick={refetch}
                disabled={ordersLoading}
                aria-label="Refresh orders list"
              >
                <FaSync className={ordersLoading ? 'fa-spin' : ''} /> Refresh
              </Button>
              
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => navigate('/export-data?type=orders')}
                aria-label="Export orders data"
              >
                <FaDownload /> Export
              </Button>
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          {/* Filter Controls */}
          <Row className="mb-3">
            <Col lg={4} md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch aria-hidden="true" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search orders..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  aria-label="Search orders"
                />
                {filters.search && (
                  <Button 
                    variant="outline-secondary"
                    onClick={() => handleFilterChange('search', '')}
                    aria-label="Clear search"
                  >
                    &times;
                  </Button>
                )}
              </InputGroup>
            </Col>
            
            <Col lg={2} md={3} className="my-2 my-md-0">
              <Form.Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
              </Form.Select>
            </Col>
            
            <Col lg={2} md={3} className="my-2 my-md-0">
              <Form.Select
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
                aria-label="Filter by platform"
              >
                <option value="">All Platforms</option>
                {platformConnectionsData?.data?.map(connection => (
                  <option key={connection.id} value={connection.id}>
                    {connection.name || connection.platformType}
                  </option>
                ))}
              </Form.Select>
            </Col>
            
            <Col lg={2} md={6} className="my-2 my-lg-0">
              <InputGroup>
                <InputGroup.Text>From</InputGroup.Text>
                <Form.Control
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  aria-label="Filter by date from"
                />
              </InputGroup>
            </Col>
            
            <Col lg={2} md={6} className="my-2 my-lg-0">
              <InputGroup>
                <InputGroup.Text>To</InputGroup.Text>
                <Form.Control
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  aria-label="Filter by date to"
                />
              </InputGroup>
            </Col>
          </Row>
          
          {/* Applied Filters Display */}
          {(filters.status || filters.platform || filters.dateFrom || filters.dateTo) && (
            <div className="d-flex align-items-center mb-3">
              <div className="text-muted me-2">Applied filters:</div>
              
              {filters.status && (
                <Badge bg="secondary" className="me-2">
                  Status: {filters.status}
                  <Button
                    size="sm"
                    variant="link"
                    className="text-white p-0 ms-1"
                    onClick={() => handleFilterChange('status', '')}
                    aria-label={`Remove status filter: ${filters.status}`}
                  >
                    &times;
                  </Button>
                </Badge>
              )}
              
              {filters.platform && (
                <Badge bg="secondary" className="me-2">
                  Platform: {
                    platformConnectionsData?.data?.find(c => c.id === filters.platform)?.name || 
                    platformConnectionsData?.data?.find(c => c.id === filters.platform)?.platformType || 
                    filters.platform
                  }
                  <Button
                    size="sm"
                    variant="link"
                    className="text-white p-0 ms-1"
                    onClick={() => handleFilterChange('platform', '')}
                    aria-label="Remove platform filter"
                  >
                    &times;
                  </Button>
                </Badge>
              )}
              
              {(filters.dateFrom || filters.dateTo) && (
                <Badge bg="secondary" className="me-2">
                  Date: {filters.dateFrom || 'Any'} to {filters.dateTo || 'Any'}
                  <Button
                    size="sm"
                    variant="link"
                    className="text-white p-0 ms-1"
                    onClick={() => {
                      handleFilterChange('dateFrom', '');
                      handleFilterChange('dateTo', '');
                    }}
                    aria-label="Remove date filter"
                  >
                    &times;
                  </Button>
                </Badge>
              )}
              
              <Button
                size="sm"
                variant="link"
                className="ms-auto"
                onClick={clearFilters}
                aria-label="Clear all filters"
              >
                Clear all filters
              </Button>
            </div>
          )}
          
          {/* Orders Table - Using AccessibleTable component */}
          <LoadingState 
            loading={ordersLoading} 
            error={ordersError}
            loadingMessage="Loading orders..."
          >
            <AccessibleTable
              columns={columns}
              data={ordersData?.orders || []}
              isLoading={ordersLoading}
              actions={actions}
              onRowClick={(order) => navigate(`/orders/${order.id}`)}
              emptyMessage={
                <div className="text-center py-5">
                  <p className="text-muted">No orders found matching your filters.</p>
                  {(filters.status || filters.platform || filters.search || filters.dateFrom || filters.dateTo) && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              }
              caption="Orders List"
              tableSummary={`A list of ${ordersData?.orders?.length || 0} orders with details including order ID, customer, date, amount, platform, and status.`}
              variant="striped"
            />
            
            {renderPagination()}
          </LoadingState>
        </Card.Body>
      </Card>
    </div>
  );
};

export default OrderList;