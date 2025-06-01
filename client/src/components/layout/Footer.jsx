import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import {
  HeartIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { isDark } = useTheme();

  const footerLinks = {
    product: [
      { name: "Dashboard", href: "/" },
      { name: "Order Management", href: "/orders" },
      { name: "Platform Integrations", href: "/platforms" },
      { name: "Analytics", href: "/analytics" },
    ],
    support: [
      { name: "Help Center", href: "/help" },
      { name: "Documentation", href: "/docs" },
      { name: "API Reference", href: "/api-docs" },
      { name: "Contact Support", href: "/support" },
    ],
    company: [
      { name: "About Us", href: "/about" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Security", href: "/security" },
    ],
  };

  const socialLinks = [
    { name: "Website", icon: GlobeAltIcon, href: "https://pazarplus.com" },
    {
      name: "Support",
      icon: EnvelopeIcon,
      href: "mailto:support@pazarplus.com",
    },
    { name: "Phone", icon: PhoneIcon, href: "tel:+902121234567" },
  ];

  // Use isDark for conditional styling with proper theme classes
  const getThemeClasses = () => {
    return {
      footer: isDark
        ? "bg-gray-900 border-gray-800 text-gray-100"
        : "bg-white border-gray-200 text-gray-900",
      text: isDark ? "text-gray-300" : "text-gray-600",
      textMuted: isDark ? "text-gray-400" : "text-gray-500",
      border: isDark ? "border-gray-800" : "border-gray-200",
      heading: isDark ? "text-white" : "text-gray-900",
      link: isDark
        ? "text-gray-400 hover:text-blue-400"
        : "text-gray-600 hover:text-blue-600",
      gradient: isDark
        ? "from-blue-400 via-purple-400 to-blue-500"
        : "from-blue-600 via-purple-600 to-blue-700",
    };
  };

  const themeClasses = getThemeClasses();

  return (
    <footer
      className={`${themeClasses.footer} border-t mt-auto transition-colors duration-200`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand section */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${themeClasses.gradient} rounded-xl flex items-center justify-center shadow-lg`}
                >
                  <span className="text-white font-bold text-lg">P+</span>
                </div>
                <div>
                  <span
                    className={`font-bold text-xl bg-gradient-to-r ${themeClasses.gradient} bg-clip-text text-transparent`}
                  >
                    Pazar+
                  </span>
                  <div className={`text-sm ${themeClasses.textMuted}`}>
                    Order Management System
                  </div>
                </div>
              </div>
              <p className={`${themeClasses.text} text-sm mb-4 max-w-md`}>
                Streamline your e-commerce operations with our comprehensive
                order management platform designed specifically for Turkish
                marketplaces.
              </p>
              <div className="flex items-center space-x-4">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      className={`${themeClasses.textMuted} hover:text-blue-600 dark:hover:text-blue-400 transition-colors`}
                      title={link.name}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Product links */}
            <div>
              <h3
                className={`text-sm font-semibold ${themeClasses.heading} mb-4`}
              >
                Product
              </h3>
              <ul className="space-y-2">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className={`text-sm ${themeClasses.link} transition-colors`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support links */}
            <div>
              <h3
                className={`text-sm font-semibold ${themeClasses.heading} mb-4`}
              >
                Support
              </h3>
              <ul className="space-y-2">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className={`text-sm ${themeClasses.link} transition-colors flex items-center space-x-2`}
                    >
                      <span>{link.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <h3
                className={`text-sm font-semibold ${themeClasses.heading} mb-4`}
              >
                Company
              </h3>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className={`text-sm ${themeClasses.link} transition-colors`}
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className={`border-t ${themeClasses.border} py-6`}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright and version */}
            <div
              className={`flex items-center space-x-4 text-sm ${themeClasses.textMuted}`}
            >
              <span>&copy; {currentYear} Pazar+ Order Management System</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center space-x-1">
                <span>Version 1.0.0</span>
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                  title="System Operational"
                />
              </span>
            </div>

            {/* Status and compliance badges */}
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 text-sm ${themeClasses.textMuted}`}
              >
                <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                <span>KVKK Compliant</span>
              </div>
              <div
                className={`flex items-center space-x-2 text-sm ${themeClasses.textMuted}`}
              >
                <DocumentTextIcon className="h-4 w-4 text-blue-500" />
                <span>ISO 27001</span>
              </div>
              <div className={`text-xs ${themeClasses.textMuted}`}>
                Made with <HeartIcon className="h-3 w-3 inline text-red-500" />{" "}
                in Turkey
              </div>
            </div>
          </div>

          {/* Additional info for development */}
          <div className={`mt-4 pt-4 border-t ${themeClasses.border}`}>
            <div
              className={`flex flex-wrap items-center justify-center gap-4 text-xs ${themeClasses.textMuted}`}
            >
              <span>Server Status: Online</span>
              <span>•</span>
              <span>Last Deployment: {new Date().toLocaleDateString()}</span>
              <span>•</span>
              <span>Environment: {process.env.NODE_ENV || "development"}</span>
              <span>•</span>
              <span>Build: {process.env.REACT_APP_VERSION || "dev"}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
