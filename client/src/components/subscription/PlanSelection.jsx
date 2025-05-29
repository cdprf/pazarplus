import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  ListGroup,
  Modal,
  Alert,
  Spinner,
} from "react-bootstrap";
import {
  FaCheck,
  FaTimes,
  FaCrown,
  FaRocket,
  FaBuilding,
  FaStar,
  FaShieldAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";
import TurkishPaymentGateway from "../payments/TurkishPaymentGateway";
import "./PlanSelection.css";

const PlanSelection = ({
  currentPlan = "trial",
  onPlanSelect,
  showModal = false,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  const plans = [
    {
      id: "starter",
      name: "Başlangıç",
      price: 199,
      yearlyPrice: 1990,
      icon: FaRocket,
      color: "#28a745",
      popular: false,
      description: "Küçük işletmeler için ideal",
      features: [
        { name: "1 Platform Bağlantısı", included: true },
        { name: "500 Ürün Limiti", included: true },
        { name: "Temel Analitik", included: true },
        { name: "E-posta Desteği", included: true },
        { name: "Stok Yönetimi", included: true },
        { name: "Multi-Platform Sync", included: false },
        { name: "AI Öneriler", included: false },
        { name: "Özel Raporlar", included: false },
        { name: "API Erişimi", included: false },
      ],
    },
    {
      id: "professional",
      name: "Profesyonel",
      price: 399,
      yearlyPrice: 3990,
      icon: FaCrown,
      color: "#007bff",
      popular: true,
      description: "Büyüyen işletmeler için en popüler seçim",
      features: [
        { name: "3 Platform Bağlantısı", included: true },
        { name: "2000 Ürün Limiti", included: true },
        { name: "Gelişmiş Analitik", included: true },
        { name: "Öncelikli Destek", included: true },
        { name: "Gelişmiş Stok Yönetimi", included: true },
        { name: "Multi-Platform Sync", included: true },
        { name: "AI Öneriler", included: true },
        { name: "Özel Raporlar", included: true },
        { name: "API Erişimi", included: false },
      ],
    },
    {
      id: "enterprise",
      name: "Kurumsal",
      price: 799,
      yearlyPrice: 7990,
      icon: FaBuilding,
      color: "#6f42c1",
      popular: false,
      description: "Büyük şirketler ve kurumsal çözümler",
      features: [
        { name: "Sınırsız Platform", included: true },
        { name: "Sınırsız Ürün", included: true },
        { name: "Kurumsal Analitik", included: true },
        { name: "7/24 Destek", included: true },
        { name: "Kurumsal Stok Yönetimi", included: true },
        { name: "Multi-Platform Sync", included: true },
        { name: "AI Öneriler & Otomasyonu", included: true },
        { name: "Özel Raporlar & Dashboard", included: true },
        { name: "Tam API Erişimi", included: true },
      ],
    },
  ];

  const [billingCycle, setBillingCycle] = useState("monthly");

  const handlePlanSelection = (plan) => {
    if (plan.id === currentPlan) return;

    setSelectedPlan(plan);

    // Prepare payment data
    const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.price;
    setPaymentData({
      orderId: `subscription_${Date.now()}`,
      amount: amount,
      currency: "TRY",
      plan: plan.id,
      billingCycle: billingCycle,
      planName: plan.name,
    });

    setShowPayment(true);
  };

  const handlePaymentComplete = async (paymentResult) => {
    setLoading(true);
    try {
      // Call API to upgrade subscription
      const response = await fetch("/api/subscriptions/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle: billingCycle,
          paymentResult: paymentResult,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (onPlanSelect) {
          onPlanSelect(selectedPlan.id);
        }
        setShowPayment(false);
        if (onClose) onClose();
      } else {
        throw new Error(data.message || "Subscription upgrade failed");
      }
    } catch (error) {
      console.error("Subscription upgrade error:", error);
      alert("Abonelik yükseltme işlemi başarısız oldu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const getDiscountPercentage = (monthly, yearly) => {
    const monthlyTotal = monthly * 12;
    const discount = ((monthlyTotal - yearly) / monthlyTotal) * 100;
    return Math.round(discount);
  };

  const PlanCard = ({ plan, isCurrentPlan }) => {
    const IconComponent = plan.icon;
    const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.price;
    const monthlyEquivalent =
      billingCycle === "yearly" ? plan.yearlyPrice / 12 : plan.price;

    return (
      <motion.div
        whileHover={{ scale: 1.03, y: -10 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={`plan-card h-100 ${plan.popular ? "popular" : ""} ${
            isCurrentPlan ? "current" : ""
          }`}
        >
          {plan.popular && (
            <div className="popular-badge">
              <FaStar className="me-1" />
              En Popüler
            </div>
          )}

          <Card.Body className="text-center">
            <div className="plan-icon" style={{ color: plan.color }}>
              <IconComponent size={48} />
            </div>

            <h4 className="plan-title">{plan.name}</h4>
            <p className="plan-description">{plan.description}</p>

            <div className="plan-pricing">
              <div className="price-amount">
                {formatPrice(monthlyEquivalent)}
                <small>/ay</small>
              </div>

              {billingCycle === "yearly" && (
                <div className="yearly-info">
                  <Badge bg="success" className="mb-2">
                    %{getDiscountPercentage(plan.price, plan.yearlyPrice)}{" "}
                    İndirim
                  </Badge>
                  <div className="yearly-total">
                    Yıllık: {formatPrice(plan.yearlyPrice)}
                  </div>
                </div>
              )}
            </div>

            <ListGroup variant="flush" className="features-list">
              {plan.features.map((feature, index) => (
                <ListGroup.Item key={index} className="feature-item">
                  {feature.included ? (
                    <FaCheck className="feature-icon included" />
                  ) : (
                    <FaTimes className="feature-icon not-included" />
                  )}
                  <span
                    className={feature.included ? "included" : "not-included"}
                  >
                    {feature.name}
                  </span>
                </ListGroup.Item>
              ))}
            </ListGroup>

            <div className="plan-actions">
              {isCurrentPlan ? (
                <Button variant="outline-secondary" disabled className="w-100">
                  Mevcut Planınız
                </Button>
              ) : (
                <Button
                  variant={plan.popular ? "primary" : "outline-primary"}
                  size="lg"
                  className="w-100"
                  onClick={() => handlePlanSelection(plan)}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    `${plan.name} Seç`
                  )}
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      </motion.div>
    );
  };

  const content = (
    <Container fluid className="plan-selection">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Row className="mb-4">
          <Col className="text-center">
            <h2 className="section-title">
              <FaShieldAlt className="me-2 text-primary" />
              Planınızı Seçin
            </h2>
            <p className="section-subtitle">
              İşletmenizin büyüklüğüne uygun planı seçin ve hemen başlayın
            </p>
          </Col>
        </Row>

        {/* Billing Toggle */}
        <Row className="mb-4">
          <Col className="text-center">
            <div className="billing-toggle">
              <Button
                variant={
                  billingCycle === "monthly" ? "primary" : "outline-primary"
                }
                onClick={() => setBillingCycle("monthly")}
                className="billing-btn"
              >
                Aylık
              </Button>
              <Button
                variant={
                  billingCycle === "yearly" ? "primary" : "outline-primary"
                }
                onClick={() => setBillingCycle("yearly")}
                className="billing-btn"
              >
                Yıllık
                <Badge bg="success" className="ms-2">
                  2 Ay Ücretsiz
                </Badge>
              </Button>
            </div>
          </Col>
        </Row>

        {/* Plans */}
        <Row className="justify-content-center">
          {plans.map((plan) => (
            <Col key={plan.id} lg={4} md={6} className="mb-4">
              <PlanCard plan={plan} isCurrentPlan={plan.id === currentPlan} />
            </Col>
          ))}
        </Row>

        {/* Trust Indicators */}
        <Row className="mt-5">
          <Col className="text-center">
            <div className="trust-indicators">
              <div className="trust-item">
                <FaShieldAlt className="trust-icon" />
                <span>Güvenli Ödeme</span>
              </div>
              <div className="trust-item">
                <FaCrown className="trust-icon" />
                <span>14 Gün Garanti</span>
              </div>
              <div className="trust-item">
                <FaCheck className="trust-icon" />
                <span>İstediğiniz Zaman İptal</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* Payment Modal */}
        <Modal
          show={showPayment}
          onHide={() => setShowPayment(false)}
          size="lg"
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>{selectedPlan?.name} Planı - Ödeme</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {paymentData && (
              <TurkishPaymentGateway
                orderId={paymentData.orderId}
                amount={paymentData.amount}
                currency={paymentData.currency}
                onPaymentComplete={handlePaymentComplete}
              />
            )}
          </Modal.Body>
        </Modal>
      </motion.div>
    </Container>
  );

  // If showModal is true, wrap content in modal
  if (showModal) {
    return (
      <Modal show={showModal} onHide={onClose} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Plan Seçimi</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">{content}</Modal.Body>
      </Modal>
    );
  }

  return content;
};

export default PlanSelection;
