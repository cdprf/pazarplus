import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Badge,
  Modal,
} from "react-bootstrap";
import {
  FaCreditCard,
  FaShieldAlt,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { motion } from "framer-motion";
import "./TurkishPaymentGateway.css";

const TurkishPaymentGateway = ({
  orderId,
  amount,
  currency = "TRY",
  onPaymentComplete,
  onPaymentError,
  customer = null,
}) => {
  const { t } = useTranslation();
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    cardHolderName: "",
    expireMonth: "",
    expireYear: "",
    cvc: "",
    installment: 1,
  });
  const [billingAddress, setBillingAddress] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    zipCode: "",
    identityNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("iyzico");
  const [installmentOptions, setInstallmentOptions] = useState([]);
  const [showSecure3D, setShowSecure3D] = useState(false);
  const [threeDSContent, setThreeDSContent] = useState("");

  useEffect(() => {
    fetchPaymentMethods();
    if (customer) {
      setBillingAddress((prev) => ({
        ...prev,
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email || "",
        phone: customer.phone || "",
      }));
    }
  }, [customer]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/payments/methods");
      const data = await response.json();
      if (data.success) {
        setPaymentMethods(data.methods || []);
      }
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
    }
  };

  const fetchInstallmentOptions = async (cardNumber) => {
    if (cardNumber.length >= 6) {
      try {
        const response = await fetch(
          `/api/payments/installments?amount=${amount}&cardBin=${cardNumber.substring(
            0,
            6
          )}&provider=${selectedProvider}`
        );
        const data = await response.json();
        if (data.success) {
          setInstallmentOptions(data.installments || []);
        }
      } catch (error) {
        console.error("Failed to fetch installment options:", error);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Card validation
    if (
      !paymentData.cardNumber ||
      paymentData.cardNumber.replace(/\s/g, "").length < 16
    ) {
      newErrors.cardNumber = "Geçerli bir kart numarası giriniz";
    }
    if (!paymentData.cardHolderName || paymentData.cardHolderName.length < 2) {
      newErrors.cardHolderName = "Kart sahibinin adını giriniz";
    }
    if (!paymentData.expireMonth || !paymentData.expireYear) {
      newErrors.expiry = "Son kullanma tarihini giriniz";
    }
    if (!paymentData.cvc || paymentData.cvc.length < 3) {
      newErrors.cvc = "Güvenlik kodunu giriniz";
    }

    // Billing address validation
    if (!billingAddress.firstName) newErrors.firstName = "Ad zorunludur";
    if (!billingAddress.lastName) newErrors.lastName = "Soyad zorunludur";
    if (!billingAddress.email) newErrors.email = "E-posta zorunludur";
    if (!billingAddress.phone) newErrors.phone = "Telefon zorunludur";
    if (!billingAddress.address) newErrors.address = "Adres zorunludur";
    if (!billingAddress.city) newErrors.city = "Şehir zorunludur";
    if (
      !billingAddress.identityNumber ||
      billingAddress.identityNumber.length !== 11
    ) {
      newErrors.identityNumber = "Geçerli bir TC Kimlik No giriniz";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const paymentPayload = {
        orderId,
        amount,
        currency,
        provider: selectedProvider,
        paymentCard: {
          number: paymentData.cardNumber.replace(/\s/g, ""),
          holderName: paymentData.cardHolderName,
          expireMonth: paymentData.expireMonth,
          expireYear: paymentData.expireYear,
          cvc: paymentData.cvc,
        },
        customer: {
          id: customer?.id || `customer_${Date.now()}`,
          name: billingAddress.firstName,
          surname: billingAddress.lastName,
          email: billingAddress.email,
          phone: billingAddress.phone,
          identityNumber: billingAddress.identityNumber,
          ip: "127.0.0.1", // This should be obtained from the server
        },
        billingAddress: {
          firstName: billingAddress.firstName,
          lastName: billingAddress.lastName,
          address: billingAddress.address,
          city: billingAddress.city,
          district: billingAddress.district,
          country: "Turkey",
          zipCode: billingAddress.zipCode,
        },
        shippingAddress: {
          firstName: billingAddress.firstName,
          lastName: billingAddress.lastName,
          address: billingAddress.address,
          city: billingAddress.city,
          district: billingAddress.district,
          country: "Turkey",
          zipCode: billingAddress.zipCode,
        },
        basketItems: [
          {
            id: "subscription",
            name: "Subscription Payment",
            category: "Service",
            price: amount,
          },
        ],
        installment: paymentData.installment,
        callbackUrl: `${window.location.origin}/payment/callback`,
      };

      const response = await fetch("/api/payments/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(paymentPayload),
      });

      const result = await response.json();

      if (result.success) {
        if (result.data.status === "pending_3ds") {
          // Handle 3D Secure
          setThreeDSContent(result.data.threeDSHtmlContent);
          setShowSecure3D(true);
        } else if (result.data.status === "completed") {
          // Payment completed
          onPaymentComplete && onPaymentComplete(result.data);
        }
      } else {
        throw new Error(result.message || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      onPaymentError && onPaymentError(error);
      setErrors({ payment: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  const getInstallmentText = (installment) => {
    if (installment === 1) return "Tek Çekim";
    return `${installment} Taksit`;
  };

  return (
    <Container fluid className="turkish-payment-gateway">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Payment Summary */}
        <Row className="mb-4">
          <Col>
            <Card className="payment-summary-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">Ödeme Özeti</h5>
                    <p className="text-muted mb-0">Sipariş No: {orderId}</p>
                  </div>
                  <div className="text-end">
                    <h4 className="text-primary mb-0">{formatPrice(amount)}</h4>
                    <Badge bg="success">Güvenli Ödeme</Badge>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {errors.payment && (
          <Alert variant="danger" className="mb-4">
            <FaExclamationTriangle className="me-2" />
            {errors.payment}
          </Alert>
        )}

        <Row>
          {/* Payment Form */}
          <Col lg={8}>
            <Card className="payment-form-card">
              <Card.Header>
                <h5 className="mb-0">
                  <FaCreditCard className="me-2" />
                  Kart Bilgileri
                </h5>
              </Card.Header>
              <Card.Body>
                <Form>
                  {/* Card Information */}
                  <Row className="mb-3">
                    <Col>
                      <Form.Label>Kart Numarası</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={paymentData.cardNumber}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value);
                          setPaymentData((prev) => ({
                            ...prev,
                            cardNumber: formatted,
                          }));
                          fetchInstallmentOptions(formatted);
                        }}
                        isInvalid={!!errors.cardNumber}
                        maxLength={19}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.cardNumber}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col>
                      <Form.Label>Kart Sahibinin Adı</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ad Soyad"
                        value={paymentData.cardHolderName}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            cardHolderName: e.target.value.toUpperCase(),
                          }))
                        }
                        isInvalid={!!errors.cardHolderName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.cardHolderName}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={4}>
                      <Form.Label>Ay</Form.Label>
                      <Form.Select
                        value={paymentData.expireMonth}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            expireMonth: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.expiry}
                      >
                        <option value="">Ay</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option
                            key={i + 1}
                            value={String(i + 1).padStart(2, "0")}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <Form.Label>Yıl</Form.Label>
                      <Form.Select
                        value={paymentData.expireYear}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            expireYear: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.expiry}
                      >
                        <option value="">Yıl</option>
                        {Array.from({ length: 20 }, (_, i) => {
                          const year = new Date().getFullYear() + i;
                          return (
                            <option key={year} value={String(year).slice(-2)}>
                              {year}
                            </option>
                          );
                        })}
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <Form.Label>CVC</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="123"
                        value={paymentData.cvc}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            cvc: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        isInvalid={!!errors.cvc}
                        maxLength={4}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.cvc}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>

                  {/* Installment Options */}
                  {installmentOptions.length > 0 && (
                    <Row className="mb-3">
                      <Col>
                        <Form.Label>Taksit Seçeneği</Form.Label>
                        <Form.Select
                          value={paymentData.installment}
                          onChange={(e) =>
                            setPaymentData((prev) => ({
                              ...prev,
                              installment: parseInt(e.target.value),
                            }))
                          }
                        >
                          {installmentOptions.map((option) => (
                            <option
                              key={option.installmentNumber}
                              value={option.installmentNumber}
                            >
                              {getInstallmentText(option.installmentNumber)}
                              {option.installmentNumber > 1 &&
                                ` (${formatPrice(
                                  option.totalPrice / option.installmentNumber
                                )} x ${option.installmentNumber})`}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                    </Row>
                  )}

                  {/* Billing Address */}
                  <hr className="my-4" />
                  <h6 className="mb-3">Fatura Adresi</h6>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Ad</Form.Label>
                      <Form.Control
                        type="text"
                        value={billingAddress.firstName}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.firstName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.firstName}
                      </Form.Control.Feedback>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Soyad</Form.Label>
                      <Form.Control
                        type="text"
                        value={billingAddress.lastName}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.lastName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.lastName}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>E-posta</Form.Label>
                      <Form.Control
                        type="email"
                        value={billingAddress.email}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Telefon</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="05XX XXX XX XX"
                        value={billingAddress.phone}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.phone}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col>
                      <Form.Label>TC Kimlik No</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="12345678901"
                        value={billingAddress.identityNumber}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            identityNumber: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        isInvalid={!!errors.identityNumber}
                        maxLength={11}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.identityNumber}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col>
                      <Form.Label>Adres</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={billingAddress.address}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.address}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.address}
                      </Form.Control.Feedback>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Şehir</Form.Label>
                      <Form.Control
                        type="text"
                        value={billingAddress.city}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.city}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.city}
                      </Form.Control.Feedback>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Posta Kodu</Form.Label>
                      <Form.Control
                        type="text"
                        value={billingAddress.zipCode}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({
                            ...prev,
                            zipCode: e.target.value,
                          }))
                        }
                      />
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Security & Summary */}
          <Col lg={4}>
            <Card className="security-card mb-3">
              <Card.Body>
                <h6 className="mb-3">
                  <FaShieldAlt className="me-2 text-success" />
                  Güvenlik
                </h6>
                <div className="security-item">
                  <FaLock className="me-2 text-primary" />
                  <span>256-bit SSL Şifreleme</span>
                </div>
                <div className="security-item">
                  <FaCheckCircle className="me-2 text-success" />
                  <span>PCI DSS Uyumlu</span>
                </div>
                <div className="security-item">
                  <FaShieldAlt className="me-2 text-info" />
                  <span>3D Secure Korumalı</span>
                </div>
              </Card.Body>
            </Card>

            <div className="payment-action">
              <Button
                variant="primary"
                size="lg"
                className="w-100"
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <FaCreditCard className="me-2" />
                    {formatPrice(amount)} Öde
                  </>
                )}
              </Button>
              <small className="text-muted d-block text-center mt-2">
                Ödeme işlemi güvenli olarak gerçekleştirilecektir
              </small>
            </div>
          </Col>
        </Row>

        {/* 3D Secure Modal */}
        <Modal
          show={showSecure3D}
          onHide={() => setShowSecure3D(false)}
          size="lg"
          backdrop="static"
        >
          <Modal.Header>
            <Modal.Title>3D Secure Doğrulama</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div
              dangerouslySetInnerHTML={{ __html: threeDSContent }}
              style={{ minHeight: "400px" }}
            />
          </Modal.Body>
        </Modal>
      </motion.div>
    </Container>
  );
};

export default TurkishPaymentGateway;
