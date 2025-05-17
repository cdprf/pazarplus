import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Container, Alert } from 'react-bootstrap';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useWebSocketConnection } from '../../hooks/useWebSocketConnection';
import { useAuth } from '../../hooks/useAuth';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { isAuthenticated } = useAuth();
  const { isConnected, reconnectAttempt, reconnect } = useWebSocketConnection();
  const location = useLocation();
  
  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Don't show connection status on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const showConnectionAlert = isAuthenticated && !isConnected && reconnectAttempt > 0 && !isAuthPage;

  return (
    <div className="app-container">
      <Navbar toggleSidebar={toggleSidebar} />
      
      {showConnectionAlert && (
        <Alert 
          variant="warning" 
          className="connection-alert mb-0 text-center"
        >
          Connection to server lost. 
          <button 
            onClick={reconnect}
            className="btn btn-link p-0 ms-2"
          >
            Reconnect now
          </button>
        </Alert>
      )}
      
      <div className="content-container">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Container fluid>
            <Outlet />
          </Container>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;