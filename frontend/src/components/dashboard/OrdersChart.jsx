import React, { useState, useEffect, useCallback } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import { Spinner, ButtonGroup, Button } from 'react-bootstrap';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

const OrdersChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  
  const fetchOrderStats = useCallback(async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }
      
      // Calculate date range based on period
      const endDate = new Date();
      let startDate = new Date();
      
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      const response = await axios.get('/orders/stats/trend', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy: period === 'year' ? 'month' : 'day'
        }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        
        const labels = data.map(item => {
          const date = new Date(item.date);
          if (period === 'year') {
            return date.toLocaleString('default', { month: 'short' });
          } else {
            return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
          }
        });
        
        setChartData({
          labels,
          datasets: [
            {
              label: 'New Orders',
              data: data.map(item => item.newOrders),
              borderColor: '#4e73df',
              backgroundColor: 'rgba(78, 115, 223, 0.05)',
              fill: true,
              tension: 0.4
            },
            {
              label: 'Shipped Orders',
              data: data.map(item => item.shippedOrders),
              borderColor: '#1cc88a',
              backgroundColor: 'rgba(28, 200, 138, 0.05)',
              fill: true,
              tension: 0.4
            }
          ]
        });
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch order statistics');
      }
    } catch (err) {
      console.error('Failed to fetch order statistics', err);
      setError('Failed to load chart data');
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    fetchOrderStats();
    
    const refreshInterval = setInterval(() => {
      fetchOrderStats(false);
    }, 300000);

    return () => clearInterval(refreshInterval);
  }, [fetchOrderStats]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    hover: {
      mode: 'nearest',
      intersect: true
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
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

      {loading ? (
        <div className="text-center p-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <div className="text-center p-5 text-danger">
          <p>{error}</p>
        </div>
      ) : !chartData ? (
        <div className="text-center p-5 text-muted">
          <p>No data available</p>
        </div>
      ) : (
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={options} />
        </div>
      )}
    </div>
  );
};

export default OrdersChart;