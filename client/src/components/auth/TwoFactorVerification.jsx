import React, { useState, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const TwoFactorVerification = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { verifyTwoFactorLogin } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { tempToken, from } = location.state || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!tempToken) {
        throw new Error('Invalid verification session');
      }

      await verifyTwoFactorLogin(code, tempToken);
      navigate(from || '/dashboard');
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Two-Factor Verification</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Enter Verification Code</Form.Label>
                <Form.Control
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  pattern="[0-9]{6}"
                  maxLength="6"
                  autoComplete="one-time-code"
                />
                <Form.Text className="text-muted">
                  Please enter the 6-digit code from your authenticator app
                </Form.Text>
              </Form.Group>

              <Button 
                className="w-100" 
                type="submit"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default TwoFactorVerification;