/* eslint-disable no-unused-vars */
import React, { useContext } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaShoppingCart, 
  FaPlug, 
  FaFileImport, 
  FaFileExport, 
  FaCog,
  FaShippingFast, 
  FaChartLine
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const Sidebar = ({ isOpen }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();
  
  // If not authenticated, don't show sidebar
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h5>Navigation</h5>
      </div>
      
      <Nav className="flex-column">
        <Nav.Link 
          as={Link} 
          to="/dashboard" 
          className={location.pathname === '/dashboard' ? 'active' : ''}
        >
          <FaHome className="icon" />
          <span className="text">Dashboard</span>
        </Nav.Link>
        
        <Nav.Link 
          as={Link} 
          to="/orders" 
          className={location.pathname.startsWith('/orders') ? 'active' : ''}
        >
          <FaShoppingCart className="icon" />
          <span className="text">Orders</span>
        </Nav.Link>
        
        <Nav.Link 
          as={Link} 
          to="/shipping" 
          className={location.pathname.startsWith('/shipping') ? 'active' : ''}
        >
          <FaShippingFast className="icon" />
          <span className="text">Shipping</span>
        </Nav.Link>
        
        <Nav.Link 
          as={Link} 
          to="/platforms" 
          className={location.pathname.startsWith('/platforms') ? 'active' : ''}
        >
          <FaPlug className="icon" />
          <span className="text">Platforms</span>
        </Nav.Link>
        
        <div className="sidebar-divider">Import/Export</div>
        
        <Nav.Link 
          as={Link} 
          to="/import" 
          className={location.pathname.startsWith('/import') ? 'active' : ''}
        >
          <FaFileImport className="icon" />
          <span className="text">Import CSV</span>
        </Nav.Link>
        
        <Nav.Link 
          as={Link} 
          to="/export" 
          className={location.pathname.startsWith('/export') ? 'active' : ''}
        >
          <FaFileExport className="icon" />
          <span className="text">Export Data</span>
        </Nav.Link>
        
        <div className="sidebar-divider">System</div>
        
        <Nav.Link 
          as={Link} 
          to="/settings" 
          className={location.pathname.startsWith('/settings') ? 'active' : ''}
        >
          <FaCog className="icon" />
          <span className="text">Settings</span>
        </Nav.Link>
      </Nav>
    </div>
  );
};

export default Sidebar;