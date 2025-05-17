import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PrivateRoute from './components/auth/PrivateRoute';

// Layout components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';

// Page components
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import PlatformConnections from './pages/PlatformConnections';
import ImportCSV from './pages/ImportCSV';
import ExportData from './pages/ExportData';
import Settings from './pages/Settings';

// Context providers
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';

// CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const isDev = process.env.NODE_ENV === 'development';
  const devMode = process.env.REACT_APP_DEV_MODE === 'true';

  // If in dev mode with direct access enabled, create a fake authenticated state
  useEffect(() => {
    if (isDev && devMode && window.location.pathname === '/dev-admin') {
      // Set a fake authentication token
      localStorage.setItem('token', 'dev-admin-token');
      
      // If needed, create other local storage items for development
      localStorage.setItem('dev_mode', 'true');
    }
  }, [isDev, devMode]);

  return (
    <AuthProvider>
      <AlertProvider>
        <Router>
          <div className="app-container">
            <Navbar toggleSidebar={toggleSidebar} />
            <div className="content-container">
              <Sidebar isOpen={sidebarOpen} />
              <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <Container fluid>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
                    <Route path="/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
                    <Route path="/platforms" element={<PrivateRoute><PlatformConnections /></PrivateRoute>} />
                    <Route path="/import" element={<PrivateRoute><ImportCSV /></PrivateRoute>} />
                    <Route path="/export" element={<PrivateRoute><ExportData /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Container>
              </main>
            </div>
            <Footer />
          </div>
        </Router>
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;