import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MessageSquare, BookOpen, GamepadIcon, CreditCard, LayoutDashboard, FilterIcon, Settings, Smartphone } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import { AppSettingsProvider } from './components/AppSettingsContext';
import { LanguageProvider } from './contexts/LanguageContext';
import PrivateRoute from './components/PrivateRoute';
import RestrictedRoute from './components/RestrictedRoute';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import WhatsApp from './pages/WhatsApp';
import NumberFiltering from './pages/NumberFiltering';
import CustomerService from './pages/CustomerService';
import Education from './pages/Education';
import Quiz from './pages/Quiz';
import SettingsPage from './pages/Settings';
import Payments from './pages/Payments';
import Features from './pages/Features';
import Help from './pages/Help';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import AirtelChat from './pages/AirtelChat';
import CreateAdmin from './pages/CreateAdmin';
import WhatsAppVerification from './pages/WhatsAppVerification';
import AnalyticsScriptInjector from './components/AnalyticsScriptInjector';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import LegalNotice from './pages/LegalNotice';
import GroqSetup from './pages/GroqSetup';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './lib/supabase';

function App() {
  const menuItems = [
    { icon: MessageSquare, label: 'WhatsApp', path: '/whatsapp', restricted: false },
    { icon: MessageSquare, label: 'Customer Service', path: '/customer-service', restricted: false },
    { icon: BookOpen, label: 'Education', path: '/education', restricted: false },
    { icon: GamepadIcon, label: 'Quiz', path: '/quiz', restricted: false },
    { icon: CreditCard, label: 'Payments', path: '/payments', restricted: false },
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', restricted: false },
    { icon: FilterIcon, label: 'Number Filtering', path: '/number-filtering', restricted: false },
    { icon: Settings, label: 'Settings', path: '/settings', restricted: false }
  ];

  // Load and apply appearance settings on app start
  useEffect(() => {
    const loadAppearanceSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('appearance_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error loading appearance settings:', error);
          return;
        }

        if (data) {
          // Apply theme color
          document.documentElement.setAttribute('data-theme-color', data.theme_color || 'yellow');
          
          // Apply font size
          document.documentElement.setAttribute('data-font-size', data.font_size || 'normal');
          
          // Apply dark mode
          if (data.dark_mode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          
          // Apply reduced motion
          if (data.reduced_motion) {
            document.documentElement.classList.add('reduced-motion');
          } else {
            document.documentElement.classList.remove('reduced-motion');
          }
          
          // Apply custom CSS if any
          if (data.custom_css) {
            let customStyleElement = document.getElementById('custom-theme-css');
            if (!customStyleElement) {
              customStyleElement = document.createElement('style');
              customStyleElement.id = 'custom-theme-css';
              document.head.appendChild(customStyleElement);
            }
            customStyleElement.textContent = data.custom_css;
          }
        }
      } catch (err) {
        console.error('Error in loadAppearanceSettings:', err);
      }
    };

    loadAppearanceSettings();
  }, []);

  return (
    <AuthProvider>
      <AppSettingsProvider>
        <LanguageProvider>
          <Router>
            <AnalyticsScriptInjector />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<><Navigation /><Home /></>} />
              <Route path="/features" element={<><Navigation /><Features /></>} />
              <Route path="/help" element={<><Navigation /><Help /></>} />
              <Route path="/login" element={<><Navigation /><Login /></>} />
              <Route path="/register" element={<><Navigation /><Register /></>} />
              <Route path="/reset-password" element={<><Navigation /><ResetPassword /></>} />
              <Route path="/airtel-chat" element={<><Navigation /><AirtelChat /></>} />
              <Route path="/create-admin" element={<CreateAdmin />} />
              <Route path="/whatsapp-verification" element={<><Navigation /><WhatsAppVerification /></>} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/legal-notice" element={<LegalNotice />} />

              {/* Groq API Setup */}
              <Route path="/groq-setup" element={<GroqSetup />} />

              {/* All modules accessible to authenticated users */}
              <Route path="/whatsapp" element={
                <PrivateRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <Sidebar menuItems={menuItems} />
                      <main className="flex-1 overflow-y-auto">
                        <WhatsApp />
                      </main>
                    </div>
                  </ErrorBoundary>
                </PrivateRoute>
              } />
              <Route path="/customer-service" element={
                <PrivateRoute>
                  <div className="flex h-screen bg-gray-50">
                    <Sidebar menuItems={menuItems} />
                    <main className="flex-1 overflow-y-auto">
                      <CustomerService />
                    </main>
                  </div>
                </PrivateRoute>
              } />
              <Route path="/education" element={
                <PrivateRoute>
                  <div className="flex h-screen bg-gray-50">
                    <Sidebar menuItems={menuItems} />
                    <main className="flex-1 overflow-y-auto">
                      <Education />
                    </main>
                  </div>
                </PrivateRoute>
              } />
              <Route path="/quiz" element={
                <PrivateRoute>
                  <div className="flex h-screen bg-gray-50">
                    <Sidebar menuItems={menuItems} />
                    <main className="flex-1 overflow-y-auto">
                      <Quiz />
                    </main>
                  </div>
                </PrivateRoute>
              } />
              <Route path="/number-filtering" element={
                <PrivateRoute>
                  <div className="flex h-screen bg-gray-50">
                    <Sidebar menuItems={menuItems} />
                    <main className="flex-1 overflow-y-auto">
                      <NumberFiltering />
                    </main>
                  </div>
                </PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <div className="flex h-screen bg-gray-50">
                    <Sidebar menuItems={menuItems} />
                    <main className="flex-1 overflow-y-auto">
                      <Dashboard />
                    </main>
                  </div>
                </PrivateRoute>
              } />
              <Route path="/payments" element={
                <PrivateRoute>
                  <div className="flex h-screen bg-gray-50">
                    <Sidebar menuItems={menuItems} />
                    <main className="flex-1 overflow-y-auto">
                      <Payments />
                    </main>
                  </div>
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <div className="flex h-screen bg-gray-50">
                    <Sidebar menuItems={menuItems} />
                    <main className="flex-1 overflow-y-auto">
                      <SettingsPage />
                    </main>
                  </div>
                </PrivateRoute>
              } />
            </Routes>
          </Router>
        </LanguageProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );
}

export default App;