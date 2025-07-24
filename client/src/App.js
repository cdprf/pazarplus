import logger from "./utils/logger";
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { AlertProvider } from "./contexts/AlertContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ErrorProvider } from "./contexts/ErrorContext";
import { DeveloperSettingsProvider } from "./contexts/DeveloperSettingsContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastManager from "./components/common/ToastManager";

// Initialize i18n
import "./i18n";

// Import CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
// import "./debug-modal.css"; // Temporary debug CSS - removed

// Import network initialization for PDF printing
// Network initialization (temporarily disabled)
// import { initializeNetworkForPDF } from "./services/networkInitialization";

// Import components
import Layout from "./components/layout/Layout.jsx";
import PrivateRoute from "./components/auth/PrivateRoute";
import PublicRoute from "./components/auth/PublicRoute";

// Import pages and components (consolidated)
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import Dashboard from "./components/dashboard/Dashboard";
import Orders from "./pages/Orders"; // Consolidated order management
import OrderDetail from "./components/orders/OrderDetail";
import ProductDetail from "./components/products/ProductDetail"; // Product detail page
import ProductManagement from "./components/ProductManagement/index.js"; // Modernized product management
import AdvancedProductManagement from "./components/ProductManagement/components/ProductManagement"; // Advanced product management system
import VariantDetectionConfigurationPage from "./components/ProductManagement/VariantDetectionConfig/VariantDetectionConfigurationPage"; // Variant detection configuration
import CustomerManagement from "./components/customers/CustomerManagement";
import CustomerProfile from "./components/customers/CustomerProfile";
import ShippingManagement from "./components/shipping/ShippingManagement";
import ShippingSlipDesigner from "./components/shipping/ShippingSlipDesigner";
import ImportExport from "./components/common/ImportExport";
import PlatformConnections from "./components/platforms/PlatformConnections";
import PlatformSettings from "./components/platforms/PlatformSettings";
import PlatformAnalytics from "./components/platforms/PlatformAnalytics";
import PlatformSyncHistory from "./components/platforms/PlatformSyncHistory";
import ProductLinkingDashboard from "./pages/admin/ProductLinkingDashboard";
import Analytics from "./pages/Analytics"; // Analytics dashboard
import Notifications from "./pages/Notifications"; // Notifications page
import PlatformOperations from "./pages/PlatformOperations"; // Platform Operations
import TaskDetails from "./pages/TaskDetails"; // Task Details page
import CustomerQuestions from "./components/CustomerQuestions"; // Customer Questions Management
import Settings from "./components/settings/Settings";
import Profile from "./components/profile/Profile"; // User Profile page
import PrintSettings from "./components/settings/PrintSettings";
import DatabaseBusyModal from "./components/DatabaseBusyModal"; // Database transaction management modal
import PlatformCategoriesManagement from "./components/PlatformCategoriesManagement.jsx";
import ErrorPage from "./pages/ErrorPage"; // Error page component
import BackgroundTaskManager from "./components/tasks/BackgroundTaskManager"; // Background task management
import DeveloperPage from "./pages/DeveloperPage"; // Developer tools page

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  // Initialize network configuration for PDF printing on app start
  useEffect(() => {
    // Temporarily disabled to prevent network scanning interference
    // initializeNetworkForPDF();
    logger.info("🔧 Network discovery disabled - using proxy configuration");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <ErrorProvider>
            <AuthProvider>
              <AlertProvider>
                <ThemeProvider>
                  <LanguageProvider>
                    <NotificationProvider>
                      <DeveloperSettingsProvider>
                        <div className="App">
                          {/* Global Toast Manager */}
                          <ToastManager />

                          {/* Database transaction management modal - globally available */}
                          <DatabaseBusyModal />

                          <Routes>
                            {/* Public routes */}
                            <Route
                              path="/login"
                              element={
                                <PublicRoute>
                                  <Login />
                                </PublicRoute>
                              }
                            />
                            <Route
                              path="/register"
                              element={
                                <PublicRoute>
                                  <Register />
                                </PublicRoute>
                              }
                            />
                            <Route
                              path="/forgot-password"
                              element={
                                <PublicRoute>
                                  <ForgotPassword />
                                </PublicRoute>
                              }
                            />
                            <Route
                              path="/reset-password"
                              element={
                                <PublicRoute>
                                  <ResetPassword />
                                </PublicRoute>
                              }
                            />
                            {/* Private routes - consolidated and organized */}
                            <Route
                              path="/"
                              element={
                                <PrivateRoute>
                                  <Layout />
                                </PrivateRoute>
                              }
                            >
                              {/* Dashboard routes */}
                              <Route index element={<Dashboard />} />
                              <Route path="dashboard" element={<Dashboard />} />

                              {/* Orders - enhanced with sub-routes */}
                              <Route path="orders" element={<Orders />} />
                              <Route
                                path="orders/:id"
                                element={<OrderDetail />}
                              />
                              <Route path="orders/new" element={<Orders />} />
                              <Route
                                path="orders/completed"
                                element={<Orders />}
                              />

                              {/* Product Detail */}
                              <Route
                                path="products/:id"
                                element={<ProductDetail />}
                              />

                              {/* Analytics */}
                              <Route path="analytics" element={<Analytics />} />

                              {/* Notifications */}
                              <Route
                                path="notifications"
                                element={<Notifications />}
                              />

                              {/* ============================================ */}
                              {/* === LEGACY PRODUCT MANAGEMENT (OLD) === */}
                              {/* ============================================ */}
                              <Route
                                path="products"
                                element={<ProductManagement />}
                              />
                              {/* Base products route using legacy system */}
                              <Route
                                path="products/base"
                                element={<ProductManagement />}
                              />

                              {/* ============================================ */}
                              {/* === NEW ENHANCED PRODUCT MANAGEMENT === */}
                              {/* ============================================ */}
                              {/* Access the NEW advanced system at /products/enhanced */}
                              <Route
                                path="products/enhanced"
                                element={<AdvancedProductManagement />}
                              />
                              <Route
                                path="products/enhanced/:id"
                                element={<AdvancedProductManagement />}
                              />
                              {/* ============================================ */}
                              <Route
                                path="products/:id/edit"
                                element={<ProductManagement />}
                              />
                              <Route
                                path="products/categories"
                                element={<PlatformCategoriesManagement />}
                              />
                              <Route
                                path="products/pricing"
                                element={<ProductManagement />}
                              />
                              {/* Variant Detection Configuration */}
                              <Route
                                path="products/variant-detection"
                                element={<VariantDetectionConfigurationPage />}
                              />

                              {/* Customer Management */}
                              <Route
                                path="customers"
                                element={<CustomerManagement />}
                              />
                              <Route
                                path="customers/:email"
                                element={<CustomerProfile />}
                              />
                              <Route
                                path="customers/profiles"
                                element={<CustomerManagement />}
                              />
                              <Route
                                path="customers/analytics"
                                element={<CustomerManagement />}
                              />
                              <Route
                                path="customers/orders"
                                element={<CustomerManagement />}
                              />
                              <Route
                                path="customers/segments"
                                element={<CustomerManagement />}
                              />
                              {/* Customer Questions Management */}
                              <Route
                                path="customer-questions"
                                element={<CustomerQuestions />}
                              />

                              {/* Shipping Management - with sub-routes */}
                              <Route
                                path="shipping"
                                element={<ShippingManagement />}
                              />
                              <Route
                                path="shipping/create"
                                element={<ShippingManagement />}
                              />
                              <Route
                                path="shipping/tracking"
                                element={<ShippingManagement />}
                              />
                              <Route
                                path="shipping/carriers"
                                element={<ShippingManagement />}
                              />
                              <Route
                                path="shipping/rates"
                                element={<ShippingManagement />}
                              />
                              <Route
                                path="shipping/slip-designer"
                                element={<ShippingSlipDesigner />}
                              />

                              {/* Platform Management - enhanced */}
                              <Route
                                path="platforms"
                                element={<PlatformConnections />}
                              />
                              <Route
                                path="platforms/trendyol"
                                element={<PlatformConnections />}
                              />
                              <Route
                                path="platforms/hepsiburada"
                                element={<PlatformConnections />}
                              />
                              <Route
                                path="platforms/n11"
                                element={<PlatformConnections />}
                              />
                              <Route
                                path="platforms/gittigidiyor"
                                element={<PlatformConnections />}
                              />
                              <Route
                                path="platforms/:platformId/settings"
                                element={<PlatformSettings />}
                              />
                              <Route
                                path="platforms/:platformId/analytics"
                                element={<PlatformAnalytics />}
                              />
                              <Route
                                path="platforms/:platformId/sync-history"
                                element={<PlatformSyncHistory />}
                              />

                              {/* Platform Operations */}
                              <Route
                                path="platform-operations"
                                element={<PlatformOperations />}
                              />
                              <Route
                                path="platform-operations/tasks/:taskId"
                                element={<TaskDetails />}
                              />

                              {/* Product-Order Linking Management */}
                              <Route
                                path="admin/product-linking"
                                element={<ProductLinkingDashboard />}
                              />
                              {/* Background Task Management */}
                              <Route
                                path="admin/background-tasks"
                                element={<BackgroundTaskManager />}
                              />

                              {/* Payment Management */}
                              <Route
                                path="payments"
                                element={<CustomerManagement />}
                              />

                              {/* Compliance */}
                              <Route path="compliance" element={<Settings />} />
                              {/* User Profile */}
                              <Route path="profile" element={<Profile />} />
                              {/* Notifications */}
                              <Route
                                path="notifications"
                                element={<Dashboard />}
                              />

                              {/* Settings - enhanced with sub-routes */}
                              <Route path="settings" element={<Settings />} />
                              <Route
                                path="settings/general"
                                element={<Settings />}
                              />
                              <Route
                                path="settings/notifications"
                                element={<Settings />}
                              />
                              <Route
                                path="settings/api"
                                element={<Settings />}
                              />
                              <Route
                                path="settings/security"
                                element={<Settings />}
                              />
                              <Route
                                path="settings/integrations"
                                element={<Settings />}
                              />
                              <Route
                                path="print-settings"
                                element={<PrintSettings />}
                              />

                              {/* Import/Export */}
                              <Route path="import" element={<ImportExport />} />
                              <Route path="export" element={<ImportExport />} />

                              {/* Support & Help */}
                              <Route path="support" element={<Dashboard />} />
                              <Route path="help" element={<Dashboard />} />
                              <Route path="privacy" element={<Dashboard />} />
                              <Route path="terms" element={<Dashboard />} />
                              <Route path="security" element={<Dashboard />} />

                              {/* Developer Tools */}
                              {process.env.NODE_ENV === "development" && (
                                <Route
                                  path="developer"
                                  element={<DeveloperPage />}
                                />
                              )}
                            </Route>

                            {/* Error routes - outside private routes for public access */}
                            <Route
                              path="/404"
                              element={<ErrorPage type="notFound" />}
                            />
                            <Route
                              path="/500"
                              element={<ErrorPage type="server" />}
                            />
                            <Route
                              path="/unauthorized"
                              element={<ErrorPage type="unauthorized" />}
                            />
                            <Route path="/error" element={<ErrorPage />} />
                            {/* Catch all route - must be last */}
                            <Route
                              path="*"
                              element={<ErrorPage type="notFound" />}
                            />
                          </Routes>
                        </div>
                      </DeveloperSettingsProvider>
                    </NotificationProvider>
                  </LanguageProvider>
                </ThemeProvider>
              </AlertProvider>
            </AuthProvider>
          </ErrorProvider>
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
