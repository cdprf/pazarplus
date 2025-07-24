import logger from "../../utils/logger";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Alert,
  Spinner,
  Form,
  InputGroup,
} from "react-bootstrap";
import {
  FaReceipt,
  FaDownload,
  FaEye,
  FaSearch,
  FaCalendarAlt,
  FaCreditCard,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
} from "react-icons/fa";
import { motion } from "framer-motion";
import "./BillingHistory.css";

const BillingHistory = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/billing/history", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      logger.error("Failed to fetch billing history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await fetch(
        `/api/billing/invoice/${invoiceId}/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fatura-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      logger.error("Failed to download invoice:", error);
      alert("Fatura indirme işlemi başarısız oldu.");
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { variant: "success", text: "Ödendi", icon: FaCheckCircle },
      pending: {
        variant: "warning",
        text: "Bekliyor",
        icon: FaExclamationTriangle,
      },
      failed: { variant: "danger", text: "Başarısız", icon: FaTimesCircle },
      refunded: {
        variant: "secondary",
        text: "İade Edildi",
        icon: FaCheckCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge bg={config.variant} className="d-flex align-items-center">
        <IconComponent className="me-1" size={12} />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (amount, currency = "TRY") => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Fatura geçmişi yükleniyor...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="billing-history">
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
                  <FaReceipt className="me-2 text-primary" />
                  Fatura Geçmişi
                </h2>
                <p className="text-muted">
                  Ödeme geçmişinizi ve faturalarınızı görüntüleyin
                </p>
              </div>
            </div>
          </Col>
        </Row>

        {/* Filters */}
        <Row className="mb-4">
          <Col md={6}>
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Fatura numarası veya açıklama ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tüm Durumlar</option>
              <option value="paid">Ödendi</option>
              <option value="pending">Bekliyor</option>
              <option value="failed">Başarısız</option>
              <option value="refunded">İade Edildi</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Billing Summary Cards */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <FaCreditCard className="summary-icon text-primary" size={32} />
                <h4 className="mt-2 mb-0">
                  ₺
                  {invoices
                    .reduce(
                      (sum, inv) =>
                        sum + (inv.status === "paid" ? inv.amount : 0),
                      0
                    )
                    .toFixed(2)}
                </h4>
                <small className="text-muted">Toplam Ödenen</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <FaCheckCircle
                  className="summary-icon text-success"
                  size={32}
                />
                <h4 className="mt-2 mb-0">
                  {invoices.filter((inv) => inv.status === "paid").length}
                </h4>
                <small className="text-muted">Ödenen Faturalar</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <FaExclamationTriangle
                  className="summary-icon text-warning"
                  size={32}
                />
                <h4 className="mt-2 mb-0">
                  {invoices.filter((inv) => inv.status === "pending").length}
                </h4>
                <small className="text-muted">Bekleyen Ödemeler</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="summary-card">
              <Card.Body className="text-center">
                <FaCalendarAlt className="summary-icon text-info" size={32} />
                <h4 className="mt-2 mb-0">{new Date().getFullYear()}</h4>
                <small className="text-muted">Bu Yıl</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Invoices Table */}
        <Row>
          <Col>
            <Card className="invoices-card">
              <Card.Header>
                <h5 className="mb-0">Faturalar</h5>
              </Card.Header>
              <Card.Body className="p-0">
                {filteredInvoices.length === 0 ? (
                  <div className="text-center py-5">
                    <FaReceipt className="text-muted mb-3" size={48} />
                    <h5 className="text-muted">Fatura bulunamadı</h5>
                    <p className="text-muted">
                      {searchTerm || statusFilter !== "all"
                        ? "Arama kriterlerinize uygun fatura bulunamadı."
                        : "Henüz faturanız bulunmuyor."}
                    </p>
                  </div>
                ) : (
                  <Table responsive hover className="mb-0">
                    <thead className="table-header">
                      <tr>
                        <th>Fatura No</th>
                        <th>Tarih</th>
                        <th>Açıklama</th>
                        <th>Tutar</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <motion.tr
                          key={invoice.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="invoice-row"
                        >
                          <td>
                            <strong>{invoice.invoiceNumber}</strong>
                          </td>
                          <td>{formatDate(invoice.createdAt)}</td>
                          <td>
                            <div>
                              <div>{invoice.description}</div>
                              {invoice.planName && (
                                <small className="text-muted">
                                  {invoice.planName}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <strong>
                              {formatPrice(invoice.amount, invoice.currency)}
                            </strong>
                          </td>
                          <td>{getStatusBadge(invoice.status)}</td>
                          <td>
                            <div className="action-buttons">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleViewInvoice(invoice)}
                              >
                                <FaEye className="me-1" />
                                Görüntüle
                              </Button>
                              {invoice.status === "paid" && (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() =>
                                    handleDownloadInvoice(invoice.id)
                                  }
                                >
                                  <FaDownload className="me-1" />
                                  İndir
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Invoice Detail Modal */}
        <Modal
          show={showInvoiceModal}
          onHide={() => setShowInvoiceModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Fatura Detayı - {selectedInvoice?.invoiceNumber}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedInvoice && (
              <div className="invoice-detail">
                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Fatura Numarası:</strong>
                    <p>{selectedInvoice.invoiceNumber}</p>
                  </Col>
                  <Col md={6}>
                    <strong>Tarih:</strong>
                    <p>{formatDate(selectedInvoice.createdAt)}</p>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <strong>Tutar:</strong>
                    <p className="h5 text-primary">
                      {formatPrice(
                        selectedInvoice.amount,
                        selectedInvoice.currency
                      )}
                    </p>
                  </Col>
                  <Col md={6}>
                    <strong>Durum:</strong>
                    <p>{getStatusBadge(selectedInvoice.status)}</p>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col>
                    <strong>Açıklama:</strong>
                    <p>{selectedInvoice.description}</p>
                  </Col>
                </Row>

                {selectedInvoice.paymentMethod && (
                  <Row className="mb-3">
                    <Col>
                      <strong>Ödeme Yöntemi:</strong>
                      <p>{selectedInvoice.paymentMethod}</p>
                    </Col>
                  </Row>
                )}

                <Alert variant="info">
                  <FaReceipt className="me-2" />
                  Bu fatura Pazar+ Teknoloji A.Ş. tarafından düzenlenmiştir.
                </Alert>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowInvoiceModal(false)}
            >
              Kapat
            </Button>
            {selectedInvoice?.status === "paid" && (
              <Button
                variant="primary"
                onClick={() => handleDownloadInvoice(selectedInvoice.id)}
              >
                <FaDownload className="me-2" />
                PDF İndir
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </motion.div>
    </Container>
  );
};

export default BillingHistory;
