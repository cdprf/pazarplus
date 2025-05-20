import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Button,
  Spinner,
  Alert
} from 'react-bootstrap';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';
import { orderService } from '../services/api/orderService';
import OrderPrintTemplate from '../components/shared/OrderPrintTemplate';
import './OrderPrint.css';

const OrderPrint = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await orderService.getOrder(id);
        
        if (response.success) {
          setOrder(response.data);
          
          // Auto-print when data is loaded
          setTimeout(() => {
            window.print();
          }, 1000);
        } else {
          setError(response.message || 'Failed to fetch order details');
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to fetch order details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [id]);
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  
  if (loading) {
    return (
      <div className="text-center p-5 d-print-none">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading order details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="danger" className="d-print-none">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Link to="/orders" className="btn btn-outline-danger">
            Back to Orders
          </Link>
        </div>
      </Alert>
    );
  }
  
  if (!order) {
    return (
      <Alert variant="warning" className="d-print-none">
        <Alert.Heading>Order Not Found</Alert.Heading>
        <p>The requested order could not be found.</p>
        <div className="d-flex justify-content-end">
          <Link to="/orders" className="btn btn-outline-warning">
            Back to Orders
          </Link>
        </div>
      </Alert>
    );
  }
  
  return (
    <Container className="order-print my-4">
      {/* Print Control Buttons - only visible on screen */}
      <div className="mb-4 d-print-none">
        <Row>
          <Col>
            <Link to={`/orders/${id}`} className="btn btn-outline-secondary me-2">
              <FaArrowLeft className="me-1" /> Back to Order
            </Link>
            <Button variant="primary" onClick={() => window.print()}>
              <FaPrint className="me-1" /> Print Order
            </Button>
          </Col>
        </Row>
      </div>
      
      {/* Print Template - visible in both print and screen */}
      <OrderPrintTemplate order={order} formatDate={formatDate} />
    </Container>
  );
};

export default OrderPrint;