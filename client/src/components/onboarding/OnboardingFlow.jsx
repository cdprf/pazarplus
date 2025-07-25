import logger from "../../utils/logger.js";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  ProgressBar,
  Alert,
  Badge,
  Modal,
} from "react-bootstrap";
import {
  FaUser,
  FaBuilding,
  FaCreditCard,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaRocket,
  FaShieldAlt,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import TurkishPaymentGateway from "../payments/TurkishPaymentGateway";
import PlanSelection from "../subscription/PlanSelection";
import "./OnboardingFlow.css";

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPayment, setShowPayment] = useState(false);

  // Form data
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [businessInfo, setBusinessInfo] = useState({
    companyName: "",
    businessType: "",
    taxNumber: "",
    address: "",
    city: "",
    district: "",
    zipCode: "",
    website: "",
    employees: "",
  });

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [preferences, setPreferences] = useState({
    industry: "",
    goals: [],
    marketplaces: [],
    monthlyOrderVolume: "",
    currentTools: [],
  });

  const steps = [
    { id: 1, title: "Kişisel Bilgiler", icon: FaUser },
    { id: 2, title: "İşletme Bilgileri", icon: FaBuilding },
    { id: 3, title: "Plan Seçimi", icon: FaCreditCard },
    { id: 4, title: "Tercihler", icon: FaRocket },
  ];

  const businessTypes = [
    "Bireysel Satıcı",
    "Limited Şirket",
    "Anonim Şirket",
    "Şahıs Şirketi",
    "Kolektif Şirket",
    "Komandit Şirket",
  ];

  const industries = [
    "Moda & Giyim",
    "Elektronik",
    "Ev & Yaşam",
    "Spor & Outdoor",
    "Kozmetik & Kişisel Bakım",
    "Kitap & Kırtasiye",
    "Oyuncak & Bebek",
    "Otomotiv",
    "Gıda & İçecek",
    "Diğer",
  ];

  const goals = [
    "Satış artışı",
    "Stok yönetimi",
    "Çoklu platform satışı",
    "Müşteri hizmetleri",
    "Analitik ve raporlama",
    "Otomatizasyon",
  ];

  const marketplaces = [
    "Trendyol",
    "Hepsiburada",
    "Amazon TR",
    "GittiGidiyor",
    "Çiçeksepeti",
    "N11",
    "Pazarama",
    "Getir",
  ];

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!personalInfo.firstName) newErrors.firstName = "Ad zorunludur";
        if (!personalInfo.lastName) newErrors.lastName = "Soyad zorunludur";
        if (!personalInfo.email) newErrors.email = "E-posta zorunludur";
        if (!personalInfo.phone) newErrors.phone = "Telefon zorunludur";
        if (!personalInfo.password || personalInfo.password.length < 6) {
          newErrors.password = "Şifre en az 6 karakter olmalıdır";
        }
        if (personalInfo.password !== personalInfo.confirmPassword) {
          newErrors.confirmPassword = "Şifreler eşleşmiyor";
        }
        break;

      case 2:
        if (!businessInfo.companyName)
          newErrors.companyName = "Şirket adı zorunludur";
        if (!businessInfo.businessType)
          newErrors.businessType = "İşletme türü zorunludur";
        if (!businessInfo.address) newErrors.address = "Adres zorunludur";
        if (!businessInfo.city) newErrors.city = "Şehir zorunludur";
        break;

      case 3:
        if (!selectedPlan) newErrors.plan = "Bir plan seçmelisiniz";
        break;

      case 4:
        if (!preferences.industry)
          newErrors.industry = "Sektör seçimi zorunludur";
        if (preferences.goals.length === 0)
          newErrors.goals = "En az bir hedef seçmelisiniz";
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3 && selectedPlan && selectedPlan.price > 0) {
        setShowPayment(true);
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, 4));
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePaymentComplete = async (paymentData) => {
    setLoading(true);
    try {
      const onboardingData = {
        personalInfo,
        businessInfo,
        selectedPlan,
        preferences,
        paymentData,
      };

      const response = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(onboardingData),
      });

      const result = await response.json();

      if (result.success) {
        // Store authentication token
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));

        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        throw new Error(result.message || "Onboarding failed");
      }
    } catch (error) {
      logger.error("Onboarding error:", error);
      setErrors({ payment: error.message });
    } finally {
      setLoading(false);
      setShowPayment(false);
    }
  };

  const handleFreePlanComplete = async () => {
    setLoading(true);
    try {
      const onboardingData = {
        personalInfo,
        businessInfo,
        selectedPlan,
        preferences,
      };

      const response = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(onboardingData),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        navigate("/dashboard");
      } else {
        throw new Error(result.message || "Onboarding failed");
      }
    } catch (error) {
      logger.error("Onboarding error:", error);
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="onboarding-card">
              <Card.Header>
                <h4>
                  <FaUser className="me-2" />
                  Kişisel Bilgileriniz
                </h4>
                <p className="text-muted mb-0">
                  Hesabınızı oluşturmak için kişisel bilgilerinizi giriniz
                </p>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ad *</Form.Label>
                      <Form.Control
                        type="text"
                        value={personalInfo.firstName}
                        onChange={(e) =>
                          setPersonalInfo((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.firstName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.firstName}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Soyad *</Form.Label>
                      <Form.Control
                        type="text"
                        value={personalInfo.lastName}
                        onChange={(e) =>
                          setPersonalInfo((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.lastName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.lastName}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>E-posta *</Form.Label>
                      <Form.Control
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) =>
                          setPersonalInfo((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Telefon *</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="05XX XXX XX XX"
                        value={personalInfo.phone}
                        onChange={(e) =>
                          setPersonalInfo((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.phone}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Şifre *</Form.Label>
                      <Form.Control
                        type="password"
                        value={personalInfo.password}
                        onChange={(e) =>
                          setPersonalInfo((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.password}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.password}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Şifre Tekrar *</Form.Label>
                      <Form.Control
                        type="password"
                        value={personalInfo.confirmPassword}
                        onChange={(e) =>
                          setPersonalInfo((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.confirmPassword}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.confirmPassword}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="onboarding-card">
              <Card.Header>
                <h4>
                  <FaBuilding className="me-2" />
                  İşletme Bilgileri
                </h4>
                <p className="text-muted mb-0">
                  İşletmenizle ilgili gerekli bilgileri giriniz
                </p>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Şirket/İşletme Adı *</Form.Label>
                      <Form.Control
                        type="text"
                        value={businessInfo.companyName}
                        onChange={(e) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            companyName: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.companyName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.companyName}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>İşletme Türü *</Form.Label>
                      <Form.Select
                        value={businessInfo.businessType}
                        onChange={(e) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            businessType: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.businessType}
                      >
                        <option value="">Seçiniz</option>
                        {businessTypes.map((type, index) => (
                          <option key={index} value={type}>
                            {type}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.businessType}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Vergi Numarası</Form.Label>
                      <Form.Control
                        type="text"
                        value={businessInfo.taxNumber}
                        onChange={(e) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            taxNumber: e.target.value,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Web Sitesi</Form.Label>
                      <Form.Control
                        type="url"
                        placeholder="https://www.example.com"
                        value={businessInfo.website}
                        onChange={(e) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            website: e.target.value,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Adres *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={businessInfo.address}
                    onChange={(e) =>
                      setBusinessInfo((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    isInvalid={!!errors.address}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.address}
                  </Form.Control.Feedback>
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Şehir *</Form.Label>
                      <Form.Control
                        type="text"
                        value={businessInfo.city}
                        onChange={(e) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        isInvalid={!!errors.city}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.city}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>İlçe</Form.Label>
                      <Form.Control
                        type="text"
                        value={businessInfo.district}
                        onChange={(e) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            district: e.target.value,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Posta Kodu</Form.Label>
                      <Form.Control
                        type="text"
                        value={businessInfo.zipCode}
                        onChange={(e) =>
                          setBusinessInfo((prev) => ({
                            ...prev,
                            zipCode: e.target.value,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="onboarding-card">
              <Card.Header>
                <h4>
                  <FaCreditCard className="me-2" />
                  Plan Seçimi
                </h4>
                <p className="text-muted mb-0">Size en uygun planı seçiniz</p>
              </Card.Header>
              <Card.Body>
                <PlanSelection
                  selectedPlan={selectedPlan}
                  onPlanSelect={setSelectedPlan}
                  showFeatures={true}
                />
                {errors.plan && (
                  <Alert variant="danger" className="mt-3">
                    {errors.plan}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="onboarding-card">
              <Card.Header>
                <h4>
                  <FaRocket className="me-2" />
                  Tercihleriniz
                </h4>
                <p className="text-muted mb-0">
                  Size daha iyi hizmet verebilmemiz için tercihlerinizi
                  belirtiniz
                </p>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-4">
                  <Form.Label>Sektörünüz *</Form.Label>
                  <Form.Select
                    value={preferences.industry}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        industry: e.target.value,
                      }))
                    }
                    isInvalid={!!errors.industry}
                  >
                    <option value="">Sektör seçiniz</option>
                    {industries.map((industry, index) => (
                      <option key={index} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.industry}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Hedefleriniz *</Form.Label>
                  <div className="checkbox-grid">
                    {goals.map((goal, index) => (
                      <Form.Check
                        key={index}
                        type="checkbox"
                        id={`goal-${index}`}
                        label={goal}
                        checked={preferences.goals.includes(goal)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreferences((prev) => ({
                              ...prev,
                              goals: [...prev.goals, goal],
                            }));
                          } else {
                            setPreferences((prev) => ({
                              ...prev,
                              goals: prev.goals.filter((g) => g !== goal),
                            }));
                          }
                        }}
                      />
                    ))}
                  </div>
                  {errors.goals && (
                    <div className="text-danger small">{errors.goals}</div>
                  )}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Kullandığınız Pazaryerleri</Form.Label>
                  <div className="checkbox-grid">
                    {marketplaces.map((marketplace, index) => (
                      <Form.Check
                        key={index}
                        type="checkbox"
                        id={`marketplace-${index}`}
                        label={marketplace}
                        checked={preferences.marketplaces.includes(marketplace)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreferences((prev) => ({
                              ...prev,
                              marketplaces: [...prev.marketplaces, marketplace],
                            }));
                          } else {
                            setPreferences((prev) => ({
                              ...prev,
                              marketplaces: prev.marketplaces.filter(
                                (m) => m !== marketplace
                              ),
                            }));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Aylık Sipariş Hacmi</Form.Label>
                  <Form.Select
                    value={preferences.monthlyOrderVolume}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        monthlyOrderVolume: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seçiniz</option>
                    <option value="0-100">0-100 sipariş</option>
                    <option value="100-500">100-500 sipariş</option>
                    <option value="500-1000">500-1000 sipariş</option>
                    <option value="1000-5000">1000-5000 sipariş</option>
                    <option value="5000+">5000+ sipariş</option>
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Container fluid className="onboarding-flow">
      <Row className="justify-content-center">
        <Col xxl={10}>
          {/* Header */}
          <div className="onboarding-header text-center mb-5">
            <h1 className="mb-3">
              <FaShieldAlt className="me-3 text-primary" />
              Pazar+ Ailesine Hoş Geldiniz
            </h1>
            <p className="lead text-muted">
              E-ticaret işletmenizi bir üst seviyeye taşımak için birkaç adımda
              hesabınızı oluşturun
            </p>
          </div>

          {/* Progress Bar */}
          <Card className="progress-card mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold">İlerleme</span>
                <Badge bg="primary">
                  {currentStep} / {steps.length}
                </Badge>
              </div>
              <ProgressBar
                now={(currentStep / steps.length) * 100}
                variant="primary"
                className="mb-3"
              />
              <div className="step-indicators">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`step-indicator ${
                      currentStep >= step.id ? "active" : ""
                    } ${currentStep === step.id ? "current" : ""}`}
                  >
                    <div className="step-icon">
                      {currentStep > step.id ? (
                        <FaCheckCircle />
                      ) : (
                        <step.icon />
                      )}
                    </div>
                    <span className="step-title">{step.title}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Step Content */}
          <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

          {/* Navigation */}
          <div className="d-flex justify-content-between mt-4">
            <Button
              variant="outline-secondary"
              onClick={handlePrevious}
              disabled={currentStep === 1 || loading}
              className="nav-button"
            >
              <FaArrowLeft className="me-2" />
              Geri
            </Button>

            {currentStep === 4 ? (
              <Button
                variant="success"
                onClick={
                  selectedPlan?.price > 0 ? handleNext : handleFreePlanComplete
                }
                disabled={loading}
                className="nav-button"
              >
                {loading ? (
                  "İşleniyor..."
                ) : selectedPlan?.price > 0 ? (
                  <>
                    Ödemeye Geç
                    <FaCreditCard className="ms-2" />
                  </>
                ) : (
                  <>
                    Hesabı Oluştur
                    <FaCheckCircle className="ms-2" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
                className="nav-button"
              >
                İleri
                <FaArrowRight className="ms-2" />
              </Button>
            )}
          </div>

          {errors.general && (
            <Alert variant="danger" className="mt-3">
              {errors.general}
            </Alert>
          )}
        </Col>
      </Row>

      {/* Payment Modal */}
      <Modal
        show={showPayment}
        onHide={() => setShowPayment(false)}
        size="xl"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Ödeme</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <TurkishPaymentGateway
            orderId={`onboarding_${Date.now()}`}
            amount={selectedPlan?.price || 0}
            currency="TRY"
            onPaymentComplete={handlePaymentComplete}
            onPaymentError={(error) => setErrors({ payment: error.message })}
            customer={{
              firstName: personalInfo.firstName,
              lastName: personalInfo.lastName,
              email: personalInfo.email,
              phone: personalInfo.phone,
            }}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default OnboardingFlow;
