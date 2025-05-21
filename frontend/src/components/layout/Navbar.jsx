import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaUser, FaCog, FaSignOutAlt, FaSun, FaMoon } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const MainNavbar = ({ toggleSidebar }) => {
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="main-navbar" role="navigation" aria-label="Main navigation">
      <Container fluid>
        <Button 
          variant="outline-light" 
          className="me-2 sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </Button>
        
        <Navbar.Brand as={Link} to="/">Pazar+ Order Management</Navbar.Brand>
        
        <Navbar.Toggle aria-controls="navbar-nav" />
        
        <Navbar.Collapse id="navbar-nav" className="justify-content-end">
          <Nav>
            <Button
              variant="outline-light"
              className="me-3 theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <FaMoon aria-hidden="true" /> : <FaSun aria-hidden="true" />}
            </Button>
            
            {isAuthenticated ? (
              <Dropdown align="end">
                <Dropdown.Toggle variant="outline-light" id="user-dropdown" aria-label="User menu">
                  <FaUser className="me-2" aria-hidden="true" />
                  <span>{user?.fullName || user?.username || 'User'}</span>
                </Dropdown.Toggle>
                
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to="/settings">
                    <FaCog className="me-2" aria-hidden="true" />
                    <span>Settings</span>
                  </Dropdown.Item>
                  
                  <Dropdown.Divider />
                  
                  <Dropdown.Item onClick={handleLogout}>
                    <FaSignOutAlt className="me-2" aria-hidden="true" />
                    <span>Logout</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                <Nav.Link as={Link} to="/register">Register</Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default MainNavbar;