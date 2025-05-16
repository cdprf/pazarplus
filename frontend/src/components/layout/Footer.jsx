import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="app-footer">
      <div>
        <span>&copy; {currentYear} Pazar+ Order Management System</span>
      </div>
      <div>
        <span>Version 1.0.0</span>
      </div>
    </footer>
  );
};

export default Footer;