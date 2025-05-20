/* eslint-disable no-unused-vars */
// src/client/components/OrderDashboard.jsx

import React from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  Spinner
} from 'react-bootstrap';
import { useOrderStats, useOrderSync } from '../../hooks/useOrders';
import { useQueryClient } from '@tanstack/react-query';
import OrdersChart from './OrdersChart';
import LoadingState from '../shared/LoadingState';
import { useContext } from 'react';
import { AlertContext } from '../../context/AlertContext';

const OrderDashboard = () => {
  const { success, error: showError } = useContext(AlertContext);
  const queryClient = useQueryClient();
  
  const { 
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useOrderStats();

  const { 
    mutate: syncOrders,
    isLoading: isSyncing 
  } = useOrderSync();

  const handleSync = async (platformId) => {
    try {
      await syncOrders({
        platformId,
        dateRange: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      });
      success('Orders synchronized successfully');
      // Force refetch stats after sync
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
    } catch (err) {
      showError(err.message);
    }
  };

  // Add some debug console logging to help identify the issue
  console.log('Order stats:', stats);

  return (
    <div className="dashboard-content">
      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header>Order Trends</Card.Header>
            <Card.Body>
              <OrdersChart />
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>Statistics</Card.Header>
            <Card.Body>
              <LoadingState 
                loading={statsLoading} 
                error={statsError}
                loadingMessage="Loading statistics..."
              >
                {stats ? (
                  <div className="stats-container">
                    <div className="stat-item mb-3">
                      <h3 className="stat-number">{stats.totalOrders || 0}</h3>
                      <span className="text-muted">Total Orders</span>
                    </div>
                    <div className="stat-item mb-3">
                      <h3 className="stat-number">{stats.pendingOrders || 0}</h3>
                      <span className="text-muted">Pending Orders</span>
                    </div>
                    <div className="stat-item mb-3">
                      <h3 className="stat-number">{stats.shippedOrders || 0}</h3>
                      <span className="text-muted">Shipped Orders</span>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="outline-primary"
                        onClick={() => handleSync()}
                        disabled={isSyncing}
                        className="w-100"
                      >
                        {isSyncing ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Syncing Orders...
                          </>
                        ) : (
                          'Sync Orders'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted">No statistics available</p>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['orderStats'] })}
                    >
                      Refresh Statistics
                    </Button>
                  </div>
                )}
              </LoadingState>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Add some custom CSS for better stats display */}
      <style jsx>{`
        .stats-container {
          padding: 0.5rem;
        }
        .stat-item {
          padding: 1rem;
          border-radius: 8px;
          background-color: #f8f9fa;
          transition: all 0.2s ease;
        }
        .stat-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .stat-number {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #3498db;
        }
      `}</style>
    </div>
  );
};

export default OrderDashboard;