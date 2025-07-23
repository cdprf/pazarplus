import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Dropdown, Badge } from "react-bootstrap";
import { FaGlobe, FaCheck } from "react-icons/fa";
import "./LanguageSwitcher.css";

const LanguageSwitcher = ({
  variant = "dropdown",
  size = "normal",
  showCompletionStatus = false,
  className = "",
}) => {
  // Use only our context, not useTranslation to avoid hanging
  const { supportedLanguages, currentLanguage, changeLanguage, isI18nReady } =
    useLanguage();

  const languages = supportedLanguages || [
    {
      code: "tr",
      name: "Türkçe",
      flag: "🇹🇷",
      nativeName: "Türkçe",
      completion: 100,
    },
    {
      code: "en",
      name: "English",
      flag: "🇺🇸",
      nativeName: "English",
      completion: 100,
    },
  ];

  const currentLang =
    languages.find((lang) => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = (languageCode) => {
    if (changeLanguage) {
      changeLanguage(languageCode);
    }
  };

  const getCompletionColor = (completion) => {
    if (completion >= 95) return "success";
    if (completion >= 80) return "warning";
    if (completion >= 50) return "danger";
    return "secondary";
  };

  // Don't render if not ready
  if (!isI18nReady) {
    return (
      <div
        className={`d-flex align-items-center text-muted ${
          size === "small" ? "small" : ""
        } ${className}`}
        style={{ fontSize: size === "small" ? "0.75rem" : "0.875rem" }}
      >
        <FaGlobe className="me-1" />
        <span>Loading...</span>
      </div>
    );
  }

  // Button variant
  if (variant === "button") {
    return (
      <div className={`language-switcher-buttons ${size} ${className}`}>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`language-btn ${
              language.code === currentLang.code ? "active" : ""
            }`}
            disabled={!isI18nReady}
          >
            <span className="language-flag">{language.flag}</span>
            <span className="d-none d-md-inline ms-1">{language.name}</span>
            {showCompletionStatus && language.completion < 100 && (
              <Badge
                bg={getCompletionColor(language.completion)}
                className="ms-1"
              >
                {language.completion}%
              </Badge>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <Dropdown align="end" className={`language-switcher ${size} ${className}`}>
      <Dropdown.Toggle
        variant="link"
        id="language-dropdown"
        className="nav-link text-light d-flex align-items-center p-0 border-0 shadow-none"
        style={{ background: "none" }}
      >
        <FaGlobe className="me-1" />
        <span className="me-1">{currentLang.flag}</span>
        <span className="d-none d-md-inline">{currentLang.name}</span>
        {showCompletionStatus && currentLang.completion < 100 && (
          <Badge
            bg={getCompletionColor(currentLang.completion)}
            className="ms-1"
          >
            {currentLang.completion}%
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu
        className={`language-dropdown-menu mt-2 shadow border-0 ${
          size === "small" ? "small" : ""
        }`}
        style={{ minWidth: size === "small" ? "200px" : "250px" }}
      >
        {languages.map((language) => (
          <Dropdown.Item
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            active={language.code === currentLang.code}
            className={`language-dropdown-item d-flex align-items-center py-2 ${
              language.code === currentLang.code ? "active" : ""
            }`}
          >
            <div className="language-item">
              <span className="language-flag me-3">{language.flag}</span>
              <div className="language-info">
                <div className="language-name fw-medium">{language.name}</div>
                {language.nativeName &&
                  language.nativeName !== language.name && (
                    <div className="language-native">{language.nativeName}</div>
                  )}
              </div>
              {showCompletionStatus && (
                <div className="ms-auto">
                  {language.completion === 100 ? (
                    <FaCheck className="language-check text-success" />
                  ) : (
                    <Badge bg={getCompletionColor(language.completion)}>
                      {language.completion}%
                    </Badge>
                  )}
                </div>
              )}
              {language.code === currentLang.code && !showCompletionStatus && (
                <FaCheck className="language-check ms-auto" />
              )}
            </div>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
