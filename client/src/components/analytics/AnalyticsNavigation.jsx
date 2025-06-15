import React from "react";
import { Nav } from "react-bootstrap";

const AnalyticsNavigation = () => {
  return (
    <Nav variant="tabs" className="mb-4">
      <Nav.Item>
        <Nav.Link active>Overview</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link>Sales</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link>Products</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link>Platforms</Nav.Link>
      </Nav.Item>
    </Nav>
  );
};

export default AnalyticsNavigation;
