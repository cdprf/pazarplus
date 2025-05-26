import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from 'react-bootstrap';
import { FaGlobe } from 'react-icons/fa';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <Dropdown>
      <Dropdown.Toggle 
        variant="outline-secondary" 
        id="language-dropdown"
        className="d-flex align-items-center"
        style={{ border: 'none', background: 'transparent' }}
      >
        <FaGlobe className="me-2" />
        <span className="me-1">{currentLanguage.flag}</span>
        <span>{currentLanguage.name}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {languages.map((language) => (
          <Dropdown.Item
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            active={language.code === i18n.language}
            className="d-flex align-items-center"
          >
            <span className="me-2">{language.flag}</span>
            {language.name}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSwitcher;