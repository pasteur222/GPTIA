import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, Save, RefreshCw, X, Settings, MessageSquare, Globe, Shield, Clock, Users, Info, Webhook } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { initializeWhatsAppWebhook } from '../lib/whatsapp-client';
import BackButton from '../components/BackButton';
import WebhookConfigForm from './WebhookConfigForm';

interface WhatsAppConfig {
  id?: string;
  access_token: string;
  phone_number_id: string;
  webhook_url: string;
  app_id: string;
  app_secret: string;
  whatsapp_business_account_id: string;
  is_active: boolean;
  message_delay: number;
  max_retries: number;
  default_language: string;
  notification_email: string;
  rate_limit: {
    enabled: boolean;
    max_per_hour: number;
    cooldown_minutes: number;
  };
}

const WhatsAppConfig = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<WhatsAppConfig>({
    access_token: '',
    phone_number_id: '',
    webhook_url: '',
    app_id: '',
    app_secret: '',
    whatsapp_business_account_id: '',
    is_active: false,
    message_delay: 1000,
    max_retries: 3,
    default_language: 'fr',
    notification_email: '',
    rate_limit: {
      enabled: true,
      max_per_hour: 60,
      cooldown_minutes: 15
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'messaging' | 'security' | 'rate-limit' | 'webhook'>('general');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserConfig();
  }, [user]);

  const loadUserConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user-specific WhatsApp config
      const { data, error: configError } = await supabase
        .from('user_whatsapp_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (configError) throw configError;
      
      if (data) {
        // User has existing configuration
        setConfig({
          ...config,
          id: data.id,
          access_token: data.access_token || '',
          phone_number_id: data.phone_number_id || '',
          webhook_url: data.webhook_url || '',
          app_id: data.app_id || '',
          app_secret: data.app_secret || '',
          whatsapp_business_account_id: data.whatsapp_business_account_id || '',
          is_active: data.is_active || false,
          // Keep default values for other fields if not present in the data
          message_delay: data.message_delay || 1000,
          max_retries: data.max_retries || 3,
          default_language: data.default_language || 'fr',
          notification_email: data.notification_email || '',
          rate_limit: data.rate_limit || config.rate_limit
        });
      }
    } catch (err) {
      console.error('Error loading WhatsApp config:', err);
      setError('Failed to load your WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate required fields
      if (!config.access_token || !config.phone_number_id || !config.webhook_url) {
        throw new Error('Please fill in all required fields (Access Token, Phone Number ID, Webhook URL)');
      }

      // Test connection with WhatsApp API
      const response = await fetch(`https://graph.facebook.com/v18.0/${config.phone_number_id}`, {
        headers: {
          'Authorization': `Bearer ${config.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error('Failed to connect to WhatsApp API. Please check your credentials.');
      }

      // Prepare data for saving
      const configToSave = {
        user_id: user.id,
        access_token: config.access_token,
        phone_number_id: config.phone_number_id,
        webhook_url: config.webhook_url,
        app_id: config.app_id || '',
        app_secret: config.app_secret || '',
        whatsapp_business_account_id: config.whatsapp_business_account_id || '',
        is_active: true, // Set to true since connection test passed
        message_delay: config.message_delay,
        max_retries: config.max_retries,
        default_language: config.default_language,
        notification_email: config.notification_email,
        rate_limit: config.rate_limit,
        updated_at: new Date().toISOString()
      };

      let saveResult;
      if (config.id) {
        // Update existing config
        saveResult = await supabase
          .from('user_whatsapp_config')
          .update(configToSave)
          .eq('id', config.id);
      } else {
        // Insert new config
        saveResult = await supabase
          .from('user_whatsapp_config')
          .insert(configToSave);
      }

      if (saveResult.error) throw saveResult.error;

      setSuccess('Your WhatsApp configuration has been saved and connected successfully!');
      
      // Reload the config to get the updated data
      await loadUserConfig();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while saving the configuration');
      
      // Update connection status to false if there was an error
      setConfig(prev => ({
        ...prev,
        is_active: false
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setConfig(prev => ({
      ...prev,
      [e.target.name]: value
    }));
  };

  const handleRateLimitChange = (field: keyof typeof config.rate_limit, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      rate_limit: {
        ...prev.rate_limit,
        [field]: value
      }
    }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App ID
              </label>
              <input
                type="text"
                name="app_id"
                value={config.app_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Optional - Meta App ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Secret
              </label>
              <input
                type="password"
                name="app_secret"
                value={config.app_secret}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Optional - Meta App Secret"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Business Account ID
              </label>
              <input
                type="text"
                name="whatsapp_business_account_id"
                value={config.whatsapp_business_account_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Optional - WhatsApp Business Account ID"
              />
              <p className="mt-1 text-sm text-gray-500">
                Used to retrieve your approved message templates from Meta
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Language
              </label>
              <select
                name="default_language"
                value={config.default_language}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Email
              </label>
              <input
                type="email"
                name="notification_email"
                value={config.notification_email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="notifications@example.com"
              />
            </div>
          </div>
        );

      case 'messaging':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Delay (ms)
              </label>
              <input
                type="number"
                name="message_delay"
                value={config.message_delay}
                onChange={handleInputChange}
                min={500}
                max={5000}
                step={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Delay between messages in bulk sending (500ms - 5000ms)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                name="max_retries"
                value={config.max_retries}
                onChange={handleInputChange}
                min={1}
                max={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Maximum number of retry attempts for failed messages
              </p>
            </div>
          </div>
        );

      case 'rate-limit':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={config.rate_limit.enabled}
                onChange={(e) => handleRateLimitChange('enabled', e.target.checked)}
                className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Enable Rate Limiting
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Messages per Hour
              </label>
              <input
                type="number"
                value={config.rate_limit.max_per_hour}
                onChange={(e) => handleRateLimitChange('max_per_hour', parseInt(e.target.value))}
                min={1}
                max={1000}
                disabled={!config.rate_limit.enabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooldown Period (minutes)
              </label>
              <input
                type="number"
                value={config.rate_limit.cooldown_minutes}
                onChange={(e) => handleRateLimitChange('cooldown_minutes', parseInt(e.target.value))}
                min={1}
                max={60}
                disabled={!config.rate_limit.enabled}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Rate Limiting Information</h4>
              <p className="text-sm text-blue-600">
                Rate limiting helps prevent spam and ensures fair usage of the WhatsApp API.
                When enabled, auto-replies will be limited to the specified number of messages per hour,
                with a cooldown period for recipients who reach the limit.
              </p>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="access_token"
                value={config.access_token}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
                placeholder="EAABwzLixnjYBO..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Permanent access token generated in Meta for Developers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="phone_number_id"
                value={config.phone_number_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
                placeholder="123456789012345"
              />
              <p className="mt-1 text-sm text-gray-500">
                WhatsApp Business phone number ID
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="webhook_url"
                value={config.webhook_url}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
                placeholder="https://your-webhook-url.com/webhook"
              />
              <p className="mt-1 text-sm text-gray-500">
                URL where WhatsApp will send webhook events
              </p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Your WhatsApp Configuration</h2>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm ${
            config.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {config.is_active ? 'Connected' : 'Not connected'}
          </div>
        </div>
      </div>

      <div className="border-b">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 border-b-2 text-sm font-medium ${
              activeTab === 'general'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-5 h-5 inline-block mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab('messaging')}
            className={`px-6 py-3 border-b-2 text-sm font-medium ${
              activeTab === 'messaging'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5 inline-block mr-2" />
            Messaging
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 border-b-2 text-sm font-medium ${
              activeTab === 'security'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="w-5 h-5 inline-block mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('rate-limit')}
            className={`px-6 py-3 border-b-2 text-sm font-medium ${
              activeTab === 'rate-limit'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-5 h-5 inline-block mr-2" />
            Rate Limiting
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`px-6 py-3 border-b-2 text-sm font-medium ${
              activeTab === 'webhook'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Webhook className="w-5 h-5 inline-block mr-2" />
            Webhook
          </button>
        </nav>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <RefreshCw className="w-5 h-5" />
            {success}
          </div>
        )}

        {!config.is_active && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-800">WhatsApp Configuration Required</h3>
            </div>
            <p className="text-sm text-blue-700">
              Please configure your personal WhatsApp Business API credentials to enable WhatsApp functionality. 
              You'll need to provide at minimum the Access Token, Phone Number ID, and Webhook URL.
            </p>
          </div>
        )}

        {activeTab === 'webhook' && (
          <WebhookConfigForm onSaved={() => setSuccess('Webhook configuration saved successfully')} />
        )}

        <form onSubmit={handleSubmit}>
          {renderTabContent()}

          <div className="mt-6 pt-4 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save and test connection
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-800">Personal Configuration</h3>
          </div>
          <p className="text-sm text-blue-600 mb-2">
            This is your personal WhatsApp Business API configuration. It will be used for all your WhatsApp interactions within the platform.
          </p>
          <p className="text-sm text-blue-600">
            To obtain these credentials, you need to:
          </p>
          <ol className="text-sm text-blue-600 list-decimal list-inside mt-2 space-y-1">
            <li>Create a Meta Developer account</li>
            <li>Set up a WhatsApp Business API application</li>
            <li>Configure a phone number</li>
            <li>Generate a permanent access token</li>
            <li>Set up a webhook endpoint</li>
            <li>Find your WhatsApp Business Account ID in Meta Business Manager</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConfig;