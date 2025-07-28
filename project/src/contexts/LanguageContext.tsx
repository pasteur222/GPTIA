import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Define available languages
export type Language = 'fr' | 'en';

// Define the context type
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key,
});

// Hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

// Translation provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({
    fr: {},
    en: {},
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load translations from database or local storage
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // First try to get from local storage
        const storedLanguage = localStorage.getItem('language') as Language;
        if (storedLanguage && (storedLanguage === 'fr' || storedLanguage === 'en')) {
          setLanguageState(storedLanguage);
        }

        // Load translations from database
        const { data, error } = await supabase
          .from('translations')
          .select('*');

        if (error) {
          console.error('Error loading translations:', error);
          // Fall back to built-in translations
          setTranslations({
            fr: frTranslations,
            en: enTranslations,
          });
        } else if (data && data.length > 0) {
          // Process database translations
          const fr: Record<string, string> = {};
          const en: Record<string, string> = {};
          
          data.forEach(item => {
            fr[item.key] = item.fr;
            en[item.key] = item.en;
          });
          
          setTranslations({
            fr: { ...frTranslations, ...fr },
            en: { ...enTranslations, ...en },
          });
        } else {
          // Fall back to built-in translations
          setTranslations({
            fr: frTranslations,
            en: enTranslations,
          });
        }
      } catch (error) {
        console.error('Error in loadTranslations:', error);
        // Fall back to built-in translations
        setTranslations({
          fr: frTranslations,
          en: enTranslations,
        });
      } finally {
        setIsLoaded(true);
      }
    };

    loadTranslations();
  }, []);

  // Function to change language
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  };

  // Translation function
  const t = (key: string): string => {
    if (!isLoaded) return key;
    
    const currentTranslations = translations[language];
    return currentTranslations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Default translations
const frTranslations: Record<string, string> = {
  // Navigation
  'nav.features': 'Nos Fonctionnalités',
  'nav.help': 'Aide',
  'nav.login': 'Se connecter',
  'nav.register': 'S\'inscrire',
  'nav.subscriptions': 'Abonnements',
  'nav.professional': 'Abonnement Professionnel',
  'nav.educational': 'Abonnement Educatif',
  
  // Sidebar
  'sidebar.whatsapp': 'WhatsApp',
  'sidebar.customerservice': 'Service Client',
  'sidebar.education': 'Éducation',
  'sidebar.quiz': 'Quiz',
  'sidebar.payments': 'Paiements',
  'sidebar.business': 'Business',
  'sidebar.dashboard': 'Tableau de Bord',
  'sidebar.numberfiltering': 'Filtrage des numéros',
  'sidebar.settings': 'Paramètres',
  
  // Settings
  'settings.title': 'Paramètres',
  'settings.profile': 'Profil',
  'settings.appearance': 'Apparence',
  'settings.whatsapp': 'WhatsApp',
  'settings.whatsappApi': 'WhatsApp API',
  'settings.aiApi': 'AI API',
  'settings.pricing': 'Tarification',
  'settings.paymentApi': 'API de Paiement',
  'settings.analytics': 'Analytiques',
  'settings.appSettings': 'Paramètres App',
  'settings.security': 'Sécurité',
  'settings.language': 'Langue',
  'settings.save': 'Enregistrer',
  'settings.cancel': 'Annuler',
  
  // App Settings
  'appSettings.title': 'Paramètres de l\'Application',
  'appSettings.edit': 'Modifier',
  'appSettings.generalInfo': 'Informations Générales',
  'appSettings.appLogo': 'Logo de l\'Application',
  'appSettings.changeLogo': 'Changer le logo',
  'appSettings.appName': 'Nom de l\'Application',
  'appSettings.companyName': 'Nom de l\'Entreprise',
  'appSettings.contactInfo': 'Informations de Contact',
  'appSettings.contactEmail': 'Email de Contact',
  'appSettings.contactPhone': 'Téléphone de Contact',
  'appSettings.address': 'Adresse',
  'appSettings.footer': 'Pied de Page',
  'appSettings.footerText': 'Texte du Pied de Page',
  'appSettings.socialMedia': 'Réseaux Sociaux',
  'appSettings.language': 'Langue de l\'Application',
  'appSettings.selectLanguage': 'Sélectionner la langue',
  'appSettings.french': 'Français',
  'appSettings.english': 'Anglais',
  
  // Common
  'common.loading': 'Chargement...',
  'common.error': 'Erreur',
  'common.success': 'Succès',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.edit': 'Modifier',
  'common.delete': 'Supprimer',
  'common.back': 'Retour',
  'common.next': 'Suivant',
  'common.send': 'Envoyer',
  'common.active': 'Actif',
  'common.inactive': 'Inactif',
};

const enTranslations: Record<string, string> = {
  // Navigation
  'nav.features': 'Our Features',
  'nav.help': 'Help',
  'nav.login': 'Login',
  'nav.register': 'Sign Up',
  'nav.subscriptions': 'Subscriptions',
  'nav.professional': 'Professional Subscription',
  'nav.educational': 'Educational Subscription',
  
  // Sidebar
  'sidebar.whatsapp': 'WhatsApp',
  'sidebar.customerservice': 'Customer Service',
  'sidebar.education': 'Education',
  'sidebar.quiz': 'Quiz',
  'sidebar.payments': 'Payments',
  'sidebar.business': 'Business',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.numberfiltering': 'Number Filtering',
  'sidebar.settings': 'Settings',
  
  // Settings
  'settings.title': 'Settings',
  'settings.profile': 'Profile',
  'settings.appearance': 'Appearance',
  'settings.whatsapp': 'WhatsApp',
  'settings.whatsappApi': 'WhatsApp API',
  'settings.aiApi': 'AI API',
  'settings.pricing': 'Pricing',
  'settings.paymentApi': 'Payment API',
  'settings.analytics': 'Analytics',
  'settings.appSettings': 'App Settings',
  'settings.security': 'Security',
  'settings.language': 'Language',
  'settings.save': 'Save',
  'settings.cancel': 'Cancel',
  
  // App Settings
  'appSettings.title': 'Application Settings',
  'appSettings.edit': 'Edit',
  'appSettings.generalInfo': 'General Information',
  'appSettings.appLogo': 'Application Logo',
  'appSettings.changeLogo': 'Change Logo',
  'appSettings.appName': 'Application Name',
  'appSettings.companyName': 'Company Name',
  'appSettings.contactInfo': 'Contact Information',
  'appSettings.contactEmail': 'Contact Email',
  'appSettings.contactPhone': 'Contact Phone',
  'appSettings.address': 'Address',
  'appSettings.footer': 'Footer',
  'appSettings.footerText': 'Footer Text',
  'appSettings.socialMedia': 'Social Media',
  'appSettings.language': 'Application Language',
  'appSettings.selectLanguage': 'Select language',
  'appSettings.french': 'French',
  'appSettings.english': 'English',
  
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.send': 'Send',
  'common.active': 'Active',
  'common.inactive': 'Inactive',
};

export default LanguageContext;