import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Dropdown } from "react-bootstrap";
import { FaGlobe } from "react-icons/fa";

const LanguageSwitcher = () => {
  // Use only our context, not useTranslation to avoid hanging
  const { supportedLanguages, currentLanguage, changeLanguage, isI18nReady } =
    useLanguage();

  const languages = supportedLanguages || [
    { code: "tr", name: "Türkçe", flag: "🇹🇷" },
    { code: "en", name: "English", flag: "🇺🇸" },
  ];

  const currentLang =
    languages.find((lang) => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = (languageCode) => {
    if (changeLanguage) {
      changeLanguage(languageCode);
    }
  };

  // Don't render if not ready
  if (!isI18nReady) {
    return (
      <div
        className="d-flex align-items-center text-muted"
        style={{ fontSize: "0.875rem" }}
      >
        <FaGlobe className="me-1" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Dropdown align="end" className="language-switcher">
      <Dropdown.Toggle
        variant="link"
        id="language-dropdown"
        className="nav-link text-light d-flex align-items-center p-0 border-0 shadow-none"
        style={{ background: "none" }}
      >
        <FaGlobe className="me-1" />
        <span className="me-1">{currentLang.flag}</span>
        <span className="d-none d-md-inline">{currentLang.name}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu
        className="mt-2 shadow border-0"
        style={{ minWidth: "180px" }}
      >
        {languages.map((language) => (
          <Dropdown.Item
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            active={language.code === currentLang.code}
            className="d-flex align-items-center py-2"
          >
            <span className="me-3 fs-5">{language.flag}</span>
            <span className="fw-medium">{language.name}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;
