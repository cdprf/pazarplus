import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const PlatformSettings = () => {
  const { platformId } = useParams();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({
    syncInterval: 15,
    autoUpdateInventory: true,
    autoUpdatePrices: false,
    webhookUrl: '',
    isActive: true
  });

  useEffect(() => {
    fetchPlatformDetails();
  }, [platformId]);

  const fetchPlatformDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/platforms/connections/${platformId}`);
      setPlatform(response.data);
      
      // Set existing settings if available
      if (response.data.settings) {
        setSettings({ ...settings, ...response.data.settings });
      }
    } catch (error) {
      console.error('Failed to fetch platform details:', error);
      setError('Failed to load platform details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.platforms.updateSettings(platformId, settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setSaving(true);
      const response = await api.platforms.testConnection(platformId);
      if (response.success) {
        alert('Connection test successful!');
      } else {
        alert('Connection test failed: ' + response.message);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('Connection test failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleForceSync = async () => {
    try {
      setSaving(true);
      // Call the API to perform a force sync
      const response = await api.platforms.syncPlatform(platformId);
      if (response.success) {
        alert('Force sync initiated successfully!');
      } else {
        alert('Force sync failed: ' + response.message);
      }
    } catch (error) {
      console.error('Force sync failed:', error);
      alert('Force sync failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleViewAnalytics = () => {
    // Navigate to the analytics page for the platform
    navigate(`/platforms/${platformId}/analytics`);
  };

  const handleSyncHistory = () => {
    // Navigate to the sync history page for the platform
    navigate(`/platforms/${platformId}/sync-history`);
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading platform settings...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate('/platforms')}>
            Back to Platforms
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!platform) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <Alert.Heading>Platform Not Found</Alert.Heading>
          <p>The requested platform could not be found.</p>
          <Button variant="outline-warning" onClick={() => navigate('/platforms')}>
            Back to Platforms
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1>{platform.name} Settings</h1>
              <p className="text-muted">Configure your {platform.name} integration</p>
            </div>
            <div>
              <Badge bg={platform.status === 'active' ? 'success' : 'danger'} className="me-2">
                {platform.status}
              </Badge>
              <Button variant="outline-secondary" onClick={() => navigate('/platforms')}>
                <i className="fas fa-arrow-left me-2"></i>Back
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Platform Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSave}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sync Interval (minutes)</Form.Label>
                      <Form.Select
                        value={settings.syncInterval}
                        onChange={(e) => setSettings({...settings, syncInterval: parseInt(e.target.value)})}
                      >
                        <option value={5}>5 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={180}>3 hours</option>
                        <option value={360}>6 hours</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Webhook URL</Form.Label>
                      <Form.Control
                        type="url"
                        value={settings.webhookUrl}
                        onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                        placeholder="https://your-site.com/webhook"
                      />
                      <Form.Text className="text-muted">
                        Receive real-time notifications
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>

                <hr />

                <h6>Automation Settings</h6>
                
                <Form.Check
                  type="switch"
                  id="auto-inventory"
                  label="Auto-update inventory"
                  checked={settings.autoUpdateInventory}
                  onChange={(e) => setSettings({...settings, autoUpdateInventory: e.target.checked})}
                  className="mb-3"
                />

                <Form.Check
                  type="switch"
                  id="auto-prices"
                  label="Auto-update prices"
                  checked={settings.autoUpdatePrices}
                  onChange={(e) => setSettings({...settings, autoUpdatePrices: e.target.checked})}
                  className="mb-3"
                />

                <Form.Check
                  type="switch"
                  id="platform-active"
                  label="Platform active"
                  checked={settings.isActive}
                  onChange={(e) => setSettings({...settings, isActive: e.target.checked})}
                  className="mb-4"
                />

                <div className="d-flex gap-2">
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>Save Settings
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline-info" 
                    onClick={handleTestConnection}
                    disabled={saving}
                  >
                    <i className="fas fa-plug me-2"></i>Test Connection
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Platform Information</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <strong>Platform Type:</strong>
                <div className="text-muted">{platform.platformType}</div>
              </div>
              <div className="mb-3">
                <strong>Connected:</strong>
                <div className="text-muted">{new Date(platform.createdAt).toLocaleString()}</div>
              </div>
              <div className="mb-3">
                <strong>Last Updated:</strong>
                <div className="text-muted">{new Date(platform.updatedAt).toLocaleString()}</div>
              </div>
              <div className="mb-3">
                <strong>Status:</strong>
                <div>
                  <Badge bg={platform.status === 'active' ? 'success' : 'danger'}>
                    {platform.status}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Header>
              <h6 className="mb-0">Quick Actions</h6>
            </Card.Header>
            <Card.Body className="d-grid gap-2">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={handleForceSync}
                disabled={saving}
              >
                {saving ? (
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                ) : (
                  <i className="fas fa-sync me-2"></i>
                )}
                Force Sync
              </Button>
              <Button 
                variant="outline-info" 
                size="sm"
                onClick={handleViewAnalytics}
              >
                <i className="fas fa-chart-bar me-2"></i>View Analytics
              </Button>
              <Button 
                variant="outline-warning" 
                size="sm"
                onClick={handleSyncHistory}
              >
                <i className="fas fa-history me-2"></i>Sync History
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PlatformSettings;