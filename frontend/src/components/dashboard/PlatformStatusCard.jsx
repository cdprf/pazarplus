import React from 'react';
import { Card, Badge, Button, Spinner } from 'react-bootstrap';
import { FaSync, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

const PlatformStatusCard = ({ 
  platform, 
  onSync, 
  syncing = false 
}) => {
  const { id, name, status, lastSyncAt } = platform;
  
  // Get status icon
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <FaCheckCircle className="text-success me-2" />;
      case 'error':
        return <FaTimesCircle className="text-danger me-2" />;
      case 'pending':
        return <FaExclamationTriangle className="text-warning me-2" />;
      default:
        return null;
    }
  };
  
  // Get status text
  const getStatusText = () => {
    switch (status) {
      case 'active':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      case 'pending':
        return 'Setup Pending';
      default:
        return 'Unknown';
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <Card className="h-100 shadow-sm">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center">
        <h6 className="mb-0 text-capitalize">{name}</h6>
        <Badge bg={status === 'active' ? 'success' : status === 'error' ? 'danger' : 'warning'}>
          {getStatusText()}
        </Badge>
      </Card.Header>
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          {getStatusIcon()}
          <div>
            <div className="small text-muted">Platform</div>
            <div className="text-capitalize">{id}</div>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="small text-muted">Last Synchronized</div>
          <div>{formatDate(lastSyncAt)}</div>
        </div>
        
        <Button 
          variant={status === 'active' ? 'outline-primary' : 'outline-secondary'} 
          className="w-100"
          onClick={() => onSync(platform.id)}
          disabled={syncing || status !== 'active'}
        >
          {syncing ? (
            <>
              <Spinner 
                as="span" 
                animation="border" 
                size="sm" 
                role="status" 
                aria-hidden="true" 
                className="me-2"
              />
              Syncing...
            </>
          ) : (
            <>
              <FaSync className="me-2" />
              Sync Orders
            </>
          )}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default PlatformStatusCard;