import logger from "../../utils/logger";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  ProgressBar,
  Alert,
  Modal,
  Form,
  Spinner,
} from "react-bootstrap";
import {
  FaCrown,
  FaCalendarAlt,
  FaChartBar,
  FaCreditCard,
  FaUpgrade,
  FaDownload,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";
import "./SubscriptionDashboard.css";

const SubscriptionDashboard = () => {
  const { t } = useTranslation();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [usageStats, setUsageStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setSubscriptionData(data.user);
        setUsageStats(data.usageStats || {});
      }
    } catch (error) {
      logger.error("Failed to fetch subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatusBadge = (status) => {
    const statusConfig = {
      trial: { variant: "info", text: "Deneme Sürümü" },
      active: { variant: "success", text: "Aktif" },
      past_due: { variant: "warning", text: "Ödeme Bekliyor" },
      canceled: { variant: "danger", text: "İptal Edildi" },
      expired: { variant: "secondary", text: "Süresi Doldu" },
    };

    const config = statusConfig[status] || statusConfig.trial;
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const getPlanName = (plan) => {
    const planNames = {
      trial: "Deneme Sürümü",
      starter: "Başlangıç",
      professional: "Profesyonel",
      enterprise: "Kurumsal",
    };
    return planNames[plan] || "Bilinmeyen";
  };

  const getPlanPrice = (plan) => {
    const prices = {
      starter: "₺199",
      professional: "₺399",
      enterprise: "₺799",
    };
    return prices[plan] || "₺0";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Belirsiz";
    return new Date(dateString).toLocaleDateString("tr-TR");
  };

  const calculateTrialDaysRemaining = () => {
    if (!subscriptionData?.trialEndsAt) return 0;
    const trialEnd = new Date(subscriptionData.trialEndsAt);
    const now = new Date();
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Abonelik bilgileri yükleniyor...</p>
      </Container>
    );
  }

  const trialDaysRemaining = calculateTrialDaysRemaining();
  const isTrialActive = subscriptionData?.subscriptionStatus === "trial";

  return (
    <Container fluid className="subscription-dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h2 className="mb-2">
                  <FaCrown className="me-2 text-warning" />
                  Abonelik Yönetimi
                </h2>
                <p className="text-muted">
                  Planınızı yönetin ve kullanımınızı takip edin
                </p>
              </div>
              <div>
                <Button
                  variant="outline-primary"
                  className="me-2"
                  onClick={() => setShowBillingModal(true)}
                >
                  <FaCreditCard className="me-2" />
                  Faturalandırma
                </Button>
                {isTrialActive && (
                  <Button
                    variant="primary"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <FaUpgrade className="me-2" />
                    Yükselt
                  </Button>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* Trial Warning */}
        {isTrialActive && trialDaysRemaining <= 3 && (
          <Alert variant="warning" className="mb-4">
            <FaExclamationTriangle className="me-2" />
            <strong>Dikkat!</strong> Deneme süreniz {trialDaysRemaining} gün
            içinde sona erecek. Kesintisiz hizmete devam etmek için planınızı
            yükseltin.
          </Alert>
        )}

        {/* Current Plan */}
        <Row className="mb-4">
          <Col lg={8}>
            <Card className="plan-card h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h4 className="mb-2">
                      {getPlanName(subscriptionData?.subscriptionPlan)}
                      {getSubscriptionStatusBadge(
                        subscriptionData?.subscriptionStatus
                      )}
                    </h4>
                    <p className="text-muted mb-0">
                      {isTrialActive
                        ? `${trialDaysRemaining} gün deneme süresi kaldı`
                        : `Aylık ${getPlanPrice(
                            subscriptionData?.subscriptionPlan
                          )}`}
                    </p>
                  </div>
                  <div className="plan-price">
                    <h3 className="text-primary mb-0">
                      {isTrialActive
                        ? "₺0"
                        : getPlanPrice(subscriptionData?.subscriptionPlan)}
                    </h3>
                    <small className="text-muted">/ay</small>
                  </div>
                </div>

                <Row>
                  <Col md={6}>
                    <div className="plan-detail">
                      <strong>Plan Başlangıcı:</strong>
                      <span className="ms-2">
                        {formatDate(
                          subscriptionData?.subscriptionStartedAt ||
                            subscriptionData?.trialStartedAt
                        )}
                      </span>
                    </div>
                    <div className="plan-detail">
                      <strong>Sonraki Ödeme:</strong>
                      <span className="ms-2">
                        {isTrialActive
                          ? formatDate(subscriptionData?.trialEndsAt)
                          : formatDate(subscriptionData?.subscriptionEndsAt)}
                      </span>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="plan-detail">
                      <strong>Şirket:</strong>
                      <span className="ms-2">
                        {subscriptionData?.companyName || "Belirtilmemiş"}
                      </span>
                    </div>
                    <div className="plan-detail">
                      <strong>Ödeme Yöntemi:</strong>
                      <span className="ms-2">
                        {subscriptionData?.paymentMethod || "Eklenmemiş"}
                      </span>
                    </div>
                  </Col>
                </Row>

                {isTrialActive && (
                  <div className="trial-progress mt-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Deneme Süresi</span>
                      <span>{trialDaysRemaining}/14 gün</span>
                    </div>
                    <ProgressBar
                      now={((14 - trialDaysRemaining) / 14) * 100}
                      variant={trialDaysRemaining <= 3 ? "danger" : "primary"}
                    />
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="feature-card h-100">
              <Card.Body>
                <h5 className="mb-3">
                  <FaCheckCircle className="me-2 text-success" />
                  Aktif Özellikler
                </h5>
                {subscriptionData?.featuresEnabled &&
                  Object.entries(subscriptionData.featuresEnabled).map(
                    ([feature, enabled]) => (
                      <div key={feature} className="feature-item">
                        <span
                          className={`feature-dot ${
                            enabled ? "enabled" : "disabled"
                          }`}
                        ></span>
                        <span className="feature-name">
                          {feature
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    )
                  )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Usage Statistics */}
        <Row className="mb-4">
          <Col>
            <Card className="usage-card">
              <Card.Header>
                <h5 className="mb-0">
                  <FaChartBar className="me-2" />
                  Kullanım İstatistikleri
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {Object.entries(usageStats).map(([metric, stats]) => (
                    <Col md={3} key={metric} className="mb-3">
                      <div className="usage-metric">
                        <h6>
                          {metric
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h6>
                        <div className="usage-progress">
                          <div className="d-flex justify-content-between mb-1">
                            <span>{stats.current}</span>
                            <span>
                              {stats.limit === -1 ? "∞" : stats.limit}
                            </span>
                          </div>
                          <ProgressBar
                            now={stats.percentage}
                            variant={
                              stats.isOverLimit
                                ? "danger"
                                : stats.percentage > 80
                                ? "warning"
                                : "success"
                            }
                          />
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Row>
          <Col>
            <Card className="actions-card">
              <Card.Body>
                <h5 className="mb-3">Hızlı İşlemler</h5>
                <div className="d-flex flex-wrap gap-2">
                  <Button variant="outline-primary" size="sm">
                    <FaDownload className="me-2" />
                    Fatura İndir
                  </Button>
                  <Button variant="outline-secondary" size="sm">
                    <FaCalendarAlt className="me-2" />
                    Ödeme Geçmişi
                  </Button>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <FaUpgrade className="me-2" />
                    Plan Değiştir
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Upgrade Modal */}
        <Modal
          show={showUpgradeModal}
          onHide={() => setShowUpgradeModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Plan Yükseltme</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Plan seçimine yönlendiriliyorsunuz...</p>
          </Modal.Body>
        </Modal>

        {/* Billing Modal */}
        <Modal
          show={showBillingModal}
          onHide={() => setShowBillingModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Faturalandırma Bilgileri</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Faturalandırma yönetimine yönlendiriliyorsunuz...</p>
          </Modal.Body>
        </Modal>
      </motion.div>
    </Container>
  );
};

export default SubscriptionDashboard;
