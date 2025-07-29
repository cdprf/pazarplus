// frontend/src/components/auth/Login.jsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/hooks/useTranslation";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
} from "react-bootstrap";
import useAuth from "../../hooks/useAuth";

const Login = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle redirect from registration
  useEffect(() => {
    if (location.state?.message) {
      setWelcomeMessage(location.state.message);
      // Pre-fill email if provided
      if (location.state.email) {
        setFormData((prev) => ({ ...prev, email: location.state.email }));
      }
      // Clear the message after 5 seconds
      setTimeout(() => setWelcomeMessage(""), 5000);
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(formData);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      className="d-flex align-items-center justify-content-center auth-container login-container"
      style={{ minHeight: "100vh" }}
    >
      <Row className="w-100">
        <Col md={6} lg={4} className="mx-auto">
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary">Pazar+</h2>
                <p className="text-muted">
                  {t("auth.signInToAccount", {}, "Hesabınıza giriş yapın")}
                </p>
              </div>

              {welcomeMessage && (
                <Alert variant="success" className="text-center">
                  <strong>{t("auth.welcome", {}, "Hoş geldiniz!")} </strong>{" "}
                  {welcomeMessage}
                </Alert>
              )}

              {error && (
                <Alert variant="danger" className="mb-3">
                  <div className="d-flex align-items-start">
                    <i className="bi bi-exclamation-triangle-fill me-2 mt-1 text-danger"></i>
                    <div>
                      <strong>Login Failed</strong>
                      <div className="mt-1">{error}</div>
                      {error.includes('password') && (
                        <div className="mt-2">
                          <Link 
                            to="/forgot-password" 
                            className="btn btn-sm btn-outline-primary"
                          >
                            Reset Password
                          </Link>
                        </div>
                      )}
                      {error.includes('Email address not found') && (
                        <div className="mt-2">
                          <Link 
                            to="/register" 
                            className="btn btn-sm btn-outline-success"
                          >
                            Create Account
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="email">
                    {t("auth.emailAddress", {}, "E-posta Adresi")}
                  </Form.Label>
                  <Form.Control
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t(
                      "auth.enterEmail",
                      {},
                      "E-posta adresinizi girin"
                    )}
                    autoComplete="email"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label htmlFor="password">
                    {t("auth.password", {}, "Şifre")}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t("auth.enterPassword", {}, "Şifrenizi girin")}
                    autoComplete="current-password"
                    required
                  />
                </Form.Group>

                <div className="d-grid mb-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading}
                  >
                    {loading
                      ? t("auth.signingIn", {}, "Giriş yapılıyor...")
                      : t("auth.signIn", {}, "Giriş Yap")}
                  </Button>
                </div>

                <div className="text-center">
                  <div className="mb-2">
                    <Link
                      to="/forgot-password"
                      className="text-decoration-none"
                    >
                      {t("auth.forgotPassword", {}, "Şifrenizi mi unuttunuz?")}
                    </Link>
                  </div>
                  <div>
                    <span className="text-muted">
                      {t("auth.noAccount", {}, "Hesabınız yok mu?")}{" "}
                    </span>
                    <Link
                      to="/register"
                      className="text-decoration-none fw-bold"
                    >
                      {t("auth.createAccount", {}, "Hesap Oluştur")}
                    </Link>
                  </div>
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
