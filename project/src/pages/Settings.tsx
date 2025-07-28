import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, UserCircle, Lock, MessageSquare, Settings as SettingsIcon, CreditCard, BarChart2, Globe, Webhook, Database, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/BackButton';
import { GROQ_MODELS, DEFAULT_GROQ_MODEL } from '../lib/constants';
import WhatsAppConfig from '../components/WhatsAppConfig';
import PaymentApiConfig from '../components/PaymentApiConfig';
import PricingManager from '../components/PricingManager';
import ExternalAnalytics from '../components/ExternalAnalytics';
import AppSettingsManager from '../components/AppSettingsManager';
import ContactManagement from '../components/ContactManagement';
import ProfileImageUpload from '../components/ProfileImageUpload';
import AppearanceSettings from '../components/AppearanceSettings';
import WebhookConfigForm from '../components/WebhookConfigForm';

const Settings = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [webhookConfig, setWebhookConfig] = useState({
    url: '',
    verify_token: '',
    is_active: false
  });
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookSuccess, setWebhookSuccess] = useState<string | null>(null);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState(DEFAULT_GROQ_MODEL);
  const [groqLoading, setGroqLoading] = useState(false);
  const [groqError, setGroqError] = useState<string | null>(null);
  const [groqSuccess, setGroqSuccess] = useState<string | null>(null);
  const [profileImageChanged, setProfileImageChanged] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [logoutSuccess, setLogoutSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadGroqConfig();
      loadWebhookConfig();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get user profile from Supabase
      const { data, error } = await supabase
        .from('profils_utilisateurs')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadWebhookConfig = async () => {
    try {
      setWebhookLoading(true);
      
      // Get webhook configuration from Supabase
      const { data, error } = await supabase
        .from('webhook_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        // If the table doesn't exist, we'll create it later
        if (error.code === '42P01') {
          console.warn('webhook_config table does not exist yet');
          return;
        }
        throw error;
      }
      
      if (data) {
        setWebhookConfig({
          url: data.url || '',
          verify_token: data.verify_token || '',
          is_active: data.is_active || false
        });
      }
    } catch (error) {
      console.error('Error loading webhook config:', error);
      setWebhookError('Failed to load webhook configuration');
    } finally {
      setWebhookLoading(false);
    }
  };

  const loadGroqConfig = async () => {
    try {
      if (!user?.id) {
        return;
      }
      
      setGroqLoading(true);
      setGroqError(null);

      // Get user's Groq API configuration from database
      const { data, error } = await supabase
        .from('user_groq_config')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (data) {
        setGroqApiKey(data.api_key || '');
        setGroqModel(data.model || 'mixtral-8x7b-32768');
      }
    } catch (error) {
      console.error('Error loading Groq config:', error);
      setGroqError('Failed to load Groq API configuration');
    } finally {
      setGroqLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Update user profile in Supabase
      const { error } = await supabase
        .from('profils_utilisateurs')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone_number: profile.phone_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      
      setSuccess('Profile updated successfully');
      setProfileImageChanged(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileImageChanged(true);
  };

  const handleSaveWebhookConfig = async () => {
    try {
      setWebhookLoading(true);
      setWebhookError(null);
      setWebhookSuccess(null);
      
      // Check if webhook_config table exists
      const { error: tableCheckError } = await supabase
        .from('webhook_config')
        .select('id')
        .limit(1);
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        // Table doesn't exist, create it
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS webhook_config (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            url text,
            verify_token text,
            is_active boolean DEFAULT false,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
          );
          
          ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Authenticated users can manage webhook config"
            ON webhook_config
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (createError) {
          console.error('Error creating webhook_config table:', createError);
          throw new Error('Failed to create webhook configuration table');
        }
      }
      
      // Get existing webhook config
      const { data: existingConfig, error: getError } = await supabase
        .from('webhook_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (getError && getError.code !== '42P01') throw getError;
      
      if (existingConfig) {
        // Update existing config
        const { error: updateError } = await supabase
          .from('webhook_config')
          .update({
            url: webhookConfig.url,
            verify_token: webhookConfig.verify_token,
            is_active: webhookConfig.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id);
        
        if (updateError) throw updateError;
      } else {
        // Insert new config
        const { error: insertError } = await supabase
          .from('webhook_config')
          .insert([{
            url: webhookConfig.url,
            verify_token: webhookConfig.verify_token,
            is_active: webhookConfig.is_active
          }]);
        
        if (insertError) throw insertError;
      }
      
      setWebhookSuccess('Webhook configuration saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setWebhookSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving webhook config:', error);
      setWebhookError(`Error saving webhook config: ${error.message}`);
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleSaveGroqConfig = async () => {
    try {
      if (!user?.id) {
        setGroqError('User not authenticated');
        return;
      }

      if (!groqApiKey) {
        setGroqError('API key is required');
        return;
      }

      setGroqLoading(true);
      setGroqError(null);
      setGroqSuccess(null);
      
      // Get existing Groq config
      const { data: existingConfig, error: getError } = await supabase
        .from('user_groq_config')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (getError) throw getError;
      
      if (existingConfig) {
        // Update existing config
        const { error: updateError } = await supabase
          .from('user_groq_config')
          .update({
            api_key: groqApiKey,
            model: groqModel,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id);
        
        if (updateError) throw updateError;
      } else {
        // Insert new config
        const { error: insertError } = await supabase
          .from('user_groq_config')
          .insert([{
            user_id: user?.id,
            api_key: groqApiKey,
            model: groqModel
          }]);
        
        if (insertError) throw insertError;
      }
      
      setGroqSuccess('Groq API configuration saved successfully');
      
      // Test the API key by making a simple request
      try {
        const testResponse = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!testResponse.ok) {
          setGroqSuccess('Configuration saved, but API key validation failed. Please check your API key.');
        }
      } catch (testError) {
        console.error('Error testing Groq API key:', testError);
        setGroqSuccess('Configuration saved, but API key validation failed. Please check your API key.');
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setGroqSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving Groq config:', error);
      setGroqError(`Error saving Groq API configuration: ${error.message}`);
    } finally {
      setGroqLoading(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      setLogoutLoading(true);
      setLogoutError(null);
      setLogoutSuccess(null);
      
      // Sign out from all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) throw error;
      
      setLogoutSuccess('Toutes les sessions ont été déconnectées avec succès');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        signOut();
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Error logging out all sessions:', error);
      setLogoutError('Erreur lors de la déconnexion des sessions');
    } finally {
      setLogoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Paramètres</h1>

        <div className="flex">
          <div className="w-64 pr-8">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'profile'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span>Profil</span>
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'whatsapp'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span>WhatsApp API</span>
              </button>
              <button
                onClick={() => setActiveTab('webhook')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'webhook'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Webhook className="w-5 h-5" />
                <span>Webhook</span>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'ai'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Database className="w-5 h-5" />
                <span>AI API</span>
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'pricing'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Tarification</span>
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'payment'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>API de Paiement</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'analytics'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BarChart2 className="w-5 h-5" />
                <span>Analytiques</span>
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'contacts'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Contacts</span>
              </button>
              <button
                onClick={() => setActiveTab('app')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'app'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span>Paramètres App</span>
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'appearance'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Palette className="w-5 h-5" />
                <span>Apparence</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left rounded-lg ${
                  activeTab === 'security'
                    ? 'bg-yellow-50 text-yellow-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-5 h-5" />
                <span>Sécurité</span>
              </button>
            </div>
          </div>

          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profil Utilisateur</h2>
                
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {success}
                  </div>
                )}
                
                <div className="flex items-start gap-8 mb-8">
                  <div>
                    <ProfileImageUpload 
                      userId={user?.id} 
                      onImageChange={handleImageChange}
                    />
                    <p className="mt-2 text-sm text-gray-500 text-center">
                      Cliquez pour modifier
                    </p>
                  </div>
                  
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prénom
                        </label>
                        <input
                          type="text"
                          value={profile?.first_name || ''}
                          onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom
                        </label>
                        <input
                          type="text"
                          value={profile?.last_name || ''}
                          onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile?.email || user?.email || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        L'adresse email ne peut pas être modifiée
                      </p>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={profile?.phone_number || ''}
                        onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <WhatsAppConfig />
            )}

            {activeTab === 'webhook' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Webhook Configuration</h2>
                <WebhookConfigForm />
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Webhook className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-blue-800">About Webhooks</h3>
                  </div>
                  <p className="text-sm text-blue-600 mb-2">
                    A webhook is a bridge between WhatsApp and your application. It receives messages and status updates from WhatsApp and forwards them to your application for processing.
                  </p>
                  <p className="text-sm text-blue-600">
                    For proper functionality, ensure your webhook server is deployed and accessible from the internet. Configure the same URL in your Meta Developer Dashboard.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuration API IA</h2>
                
                {groqError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {groqError}
                  </div>
                )}
                
                {groqSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {groqSuccess}
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clé API Groq <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Votre clé API Groq pour accéder aux modèles d'IA. Obtenez-la sur <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:underline">console.groq.com/keys</a>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modèle par défaut
                    </label>
                    <select
                      value={groqModel}
                      onChange={(e) => setGroqModel(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" 
                    >
                      {GROQ_MODELS.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Le modèle d'IA utilisé par défaut pour les réponses
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveGroqConfig}
                      disabled={groqLoading || !groqApiKey}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                      {groqLoading ? 'Enregistrement...' : 'Enregistrer la configuration'}
                    </button>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">À propos de la configuration Groq</h3>
                    <p className="text-sm text-blue-600">
                      Groq est un service d'IA qui fournit des modèles de langage avancés. Vous devez configurer votre propre clé API pour utiliser ces fonctionnalités.
                      Votre clé API est stockée de manière sécurisée et n'est utilisée que pour vos propres requêtes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <PricingManager />
            )}

            {activeTab === 'payment' && (
              <PaymentApiConfig />
            )}

            {activeTab === 'analytics' && (
              <ExternalAnalytics />
            )}

            {activeTab === 'contacts' && (
              <ContactManagement />
            )}

            {activeTab === 'app' && (
              <AppSettingsManager />
            )}

            {activeTab === 'appearance' && (
              <AppearanceSettings />
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Sécurité</h2>
                
                {logoutError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {logoutError}
                  </div>
                )}
                
                {logoutSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {logoutSuccess}
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Changer le mot de passe</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe actuel
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nouveau mot de passe
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmer le nouveau mot de passe
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <button
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                        >
                          Changer le mot de passe
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Sessions actives</h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Session actuelle</p>
                            <p className="text-sm text-gray-500">Dernière activité: {new Date().toLocaleString()}</p>
                          </div>
                          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            Actif
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLogoutAllSessions}
                        disabled={logoutLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {logoutLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Déconnexion en cours...
                          </>
                        ) : (
                          'Déconnecter toutes les autres sessions'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;