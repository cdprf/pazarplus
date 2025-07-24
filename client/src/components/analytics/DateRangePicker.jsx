import logger from "../../utils/logger";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Form, Button, Dropdown, Alert, Spinner, Modal } from "react-bootstrap";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

const DateRangePicker = ({
  startDate,
  endDate,
  onDateRangeChange,
  onApply,
  disabled = false,
  loading = false,
  error = null,
  className = "",
  "aria-label": ariaLabel,
  testId,
  showPresets = true,
  showCustomRange = true,
  maxRange = 365, // days
  minDate = null,
  maxDate = null,
  format = "YYYY-MM-DD",
  quickRanges = [],
  onError,
  showApplyButton = true,
  autoApply = false,
}) => {
  const [tempStartDate, setTempStartDate] = useState(startDate || "");
  const [tempEndDate, setTempEndDate] = useState(endDate || "");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Default quick ranges
  const defaultQuickRanges = useMemo(
    () => [
      {
        label: "Today",
        key: "today",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        icon: "📅",
      },
      {
        label: "Yesterday",
        key: "yesterday",
        startDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        endDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        icon: "📆",
      },
      {
        label: "Last 7 days",
        key: "last7days",
        startDate: new Date(Date.now() - 7 * 86400000)
          .toISOString()
          .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        icon: "📊",
      },
      {
        label: "Last 30 days",
        key: "last30days",
        startDate: new Date(Date.now() - 30 * 86400000)
          .toISOString()
          .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        icon: "📈",
      },
      {
        label: "This month",
        key: "thismonth",
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        icon: "🗓️",
      },
      {
        label: "Last month",
        key: "lastmonth",
        startDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 1,
          1
        )
          .toISOString()
          .split("T")[0],
        endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
          .toISOString()
          .split("T")[0],
        icon: "📅",
      },
      {
        label: "Last 90 days",
        key: "last90days",
        startDate: new Date(Date.now() - 90 * 86400000)
          .toISOString()
          .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        icon: "📊",
      },
      {
        label: "This year",
        key: "thisyear",
        startDate: new Date(new Date().getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        icon: "🗓️",
      },
    ],
    []
  );

  const rangesToUse = quickRanges.length > 0 ? quickRanges : defaultQuickRanges;

  // Validation function
  const validateDateRange = useCallback(
    (start, end) => {
      if (!start || !end) {
        return "Both start and end dates are required";
      }

      const startDateObj = new Date(start);
      const endDateObj = new Date(end);

      if (startDateObj > endDateObj) {
        return "Start date cannot be after end date";
      }

      if (minDate && startDateObj < new Date(minDate)) {
        return `Start date cannot be before ${minDate}`;
      }

      if (maxDate && endDateObj > new Date(maxDate)) {
        return `End date cannot be after ${maxDate}`;
      }

      const daysDiff = Math.ceil(
        (endDateObj - startDateObj) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > maxRange) {
        return `Date range cannot exceed ${maxRange} days`;
      }

      return null;
    },
    [minDate, maxDate, maxRange]
  );

  // Update temp dates when props change
  useEffect(() => {
    setTempStartDate(startDate || "");
    setTempEndDate(endDate || "");
  }, [startDate, endDate]);

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (preset) => {
      try {
        setSelectedPreset(preset.key);
        setValidationError(null);

        const validation = validateDateRange(preset.startDate, preset.endDate);
        if (validation) {
          setValidationError(validation);
          onError?.(new Error(validation));
          return;
        }

        if (autoApply) {
          onDateRangeChange?.(preset.startDate, preset.endDate);
          onApply?.(preset.startDate, preset.endDate);
        } else {
          setTempStartDate(preset.startDate);
          setTempEndDate(preset.endDate);
        }
      } catch (err) {
        logger.error("Date preset selection error:", err);
        onError?.(err);
      }
    },
    [validateDateRange, autoApply, onDateRangeChange, onApply, onError]
  );

  // Handle custom date changes
  const handleDateChange = useCallback(
    (type, value) => {
      try {
        setValidationError(null);

        if (type === "start") {
          setTempStartDate(value);
          if (autoApply && tempEndDate) {
            const validation = validateDateRange(value, tempEndDate);
            if (!validation) {
              onDateRangeChange?.(value, tempEndDate);
              onApply?.(value, tempEndDate);
            }
          }
        } else {
          setTempEndDate(value);
          if (autoApply && tempStartDate) {
            const validation = validateDateRange(tempStartDate, value);
            if (!validation) {
              onDateRangeChange?.(tempStartDate, value);
              onApply?.(tempStartDate, value);
            }
          }
        }
      } catch (err) {
        logger.error("Date change error:", err);
        onError?.(err);
      }
    },
    [
      tempStartDate,
      tempEndDate,
      validateDateRange,
      autoApply,
      onDateRangeChange,
      onApply,
      onError,
    ]
  );

  // Handle apply button
  const handleApply = useCallback(() => {
    try {
      const validation = validateDateRange(tempStartDate, tempEndDate);
      if (validation) {
        setValidationError(validation);
        onError?.(new Error(validation));
        return;
      }

      setValidationError(null);
      onDateRangeChange?.(tempStartDate, tempEndDate);
      onApply?.(tempStartDate, tempEndDate);
      setShowCustomModal(false);
    } catch (err) {
      logger.error("Apply date range error:", err);
      onError?.(err);
    }
  }, [
    tempStartDate,
    tempEndDate,
    validateDateRange,
    onDateRangeChange,
    onApply,
    onError,
  ]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        setShowCustomModal(false);
        setValidationError(null);
      } else if (event.key === "Enter" && showApplyButton) {
        handleApply();
      }
    },
    [showApplyButton, handleApply]
  );

  // Format display text
  const getDisplayText = useCallback(() => {
    if (selectedPreset) {
      const preset = rangesToUse.find((r) => r.key === selectedPreset);
      return preset ? `${preset.icon} ${preset.label}` : "Select Date Range";
    }

    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    }

    return "Select Date Range";
  }, [selectedPreset, rangesToUse, startDate, endDate]);

  // Loading state
  if (loading) {
    return (
      <div
        className={`d-flex align-items-center ${className}`}
        data-testid={testId}
      >
        <Spinner animation="border" size="sm" className="me-2" />
        <span className="text-muted">Loading date options...</span>
      </div>
    );
  }

  return (
    <div className={className} data-testid={testId} onKeyDown={handleKeyDown}>
      {/* Error Alert */}
      {(error || validationError) && (
        <Alert
          variant="danger"
          className="mb-2"
          dismissible
          onClose={() => setValidationError(null)}
        >
          <ExclamationTriangleIcon
            className="h-4 w-4 me-2"
            aria-hidden="true"
          />
          {error || validationError}
        </Alert>
      )}

      {/* Main Date Range Selector */}
      <Dropdown>
        <Dropdown.Toggle
          variant="outline-primary"
          disabled={disabled}
          aria-label={ariaLabel || "Select date range"}
          className="d-flex align-items-center"
        >
          <CalendarDaysIcon className="h-4 w-4 me-2" aria-hidden="true" />
          {getDisplayText()}
          <ChevronDownIcon className="h-3 w-3 ms-2" aria-hidden="true" />
        </Dropdown.Toggle>

        <Dropdown.Menu>
          {/* Quick Range Options */}
          {showPresets && (
            <>
              <Dropdown.Header>Quick Ranges</Dropdown.Header>
              {rangesToUse.map((range) => (
                <Dropdown.Item
                  key={range.key}
                  onClick={() => handlePresetSelect(range)}
                  className={selectedPreset === range.key ? "active" : ""}
                  aria-label={`Select ${range.label} date range`}
                >
                  <div className="d-flex align-items-center">
                    <span className="me-2">{range.icon}</span>
                    <span className="flex-grow-1">{range.label}</span>
                    {selectedPreset === range.key && (
                      <CheckIcon
                        className="h-4 w-4 text-success"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </Dropdown.Item>
              ))}
              {showCustomRange && <Dropdown.Divider />}
            </>
          )}

          {/* Custom Range Option */}
          {showCustomRange && (
            <Dropdown.Item
              onClick={() => setShowCustomModal(true)}
              aria-label="Select custom date range"
            >
              <div className="d-flex align-items-center">
                <span className="me-2">🎯</span>
                <span>Custom Range</span>
              </div>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Custom Date Range Modal */}
      <Modal
        show={showCustomModal}
        onHide={() => setShowCustomModal(false)}
        centered
        aria-labelledby="custom-date-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="custom-date-modal-title">
            <CalendarDaysIcon className="h-5 w-5 me-2" aria-hidden="true" />
            Select Custom Date Range
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="start-date">Start Date</Form.Label>
                  <Form.Control
                    id="start-date"
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => handleDateChange("start", e.target.value)}
                    min={minDate}
                    max={maxDate}
                    aria-describedby="start-date-help"
                  />
                  <Form.Text id="start-date-help" className="text-muted">
                    Select the start date for your range
                  </Form.Text>
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label htmlFor="end-date">End Date</Form.Label>
                  <Form.Control
                    id="end-date"
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => handleDateChange("end", e.target.value)}
                    min={minDate}
                    max={maxDate}
                    aria-describedby="end-date-help"
                  />
                  <Form.Text id="end-date-help" className="text-muted">
                    Select the end date for your range
                  </Form.Text>
                </Form.Group>
              </div>
            </div>

            {validationError && (
              <Alert variant="warning" className="mb-3">
                <ExclamationTriangleIcon
                  className="h-4 w-4 me-2"
                  aria-hidden="true"
                />
                {validationError}
              </Alert>
            )}
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowCustomModal(false)}
            aria-label="Cancel date selection"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            disabled={
              !tempStartDate || !tempEndDate || Boolean(validationError)
            }
            aria-label="Apply selected date range"
          >
            <CheckIcon className="h-4 w-4 me-2" aria-hidden="true" />
            Apply Range
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DateRangePicker;
