import logger from "./utils/logger.js";
import React, { useEffect, Suspense, lazy } from "react";
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
import LoadingSkeleton from "./components/ui/LoadingSkeleton";
import performanceMonitor from "./services/performanceMonitor";
import "./i18n";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Layout from "./components/layout/Layout.jsx";
import PrivateRoute from "./components/auth/PrivateRoute";
import PublicRoute from "./components/auth/PublicRoute";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from "./components/auth/ForgotPassword";
import ResetPassword from "./components/auth/ResetPassword";
import Dashboard from "./components/dashboard/Dashboard";

// Development-only components
const PerformanceDashboard = lazy(() =>
  import("./components/developer/PerformanceDashboard")
);

// Lazy load heavy components
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./components/orders/OrderDetail"));
const ProductDetail = lazy(() => import("./components/products/ProductDetail"));
const ProductManagement = lazy(() =>
  import("./components/ProductManagement/index.js")
);
const AdvancedProductManagement = lazy(() =>
  import("./components/ProductManagement/components/ProductManagement")
);
const VariantDetectionConfigurationPage = lazy(() =>
  import(
    "./components/ProductManagement/VariantDetectionConfig/VariantDetectionConfigurationPage"
  )
);
const CustomerManagement = lazy(() =>
  import("./components/customers/CustomerManagement")
);
const CustomerProfile = lazy(() =>
  import("./components/customers/CustomerProfile")
);
const ShippingManagement = lazy(() =>
  import("./components/shipping/ShippingManagement")
);
const ShippingSlipDesigner = lazy(() =>
  import("./components/shipping/ShippingSlipDesigner")
);
const ImportExport = lazy(() => import("./components/common/ImportExport"));
const PlatformConnections = lazy(() =>
  import("./components/platforms/PlatformConnections")
);
const PlatformSettings = lazy(() =>
  import("./components/platforms/PlatformSettings")
);
const PlatformAnalytics = lazy(() =>
  import("./components/platforms/PlatformAnalytics")
);
const PlatformSyncHistory = lazy(() =>
  import("./components/platforms/PlatformSyncHistory")
);
const ProductLinkingDashboard = lazy(() =>
  import("./pages/admin/ProductLinkingDashboard")
);
const Analytics = lazy(() => import("./pages/Analytics"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PlatformOperations = lazy(() => import("./pages/PlatformOperations"));
const TaskDetails = lazy(() => import("./pages/TaskDetails"));
const CustomerQuestions = lazy(() => import("./components/CustomerQuestions"));
const Settings = lazy(() => import("./components/settings/Settings"));
const Config = lazy(() => import("./components/config/Config"));
const Profile = lazy(() => import("./components/profile/Profile"));
const PrintSettings = lazy(() => import("./components/settings/PrintSettings"));
const DatabaseBusyModal = lazy(() => import("./components/DatabaseBusyModal"));
const PlatformCategoriesManagement = lazy(() =>
  import("./components/PlatformCategoriesManagement.jsx")
);
const ErrorPage = lazy(() => import("./pages/ErrorPage"));
const BackgroundTaskManager = lazy(() =>
  import("./components/tasks/BackgroundTaskManager")
);
const DeveloperPage = lazy(() => import("./pages/DeveloperPage"));

// Create an enhanced query client with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Smart retry logic
        if (error?.response?.status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      networkMode: "online", // Only fetch when online
    },
    mutations: {
      retry: 1,
      networkMode: "online",
    },
  },
});

// Performance loading component
const PageLoader = () => (
  <div
    className="d-flex justify-content-center align-items-center"
    style={{ minHeight: "60vh" }}
  >
    <LoadingSkeleton />
  </div>
);

function App() {
  // Initialize network configuration for PDF printing on app start
  useEffect(() => {
    const appStartTime = performance.now();

    // Temporarily disabled to prevent network scanning interference
    // initializeNetworkForPDF();
    logger.info("🔧 Network discovery disabled - using proxy configuration");

    // Performance monitoring
    performanceMonitor.trackPageLoad("App", appStartTime);

    // Preload critical components after initial render
    const preloadComponents = async () => {
      try {
        const componentStartTime = performance.now();

        // Preload the most commonly used components
        await Promise.all([
          import("./pages/Orders"),
          import("./components/settings/Settings"),
          import("./pages/Analytics"),
        ]);

        performanceMonitor.trackComponentLoad(
          "CriticalComponents",
          componentStartTime
        );

        const loadTime = performance.now() - appStartTime;
        logger.info(`🚀 App initialized in ${loadTime.toFixed(2)}ms`);
        logger.info("📦 Critical components preloaded");
      } catch (error) {
        logger.warn("⚠️ Component preloading failed:", error);
      }
    };

    // Preload after a short delay to not block initial render
    const timer = setTimeout(preloadComponents, 1000);

    // Set up periodic performance reporting in development
    let perfTimer;
    if (process.env.NODE_ENV === "development") {
      perfTimer = setInterval(() => {
        performanceMonitor.printSummary();
      }, 30000); // Every 30 seconds
    }

    return () => {
      clearTimeout(timer);
      if (perfTimer) clearInterval(perfTimer);
    };
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
                          <Suspense fallback={<div>Yükleniyor...</div>}>
                            <DatabaseBusyModal />
                          </Suspense>

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
                              <Route
                                path="orders"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <Orders />
                                  </Suspense>
                                }
                              />
                              <Route
                                path="orders/:id"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <OrderDetail />
                                  </Suspense>
                                }
                              />
                              <Route
                                path="orders/new"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <Orders />
                                  </Suspense>
                                }
                              />
                              <Route
                                path="orders/completed"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <Orders />
                                  </Suspense>
                                }
                              />

                              {/* Product Detail */}
                              <Route
                                path="products/:id"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <ProductDetail />
                                  </Suspense>
                                }
                              />

                              {/* Analytics */}
                              <Route
                                path="analytics"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <Analytics />
                                  </Suspense>
                                }
                              />

                              {/* Notifications */}
                              <Route
                                path="notifications"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <Notifications />
                                  </Suspense>
                                }
                              />

                              {/* ============================================ */}
                              {/* === LEGACY PRODUCT MANAGEMENT (OLD) === */}
                              {/* ============================================ */}
                              <Route
                                path="products"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <ProductManagement />
                                  </Suspense>
                                }
                              />
                              {/* Base products route using legacy system */}
                              <Route
                                path="products/base"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <ProductManagement />
                                  </Suspense>
                                }
                              />

                              {/* ============================================ */}
                              {/* === NEW ENHANCED PRODUCT MANAGEMENT === */}
                              {/* ============================================ */}
                              {/* Access the NEW advanced system at /products/enhanced */}
                              <Route
                                path="products/enhanced"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <AdvancedProductManagement />
                                  </Suspense>
                                }
                              />
                              <Route
                                path="products/enhanced/:id"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <AdvancedProductManagement />
                                  </Suspense>
                                }
                              />
                              {/* ============================================ */}
                              <Route
                                path="products/:id/edit"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <ProductManagement />
                                  </Suspense>
                                }
                              />
                              <Route
                                path="products/categories"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <PlatformCategoriesManagement />
                                  </Suspense>
                                }
                              />
                              <Route
                                path="products/pricing"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <ProductManagement />
                                  </Suspense>
                                }
                              />
                              {/* Variant Detection Configuration */}
                              <Route
                                path="products/variant-detection"
                                element={
                                  <Suspense fallback={<PageLoader />}>
                                    <VariantDetectionConfigurationPage />
                                  </Suspense>
                                }
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
                              <Route path="config" element={<Config />} />
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

      {/* Performance Dashboard for development */}
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <PerformanceDashboard />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

export default App;
