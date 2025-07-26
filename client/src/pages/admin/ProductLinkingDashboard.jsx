import logger from "../../utils/logger.js";
import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n/hooks/useTranslation";
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Spinner,
  Alert,
  Pagination,
} from "react-bootstrap";
import { FiLink, FiRefreshCw, FiFilter, FiSearch, FiX } from "react-icons/fi";
import api from "../../services/api";

const ProductLinkingDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [unlinkedItems, setUnlinkedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processLoading, setProcessLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    platform: "",
    search: "",
    startDate: "",
    endDate: "",
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Load statistics
      const statsResponse = await api.get(
        "/order-management/product-linking/stats",
        {
          params: filters,
        }
      );
      setStats(statsResponse.data.data);

      // Load unlinked items
      const itemsResponse = await api.get(
        "/order-management/product-linking/unlinked-items",
        {
          params: {
            ...filters,
            page: currentPage,
            limit: 20,
          },
        }
      );
      setUnlinkedItems(itemsResponse.data.data.items);
      setTotalPages(itemsResponse.data.data.pagination.totalPages);
    } catch (error) {
      logger.error("Error loading data:", error);
    }
    setLoading(false);
  }, [currentPage, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunRetroactive = async () => {
    setProcessLoading(true);
    try {
      const response = await api.post(
        "/order-management/product-linking/run-retroactive",
        {
          ...filters,
          batchSize: 100,
          dryRun: false,
        }
      );

      if (response.data.success) {
        alert(
          t(
            "admin.productLinking.retroactiveCompleted",
            "Geçmişe dönük bağlantı tamamlandı! İşlenen: {{processed}}, Bağlanan: {{linked}}",
            {
              processed: response.data.data.processedItems,
              linked: response.data.data.linkedItems,
            }
          )
        );
        loadData(); // Reload data to show updated stats
      }
    } catch (error) {
      logger.error("Error running retroactive linking:", error);
      alert(
        t(
          "admin.productLinking.retroactiveError",
          "Geçmişe dönük bağlantı çalıştırılırken hata oluştu. Detaylar için konsolu kontrol edin."
        )
      );
    }
    setProcessLoading(false);
  };

  const handleShowSuggestions = async (item) => {
    setSelectedItem(item);
    try {
      const response = await api.get(
        `/order-management/product-linking/suggestions/${item.id}`
      );
      setSuggestions(response.data.data.suggestions || []);
      setShowLinkModal(true);
    } catch (error) {
      logger.error("Error loading suggestions:", error);
      setSuggestions([]);
      setShowLinkModal(true);
    }
  };

  const handleManualLink = async (productId) => {
    try {
      await api.post(
        `/order-management/product-linking/link/${selectedItem.id}`,
        {
          productId,
        }
      );
      setShowLinkModal(false);
      loadData(); // Reload data
      alert(
        t(
          "admin.productLinking.productLinkedSuccessfully",
          {},
          "Ürün başarıyla bağlandı!"
        )
      );
    } catch (error) {
      logger.error("Error linking product:", error);
      alert(
        t(
          "admin.productLinking.errorLinkingProduct",
          {},
          "Ürün bağlanırken hata oluştu. Detaylar için konsolu kontrol edin."
        )
      );
    }
  };

  const handleUnlink = async (itemId) => {
    if (
      window.confirm(
        t(
          "admin.productLinking.confirmUnlink",
          {},
          "Bu öğenin bağlantısını kaldırmak istediğinizden emin misiniz?"
        )
      )
    ) {
      try {
        await api.delete(`/order-management/product-linking/unlink/${itemId}`);
        loadData(); // Reload data
        alert(
          t(
            "admin.productLinking.productUnlinkedSuccessfully",
            {},
            "Ürün bağlantısı başarıyla kaldırıldı!"
          )
        );
      } catch (error) {
        logger.error("Error unlinking product:", error);
        alert(
          t(
            "admin.productLinking.errorUnlinkingProduct",
            {},
            "Ürün bağlantısı kaldırılırken hata oluştu. Detaylar için konsolu kontrol edin."
          )
        );
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getPlatformBadgeColor = (platform) => {
    const colors = {
      trendyol: "warning",
      hepsiburada: "primary",
      n11: "success",
      amazon: "info",
    };
    return colors[platform] || "secondary";
  };

  if (loading && !stats) {
    return (
      <div className="d-flex justify-content-center p-5">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  return (
    <div className="product-linking-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {t("admin.productLinking.title", "Ürün-Sipariş Bağlantısı Yönetimi")}
        </h2>
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder={t(
              "admin.productLinking.searchPlaceholder",
              "Ürün ara..."
            )}
            style={{ width: "200px" }}
            className="me-2"
          />
          <FiSearch className="align-self-center text-muted" />
          <Button
            variant="primary"
            onClick={handleRunRetroactive}
            disabled={processLoading}
          >
            {processLoading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {t("common.processing", {}, "İşleniyor...")}
              </>
            ) : (
              <>
                <FiRefreshCw className="me-2" />
                {t(
                  "admin.productLinking.runRetroactive",
                  "Geçmişe Dönük Bağlantı Çalıştır"
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-primary">
                  {stats.summary.totalOrderItems}
                </h5>
                <p className="mb-0">
                  {t(
                    "admin.productLinking.totalOrderItems",
                    "Toplam Sipariş Ürünleri"
                  )}
                </p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-success">
                  {stats.summary.linkedOrderItems}
                </h5>
                <p className="mb-0">
                  {t("admin.productLinking.linkedItems", "Bağlanmış Ürünler")}
                </p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-danger">
                  {stats.summary.unlinkedOrderItems}
                </h5>
                <p className="mb-0">
                  {t(
                    "admin.productLinking.unlinkedItems",
                    "Bağlanmamış Ürünler"
                  )}
                </p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-info">
                  {stats.summary.overallLinkingRate}%
                </h5>
                <p className="mb-0">
                  {t("admin.productLinking.linkingRate", "Bağlantı Oranı")}
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Platform Breakdown */}
      {stats && stats.platformBreakdown.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            {t("admin.productLinking.platformBreakdown", "Platform Dağılımı")}
          </Card.Header>
          <Card.Body>
            <Row>
              {stats.platformBreakdown.map((platform) => (
                <Col md={3} key={platform.platform}>
                  <div className="text-center p-3 border rounded">
                    <Badge
                      bg={getPlatformBadgeColor(platform.platform)}
                      className="mb-2"
                    >
                      {platform.platform.toUpperCase()}
                    </Badge>
                    <div>
                      <strong>{platform.total}</strong> total
                    </div>
                    <div>
                      <span className="text-success">{platform.linked}</span>{" "}
                      {t("admin.productLinking.linked", {}, "bağlı")}
                    </div>
                    <div>
                      <span className="text-danger">{platform.unlinked}</span>{" "}
                      {t("admin.productLinking.unlinked", {}, "bağlanmamış")}
                    </div>
                    <div>
                      <small>
                        {platform.linkingRate}%{" "}
                        {t("admin.productLinking.rate", {}, "oran")}
                      </small>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Header>
          <FiFilter className="me-2" />
          {t("common.filters", {}, "Filtreler")}
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  {t("admin.productLinking.platform", "Platform")}
                </Form.Label>
                <Form.Select
                  value={filters.platform}
                  onChange={(e) =>
                    handleFilterChange("platform", e.target.value)
                  }
                >
                  <option value="">
                    {t("admin.productLinking.allPlatforms", "Tüm Platformlar")}
                  </option>
                  <option value="trendyol">Trendyol</option>
                  <option value="hepsiburada">Hepsiburada</option>
                  <option value="n11">N11</option>
                  <option value="amazon">Amazon</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>{t("common.search", {}, "Arama")}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t(
                    "admin.productLinking.searchPlaceholder",
                    {},
                    "Başlık, SKU, barkod ile ara..."
                  )}
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  {t("common.startDate", {}, "Başlangıç Tarihi")}
                </Form.Label>
                <Form.Control
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>
                  {t("common.endDate", {}, "Bitiş Tarihi")}
                </Form.Label>
                <Form.Control
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Unlinked Items Table */}
      <Card>
        <Card.Header>
          {t(
            "admin.productLinking.unlinkedOrderItems",
            {},
            "Bağlanmamış Sipariş Ürünleri"
          )}{" "}
          ({unlinkedItems.length})
        </Card.Header>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>{t("common.order", {}, "Sipariş")}</th>
                <th>{t("common.platform", {}, "Platform")}</th>
                <th>{t("common.title", {}, "Başlık")}</th>
                <th>{t("common.sku", {}, "SKU")}</th>
                <th>{t("common.barcode", {}, "Barkod")}</th>
                <th>{t("common.actions", {}, "İşlemler")}</th>
              </tr>
            </thead>
            <tbody>
              {unlinkedItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <small>{item.order?.orderNumber}</small>
                  </td>
                  <td>
                    <Badge bg={getPlatformBadgeColor(item.order?.platform)}>
                      {item.order?.platform}
                    </Badge>
                  </td>
                  <td>
                    <div
                      className="text-truncate"
                      style={{ maxWidth: "200px" }}
                    >
                      {item.title}
                    </div>
                  </td>
                  <td>
                    <small>{item.sku || "-"}</small>
                  </td>
                  <td>
                    <small>{item.barcode || "-"}</small>
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleShowSuggestions(item)}
                    >
                      <FiLink /> {t("admin.productLinking.link", {}, "Bağla")}
                    </Button>
                    {item.productId && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleUnlink(item.id)}
                      >
                        <FiX />{" "}
                        {t(
                          "admin.productLinking.unlink",
                          {},
                          "Bağlantıyı Kaldır"
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                />
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + Math.max(1, currentPage - 2);
                  if (page <= totalPages) {
                    return (
                      <Pagination.Item
                        key={page}
                        active={page === currentPage}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Pagination.Item>
                    );
                  }
                  return null;
                })}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Link Modal */}
      <Modal
        show={showLinkModal}
        onHide={() => setShowLinkModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {t(
              "admin.productLinking.linkProductToOrderItem",
              {},
              "Ürünü Sipariş Kalemiyle Bağla"
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div className="mb-3">
              <h6>
                {t(
                  "admin.productLinking.orderItemDetails",
                  {},
                  "Sipariş Kalemi Detayları"
                )}
                :
              </h6>
              <p>
                <strong>{t("common.title", {}, "Başlık")}:</strong>{" "}
                {selectedItem.title}
              </p>
              <p>
                <strong>{t("common.sku", {}, "SKU")}:</strong>{" "}
                {selectedItem.sku || "N/A"}
              </p>
              <p>
                <strong>Barcode:</strong> {selectedItem.barcode || "N/A"}
              </p>
            </div>
          )}

          <h6>Suggested Products:</h6>
          {suggestions.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Match Strategy</th>
                  <th>Confidence</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((suggestion) => (
                  <tr key={suggestion.id}>
                    <td>{suggestion.name}</td>
                    <td>{suggestion.sku}</td>
                    <td>
                      <Badge bg="info">{suggestion.matchStrategy}</Badge>
                    </td>
                    <td>
                      <Badge
                        bg={
                          suggestion.confidence > 0.8
                            ? "success"
                            : suggestion.confidence > 0.6
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleManualLink(suggestion.id)}
                      >
                        Link
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">
              No product suggestions found. You may need to add products that
              match this order item.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLinkModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProductLinkingDashboard;
