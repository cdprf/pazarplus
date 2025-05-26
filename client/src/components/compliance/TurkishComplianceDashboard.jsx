import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Spinner
} from 'react-bootstrap';
import { 
  FaShieldAlt, 
  FaFileInvoice, 
  FaArchive, 
  FaCalculator,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaDownload,
  FaEye
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import './TurkishComplianceDashboard.css';

const TurkishComplianceDashboard = ({ orderId }) => {
  const { t } = useTranslation();
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showKVKKModal, setShowKVKKModal] = useState(false);
  const [showEFaturaModal, setShowEFaturaModal] = useState(false);
  const [showEArsivModal, setShowEArsivModal] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    fetchComplianceData();
  }, [orderId]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/compliance/status/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setComplianceData(data);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKVKKConsent = async (consentData) => {
    try {
      setProcessingAction('kvkk');
      const response = await fetch(`/api/compliance/kvkk/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(consentData)
      });
      
      if (response.ok) {
        await fetchComplianceData();
        setShowKVKKModal(false);
      }
    } catch (error) {
      console.error('Failed to record KVKK consent:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCreateEFatura = async (eFaturaData) => {
    try {
      setProcessingAction('efatura');
      const response = await fetch(`/api/compliance/efatura/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(eFaturaData)
      });
      
      if (response.ok) {
        await fetchComplianceData();
        setShowEFaturaModal(false);
      }
    } catch (error) {
      console.error('Failed to create E-Fatura:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCreateEArsiv = async () => {
    try {
      setProcessingAction('earsiv');
      const response = await fetch(`/api/compliance/earsiv/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await fetchComplianceData();
        setShowEArsivModal(false);
      }
    } catch (error) {
      console.error('Failed to create E-Arşiv:', error);
    } finally {
      setProcessingAction(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'COMPLIANT': { variant: 'success', icon: FaCheckCircle },
      'NON_COMPLIANT': { variant: 'danger', icon: FaExclamationTriangle },
      'PENDING': { variant: 'warning', icon: FaClock }
    };

    const config = statusConfig[status] || statusConfig['PENDING'];
    const IconComponent = config.icon;

    return (
      <Badge bg={config.variant} className="d-flex align-items-center">
        <IconComponent className="me-1" />
        {t(`compliance.status.${status.toLowerCase()}`)}
      </Badge>
    );
  };

  const getComplianceProgress = () => {
    if (!complianceData) return 0;
    
    let completed = 0;
    let total = 3; // KVKK, E-Fatura/E-Arşiv, İrsaliye

    if (complianceData.kvkkConsent) completed += 1;
    if (complianceData.eFaturaStatus === 'SENT' || complianceData.eArsivStatus === 'CREATED') completed += 1;
    if (complianceData.irsaliyeNumber) completed += 1;

    return Math.round((completed / total) * 100);
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
    <Container fluid className="turkish-compliance-dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="dashboard-header">
              <h2 className="d-flex align-items-center mb-3">
                <FaShieldAlt className="me-3 text-primary" />
                {t('compliance.title')}
              </h2>
              <p className="text-muted">{t('compliance.subtitle')}</p>
            </div>
          </Col>
        </Row>

        {/* Compliance Progress */}
        <Row className="mb-4">
          <Col>
            <Card className="compliance-progress-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Uyumluluk Durumu</h5>
                  {complianceData && getStatusBadge(complianceData.status || 'PENDING')}
                </div>
                <ProgressBar 
                  now={getComplianceProgress()} 
                  label={`${getComplianceProgress()}%`}
                  variant={getComplianceProgress() === 100 ? 'success' : 'primary'}
                  className="compliance-progress"
                />
                <small className="text-muted mt-2 d-block">
                  {getComplianceProgress() === 100 ? 
                    'Tüm uyumluluk gereksinimler tamamlandı' : 
                    'Bazı uyumluluk adımları eksik'
                  }
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Compliance Cards */}
        <Row className="g-4">
          {/* KVKK Card */}
          <Col lg={4}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="compliance-card kvkk-card h-100">
                <Card.Body>
                  <div className="card-icon-header">
                    <FaShieldAlt className="card-icon" />
                    <h5>{t('compliance.kvkk.title')}</h5>
                  </div>
                  
                  <div className="compliance-status mb-3">
                    {complianceData?.kvkkConsent ? (
                      <Badge bg="success" className="d-flex align-items-center">
                        <FaCheckCircle className="me-1" />
                        {t('compliance.kvkk.consentGiven')}
                      </Badge>
                    ) : (
                      <Badge bg="warning" className="d-flex align-items-center">
                        <FaExclamationTriangle className="me-1" />
                        {t('compliance.kvkk.consentRequired')}
                      </Badge>
                    )}
                  </div>

                  {complianceData?.kvkkConsent && (
                    <div className="compliance-details">
                      <small className="text-muted">
                        <strong>{t('compliance.kvkk.consentMethod')}:</strong> {complianceData.kvkkConsentMethod}<br/>
                        <strong>{t('compliance.kvkk.consentDate')}:</strong> {new Date(complianceData.kvkkConsentDate).toLocaleDateString('tr-TR')}
                      </small>
                    </div>
                  )}

                  <div className="card-actions mt-3">
                    {!complianceData?.kvkkConsent ? (
                      <Button 
                        variant="primary" 
                        onClick={() => setShowKVKKModal(true)}
                        disabled={processingAction === 'kvkk'}
                      >
                        {processingAction === 'kvkk' ? (
                          <Spinner size="sm" className="me-2" />
                        ) : null}
                        KVKK Onayı Al
                      </Button>
                    ) : (
                      <Button variant="outline-primary" size="sm">
                        <FaEye className="me-1" />
                        Detayları Görüntüle
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>

          {/* E-Fatura/E-Arşiv Card */}
          <Col lg={4}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="compliance-card efatura-card h-100">
                <Card.Body>
                  <div className="card-icon-header">
                    <FaFileInvoice className="card-icon" />
                    <h5>{complianceData?.customerType === 'COMPANY' ? 
                      t('compliance.efatura.title') : 
                      t('compliance.earsiv.title')
                    }</h5>
                  </div>
                  
                  <div className="compliance-status mb-3">
                    {(complianceData?.eFaturaStatus === 'SENT' || complianceData?.eArsivStatus === 'CREATED') ? (
                      <Badge bg="success" className="d-flex align-items-center">
                        <FaCheckCircle className="me-1" />
                        Oluşturuldu
                      </Badge>
                    ) : (
                      <Badge bg="warning" className="d-flex align-items-center">
                        <FaExclamationTriangle className="me-1" />
                        Oluşturulması Gerekli
                      </Badge>
                    )}
                  </div>

                  {(complianceData?.eFaturaNumber || complianceData?.eArsivNumber) && (
                    <div className="compliance-details">
                      <small className="text-muted">
                        <strong>Belge No:</strong> {complianceData.eFaturaNumber || complianceData.eArsivNumber}<br/>
                        <strong>Tarih:</strong> {new Date(complianceData.eFaturaDate || complianceData.eArsivDate).toLocaleDateString('tr-TR')}
                      </small>
                    </div>
                  )}

                  <div className="card-actions mt-3">
                    {!(complianceData?.eFaturaStatus === 'SENT' || complianceData?.eArsivStatus === 'CREATED') ? (
                      <Button 
                        variant="primary" 
                        onClick={() => complianceData?.customerType === 'COMPANY' ? 
                          setShowEFaturaModal(true) : 
                          setShowEArsivModal(true)
                        }
                        disabled={processingAction === 'efatura' || processingAction === 'earsiv'}
                      >
                        {(processingAction === 'efatura' || processingAction === 'earsiv') ? (
                          <Spinner size="sm" className="me-2" />
                        ) : null}
                        {complianceData?.customerType === 'COMPANY' ? 
                          t('compliance.efatura.create') : 
                          t('compliance.earsiv.create')
                        }
                      </Button>
                    ) : (
                      <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm">
                          <FaEye className="me-1" />
                          Görüntüle
                        </Button>
                        <Button variant="outline-secondary" size="sm">
                          <FaDownload className="me-1" />
                          İndir
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>

          {/* Tax Calculation Card */}
          <Col lg={4}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="compliance-card tax-card h-100">
                <Card.Body>
                  <div className="card-icon-header">
                    <FaCalculator className="card-icon" />
                    <h5>{t('compliance.tax.title')}</h5>
                  </div>
                  
                  {complianceData?.kdvTotal && (
                    <div className="tax-breakdown">
                      <div className="tax-item">
                        <span>KDV Öncesi:</span>
                        <strong>{(complianceData.totalBeforeKDV || 0).toFixed(2)} ₺</strong>
                      </div>
                      <div className="tax-item">
                        <span>KDV (%{complianceData.kdvRate || 18}):</span>
                        <strong>{(complianceData.kdvTotal || 0).toFixed(2)} ₺</strong>
                      </div>
                      <div className="tax-item total">
                        <span>Toplam:</span>
                        <strong>{(complianceData.totalWithKDV || 0).toFixed(2)} ₺</strong>
                      </div>
                    </div>
                  )}

                  <div className="card-actions mt-3">
                    <Button variant="outline-primary" size="sm">
                      <FaCalculator className="me-1" />
                      Hesaplama Detayları
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Issues Alert */}
        {complianceData?.issues?.length > 0 && (
          <Row className="mt-4">
            <Col>
              <Alert variant="warning" className="compliance-issues">
                <Alert.Heading className="h6">
                  <FaExclamationTriangle className="me-2" />
                  Uyumluluk Sorunları
                </Alert.Heading>
                <ul className="mb-0">
                  {complianceData.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </Alert>
            </Col>
          </Row>
        )}
      </motion.div>

      {/* KVKK Modal */}
      <KVKKConsentModal 
        show={showKVKKModal}
        onHide={() => setShowKVKKModal(false)}
        onSubmit={handleKVKKConsent}
        processing={processingAction === 'kvkk'}
      />

      {/* E-Fatura Modal */}
      <EFaturaModal 
        show={showEFaturaModal}
        onHide={() => setShowEFaturaModal(false)}
        onSubmit={handleCreateEFatura}
        processing={processingAction === 'efatura'}
      />

      {/* E-Arşiv Modal */}
      <EArsivModal 
        show={showEArsivModal}
        onHide={() => setShowEArsivModal(false)}
        onSubmit={handleCreateEArsiv}
        processing={processingAction === 'earsiv'}
      />
    </Container>
  );
};

// KVKK Consent Modal Component
const KVKKConsentModal = ({ show, onHide, onSubmit, processing }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    consentGiven: true,
    consentMethod: 'WEBSITE',
    consentDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>KVKK Veri Koruma Onayı</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Alert variant="info">
            <strong>KVKK Bilgilendirme:</strong> Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında işlenmektedir.
          </Alert>
          
          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              id="kvkk-consent"
              label="KVKK kapsamında kişisel verilerimin işlenmesine onay veriyorum"
              checked={formData.consentGiven}
              onChange={(e) => setFormData({...formData, consentGiven: e.target.checked})}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Onay Yöntemi</Form.Label>
            <Form.Select 
              value={formData.consentMethod}
              onChange={(e) => setFormData({...formData, consentMethod: e.target.value})}
            >
              <option value="WEBSITE">Web Sitesi</option>
              <option value="EMAIL">E-posta</option>
              <option value="PHONE">Telefon</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Onay Tarihi</Form.Label>
            <Form.Control 
              type="date"
              value={formData.consentDate}
              onChange={(e) => setFormData({...formData, consentDate: e.target.value})}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={processing || !formData.consentGiven}>
            {processing ? <Spinner size="sm" className="me-2" /> : null}
            KVKK Onayını Kaydet
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// E-Fatura Modal Component
const EFaturaModal = ({ show, onHide, onSubmit, processing }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    customerType: 'COMPANY',
    taxNumber: '',
    taxOffice: '',
    identityNumber: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>E-Fatura Oluştur</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Müşteri Tipi</Form.Label>
            <Form.Select 
              value={formData.customerType}
              onChange={(e) => setFormData({...formData, customerType: e.target.value})}
            >
              <option value="COMPANY">Kurumsal</option>
              <option value="INDIVIDUAL">Bireysel</option>
            </Form.Select>
          </Form.Group>

          {formData.customerType === 'COMPANY' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Vergi Numarası (VKN)</Form.Label>
                <Form.Control 
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({...formData, taxNumber: e.target.value})}
                  placeholder="10 haneli vergi numarası"
                  maxLength={10}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Vergi Dairesi</Form.Label>
                <Form.Control 
                  type="text"
                  value={formData.taxOffice}
                  onChange={(e) => setFormData({...formData, taxOffice: e.target.value})}
                  placeholder="Vergi dairesi adı"
                  required
                />
              </Form.Group>
            </>
          )}

          {formData.customerType === 'INDIVIDUAL' && (
            <Form.Group className="mb-3">
              <Form.Label>TC Kimlik Numarası (Opsiyonel)</Form.Label>
              <Form.Control 
                type="text"
                value={formData.identityNumber}
                onChange={(e) => setFormData({...formData, identityNumber: e.target.value})}
                placeholder="11 haneli TC kimlik numarası"
                maxLength={11}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={processing}>
            {processing ? <Spinner size="sm" className="me-2" /> : null}
            E-Fatura Oluştur
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// E-Arşiv Modal Component
const EArsivModal = ({ show, onHide, onSubmit, processing }) => {
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>E-Arşiv Belgesi Oluştur</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Alert variant="info">
            <strong>E-Arşiv Bilgisi:</strong> E-Arşiv belgesi bireysel müşteriler için elektronik arşiv sistemi ile oluşturulacaktır.
          </Alert>
          <p>Bu işlem sipariş için otomatik olarak E-Arşiv belgesi oluşturacaktır.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={processing}>
            {processing ? <Spinner size="sm" className="me-2" /> : null}
            E-Arşiv Oluştur
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default TurkishComplianceDashboard;