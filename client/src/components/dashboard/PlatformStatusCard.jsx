import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Badge } from 'react-bootstrap';
import { FaSync } from 'react-icons/fa';

const PlatformStatusCard = ({ platform, onSync, isSyncing }) => {
  const getStatusBadge = (status) => {
    const statusMap = {
      active: 'success',
      error: 'danger',
      disconnected: 'warning',
      disabled: 'secondary'
    };

    return (
      <Badge 
        bg={statusMap[status] || 'secondary'}
        className="ms-2"
      >
        {status}
      </Badge>
    );
  };

  return (
    <Card className="h-100 platform-status-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">
              {platform.name}
              {getStatusBadge(platform.status)}
            </h5>
            <div className="text-muted small">
              Last synced: {platform.lastSyncedAt 
                ? new Date(platform.lastSyncedAt).toLocaleString() 
                : 'Never'}
            </div>
          </div>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={onSync}
            disabled={isSyncing || platform.status === 'disabled'}
          >
            <FaSync className={isSyncing ? 'spin' : ''} />
            {' '}
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
        {platform.error && (
          <div className="text-danger small mt-2">
            {platform.error}
          </div>
        )}
        <div className="mt-3 small">
          <div>Orders Today: {platform.metrics?.ordersToday || 0}</div>
          <div>Total Orders: {platform.metrics?.totalOrders || 0}</div>
        </div>
      </Card.Body>
    </Card>
  );
};

PlatformStatusCard.propTypes = {
  platform: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    lastSyncedAt: PropTypes.string,
    error: PropTypes.string,
    metrics: PropTypes.shape({
      ordersToday: PropTypes.number,
      totalOrders: PropTypes.number
    })
  }).isRequired,
  onSync: PropTypes.func.isRequired,
  isSyncing: PropTypes.bool
};

PlatformStatusCard.defaultProps = {
  isSyncing: false
};

export default PlatformStatusCard;