import React, { useState, useMemo } from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import LoadingState from '../shared/LoadingState';
import { useOrderTrends } from '../../hooks/useOrders';
import useWebSocketQuery from '../../hooks/useWebSocketQuery';

const OrdersChart = () => {
  const [period, setPeriod] = useState('week');
  const { data, isLoading, error } = useOrderTrends(period);
  
  // Set up real-time updates for chart data
  useWebSocketQuery(['orderStats', period], ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED'], {
    'ORDER_CREATED': {
      'timestamp': {
        'gte': new Date(Date.now() - (period === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString()
      }
    }
  });

  // Process error to ensure it's a string
  const errorMessage = error ? (error.message || error.toString()) : null;

  // Process and format chart data
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      new: item.newOrders || 0,
      processing: item.processingOrders || 0,
      shipped: item.shippedOrders || 0,
      delivered: item.deliveredOrders || 0
    }));
  }, [data]);

  const colors = {
    new: '#8884d8',
    processing: '#82ca9d',
    shipped: '#ffc658',
    delivered: '#ff7300'
  };

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <ButtonGroup size="sm">
          <Button 
            variant={period === 'week' ? 'primary' : 'outline-primary'}
            onClick={() => setPeriod('week')}
          >
            Week
          </Button>
          <Button 
            variant={period === 'month' ? 'primary' : 'outline-primary'}
            onClick={() => setPeriod('month')}
          >
            Month
          </Button>
          <Button 
            variant={period === 'year' ? 'primary' : 'outline-primary'}
            onClick={() => setPeriod('year')}
          >
            Year
          </Button>
        </ButtonGroup>
      </div>

      <LoadingState
        loading={isLoading}
        error={errorMessage}
        loadingMessage="Loading chart data..."
      >
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="new"
                name="New Orders"
                stroke={colors.new}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="processing"
                name="Processing"
                stroke={colors.processing}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="shipped"
                name="Shipped"
                stroke={colors.shipped}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="delivered"
                name="Delivered"
                stroke={colors.delivered}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center p-5 text-muted">
            <p>No data available</p>
          </div>
        )}
      </LoadingState>
    </div>
  );
};

export default OrdersChart;