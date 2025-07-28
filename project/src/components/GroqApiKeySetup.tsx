import React, { useState, useEffect } from 'react';
import { AlertCircle, Key, Save, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveGroqConfig, getGroqConfig } from '../lib/groq-config';
import { GROQ_MODELS } from '../lib/constants';

interface GroqApiKeySetupProps {
  onComplete?: () => void;
}

const GroqApiKeySetup: React.FC<GroqApiKeySetupProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_GROQ_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    if (user) {
      loadExistingConfig();
    }
  }, [user]);

  const loadExistingConfig = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const config = await getGroqConfig(user.id);
      setApiKey(config.apiKey);
      setModel(config.model);
      setHasExistingConfig(true);
    } catch (error) {
      // If no config exists, that's fine - we'll create one
      setHasExistingConfig(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      setError('You must be logged in to save API configuration');
      return;
    }

    if (!apiKey) {
      setError('API key is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Test the API key
      const testResponse = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!testResponse.ok) {
        throw new Error('Invalid API key. Please check and try again.');
      }
      
      // Save the configuration
      await saveGroqConfig(user.id, {
        apiKey,
        model
      });
      
      setSuccess('API key saved successfully');
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error saving Groq API key:', error);
      setError(error instanceof Error ? error.message : 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Key className="w-6 h-6 text-yellow-500" />
        <h2 className="text-xl font-semibold text-gray-900">Groq API Configuration</h2>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Groq API Key <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Your Groq API key for accessing AI models. Get it from{' '}
            <a 
              href="https://console.groq.com/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-yellow-600 hover:underline"
            >
              console.groq.com/keys
            </a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            {GROQ_MODELS.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            The default model to use for AI responses
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={loading || !apiKey}
            className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {hasExistingConfig ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {hasExistingConfig ? 'Update Configuration' : 'Save Configuration'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Why do I need a Groq API key?</h3>
        <p className="text-sm text-blue-600">
          Groq provides the AI capabilities for our education and customer service features. 
          By using your own API key, you maintain control over your usage and billing.
          Your key is stored securely and only used for your own requests.
        </p>
      </div>
    </div>
  );
};

export default GroqApiKeySetup;