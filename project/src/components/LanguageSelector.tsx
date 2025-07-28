import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons';
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'dropdown',
  className = ''
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' }
  ];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  if (variant === 'buttons') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as Language)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              language === lang.code
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span>{language === 'fr' ? 'Français' : 'English'}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code as Language)}
              className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-50"
            >
              <span>{lang.name}</span>
              {language === lang.code && (
                <Check className="w-4 h-4 text-green-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;