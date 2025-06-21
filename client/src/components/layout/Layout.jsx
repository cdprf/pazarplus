import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import AdvancedSidebar from "../sidebar/AdvancedSidebar";
import Footer from "./Footer";
import { useWebSocketConnection } from "../../hooks/useWebSocketConnection";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { WifiOff } from "lucide-react";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { isAuthenticated } = useAuth();
  const { isConnected, reconnectAttempt, reconnect } = useWebSocketConnection();
  const location = useLocation();

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Don't show connection status on auth pages
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";
  const showConnectionAlert =
    isAuthenticated && !isConnected && reconnectAttempt > 0 && !isAuthPage;

  return (
    <div className="app-container min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar toggleSidebar={toggleSidebar} />

        {showConnectionAlert && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3">
            <div className="flex items-center justify-center space-x-3 text-yellow-800 dark:text-yellow-200">
              <WifiOff className="w-4 h-4 icon-contrast-warning" />
              <span className="text-sm font-medium">
                Connection to server lost.
              </span>
              <Button
                onClick={reconnect}
                variant="ghost"
                size="sm"
                className="text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/30"
              >
                Reconnect now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main content area with proper top padding */}
      <div className="pt-16 min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-1">
          {isAuthenticated && (
            <AdvancedSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          )}

          <main className="flex-1 transition-all duration-300 bg-gray-50 dark:bg-gray-900">
            <div className="min-h-full bg-gray-50 dark:bg-gray-900">
              <Outlet />
            </div>
          </main>
        </div>

        <Footer />
      </div>

      {/* Toast notifications are already handled by AlertProvider */}
    </div>
  );
};

export default Layout;
