// frontend/src/components/auth/Register.jsx

import React, { useState, useContext, useEffect } from 'react';
import { Form, Button, Card, Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';
import PasswordStrengthMeter from './PasswordStrengthMeter';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [validationError, setValidationError] = useState(null);
  
  const { register, error, setError } = useContext(AuthContext);
  const { error: showError, success: showSuccess } = useContext(AlertContext);
  
  const navigate = useNavigate();
  
  const { username, email, fullName, password, confirmPassword } = formData;

  // Handle authentication errors
  useEffect(() => {
    if (error) {
      setValidationError(error);
      showError(error);
      setError(null);
    }
  }, [error, showError, setError]);

  useEffect(() => {
    const validatePassword = async () => {
      if (password) {
        try {
          const response = await fetch('http://localhost:3001/api/auth/validate-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
          });
          const result = await response.json();
          setPasswordStrength(result.strength);
          setPasswordErrors(result.errors || []);
          setValidationError(null);
        } catch (err) {
          console.error('Password validation error:', err);
          setPasswordStrength(0);
          setPasswordErrors(['Unable to validate password']);
          setValidationError('Password validation failed');
        }
      } else {
        setPasswordStrength(0);
        setPasswordErrors([]);
        setValidationError(null);
      }
    };

    validatePassword();
  }, [password]);

  // Rest of the component code...
  
  const validateForm = () => {
    const errors = {};
    
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (passwordErrors.length > 0) {
      errors.password = 'Password does not meet requirements';
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await register(formData);
      if (response.success) {
        localStorage.setItem('pendingVerificationEmail', email);
        setVerificationSent(true);
        showSuccess('Registration successful! Please check your email to verify your account.');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Registration failed');
      setValidationError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card>
              <Card.Body className="text-center">
                <h2 className="mb-4">Verify Your Email</h2>
                <Alert variant="info">
                  <h4>Almost there!</h4>
                  <p>We've sent a verification email to <strong>{email}</strong></p>
                  <p>Please check your inbox and click the verification link to complete your registration.</p>
                </Alert>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/login')}
                >
                  Go to Login
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Register</h2>
              
              {validationError && (
                <Alert variant="danger" onClose={() => setValidationError(null)} dismissible>
                  {validationError}
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={username}
                    onChange={handleChange}
                    isInvalid={!!formErrors.username}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.username}
                  </Form.Control.Feedback>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={email}
                    onChange={handleChange}
                    isInvalid={!!formErrors.email}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="fullName"
                    value={fullName}
                    onChange={handleChange}
                    isInvalid={!!formErrors.fullName}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.fullName}
                  </Form.Control.Feedback>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={password}
                    onChange={handleChange}
                    isInvalid={!!formErrors.password}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.password}
                  </Form.Control.Feedback>
                  <PasswordStrengthMeter 
                    strength={passwordStrength}
                    errors={passwordErrors}
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={handleChange}
                    isInvalid={!!formErrors.confirmPassword}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.confirmPassword}
                  </Form.Control.Feedback>
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100" 
                  disabled={loading || passwordErrors.length > 0}
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
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </Button>
              </Form>
              
              <div className="text-center mt-3">
                <Link to="/login">Already have an account? Login</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;
