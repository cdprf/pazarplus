import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs';
import axios from 'axios';
import { Spinner } from 'react-bootstrap';
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

const OrdersChart = ({ period = 'week' }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderStats = async () => {
      try {
        setLoading(true);
        
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
        
        // Fetch order statistics by date
        const response = await axios.get('/orders/stats/trend', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            groupBy: period === 'year' ? 'month' : 'day'
          }
        });
        
        if (response.data.success) {
          // Process chart data
          const data = response.data.data;
          
          // Format labels based on period
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
        } else {
          setError(response.data.message || 'Failed to fetch order statistics');
        }
      } catch (err) {
        console.error('Failed to fetch order statistics', err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderStats();
  }, [period]);
  
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
          precision: 0 // Only show integer values
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center p-5 text-danger">
        <p>{error}</p>
      </div>
    );
  }
  
  if (!chartData) {
    return (
      <div className="text-center p-5 text-muted">
        <p>No data available</p>
      </div>
    );
  }
  
  return (
    <div style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default OrdersChart;