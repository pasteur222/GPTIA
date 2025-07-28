import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, HelpCircle, Briefcase, Menu, X, ChevronDown } from 'lucide-react';
import { useAppSettings } from './AppSettingsContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const scrollToSubscription = () => {
    navigate('/professional-subscription');
  };

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-yellow-500" />
              <span className="text-xl font-semibold text-gray-900">{settings.app_name}</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                {t('nav.subscriptions')}
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <Link
                    to="/professional-subscription"
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-yellow-500" />
                      <span>{t('nav.professional')}</span>
                    </div>
                  </Link>
                  <Link
                    to="/airtel-chat"
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-600" />
                      <span>{t('nav.educational')}</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
            
            <Link
              to="/features"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/features')
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t('nav.features')}
            </Link>
            
            <Link
              to="/help"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/help')
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-1">
                <HelpCircle className="w-4 h-4" />
                {t('nav.help')}
              </span>
            </Link>
            
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {t('nav.login')}
            </Link>
            
            <button
              onClick={scrollToSubscription}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors shadow-sm"
            >
              {t('nav.register')}
            </button>

            <LanguageSelector />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/professional-subscription"
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-yellow-500" />
                <span>{t('nav.professional')}</span>
              </div>
            </Link>
            
            <Link
              to="/airtel-chat"
              className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span>{t('nav.educational')}</span>
              </div>
            </Link>
            
            <Link
              to="/features"
              className={`block px-3 py-2 rounded-lg text-base font-medium ${
                isActive('/features')
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.features')}
            </Link>
            
            <Link
              to="/help"
              className={`block px-3 py-2 rounded-lg text-base font-medium ${
                isActive('/help')
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                {t('nav.help')}
              </span>
            </Link>
            
            <div className="pt-4 pb-3 border-t border-gray-200">
              <Link
                to="/login"
                className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.login')}
              </Link>
              
              <Link
                to="/professional-subscription"
                className="block px-3 py-2 mt-2 rounded-lg text-base font-medium text-white bg-yellow-500 hover:bg-yellow-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.register')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;