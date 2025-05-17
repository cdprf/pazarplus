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
    } catch (err) {
      showError(err.message);
    }
  };

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
                {stats && (
                  <div>
                    <div className="stat-item mb-3">
                      <h4>{stats.totalOrders}</h4>
                      <span className="text-muted">Total Orders</span>
                    </div>
                    <div className="stat-item mb-3">
                      <h4>{stats.pendingOrders}</h4>
                      <span className="text-muted">Pending Orders</span>
                    </div>
                    <div className="stat-item mb-3">
                      <h4>{stats.shippedOrders}</h4>
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
                )}
              </LoadingState>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderDashboard;