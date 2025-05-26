import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Alert, Button, Spinner } from 'react-bootstrap';
import api from '../../services/api';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setError('No verification token provided');
        setVerifying(false);
        return;
      }

      try {
        const response = await api.post('/api/auth/verify-email', { token });
        if (response.data.success) {
          setSuccess(true);
          // Store tokens
          localStorage.setItem('token', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          // Redirect to dashboard after 3 seconds
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error verifying email');
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [navigate, searchParams]);

  const handleResendVerification = async () => {
    try {
      setVerifying(true);
      const email = localStorage.getItem('pendingVerificationEmail');
      if (!email) {
        setError('No email found for verification');
        return;
      }

      const response = await api.post('/api/auth/resend-verification', { email });
      if (response.data.success) {
        setSuccess(true);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error resending verification email');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Body className="text-center">
              <h2 className="mb-4">Email Verification</h2>
              
              {verifying ? (
                <>
                  <Spinner animation="border" role="status" />
                  <p className="mt-3">Verifying your email address...</p>
                </>
              ) : success ? (
                <Alert variant="success">
                  <h4>Email Verified Successfully!</h4>
                  <p>You will be redirected to the dashboard shortly...</p>
                </Alert>
              ) : (
                <Alert variant="danger">
                  <h4>Verification Failed</h4>
                  <p>{error}</p>
                  <Button 
                    variant="primary"
                    onClick={handleResendVerification}
                    disabled={verifying}
                  >
                    Resend Verification Email
                  </Button>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmailVerification;