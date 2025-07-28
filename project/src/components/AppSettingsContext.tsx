import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AppSettings {
  app_name: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  footer_text: string;
  company_name: string;
  social_links: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

interface AppSettingsContextType {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  app_name: 'MTN GPT',
  contact_email: 'contact@mtngpt.com',
  contact_phone: '+221 XX XXX XX XX',
  contact_address: 'Brazzaville, République du Congo',
  footer_text: 'Fait avec ❤️ par la start-up Ecopa\'n en République du Congo',
  company_name: 'Ecopa\'n',
  social_links: {
    facebook: 'https://facebook.com/',
    twitter: 'https://twitter.com/',
    instagram: 'https://instagram.com/',
    linkedin: 'https://linkedin.com/'
  }
};

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  error: null,
  refreshSettings: async () => {}
});

export const useAppSettings = () => useContext(AppSettingsContext);

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading app settings:', err);
      setError('Failed to load application settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <AppSettingsContext.Provider value={{ 
      settings, 
      loading, 
      error, 
      refreshSettings: loadSettings 
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
};