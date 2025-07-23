import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Badge,
  Alert,
  ProgressBar,
  Tabs,
  Tab,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import {
  FaLanguage,
  FaDownload,
  FaUpload,
  FaCheck,
  FaExclamationTriangle,
  FaSearch,
  FaSync,
  FaFileExport,
  FaFileImport,
  FaEdit,
} from "react-icons/fa";
import { useTranslationManager } from "../../i18n/hooks/useTranslation";
import TranslationValidator from "../../i18n/utils/translationValidator";
import "./EnhancedTranslationManager.css";

const EnhancedTranslationManager = () => {
  const {
    missingKeys,
    getMissingKeys,
    clearMissingKeys,
    validateTranslations,
    exportMissingKeys,
    currentLanguage,
  } = useTranslationManager();

  const [activeTab, setActiveTab] = useState("overview");
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("tr");

  const validator = new TranslationValidator();

  useEffect(() => {
    handleValidateAll();
  }, []);

  const handleValidateAll = async () => {
    setIsValidating(true);
    try {
      const results = validator.validateAll();
      setValidationResults(results);
    } catch (error) {
      console.error("Validation failed:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExportReport = (format) => {
    try {
      const report = validator.exportReport(format);
      const blob = new Blob([report], {
        type:
          format === "json"
            ? "application/json"
            : format === "csv"
            ? "text/csv"
            : "text/html",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `translation-report-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleGenerateMissingTemplate = (language) => {
    try {
      const template = validator.generateMissingTemplate(language);
      const blob = new Blob([JSON.stringify(template, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `missing-translations-${language}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Template generation failed:", error);
    }
  };

  const filteredMissingKeys = missingKeys.filter((key) =>
    key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompletionColor = (percentage) => {
    if (percentage >= 95) return "success";
    if (percentage >= 80) return "warning";
    if (percentage >= 50) return "danger";
    return "secondary";
  };

  const renderOverviewTab = () => (
    <Row>
      <Col md={8}>
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">
              <FaLanguage className="me-2" />
              Translation Status Overview
            </h5>
          </Card.Header>
          <Card.Body>
            {isValidating ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
                <p className="mt-2">Validating translations...</p>
              </div>
            ) : validationResults ? (
              <>
                <div className="mb-4">
                  <h6>Summary</h6>
                  <Row className="text-center">
                    <Col>
                      <div className="metric">
                        <div className="metric-value">
                          {validationResults.summary.totalKeys}
                        </div>
                        <div className="metric-label">Total Keys</div>
                      </div>
                    </Col>
                    <Col>
                      <div className="metric">
                        <div className="metric-value">
                          {validationResults.summary.translatedKeys}
                        </div>
                        <div className="metric-label">Translated</div>
                      </div>
                    </Col>
                    <Col>
                      <div className="metric">
                        <div className="metric-value">
                          {validationResults.summary.missingKeys}
                        </div>
                        <div className="metric-label">Missing</div>
                      </div>
                    </Col>
                    <Col>
                      <div className="metric">
                        <div className="metric-value">
                          {validationResults.summary.completionPercentage.toFixed(
                            1
                          )}
                          %
                        </div>
                        <div className="metric-label">Complete</div>
                      </div>
                    </Col>
                  </Row>
                  <ProgressBar
                    now={validationResults.summary.completionPercentage}
                    variant={getCompletionColor(
                      validationResults.summary.completionPercentage
                    )}
                    className="mt-3"
                  />
                </div>

                <h6>Languages</h6>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Language</th>
                      <th>Total</th>
                      <th>Translated</th>
                      <th>Missing</th>
                      <th>Completion</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(validationResults.languages).map(
                      ([lang, result]) => (
                        <tr key={lang}>
                          <td>
                            <Badge bg="primary">{lang.toUpperCase()}</Badge>
                          </td>
                          <td>{result.total}</td>
                          <td>{result.translated}</td>
                          <td>
                            <Badge
                              bg={
                                result.missing.length > 0 ? "danger" : "success"
                              }
                            >
                              {result.missing.length}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <ProgressBar
                                now={result.percentage}
                                variant={getCompletionColor(result.percentage)}
                                style={{ width: "60px", height: "8px" }}
                                className="me-2"
                              />
                              <small>{result.percentage.toFixed(1)}%</small>
                            </div>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() =>
                                handleGenerateMissingTemplate(lang)
                              }
                              disabled={result.missing.length === 0}
                            >
                              <FaDownload size={12} />
                            </Button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Table>
              </>
            ) : (
              <Alert variant="info">
                Click "Validate All" to check translation status.
              </Alert>
            )}
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}>
        <Card className="mb-4">
          <Card.Header>
            <h6 className="mb-0">Quick Actions</h6>
          </Card.Header>
          <Card.Body>
            <div className="d-grid gap-2">
              <Button
                variant="primary"
                onClick={handleValidateAll}
                disabled={isValidating}
              >
                <FaSync className="me-2" />
                {isValidating ? "Validating..." : "Validate All"}
              </Button>

              <Button
                variant="outline-success"
                onClick={() => setShowExportModal(true)}
                disabled={!validationResults}
              >
                <FaFileExport className="me-2" />
                Export Report
              </Button>

              <Button
                variant="outline-warning"
                onClick={() => setShowImportModal(true)}
              >
                <FaFileImport className="me-2" />
                Import Translations
              </Button>

              <Button
                variant="outline-info"
                onClick={exportMissingKeys}
                disabled={missingKeys.length === 0}
              >
                <FaDownload className="me-2" />
                Export Missing Keys
              </Button>
            </div>
          </Card.Body>
        </Card>

        {validationResults?.recommendations && (
          <Card>
            <Card.Header>
              <h6 className="mb-0">Recommendations</h6>
            </Card.Header>
            <Card.Body>
              {validationResults.recommendations.map((rec, index) => (
                <Alert
                  key={index}
                  variant={rec.type === "error" ? "danger" : rec.type}
                  className="py-2 small"
                >
                  {rec.message}
                </Alert>
              ))}
            </Card.Body>
          </Card>
        )}
      </Col>
    </Row>
  );

  const renderMissingKeysTab = () => (
    <Card>
      <Card.Header>
        <Row className="align-items-center">
          <Col>
            <h5 className="mb-0">
              <FaExclamationTriangle className="me-2 text-warning" />
              Missing Translation Keys ({filteredMissingKeys.length})
            </h5>
          </Col>
          <Col xs="auto">
            <InputGroup size="sm" style={{ width: "250px" }}>
              <Form.Control
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
            </InputGroup>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {filteredMissingKeys.length > 0 ? (
          <div className="missing-keys-list">
            {filteredMissingKeys.map((key, index) => (
              <div key={index} className="missing-key-item">
                <div className="key-info">
                  <code className="key-name">{key}</code>
                  <div className="key-suggestion">
                    Suggestion:{" "}
                    {key
                      .split(".")
                      .pop()
                      .replace(/([A-Z])/g, " $1")
                      .trim()}
                  </div>
                </div>
                <div className="key-actions">
                  <Button size="sm" variant="outline-primary">
                    <FaEdit size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert variant="success" className="text-center">
            <FaCheck className="me-2" />
            No missing translation keys found!
          </Alert>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid className="enhanced-translation-manager">
      <div className="page-header mb-4">
        <h2>
          <FaLanguage className="me-2" />
          Enhanced Translation Manager
        </h2>
        <p className="text-muted">
          Advanced translation management and validation tools
        </p>
      </div>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="overview" title="Overview">
          {renderOverviewTab()}
        </Tab>
        <Tab
          eventKey="missing"
          title={
            <span>
              Missing Keys
              {missingKeys.length > 0 && (
                <Badge bg="danger" className="ms-1">
                  {missingKeys.length}
                </Badge>
              )}
            </span>
          }
        >
          {renderMissingKeysTab()}
        </Tab>
      </Tabs>

      {/* Export Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Export Translation Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Choose the format for your translation report:</p>
          <div className="d-grid gap-2">
            <Button
              variant="outline-primary"
              onClick={() => {
                handleExportReport("json");
                setShowExportModal(false);
              }}
            >
              <FaFileExport className="me-2" />
              JSON Format
            </Button>
            <Button
              variant="outline-success"
              onClick={() => {
                handleExportReport("csv");
                setShowExportModal(false);
              }}
            >
              <FaFileExport className="me-2" />
              CSV Format
            </Button>
            <Button
              variant="outline-info"
              onClick={() => {
                handleExportReport("html");
                setShowExportModal(false);
              }}
            >
              <FaFileExport className="me-2" />
              HTML Report
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Import Translations</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Language</Form.Label>
              <Form.Select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="tr">Turkish</option>
                <option value="en">English</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Upload Translation File</Form.Label>
              <Form.Control type="file" accept=".json" />
              <Form.Text className="text-muted">
                Upload a JSON file containing translation keys and values.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
          <Button variant="primary">
            <FaUpload className="me-2" />
            Import
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EnhancedTranslationManager;
