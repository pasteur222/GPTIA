import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Check, Globe, Webhook } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WebhookConfigFormProps {
  onSaved?: () => void;
}

const WebhookConfigForm: React.FC<WebhookConfigFormProps> = ({ onSaved }) => {
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadWebhookConfig();
  }, [user]);

  const loadWebhookConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get webhook URL from user_whatsapp_config
      const { data, error } = await supabase
        .from('user_whatsapp_config')
        .select('webhook_url')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading webhook config:', error);
        setError('Error loading webhook configuration');
        return;
      }

      if (data && data.webhook_url) {
        setWebhookUrl(data.webhook_url);
        // Extract verify token from URL if it contains one
        const url = new URL(data.webhook_url);
        const token = url.searchParams.get('verify_token');
        if (token) {
          setVerifyToken(token);
        }
      }
    } catch (error) {
      console.error('Error in loadWebhookConfig:', error);
      setError('Error loading webhook configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      setError('You must be logged in to update webhook configuration');
      return;
    }

    if (!webhookUrl) {
      setError('Webhook URL is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate URL format
      try {
        new URL(webhookUrl);
      } catch (e) {
        throw new Error('Invalid URL format');
      }

      // Get existing WhatsApp config
      const { data: existingConfig, error: configError } = await supabase
        .from('user_whatsapp_config')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (configError) {
        throw new Error(`Error checking existing config: ${configError.message}`);
      }

      if (existingConfig) {
        // Update existing config
        const { error: updateError } = await supabase
          .from('user_whatsapp_config')
          .update({
            webhook_url: webhookUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id);

        if (updateError) {
          throw new Error(`Error updating webhook URL: ${updateError.message}`);
        }
      } else {
        // No active config found, create a new one
        setError('No active WhatsApp configuration found. Please configure your WhatsApp API first.');
        return;
      }

      setSuccess('Webhook configuration saved successfully');
      
      if (onSaved) {
        onSaved();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving webhook config:', error);
      setError(error instanceof Error ? error.message : 'Error saving webhook configuration');
    } finally {
      setSaving(false);
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
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Webhook Configuration</h2>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-webhook-url.com/webhook"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <button
              onClick={handleSave}
              disabled={saving || !webhookUrl}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            The URL where WhatsApp will send webhook events
          </p>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Webhook className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-blue-800">About Webhooks</h3>
          </div>
          <p className="text-sm text-blue-600 mb-2">
            The webhook receives messages and status updates from WhatsApp and forwards them to your application.
            Make sure your webhook is properly deployed and accessible from the internet.
          </p>
          <p className="text-sm text-blue-600">
            Current webhook URL: <span className="font-medium">{webhookUrl || 'Not configured'}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebhookConfigForm;