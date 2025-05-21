// frontend/src/components/auth/Login.jsx

import React, { useState, useContext, useEffect, useRef } from 'react';
import { Form, Button, Card, Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { login, isAuthenticated, error, setError } = useContext(AuthContext);
  const { error: showError } = useContext(AlertContext);
  
  const emailInputRef = useRef(null);
  const navigate = useNavigate();
  
  // Focus on email input when component mounts
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  // Display auth errors
  useEffect(() => {
    if (error) {
      showError(error);
      setFormError(error);
      setError(null);
    }
  }, [error, showError, setError]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setFormError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container>
      <Row className="justify-content-center align-items-center min-vh-80">
        <Col md={6} lg={5}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <h1 className="mb-0 h3">Pazar+</h1>
                <p className="text-muted">Order Management System</p>
              </div>
              
              <h2 className="mb-4 text-center h4">Login to Your Account</h2>
              
              {formError && (
                <Alert 
                  variant="danger" 
                  className="mb-4"
                  role="alert"
                  aria-live="assertive"
                >
                  {formError}
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3" controlId="loginEmail">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    ref={emailInputRef}
                    required
                    aria-required="true"
                    aria-describedby="emailHelp"
                    autoComplete="email"
                  />
                  <Form.Text id="emailHelp" className="text-muted">
                    We'll never share your email with anyone else.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-4" controlId="loginPassword">
                  <div className="d-flex justify-content-between">
                    <Form.Label>Password</Form.Label>
                    <Link to="/forgot-password" className="small">
                      Forgot password?
                    </Link>
                  </div>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-required="true"
                    autoComplete="current-password"
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 py-2 mb-3"
                  disabled={loading}
                  aria-busy={loading}
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
                      <span>Logging in...</span>
                    </>
                  ) : 'Login'}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="mb-0">
                    Don't have an account? <Link to="/register" className="fw-medium">Register</Link>
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
