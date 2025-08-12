import React, { useState } from "react";
import { useTranslation } from "../../i18n/hooks/useTranslation";
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
import { Link } from "react-router-dom";
import api from "../../services/api";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/forgot-password", { email });
      if (response.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container className="py-5 auth-container">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card>
              <Card.Body className="text-center">
                <h2 className="mb-4">
                  {t("auth.checkYourEmail", {}, "E-postanızı Kontrol Edin")}
                </h2>
                <Alert variant="success">
                  <p>
                    {t(
                      "auth.resetLinkSent",
                      {},
                      "Bu e-posta adresi ile bir hesap mevcutsa, kısa süre içinde şifre sıfırlama bağlantısı alacaksınız."
                    )}
                  </p>
                  <p>
                    {t(
                      "auth.checkInboxInstructions",
                      {},
                      "Lütfen gelen kutunuzu kontrol edin ve şifrenizi sıfırlamak için talimatları takip edin."
                    )}
                  </p>
                </Alert>
                <Link to="/login" className="btn btn-primary">
                  {t("auth.returnToLogin", {}, "Girişe Dön")}
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5 auth-container">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">
                {t("auth.resetPassword", {}, "Şifre Sıfırla")}
              </h2>
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    {t("auth.emailAddress", {}, "E-posta Adresi")}
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    {t(
                      "auth.enterEmailInstruction",
                      {},
                      "Hesabınızla ilişkili e-posta adresini girin."
                    )}
                  </Form.Text>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
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
                      {t(
                        "auth.sendingResetLink",
                        {},
                        "Sıfırlama bağlantısı gönderiliyor..."
                      )}
                    </>
                  ) : (
                    t("auth.sendResetLink", {}, "Sıfırlama Bağlantısı Gönder")
                  )}
                </Button>
              </Form>

              <div className="text-center mt-3">
                <Link to="/login">
                  {t(
                    "auth.rememberPassword",
                    {},
                    "Şifrenizi hatırladınız mı? Giriş Yap"
                  )}
                </Link>
              </div>
            </Card.Body>
          </Card>

          {/* Copyright Footer */}
          <div className="text-center mt-4">
            <div className="text-muted small">
              <p className="mb-1">
                © {new Date().getFullYear()} Pazar+ by{" "}
                <a
                  href="https://github.com/Great0S"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none fw-bold text-primary"
                >
                  Great0S
                </a>
                . All rights reserved.
              </p>
              <p className="mb-0">
                All work is property of{" "}
                <a
                  href="https://github.com/Great0S"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-decoration-none fw-bold text-primary"
                >
                  Great0S
                </a>
                . Licensed under MIT License.
              </p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPassword;
