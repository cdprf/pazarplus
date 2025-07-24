import logger from "../../utils/logger";
import React, { useState, useCallback, useMemo } from "react";
import { Nav, Badge, Spinner, Alert } from "react-bootstrap";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  BanknotesIcon,
  CogIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const AnalyticsNavigation = ({
  activeTab = "overview",
  onTabChange,
  tabs = [],
  loading = false,
  error = null,
  className = "",
  "aria-label": ariaLabel,
  testId,
  showBadges = false,
  tabCounts = {},
}) => {
  const [focusedTab, setFocusedTab] = useState(null);

  // Default tabs configuration
  const defaultTabs = useMemo(
    () => [
      {
        key: "overview",
        label: "Overview",
        icon: ChartBarIcon,
        description: "General dashboard overview",
        color: "primary",
      },
      {
        key: "sales",
        label: "Sales",
        icon: CurrencyDollarIcon,
        description: "Sales analytics and performance",
        color: "success",
      },
      {
        key: "products",
        label: "Products",
        icon: CubeIcon,
        description: "Product performance and insights",
        color: "info",
      },
      {
        key: "customers",
        label: "Customers",
        icon: UserGroupIcon,
        description: "Customer analytics and segmentation",
        color: "warning",
      },
      {
        key: "platforms",
        label: "Platforms",
        icon: BuildingStorefrontIcon,
        description: "Platform performance comparison",
        color: "secondary",
      },
      {
        key: "financial",
        label: "Financial",
        icon: BanknotesIcon,
        description: "Financial analytics and reporting",
        color: "danger",
      },
      {
        key: "operational",
        label: "Operational",
        icon: CogIcon,
        description: "Operational metrics and efficiency",
        color: "dark",
      },
    ],
    []
  );

  const tabsToRender = tabs.length > 0 ? tabs : defaultTabs;

  const handleTabClick = useCallback(
    (tabKey, event) => {
      try {
        event.preventDefault();
        if (tabKey !== activeTab && onTabChange) {
          onTabChange(tabKey);
        }
      } catch (err) {
        logger.error("Analytics navigation error:", err);
      }
    },
    [activeTab, onTabChange]
  );

  const handleKeyDown = useCallback(
    (event, tabKey) => {
      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          handleTabClick(tabKey, event);
          break;
        case "ArrowLeft":
          event.preventDefault();
          const currentIndex = tabsToRender.findIndex(
            (tab) => tab.key === tabKey
          );
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : tabsToRender.length - 1;
          setFocusedTab(tabsToRender[prevIndex].key);
          break;
        case "ArrowRight":
          event.preventDefault();
          const currentIdx = tabsToRender.findIndex(
            (tab) => tab.key === tabKey
          );
          const nextIndex =
            currentIdx < tabsToRender.length - 1 ? currentIdx + 1 : 0;
          setFocusedTab(tabsToRender[nextIndex].key);
          break;
        case "Home":
          event.preventDefault();
          setFocusedTab(tabsToRender[0].key);
          break;
        case "End":
          event.preventDefault();
          setFocusedTab(tabsToRender[tabsToRender.length - 1].key);
          break;
        default:
          break;
      }
    },
    [tabsToRender, handleTabClick]
  );

  // Loading state
  if (loading) {
    return (
      <div className={`mb-4 ${className}`} data-testid={testId}>
        <div className="d-flex align-items-center">
          <Spinner animation="border" size="sm" className="me-2" />
          <span className="text-muted">Loading navigation...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`mb-4 ${className}`} data-testid={testId}>
        <Alert variant="danger" className="mb-0">
          <ExclamationTriangleIcon
            className="h-4 w-4 me-2"
            aria-hidden="true"
          />
          Navigation error: {error}
        </Alert>
      </div>
    );
  }

  return (
    <nav
      className={`mb-4 ${className}`}
      role="tablist"
      aria-label={ariaLabel || "Analytics sections"}
      data-testid={testId}
    >
      <Nav variant="tabs" className="flex-wrap">
        {tabsToRender.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.key;
          const isFocused = focusedTab === tab.key;
          const count = tabCounts[tab.key];

          return (
            <Nav.Item key={tab.key}>
              <Nav.Link
                active={isActive}
                onClick={(e) => handleTabClick(tab.key, e)}
                onKeyDown={(e) => handleKeyDown(e, tab.key)}
                onFocus={() => setFocusedTab(tab.key)}
                onBlur={() => setFocusedTab(null)}
                href={`#${tab.key}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.key}-panel`}
                aria-describedby={`${tab.key}-desc`}
                tabIndex={isActive ? 0 : -1}
                className={`d-flex align-items-center ${
                  isFocused ? "focus-visible" : ""
                }`}
                style={{
                  cursor: "pointer",
                  outline: isFocused ? "2px solid var(--bs-primary)" : "none",
                  outlineOffset: "2px",
                }}
              >
                {IconComponent && (
                  <IconComponent className="h-4 w-4 me-2" aria-hidden="true" />
                )}
                <span>{tab.label}</span>
                {showBadges && count !== undefined && (
                  <Badge
                    bg={tab.color || "primary"}
                    className="ms-2"
                    aria-label={`${count} items`}
                  >
                    {count}
                  </Badge>
                )}
              </Nav.Link>

              {/* Hidden description for screen readers */}
              <span id={`${tab.key}-desc`} className="visually-hidden">
                {tab.description}
              </span>
            </Nav.Item>
          );
        })}
      </Nav>
    </nav>
  );
};

export default AnalyticsNavigation;
