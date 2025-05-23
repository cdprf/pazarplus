// frontend/src/components/auth/Login.jsx

import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle redirect after successful authentication
  useEffect(() => {
    console.log('Login useEffect triggered:', { isAuthenticated, user: !!user });
    
    if (isAuthenticated && user) {
      console.log('Redirecting user after login...');
      // Get the intended destination or default to dashboard
      const returnTo = sessionStorage.getItem('returnTo') || location.state?.from?.pathname || '/dashboard';
      console.log('Redirect destination:', returnTo);
      sessionStorage.removeItem('returnTo');
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login({ email, password });
      
      if (response.requires2FA) {
        // Redirect to 2FA verification page with temporary token
        navigate('/verify-2fa', { 
          state: { 
            tempToken: response.tempToken,
            email 
          }
        });
        return;
      }
      
      // Don't manually navigate here - let useEffect handle it
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Sign In</h2>
              
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                        className="me-2"
                      />
                      Signing in...
                    </>
                  ) : 'Sign in'}
                </Button>
                
                <div className="text-center mt-3">
                  <p className="mb-0">
                    Don't have an account? <Link to="/register">Register</Link>
                  </p>
                  <p className="mt-2">
                    <Link to="/forgot-password">Forgot your password?</Link>
                  </p>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
