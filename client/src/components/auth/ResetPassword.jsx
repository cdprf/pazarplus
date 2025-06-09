import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Container,
  Row,
  Col,
  Alert,
  Spinner,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState([]);

  const { password, confirmPassword } = formData;

  useEffect(() => {
    const validatePassword = (password) => {
      if (!password) {
        setPasswordStrength(0);
        setPasswordErrors([]);
        return;
      }

      const errors = [];
      let strength = 0;

      // Check length (0-30 points)
      if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
      } else if (password.length >= 12) {
        strength += 30;
      } else if (password.length >= 10) {
        strength += 25;
      } else {
        strength += 15;
      }

      // Check for uppercase letter (0-20 points)
      if (!/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
      } else {
        strength += 20;
      }

      // Check for lowercase letter (0-20 points)
      if (!/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
      } else {
        strength += 20;
      }

      // Check for number (0-15 points)
      if (!/\d/.test(password)) {
        errors.push("Password must contain at least one number");
      } else {
        strength += 15;
      }

      // Check for special character (0-15 points)
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push("Password must contain at least one special character");
      } else {
        strength += 15;
      }

      strength = Math.min(strength, 100);
      setPasswordStrength(strength);
      setPasswordErrors(errors);
    };

    validatePassword(password);
  }, [password]);

  const validateForm = () => {
    const errors = {};

    if (!password) {
      errors.password = "Password is required";
    } else if (passwordErrors.length > 0) {
      errors.password = "Password does not meet requirements";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      setError("Reset token is missing from URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        password,
      });

      if (response.data.success) {
        // Show success message and redirect to login
        navigate(
          "/login?message=Password reset successful. Please log in with your new password."
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Reset Your Password</h2>
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={password}
                    onChange={handleChange}
                    isInvalid={!!formErrors.password}
                    disabled={loading}
                    placeholder="Enter your new password"
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
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={handleChange}
                    isInvalid={!!formErrors.confirmPassword}
                    disabled={loading}
                    placeholder="Confirm your new password"
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
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;
