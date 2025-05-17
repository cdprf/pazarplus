/* eslint-disable no-unused-vars */
// Settings.jsx - Part 1: Imports and State Setup

import React, { useState, useContext, useEffect, useCallback } from "react";
import {
  Card,
  Form,
  Button,
  Tab,
  Nav,
  Row,
  Col,
  Spinner,
  Alert,
  ListGroup,
  Badge,
  Toast,
  ToastContainer,
  Modal,
} from "react-bootstrap";
import {
  FaUser,
  FaLock,
  FaCog,
  FaTruck,
  FaFileInvoiceDollar,
  FaBell,
  FaCheck,
  FaExclamationTriangle,
  FaSave,
  FaTrash,
  FaSync,
  FaPaperPlane,
  FaGlobe,
  FaCalendarAlt,
  FaDollarSign,
  FaLanguage,
  FaInfo,
} from "react-icons/fa";
import axios from "axios";
import { AlertContext } from "../context/AlertContext";
import { AuthContext } from "../context/AuthContext";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [testEmailSent, setTestEmailSent] = useState(false);

  const { success, error } = useContext(AlertContext);
  const { user, updateProfile, changePassword } = useContext(AuthContext);

  // Profile settings
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
  });

  // Password settings
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    defaultCurrency: "USD",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    language: "en",
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderConfirmations: true,
    shipmentUpdates: true,
    statusChanges: true,
    dailySummary: false,
    marketingEmails: false,
  });

  // Shipping settings
  const [shippingSettings, setShippingSettings] = useState({
    defaultCarrier: "",
    returnAddress: {
      name: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
    },
    labelSize: "letter",
    carriers: [],
  });
  // Settings.jsx - Part 2: Effects and Helper Functions

  // Load user data
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch general settings
      const generalRes = await axios.get("/settings/general");

      // Fetch notification settings
      const notificationRes = await axios.get("/settings/notifications");

      // Fetch shipping settings and carriers
      const shippingRes = await axios.get("/settings/shipping");
      const carriersRes = await axios.get("/shipping/carriers");

      if (generalRes.data.success) {
        setGeneralSettings(generalRes.data.data);
      }

      if (notificationRes.data.success) {
        setNotificationSettings(notificationRes.data.data);
      }

      if (shippingRes.data.success) {
        setShippingSettings({
          ...shippingRes.data.data,
          carriers: carriersRes.data.success ? carriersRes.data.data : [],
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      error("Failed to load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [error]); // Include error as a dependency because it's used inside the function

  // Load user data AFTER defining fetchSettings
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        company: user.company || "",
        jobTitle: user.jobTitle || "",
      });
    }

    // Fetch other settings
    fetchSettings();
  }, [user, fetchSettings]);

  // Handle profile form change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;

    setProfileData({
      ...profileData,
      [name]: value,
    });
  };

  // Handle password form change
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  // Handle general settings change
  const handleGeneralSettingChange = (e) => {
    const { name, value } = e.target;

    setGeneralSettings({
      ...generalSettings,
      [name]: value,
    });
  };

  // Handle notification settings change
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;

    setNotificationSettings({
      ...notificationSettings,
      [name]: checked,
    });
  };

  // Handle shipping settings change
  const handleShippingChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("returnAddress.")) {
      const addressField = name.split(".")[1];

      setShippingSettings({
        ...shippingSettings,
        returnAddress: {
          ...shippingSettings.returnAddress,
          [addressField]: value,
        },
      });
    } else {
      setShippingSettings({
        ...shippingSettings,
        [name]: value,
      });
    }
  };
  // Settings.jsx - Part 3: Save and Action Functions

  // Save profile
  const saveProfile = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const result = await updateProfile(profileData);

      if (result) {
        success("Profile updated successfully");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save password
  const savePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error("New passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const result = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result) {
        success("Password changed successfully");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (err) {
      console.error("Error changing password:", err);
      error("Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save general settings
  const saveGeneralSettings = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await axios.post("/settings/general", generalSettings);

      if (response.data.success) {
        success("General settings saved successfully");
      } else {
        error(response.data.message || "Failed to save general settings");
      }
    } catch (err) {
      console.error("Error saving general settings:", err);
      error("Failed to save general settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save notification settings
  const saveNotificationSettings = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await axios.post(
        "/settings/notifications",
        notificationSettings
      );

      if (response.data.success) {
        success("Notification settings saved successfully");
      } else {
        error(response.data.message || "Failed to save notification settings");
      }
    } catch (err) {
      console.error("Error saving notification settings:", err);
      error("Failed to save notification settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save shipping settings
  const saveShippingSettings = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await axios.post("/settings/shipping", shippingSettings);

      if (response.data.success) {
        success("Shipping settings saved successfully");
      } else {
        error(response.data.message || "Failed to save shipping settings");
      }
    } catch (err) {
      console.error("Error saving shipping settings:", err);
      error("Failed to save shipping settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    try {
      setLoading(true);

      const response = await axios.post("/settings/test-email");

      if (response.data.success) {
        setTestEmailSent(true);
        setTimeout(() => setTestEmailSent(false), 5000);
      } else {
        error(response.data.message || "Failed to send test email");
      }
    } catch (err) {
      console.error("Error sending test email:", err);
      error("Failed to send test email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Open confirm modal
  const openConfirmModal = (type) => {
    setModalType(type);
    setShowConfirmModal(true);
  };

  // Handle confirm action
  const handleConfirmAction = async () => {
    try {
      setLoading(true);

      if (modalType === "delete-account") {
        // Delete account logic
        const response = await axios.delete("/auth/account");

        if (response.data.success) {
          success("Account deleted successfully");
          // Redirect to login page or logout
          window.location.href = "/login";
        } else {
          error(response.data.message || "Failed to delete account");
        }
      } else if (modalType === "reset-settings") {
        // Reset settings logic
        const response = await axios.post("/settings/reset");

        if (response.data.success) {
          success("Settings reset successfully");
          fetchSettings(); // Refresh settings
        } else {
          error(response.data.message || "Failed to reset settings");
        }
      }
    } catch (err) {
      console.error("Error:", err);
      error("Operation failed. Please try again.");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };
  // Settings.jsx - Part 4: Main Render (Beginning)

  return (
    <div className="settings-page">
      <h2 className="mb-4">Settings</h2>

      <Tab.Container
        id="settings-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
      >
        <Row>
          <Col lg={3}>
            <Card className="shadow-sm mb-4">
              <Card.Body className="p-0">
                <Nav variant="pills" className="flex-column">
                  <Nav.Item>
                    <Nav.Link eventKey="profile" className="rounded-0">
                      <FaUser className="me-2" />
                      Profile
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="password" className="rounded-0">
                      <FaLock className="me-2" />
                      Password
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="general" className="rounded-0">
                      <FaCog className="me-2" />
                      General
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="notifications" className="rounded-0">
                      <FaBell className="me-2" />
                      Notifications
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="shipping" className="rounded-0">
                      <FaTruck className="me-2" />
                      Shipping
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Body>
            </Card>

            <Card className="shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Danger Zone</h6>
                <div className="d-grid gap-2">
                  <Button
                    variant="outline-warning"
                    onClick={() => openConfirmModal("reset-settings")}
                  >
                    <FaSync className="me-2" />
                    Reset All Settings
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={() => openConfirmModal("delete-account")}
                  >
                    <FaTrash className="me-2" />
                    Delete Account
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={9}>
            <Card className="shadow-sm">
              <Card.Body>
                <Tab.Content>
                  {/* Profile Tab */}
                  <Tab.Pane eventKey="profile">
                    <h4 className="mb-4">Profile Settings</h4>

                    <Form onSubmit={saveProfile}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control
                              type="text"
                              name="fullName"
                              value={profileData.fullName}
                              onChange={handleProfileChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              value={profileData.email}
                              onChange={handleProfileChange}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              value={profileData.phone}
                              onChange={handleProfileChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Company</Form.Label>
                            <Form.Control
                              type="text"
                              name="company"
                              value={profileData.company}
                              onChange={handleProfileChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-4">
                        <Form.Label>Job Title</Form.Label>
                        <Form.Control
                          type="text"
                          name="jobTitle"
                          value={profileData.jobTitle}
                          onChange={handleProfileChange}
                        />
                      </Form.Group>

                      <div className="d-flex justify-content-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <FaSave className="me-2" />
                              Save Profile
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab.Pane>

                  {/* Password Tab */}
                  <Tab.Pane eventKey="password">
                    <h4 className="mb-4">Change Password</h4>

                    <Form onSubmit={savePassword}>
                      <Form.Group className="mb-3">
                        <Form.Label>Current Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                          minLength={6}
                        />
                        <Form.Text className="text-muted">
                          Password must be at least 6 characters long.
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label>Confirm New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                          minLength={6}
                        />
                      </Form.Group>

                      <div className="d-flex justify-content-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <FaSave className="me-2" />
                              Change Password
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab.Pane>

                  {/* General Settings Tab */}
                  <Tab.Pane eventKey="general">
                    <h4 className="mb-4">General Settings</h4>

                    <Form onSubmit={saveGeneralSettings}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              <FaGlobe className="me-2" />
                              Default Language
                            </Form.Label>
                            <Form.Select
                              name="language"
                              value={generalSettings.language}
                              onChange={handleGeneralSettingChange}
                            >
                              <option value="en">English</option>
                              <option value="tr">Turkish</option>
                              <option value="de">German</option>
                              <option value="fr">French</option>
                              <option value="es">Spanish</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              <FaDollarSign className="me-2" />
                              Default Currency
                            </Form.Label>
                            <Form.Select
                              name="defaultCurrency"
                              value={generalSettings.defaultCurrency}
                              onChange={handleGeneralSettingChange}
                            >
                              <option value="USD">US Dollar (USD)</option>
                              <option value="EUR">Euro (EUR)</option>
                              <option value="GBP">British Pound (GBP)</option>
                              <option value="TRY">Turkish Lira (TRY)</option>
                              <option value="JPY">Japanese Yen (JPY)</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              <FaCalendarAlt className="me-2" />
                              Date Format
                            </Form.Label>
                            <Form.Select
                              name="dateFormat"
                              value={generalSettings.dateFormat}
                              onChange={handleGeneralSettingChange}
                            >
                              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              <FaGlobe className="me-2" />
                              Timezone
                            </Form.Label>
                            <Form.Select
                              name="timezone"
                              value={generalSettings.timezone}
                              onChange={handleGeneralSettingChange}
                            >
                              <option value="UTC">UTC</option>
                              <option value="Europe/Istanbul">
                                Europe/Istanbul
                              </option>
                              <option value="Europe/London">
                                Europe/London
                              </option>
                              <option value="America/New_York">
                                America/New_York
                              </option>
                              <option value="Asia/Tokyo">Asia/Tokyo</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      <div className="d-flex justify-content-end mt-3">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <FaSave className="me-2" />
                              Save Settings
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab.Pane>

                  {/* Notifications Tab */}
                  <Tab.Pane eventKey="notifications">
                    <h4 className="mb-4">Notification Settings</h4>

                    <Form onSubmit={saveNotificationSettings}>
                      <div className="mb-4">
                        <Form.Check
                          type="switch"
                          id="emailNotifications"
                          name="emailNotifications"
                          label="Enable Email Notifications"
                          checked={notificationSettings.emailNotifications}
                          onChange={handleNotificationChange}
                          className="mb-3"
                        />

                        <Alert variant="info" className="mb-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <span>
                              <FaInfo className="me-2" />
                              Test your email configuration by sending a test
                              email.
                            </span>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={sendTestEmail}
                              disabled={
                                loading ||
                                !notificationSettings.emailNotifications
                              }
                            >
                              <FaPaperPlane className="me-2" />
                              Send Test Email
                            </Button>
                          </div>
                        </Alert>

                        {testEmailSent && (
                          <Alert variant="success" className="mb-3">
                            <FaCheck className="me-2" />
                            Test email sent successfully! Please check your
                            inbox.
                          </Alert>
                        )}
                      </div>

                      <h5 className="mb-3">Email Notification Types</h5>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="orderConfirmations"
                          name="orderConfirmations"
                          label="Order Confirmations"
                          checked={notificationSettings.orderConfirmations}
                          onChange={handleNotificationChange}
                          disabled={!notificationSettings.emailNotifications}
                        />
                        <Form.Text className="text-muted">
                          Receive email notifications when new orders are
                          received.
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="shipmentUpdates"
                          name="shipmentUpdates"
                          label="Shipment Updates"
                          checked={notificationSettings.shipmentUpdates}
                          onChange={handleNotificationChange}
                          disabled={!notificationSettings.emailNotifications}
                        />
                        <Form.Text className="text-muted">
                          Receive email notifications when orders are shipped.
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="statusChanges"
                          name="statusChanges"
                          label="Status Changes"
                          checked={notificationSettings.statusChanges}
                          onChange={handleNotificationChange}
                          disabled={!notificationSettings.emailNotifications}
                        />
                        <Form.Text className="text-muted">
                          Receive email notifications when order statuses
                          change.
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Check
                          type="checkbox"
                          id="dailySummary"
                          name="dailySummary"
                          label="Daily Summary"
                          checked={notificationSettings.dailySummary}
                          onChange={handleNotificationChange}
                          disabled={!notificationSettings.emailNotifications}
                        />
                        <Form.Text className="text-muted">
                          Receive a daily summary of orders and activities.
                        </Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Check
                          type="checkbox"
                          id="marketingEmails"
                          name="marketingEmails"
                          label="Marketing Emails"
                          checked={notificationSettings.marketingEmails}
                          onChange={handleNotificationChange}
                          disabled={!notificationSettings.emailNotifications}
                        />
                        <Form.Text className="text-muted">
                          Receive marketing emails about new features and
                          updates.
                        </Form.Text>
                      </Form.Group>

                      <div className="d-flex justify-content-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <FaSave className="me-2" />
                              Save Notification Settings
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab.Pane>

                  {/* Shipping Tab */}
                  <Tab.Pane eventKey="shipping">
                    <h4 className="mb-4">Shipping Settings</h4>

                    <Form onSubmit={saveShippingSettings}>
                      <Form.Group className="mb-4">
                        <Form.Label>Default Shipping Carrier</Form.Label>
                        <Form.Select
                          name="defaultCarrier"
                          value={shippingSettings.defaultCarrier}
                          onChange={handleShippingChange}
                        >
                          <option value="">Select Default Carrier</option>
                          {shippingSettings.carriers.map((carrier) => (
                            <option key={carrier.id} value={carrier.id}>
                              {carrier.name}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          This carrier will be pre-selected when creating
                          shipping labels.
                        </Form.Text>
                      </Form.Group>

                      <h5 className="mb-3">Return Address</h5>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Name / Company</Form.Label>
                            <Form.Control
                              type="text"
                              name="returnAddress.name"
                              value={shippingSettings.returnAddress.name}
                              onChange={handleShippingChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Address Line 1</Form.Label>
                            <Form.Control
                              type="text"
                              name="returnAddress.line1"
                              value={shippingSettings.returnAddress.line1}
                              onChange={handleShippingChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label>Address Line 2</Form.Label>
                        <Form.Control
                          type="text"
                          name="returnAddress.line2"
                          value={shippingSettings.returnAddress.line2}
                          onChange={handleShippingChange}
                        />
                      </Form.Group>

                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>City</Form.Label>
                            <Form.Control
                              type="text"
                              name="returnAddress.city"
                              value={shippingSettings.returnAddress.city}
                              onChange={handleShippingChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Region / State</Form.Label>
                            <Form.Control
                              type="text"
                              name="returnAddress.region"
                              value={shippingSettings.returnAddress.region}
                              onChange={handleShippingChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Postal Code</Form.Label>
                            <Form.Control
                              type="text"
                              name="returnAddress.postalCode"
                              value={shippingSettings.returnAddress.postalCode}
                              onChange={handleShippingChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-4">
                        <Form.Label>Country</Form.Label>
                        <Form.Select
                          name="returnAddress.country"
                          value={shippingSettings.returnAddress.country}
                          onChange={handleShippingChange}
                        >
                          <option value="">Select Country</option>
                          <option value="TR">Turkey</option>
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label>Label Size</Form.Label>
                        <Form.Select
                          name="labelSize"
                          value={shippingSettings.labelSize}
                          onChange={handleShippingChange}
                        >
                          <option value="letter">Letter (8.5" x 11")</option>
                          <option value="a4">A4 (210mm x 297mm)</option>
                          <option value="4x6">4" x 6" Label</option>
                          <option value="thermal">Thermal Printer</option>
                        </Form.Select>
                        <Form.Text className="text-muted">
                          Select the default size for printing shipping labels.
                        </Form.Text>
                      </Form.Group>

                      <div className="d-flex justify-content-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <FaSave className="me-2" />
                              Save Shipping Settings
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Tab.Pane>
                </Tab.Content>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Tab.Container>

      {/* Confirmation Modal */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalType === "delete-account"
              ? "Delete Account"
              : "Reset Settings"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalType === "delete-account" ? (
            <>
              <p>
                Are you sure you want to delete your account? This action cannot
                be undone.
              </p>
              <Alert variant="danger">
                <FaExclamationTriangle className="me-2" />
                All your data, including order history and settings, will be
                permanently deleted.
              </Alert>
            </>
          ) : (
            <>
              <p>
                Are you sure you want to reset all settings to their default
                values?
              </p>
              <Alert variant="warning">
                <FaExclamationTriangle className="me-2" />
                Your profile information will remain, but all other settings
                will be reset.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant={modalType === "delete-account" ? "danger" : "warning"}
            onClick={handleConfirmAction}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              <>
                {modalType === "delete-account" ? (
                  <>
                    <FaTrash className="me-2" />
                    Delete Account
                  </>
                ) : (
                  <>
                    <FaSync className="me-2" />
                    Reset Settings
                  </>
                )}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Test Email Toast */}
      <ToastContainer position="bottom-end" className="p-3">
        <Toast
          show={testEmailSent}
          onClose={() => setTestEmailSent(false)}
          delay={5000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Email Sent</strong>
          </Toast.Header>
          <Toast.Body>
            Test email has been sent to {profileData.email}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default Settings;
