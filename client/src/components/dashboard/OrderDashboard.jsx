/* eslint-disable no-unused-vars */
// src/client/components/OrderDashboard.jsx

import React, { useCallback, useState, useMemo } from "react";
import { Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { useOrderStats, useOrderSync } from "../../hooks/useOrders";
import { useQueryClient } from "@tanstack/react-query";
import OrdersChart from "./OrdersChart";
import LoadingState from "../shared/LoadingState";
import { useContext } from "react";
import { AlertContext } from "../../contexts/AlertContext";
import PlatformStatusCard from "./PlatformStatusCard";
import useWebSocketQuery from "../../hooks/useWebSocketQuery";
import { usePlatforms } from "../../hooks/usePlatforms";

const OrderDashboard = () => {
  const { success, error: showError } = useContext(AlertContext);
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [syncingPlatforms, setSyncingPlatforms] = useState(new Set());

  // Get platform connections
  const { data: platforms = [] } = usePlatforms();

  // Set up WebSocket query with filters
  useWebSocketQuery(
    ["orderStats"],
    ["ORDER_UPDATED", "ORDER_CREATED", "ORDER_CANCELLED"],
    {
      ORDER_UPDATED: {
        updateType: "status", // Only listen for status updates
      },
    }
  );

  // Listen for platform status changes with specific filters
  useWebSocketQuery(["platforms"], ["PLATFORM_STATUS_CHANGED"], {
    PLATFORM_STATUS_CHANGED: {
      "platform.status": ["active", "error"], // Only major status changes
    },
  });

  // Listen for sync completion events
  useWebSocketQuery(["syncStatus"], ["ORDER_SYNC_COMPLETED"]);

  // Fetch order statistics
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useOrderStats({ period: selectedPeriod });

  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (!stats) return {};

    return {
      totalOrders: stats.totalOrders || 0,
      newOrders: stats.newOrders || 0,
      processingOrders: stats.processingOrders || 0,
      shippedOrders: stats.shippedOrders || 0,
      cancelledOrders: stats.cancelledOrders || 0,
      returnedOrders: stats.returnedOrders || 0,
    };
  }, [stats]);

  // Handle platform sync
  const handleSync = useCallback(async (platformId) => {
    setSyncingPlatforms((prev) => new Set([...prev, platformId]));
    try {
      await fetch(`/api/order-management/sync/${platformId}`, {
        method: "POST",
      });
    } finally {
      setSyncingPlatforms((prev) => {
        const next = new Set(prev);
        next.delete(platformId);
        return next;
      });
    }
  }, []);

  if (statsLoading) {
    return <div>Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard">
      <Row className="mb-4">
        <Col>
          <h2>Order Dashboard</h2>
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-secondary"
            className="me-2"
            onClick={() => setSelectedPeriod("week")}
            active={selectedPeriod === "week"}
          >
            Week
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => setSelectedPeriod("month")}
            active={selectedPeriod === "month"}
          >
            Month
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>New Orders</Card.Title>
              <h3>{metrics.newOrders}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Processing</Card.Title>
              <h3>{metrics.processingOrders}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Shipped</Card.Title>
              <h3>{metrics.shippedOrders}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Order Trends</Card.Title>
              <OrdersChart
                data={stats?.chartData || []}
                period={selectedPeriod}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Platform Status</Card.Title>
              <Row>
                {platforms.map((platform) => (
                  <Col key={platform.id} md={4} className="mb-3">
                    <PlatformStatusCard
                      platform={platform}
                      onSync={() => handleSync(platform.id)}
                      isSyncing={syncingPlatforms.has(platform.id)}
                    />
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderDashboard;
