import React, { useState } from "react";
import { Container, Row, Col, Nav } from "react-bootstrap";
import BusinessIntelligenceDashboard from "../components/analytics/BusinessIntelligenceDashboard";
import SalesAnalytics from "../components/analytics/SalesAnalytics";
import ProductAnalytics from "../components/analytics/ProductAnalytics";
import PlatformAnalytics from "../components/analytics/PlatformAnalytics";
import CustomerAnalytics from "../components/analytics/CustomerAnalytics";
import FinancialAnalytics from "../components/analytics/FinancialAnalytics";
import OperationalAnalytics from "../components/analytics/OperationalAnalytics";

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <BusinessIntelligenceDashboard />;
      case "sales":
        return <SalesAnalytics />;
      case "products":
        return <ProductAnalytics />;
      case "platforms":
        return <PlatformAnalytics />;
      case "customers":
        return <CustomerAnalytics />;
      case "financial":
        return <FinancialAnalytics />;
      case "operational":
        return <OperationalAnalytics />;
      default:
        return <BusinessIntelligenceDashboard />;
    }
  };

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <h1 className="mb-4">Analytics Dashboard</h1>

          <Nav variant="tabs" className="mb-4">
            <Nav.Item>
              <Nav.Link
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "sales"}
                onClick={() => setActiveTab("sales")}
              >
                Sales
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "products"}
                onClick={() => setActiveTab("products")}
              >
                Products
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "platforms"}
                onClick={() => setActiveTab("platforms")}
              >
                Platforms
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "customers"}
                onClick={() => setActiveTab("customers")}
              >
                Customers
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "financial"}
                onClick={() => setActiveTab("financial")}
              >
                Financial
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === "operational"}
                onClick={() => setActiveTab("operational")}
              >
                Operational
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
      </Row>

      <Row>
        <Col>{renderContent()}</Col>
      </Row>
    </Container>
  );
};

export default Analytics;
