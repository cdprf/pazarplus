import React, { useState, useRef } from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
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
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import LoadingState from '../shared/LoadingState';
import { useOrderTrends } from '../../hooks/useOrders';

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
  const [period, setPeriod] = useState('week');
  const chartRef = useRef(null);
  const { data, isLoading, error } = useOrderTrends(period);

  const formatDate = (dateString, period) => {
    const date = parseISO(dateString);
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (period === 'year') {
      return formatInTimeZone(date, userTimeZone, 'MMM yyyy');
    } else if (period === 'month') {
      return formatInTimeZone(date, userTimeZone, 'MMM d');
    } else {
      return formatInTimeZone(date, userTimeZone, 'MMM d, HH:mm');
    }
  };

  const chartData = data ? {
    labels: data.map(item => formatDate(item.date, period)),
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
  } : null;

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
        callbacks: {
          title: (context) => context[0].label,
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`
        }
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
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
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

      <LoadingState
        loading={isLoading}
        error={error}
        loadingMessage="Loading chart data..."
      >
        {chartData ? (
          <div style={{ height: '300px' }}>
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
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