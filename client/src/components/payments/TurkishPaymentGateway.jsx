import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  Button, 
  Form,
  Alert,
  Modal,
  Spinner,
  Tabs,
  Tab
} from 'react-bootstrap';
import { 
  FaCreditCard, 
  FaUniversity, 
  FaMobile,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import './TurkishPaymentGateway.css';

const TurkishPaymentGateway = ({ orderId, amount, currency = 'TRY', onPaymentComplete }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('creditCard');
  const [paymentGateways, setPaymentGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardHolderName: '',
    installments: '1'
  });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  useEffect(() => {
    fetchPaymentGateways();
  }, []);

  const fetchPaymentGateways = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/gateways/turkish', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPaymentGateways(data.gateways || []);
      if (data.gateways?.length > 0) {
        setSelectedGateway(data.gateways[0]);
      }
    } catch (error) {
      console.error('Failed to fetch payment gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      setProcessing(true);

      const paymentData = {
        orderId,
        gatewayId: selectedGateway.id,
        amount,
        currency,
        paymentMethod: activeTab,
        ...paymentForm
      };

      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.success) {
        onPaymentComplete?.(result);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      alert('Ödeme işlemi başarısız: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getInstallmentOptions = () => {
    if (!selectedGateway?.installmentOptions) return [];
    return selectedGateway.installmentOptions.map(option => ({
      value: option.installment.toString(),
      label: option.installment === 1 ? 
        t('payments.noInstallment') : 
        `${option.installment} ${t('payments.installments')} (${formatAmount(option.monthlyAmount)})`
    }));
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">{t('common.loading')}</p>
      </Container>
    );
  }

  return (
    <Container fluid className="turkish-payment-gateway">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Payment Header */}
        <Row className="mb-4">
          <Col>
            <Card className="payment-header-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="mb-1">Güvenli Ödeme</h4>
                    <p className="text-muted mb-0">256-bit SSL şifreleme ile korunmaktadır</p>
                  </div>
                  <div className="payment-amount">
                    <h3 className="text-primary mb-0">{formatAmount(amount)}</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Payment Gateway Selection */}
        <Row className="mb-4">
          <Col>
            <Card className="gateway-selection-card">
              <Card.Body>
                <h5 className="mb-3">Ödeme Sağlayıcısı Seçin</h5>
                <Row className="g-3">
                  {paymentGateways.map((gateway) => (
                    <Col md={4} key={gateway.id}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card 
                          className={`gateway-card ${selectedGateway?.id === gateway.id ? 'selected' : ''}`}
                          onClick={() => setSelectedGateway(gateway)}
                        >
                          <Card.Body className="text-center">
                            <img 
                              src={gateway.logo} 
                              alt={gateway.name}
                              className="gateway-logo mb-2"
                            />
                            <h6 className="mb-1">{gateway.name}</h6>
                            <Badge bg={gateway.isActive ? 'success' : 'secondary'}>
                              {gateway.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </Card.Body>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Payment Methods */}
        <Row>
          <Col>
            <Card className="payment-methods-card">
              <Card.Body>
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="payment-tabs mb-4"
                >
                  {/* Credit Card Tab */}
                  <Tab 
                    eventKey="creditCard" 
                    title={
                      <span>
                        <FaCreditCard className="me-2" />
                        Kredi/Banka Kartı
                      </span>
                    }
                  >
                    <Form onSubmit={handlePayment}>
                      <Row>
                        <Col md={8}>
                          <Form.Group className="mb-3">
                            <Form.Label>Kart Numarası</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="1234 5678 9012 3456"
                              value={paymentForm.cardNumber}
                              onChange={(e) => setPaymentForm({
                                ...paymentForm, 
                                cardNumber: e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
                              })}
                              maxLength={19}
                              required
                            />
                          </Form.Group>

                          <Row>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>Son Kullanma Tarihi</Form.Label>
                                <Row>
                                  <Col>
                                    <Form.Select
                                      value={paymentForm.expiryMonth}
                                      onChange={(e) => setPaymentForm({...paymentForm, expiryMonth: e.target.value})}
                                      required
                                    >
                                      <option value="">Ay</option>
                                      {Array.from({length: 12}, (_, i) => (
                                        <option key={i+1} value={String(i+1).padStart(2, '0')}>
                                          {String(i+1).padStart(2, '0')}
                                        </option>
                                      ))}
                                    </Form.Select>
                                  </Col>
                                  <Col>
                                    <Form.Select
                                      value={paymentForm.expiryYear}
                                      onChange={(e) => setPaymentForm({...paymentForm, expiryYear: e.target.value})}
                                      required
                                    >
                                      <option value="">Yıl</option>
                                      {Array.from({length: 10}, (_, i) => {
                                        const year = new Date().getFullYear() + i;
                                        return (
                                          <option key={year} value={year}>
                                            {year}
                                          </option>
                                        );
                                      })}
                                    </Form.Select>
                                  </Col>
                                </Row>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <Form.Label>CVV</Form.Label>
                                <Form.Control
                                  type="text"
                                  placeholder="123"
                                  value={paymentForm.cvv}
                                  onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value})}
                                  maxLength={4}
                                  required
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-3">
                            <Form.Label>Kart Üzerindeki İsim</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="JOHN DOE"
                              value={paymentForm.cardHolderName}
                              onChange={(e) => setPaymentForm({...paymentForm, cardHolderName: e.target.value.toUpperCase()})}
                              required
                            />
                          </Form.Group>

                          {/* Installments */}
                          {selectedGateway?.installmentOptions?.length > 0 && (
                            <Form.Group className="mb-3">
                              <Form.Label>Taksit Seçeneği</Form.Label>
                              <Form.Select
                                value={paymentForm.installments}
                                onChange={(e) => setPaymentForm({...paymentForm, installments: e.target.value})}
                              >
                                {getInstallmentOptions().map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          )}
                        </Col>

                        <Col md={4}>
                          <Card className="security-info-card">
                            <Card.Body>
                              <h6 className="d-flex align-items-center mb-3">
                                <FaShieldAlt className="text-success me-2" />
                                Güvenlik Bilgileri
                              </h6>
                              <div className="security-features">
                                <div className="security-item">
                                  <FaCheckCircle className="text-success me-2" />
                                  <span>256-bit SSL Şifreleme</span>
                                </div>
                                <div className="security-item">
                                  <FaCheckCircle className="text-success me-2" />
                                  <span>PCI DSS Uyumlu</span>
                                </div>
                                <div className="security-item">
                                  <FaCheckCircle className="text-success me-2" />
                                  <span>3D Secure Koruması</span>
                                </div>
                              </div>
                              <Button 
                                variant="outline-info" 
                                size="sm" 
                                className="mt-3"
                                onClick={() => setShowSecurityModal(true)}
                              >
                                <FaInfoCircle className="me-1" />
                                Detaylı Bilgi
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>

                      <div className="payment-actions mt-4">
                        <Button 
                          type="submit" 
                          variant="primary" 
                          size="lg"
                          disabled={processing}
                          className="payment-submit-btn"
                        >
                          {processing ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              İşleniyor...
                            </>
                          ) : (
                            <>
                              <FaCreditCard className="me-2" />
                              {formatAmount(amount)} Öde
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab>

                  {/* Bank Transfer Tab */}
                  <Tab 
                    eventKey="bankTransfer" 
                    title={
                      <span>
                        <FaUniversity className="me-2" />
                        Havale/EFT
                      </span>
                    }
                  >
                    <div className="bank-transfer-info">
                      <Alert variant="info">
                        <Alert.Heading className="h6">
                          <FaUniversity className="me-2" />
                          Banka Hesap Bilgileri
                        </Alert.Heading>
                        <div className="bank-details">
                          <div className="bank-item">
                            <strong>Banka:</strong> Türkiye İş Bankası
                          </div>
                          <div className="bank-item">
                            <strong>Hesap Sahibi:</strong> Pazar+ Teknoloji A.Ş.
                          </div>
                          <div className="bank-item">
                            <strong>IBAN:</strong> TR98 0006 4000 0011 2345 6789 01
                          </div>
                          <div className="bank-item">
                            <strong>Açıklama:</strong> Sipariş No: {orderId}
                          </div>
                        </div>
                      </Alert>
                      
                      <Button variant="success" size="lg" className="mt-3">
                        <FaUniversity className="me-2" />
                        Banka Bilgilerini Kopyala
                      </Button>
                    </div>
                  </Tab>

                  {/* Mobile Payment Tab */}
                  <Tab 
                    eventKey="mobilePayment" 
                    title={
                      <span>
                        <FaMobile className="me-2" />
                        Mobil Ödeme
                      </span>
                    }
                  >
                    <div className="mobile-payment-options">
                      <Row className="g-3">
                        <Col md={4}>
                          <Card className="mobile-option-card">
                            <Card.Body className="text-center">
                              <div className="mobile-logo mb-3">📱</div>
                              <h6>Turkcell</h6>
                              <p className="text-muted small">Faturalı/Faturasız Hat</p>
                              <Button variant="outline-primary" size="sm">
                                Seç
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="mobile-option-card">
                            <Card.Body className="text-center">
                              <div className="mobile-logo mb-3">📱</div>
                              <h6>Vodafone</h6>
                              <p className="text-muted small">Faturalı/Faturasız Hat</p>
                              <Button variant="outline-primary" size="sm">
                                Seç
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="mobile-option-card">
                            <Card.Body className="text-center">
                              <div className="mobile-logo mb-3">📱</div>
                              <h6>Türk Telekom</h6>
                              <p className="text-muted small">Faturalı/Faturasız Hat</p>
                              <Button variant="outline-primary" size="sm">
                                Seç
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Security Modal */}
        <SecurityInfoModal 
          show={showSecurityModal}
          onHide={() => setShowSecurityModal(false)}
        />
      </motion.div>
    </Container>
  );
};

// Security Information Modal
const SecurityInfoModal = ({ show, onHide }) => {
  const { t } = useTranslation();

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaShieldAlt className="me-2" />
          Güvenlik ve Gizlilik
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="security-details">
          <h6>🔒 SSL Şifreleme</h6>
          <p>Tüm ödeme bilgileriniz 256-bit SSL teknolojisi ile şifrelenir ve güvenli bir şekilde iletilir.</p>
          
          <h6>🛡️ PCI DSS Uyumluluk</h6>
          <p>Ödeme sistemimiz PCI DSS (Payment Card Industry Data Security Standard) gereksinimlerine uygundur.</p>
          
          <h6>🔐 3D Secure</h6>
          <p>Kartınız 3D Secure teknolojisi ile korunur. Ödeme sırasında bankanız tarafından doğrulama yapılır.</p>
          
          <h6>📊 Veri Koruma</h6>
          <p>Kart bilgileriniz sistemimizde saklanmaz. Tüm işlemler gerçek zamanlı olarak yapılır.</p>
          
          <h6>🏛️ KVKK Uyumluluk</h6>
          <p>Kişisel verileriniz 6698 sayılı KVKK kapsamında korunur ve işlenir.</p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Anladım
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TurkishPaymentGateway;