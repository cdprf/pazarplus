import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { AlertProvider } from "./contexts/AlertContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Import CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
// import "./debug-modal.css"; // Temporary debug CSS - removed

// Import network initialization for PDF printing
import { initializeNetworkForPDF } from "./services/networkInitialization";

// Import components
import Layout from "./components/layout/Layout.jsx";
import PrivateRoute from "./components/auth/PrivateRoute";
import PublicRoute from "./components/auth/PublicRoute";

// Import pages and components (consolidated)
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import EmailVerification from "./components/auth/EmailVerification";
import Dashboard from "./components/dashboard/Dashboard";
import Orders from "./pages/Orders"; // Consolidated order management
import OrderDetail from "./components/orders/OrderDetail";
import ProductManagement from "./components/ProductManagement/index.js"; // Modernized product management
import EnhancedProductManagement from "./components/ProductManagement/components/EnhancedProductManagement"; // Enhanced product management system
import CustomerManagement from "./components/customers/CustomerManagement";
import CustomerProfile from "./components/customers/CustomerProfile";
import ShippingManagement from "./components/shipping/ShippingManagement";
import EnhancedShippingSlipDesigner from "./components/shipping/EnhancedShippingSlipDesigner";
import ImportExport from "./components/common/ImportExport";
import PlatformConnections from "./components/platforms/PlatformConnections";
import PlatformSettings from "./components/platforms/PlatformSettings";
import PlatformAnalytics from "./components/platforms/PlatformAnalytics";
import PlatformSyncHistory from "./components/platforms/PlatformSyncHistory";
import ProductLinkingDashboard from "./pages/admin/ProductLinkingDashboard";
import Analytics from "./pages/Analytics"; // Analytics dashboard
import PlatformOperations from "./pages/PlatformOperations"; // Platform Operations
import Settings from "./components/settings/Settings";
import PrintSettings from "./components/settings/PrintSettings";
import DatabaseBusyModal from "./components/DatabaseBusyModal"; // Database transaction management modal

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
    initializeNetworkForPDF();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <AlertProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <div className="App">
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
                        path="/verify-email"
                        element={
                          <PublicRoute>
                            <EmailVerification />
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
                        <Route path="orders" element={<Orders />} />
                        <Route path="orders/:id" element={<OrderDetail />} />
                        <Route path="analytics" element={<Analytics />} />

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
                        {/* Access the NEW enhanced system at /products/enhanced */}
                        <Route
                          path="products/enhanced"
                          element={<EnhancedProductManagement />}
                        />
                        <Route
                          path="products/enhanced/:id"
                          element={<EnhancedProductManagement />}
                        />
                        {/* ============================================ */}

                        <Route
                          path="products/:id/edit"
                          element={<ProductManagement />}
                        />
                        <Route
                          path="products/categories"
                          element={<ProductManagement />}
                        />
                        <Route
                          path="products/pricing"
                          element={<ProductManagement />}
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
                          element={<EnhancedShippingSlipDesigner />}
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

                        {/* Orders - enhanced with sub-routes */}
                        <Route path="orders" element={<Orders />} />
                        <Route path="orders/:id" element={<OrderDetail />} />
                        <Route path="orders/new" element={<Orders />} />
                        <Route path="orders/completed" element={<Orders />} />

                        {/* Product-Order Linking Management */}
                        <Route
                          path="admin/product-linking"
                          element={<ProductLinkingDashboard />}
                        />

                        {/* Payment Management */}
                        <Route
                          path="payments"
                          element={<CustomerManagement />}
                        />

                        {/* Compliance */}
                        <Route path="compliance" element={<Settings />} />

                        {/* User Profile */}
                        <Route path="profile" element={<Settings />} />

                        {/* Notifications */}
                        <Route path="notifications" element={<Dashboard />} />

                        {/* Settings - enhanced with sub-routes */}
                        <Route path="settings" element={<Settings />} />
                        <Route
                          path="settings/notifications"
                          element={<Settings />}
                        />
                        <Route path="settings/api" element={<Settings />} />
                        <Route path="settings/users" element={<Settings />} />
                        <Route
                          path="print-settings"
                          element={<PrintSettings />}
                        />

                        {/* Support */}
                        <Route path="support" element={<Dashboard />} />

                        {/* Import/Export */}
                        <Route
                          path="import-export"
                          element={<ImportExport />}
                        />

                        {/* Footer and Static Pages */}
                        <Route path="help" element={<Dashboard />} />
                        <Route path="docs" element={<Dashboard />} />
                        <Route path="api-docs" element={<Dashboard />} />
                        <Route path="about" element={<Dashboard />} />
                        <Route path="privacy" element={<Dashboard />} />
                        <Route path="terms" element={<Dashboard />} />
                        <Route path="security" element={<Dashboard />} />
                      </Route>
                    </Routes>
                  </div>
                </NotificationProvider>
              </ThemeProvider>
            </AlertProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
