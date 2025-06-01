import React from "react";
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
import ProductManagement from "./components/ProductManagement";
import CustomerManagement from "./components/customers/CustomerManagement";
import ShippingManagement from "./components/shipping/ShippingManagement";
import ShippingSlipDesigner from "./components/shipping/ShippingSlipDesigner";
import ImportExport from "./components/common/ImportExport";
import PlatformConnections from "./components/platforms/PlatformConnections";
import PlatformSettings from "./components/platforms/PlatformSettings";
import PlatformAnalytics from "./components/platforms/PlatformAnalytics";
import PlatformSyncHistory from "./components/platforms/PlatformSyncHistory";
import Reports from "./components/reports/Reports"; // Add the analytics/reports page
import Settings from "./components/settings/Settings";
import PrintSettings from "./components/settings/PrintSettings";
import InventoryInsights from "./components/analytics/InventoryInsights"; // Add inventory component

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
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <AlertProvider>
              <ThemeProvider>
                <NotificationProvider>
                  <div className="App">
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
                        <Route
                          path="products"
                          element={<ProductManagement />}
                        />
                        <Route
                          path="products/inventory"
                          element={<InventoryInsights />}
                        />

                        {/* Other management routes */}
                        <Route
                          path="customers"
                          element={<CustomerManagement />}
                        />
                        <Route
                          path="shipping"
                          element={<ShippingManagement />}
                        />
                        {/* Nested shipping routes */}
                        <Route
                          path="shipping/slip-designer"
                          element={<ShippingSlipDesigner />}
                        />
                        <Route
                          path="import-export"
                          element={<ImportExport />}
                        />

                        {/* Platform management */}
                        <Route
                          path="platforms"
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

                        {/* Reports */}
                        <Route path="reports" element={<Reports />} />
                        <Route path="analytics" element={<Reports />} />
                        <Route path="analytics/sales" element={<Reports />} />
                        <Route
                          path="analytics/performance"
                          element={<Reports />}
                        />
                        <Route path="analytics/trends" element={<Reports />} />

                        {/* Settings */}
                        <Route path="settings" element={<Settings />} />
                        <Route
                          path="print-settings"
                          element={<PrintSettings />}
                        />

                        {/* Inventory Insights */}
                        <Route
                          path="inventory-insights"
                          element={<InventoryInsights />}
                        />
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
