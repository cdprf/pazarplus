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
    <nav 
      className={`sidebar ${isOpen ? 'open' : 'closed'}`} 
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="sidebar-header">
        <h5>Navigation</h5>
      </div>
      
      <Nav className="flex-column" as="ul">
        <Nav.Item as="li">
          <Nav.Link 
            as={Link} 
            to="/dashboard" 
            className={location.pathname === '/dashboard' ? 'active' : ''}
            aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
          >
            <FaHome className="icon" aria-hidden="true" />
            <span className="text">Dashboard</span>
          </Nav.Link>
        </Nav.Item>
        
        <Nav.Item as="li">
          <Nav.Link 
            as={Link} 
            to="/orders" 
            className={location.pathname.startsWith('/orders') ? 'active' : ''}
            aria-current={location.pathname.startsWith('/orders') ? 'page' : undefined}
          >
            <FaShoppingCart className="icon" aria-hidden="true" />
            <span className="text">Orders</span>
          </Nav.Link>
        </Nav.Item>
        
        <Nav.Item as="li">
          <Nav.Link 
            as={Link} 
            to="/shipping" 
            className={location.pathname.startsWith('/shipping') ? 'active' : ''}
            aria-current={location.pathname.startsWith('/shipping') ? 'page' : undefined}
          >
            <FaShippingFast className="icon" aria-hidden="true" />
            <span className="text">Shipping</span>
          </Nav.Link>
        </Nav.Item>
        
        <Nav.Item as="li">
          <Nav.Link 
            as={Link} 
            to="/platforms" 
            className={location.pathname.startsWith('/platforms') ? 'active' : ''}
            aria-current={location.pathname.startsWith('/platforms') ? 'page' : undefined}
          >
            <FaPlug className="icon" aria-hidden="true" />
            <span className="text">Platforms</span>
          </Nav.Link>
        </Nav.Item>
        
        <div className="sidebar-divider" role="separator">Import/Export</div>
        
        <Nav.Item as="li">
          <Nav.Link 
            as={Link} 
            to="/import" 
            className={location.pathname.startsWith('/import') ? 'active' : ''}
            aria-current={location.pathname.startsWith('/import') ? 'page' : undefined}
          >
            <FaFileImport className="icon" aria-hidden="true" />
            <span className="text">Import CSV</span>
          </Nav.Link>
        </Nav.Item>
        
        <Nav.Item as="li">
          <Nav.Link 
            as={Link} 
            to="/export" 
            className={location.pathname.startsWith('/export') ? 'active' : ''}
            aria-current={location.pathname.startsWith('/export') ? 'page' : undefined}
          >
            <FaFileExport className="icon" aria-hidden="true" />
            <span className="text">Export Data</span>
          </Nav.Link>
        </Nav.Item>
        
        <div className="sidebar-divider" role="separator">System</div>
        
        <Nav.Item as="li">
          <Nav.Link 
            as={Link} 
            to="/settings" 
            className={location.pathname.startsWith('/settings') ? 'active' : ''}
            aria-current={location.pathname.startsWith('/settings') ? 'page' : undefined}
          >
            <FaCog className="icon" aria-hidden="true" />
            <span className="text">Settings</span>
          </Nav.Link>
        </Nav.Item>
      </Nav>
    </nav>
  );
};

export default Sidebar;