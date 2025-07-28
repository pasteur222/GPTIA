import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, AlertCircle, Check, Building, Mail, Phone, MapPin, Globe, Heart, Edit, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppSettings } from './AppSettingsContext';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';

interface AppSettingsManagerProps {
  onClose?: () => void;
}

interface AppSettings {
  id?: string;
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
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  app_name: 'Airtel GPT',
  contact_email: 'contact@airtelgpt.com',
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

const AppSettingsManager: React.FC<AppSettingsManagerProps> = ({ onClose }) => {
  const { refreshSettings } = useAppSettings();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: checkError } = await supabase
        .from('app_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) throw checkError;
      
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading app settings:', err);
      setError('Erreur lors du chargement des paramètres de l\'application');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (!settings.app_name || !settings.contact_email) {
        setError('Le nom de l\'application et l\'email de contact sont requis');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.contact_email)) {
        setError('Format d\'email invalide');
        return;
      }

      // Validate URL formats
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      const socialLinks = settings.social_links;
      for (const [key, value] of Object.entries(socialLinks)) {
        if (value && !urlRegex.test(value)) {
          setError(`Format d'URL invalide pour ${key}`);
          return;
        }
      }

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('app_settings')
          .update({
            app_name: settings.app_name,
            contact_email: settings.contact_email,
            contact_phone: settings.contact_phone,
            contact_address: settings.contact_address,
            footer_text: settings.footer_text,
            company_name: settings.company_name,
            social_links: settings.social_links,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('app_settings')
          .insert([{
            app_name: settings.app_name,
            contact_email: settings.contact_email,
            contact_phone: settings.contact_phone,
            contact_address: settings.contact_address,
            footer_text: settings.footer_text,
            company_name: settings.company_name,
            social_links: settings.social_links
          }]);

        if (error) throw error;
      }

      setSuccess('Paramètres de l\'application enregistrés avec succès');
      setIsEditing(false);
      
      // Refresh settings in context
      refreshSettings();
      
      // Reload settings in this component
      loadSettings();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving app settings:', err);
      setError('Erreur lors de l\'enregistrement des paramètres de l\'application');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('appSettings.title')}</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Edit className="w-4 h-4" />
            {t('appSettings.edit')}
          </button>
        ) : (
          <button
            onClick={() => {
              setIsEditing(false);
              loadSettings(); // Reload original settings
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
            {t('common.cancel')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-gray-500" />
            {t('appSettings.generalInfo')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('appSettings.appName')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={settings.app_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, app_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Airtel GPT"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.app_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('appSettings.companyName')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ecopa'n"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.company_name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-500" />
            {t('appSettings.contactInfo')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('appSettings.contactEmail')}
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="contact@airtelgpt.com"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.contact_email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('appSettings.contactPhone')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="+221 XX XXX XX XX"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.contact_phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('appSettings.address')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={settings.contact_address}
                  onChange={(e) => setSettings(prev => ({ ...prev, contact_address: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Brazzaville, République du Congo"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.contact_address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-gray-500" />
            {t('appSettings.footer')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('appSettings.footerText')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={settings.footer_text}
                  onChange={(e) => setSettings(prev => ({ ...prev, footer_text: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Fait avec ❤️ par la start-up Ecopa'n en République du Congo"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.footer_text}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-500" />
            {t('appSettings.socialMedia')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={settings.social_links.facebook || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    social_links: {
                      ...prev.social_links,
                      facebook: e.target.value
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="https://facebook.com/votrepage"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.social_links.facebook || 'Non défini'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitter
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={settings.social_links.twitter || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    social_links: {
                      ...prev.social_links,
                      twitter: e.target.value
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="https://twitter.com/votrecompte"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.social_links.twitter || 'Non défini'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={settings.social_links.instagram || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    social_links: {
                      ...prev.social_links,
                      instagram: e.target.value
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="https://instagram.com/votrecompte"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.social_links.instagram || 'Non défini'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={settings.social_links.linkedin || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    social_links: {
                      ...prev.social_links,
                      linkedin: e.target.value
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="https://linkedin.com/company/votreentreprise"
                />
              ) : (
                <p className="text-gray-900 py-2 px-4 bg-white border border-gray-200 rounded-lg">
                  {settings.social_links.linkedin || 'Non défini'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-500" />
            {t('appSettings.language')}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('appSettings.selectLanguage')}
              </label>
              <LanguageSelector variant="buttons" />
              <p className="mt-2 text-sm text-gray-500">
                Cette option change la langue de l'interface pour tous les utilisateurs.
              </p>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsEditing(false);
                loadSettings(); // Reload original settings
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('common.save')}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppSettingsManager;