import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Check, CreditCard, Smartphone, Globe, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentApiConfigProps {
  onClose?: () => void;
}

interface PaymentConfig {
  id?: string;
  provider: string;
  client_id: string;
  client_secret: string;
  is_active: boolean;
  additional_config?: Record<string, string>;
}

const PAYMENT_PROVIDERS = [
  { id: 'airtel', name: 'Airtel Money', icon: Smartphone, color: 'red' },
  { id: 'mtn', name: 'MTN Mobile Money', icon: Smartphone, color: 'yellow' },
  { id: 'vodacom', name: 'Vodacom M-Pesa', icon: Smartphone, color: 'red' },
  { id: 'orange', name: 'Orange Money', icon: Smartphone, color: 'orange' },
  { id: 'africell', name: 'Africell Money', icon: Smartphone, color: 'red' },
  { id: 'moov', name: 'Moov Money', icon: Smartphone, color: 'blue' },
  { id: 'stripe', name: 'Stripe', icon: CreditCard, color: 'purple' },
  { id: 'paypal', name: 'PayPal', icon: Globe, color: 'blue' }
];

const PROVIDER_FIELDS: Record<string, { name: string; fields: Array<{ key: string; label: string; type: string; placeholder: string }> }> = {
  airtel: {
    name: 'Airtel Money',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: '4e6cf8f4-5e0c-40b4-af8e-bb7c0742fd0e' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'api_endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://openapi.airtel.africa' },
      { key: 'country_code', label: 'Country Code', type: 'text', placeholder: 'CG' }
    ]
  },
  mtn: {
    name: 'MTN Mobile Money',
    fields: [
      { key: 'client_id', label: 'API User', type: 'text', placeholder: 'api_user_123' },
      { key: 'client_secret', label: 'API Key', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'api_endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://api.mtn.com/collection/v1' },
      { key: 'subscription_key', label: 'Subscription Key', type: 'password', placeholder: '••••••••••••••••' }
    ]
  },
  vodacom: {
    name: 'Vodacom M-Pesa',
    fields: [
      { key: 'client_id', label: 'API Key', type: 'text', placeholder: 'api_key_123' },
      { key: 'client_secret', label: 'API Secret', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'api_endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://openapi.m-pesa.com/sandbox' }
    ]
  },
  orange: {
    name: 'Orange Money',
    fields: [
      { key: 'client_id', label: 'Merchant ID', type: 'text', placeholder: 'merchant_123' },
      { key: 'client_secret', label: 'API Key', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'api_endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://api.orange.com/orange-money-webpay' }
    ]
  },
  africell: {
    name: 'Africell Money',
    fields: [
      { key: 'client_id', label: 'Merchant ID', type: 'text', placeholder: 'merchant_123' },
      { key: 'client_secret', label: 'API Key', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'api_endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://api.africell.com/payments' }
    ]
  },
  moov: {
    name: 'Moov Money',
    fields: [
      { key: 'client_id', label: 'Merchant ID', type: 'text', placeholder: 'merchant_123' },
      { key: 'client_secret', label: 'API Key', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'api_endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://api.moov.com/payments' }
    ]
  },
  stripe: {
    name: 'Stripe',
    fields: [
      { key: 'client_id', label: 'Publishable Key', type: 'text', placeholder: 'pk_test_123456789' },
      { key: 'client_secret', label: 'Secret Key', type: 'password', placeholder: 'sk_test_123456789' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_123456789' }
    ]
  },
  paypal: {
    name: 'PayPal',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'AeA1QIZXXXXXXXXXXXXXXXXXXXXXXXXbdYn' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••••••••••' },
      { key: 'mode', label: 'Mode', type: 'select', placeholder: 'sandbox' }
    ]
  }
};

const PaymentApiConfig: React.FC<PaymentApiConfigProps> = ({ onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('airtel');
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<PaymentConfig>({
    provider: 'airtel',
    client_id: '',
    client_secret: '',
    is_active: true,
    additional_config: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    // When selected provider changes, load its config
    const config = configs.find(c => c.provider === selectedProvider);
    if (config) {
      setCurrentConfig(config);
    } else {
      // Reset to default if no config exists
      setCurrentConfig({
        provider: selectedProvider,
        client_id: '',
        client_secret: '',
        is_active: true,
        additional_config: {}
      });
    }
  }, [selectedProvider, configs]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: checkError } = await supabase
        .from('payment_api_config')
        .select('*');

      if (checkError) throw checkError;
      
      // Transform data to include additional_config
      const transformedConfigs = data?.map(item => {
        const { id, provider, client_id, client_secret, is_active, ...additionalFields } = item;
        
        // Remove standard fields from additionalFields
        delete additionalFields.updated_at;
        
        return {
          id,
          provider,
          client_id,
          client_secret,
          is_active,
          additional_config: additionalFields
        };
      }) || [];

      setConfigs(transformedConfigs);

      // Set initial selected provider config if available
      const initialConfig = transformedConfigs.find(c => c.provider === 'airtel');
      if (initialConfig) {
        setCurrentConfig(initialConfig);
        setSelectedProvider('airtel');
      }
    } catch (err) {
      console.error('Error loading payment configs:', err);
      setError('Erreur lors du chargement des configurations de paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Prepare data for upsert
      const { id, additional_config, ...baseConfig } = currentConfig;
      
      // Combine base config with additional fields
      const configToSave = {
        ...baseConfig,
        ...(additional_config || {})
      };

      // Upsert config to the database
      const { error } = await supabase
        .from('payment_api_config')
        .upsert(id ? { id, ...configToSave } : configToSave, { onConflict: 'provider' });

      if (error) throw error;

      // Reload configs to get the updated list
      await loadConfigs();
      
      setSuccess('Configuration de paiement enregistrée avec succès');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving payment config:', error);
      setError('Erreur lors de l\'enregistrement de la configuration de paiement');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      // Handle nested fields (additional_config)
      const [parent, child] = field.split('.');
      setCurrentConfig(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof PaymentConfig] as Record<string, string>),
          [child]: value
        }
      }));
    } else {
      // Handle top-level fields
      setCurrentConfig(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAdditionalFieldChange = (key: string, value: string) => {
    setCurrentConfig(prev => ({
      ...prev,
      additional_config: {
        ...(prev.additional_config || {}),
        [key]: value
      }
    }));
  };

  const renderProviderFields = () => {
    const providerConfig = PROVIDER_FIELDS[selectedProvider];
    if (!providerConfig) return null;

    return (
      <div className="space-y-4">
        {providerConfig.fields.map(field => {
          // Determine if this is a standard field or additional field
          const isStandardField = field.key === 'client_id' || field.key === 'client_secret';
          const value = isStandardField 
            ? currentConfig[field.key as keyof PaymentConfig] as string
            : (currentConfig.additional_config?.[field.key] || '');

          return (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={value}
                  onChange={(e) => isStandardField 
                    ? handleInputChange(field.key, e.target.value)
                    : handleAdditionalFieldChange(field.key, e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="sandbox">Sandbox (Test)</option>
                  <option value="live">Live (Production)</option>
                </select>
              ) : (
                <input
                  type={field.type}
                  value={value}
                  onChange={(e) => isStandardField 
                    ? handleInputChange(field.key, e.target.value)
                    : handleAdditionalFieldChange(field.key, e.target.value)
                  }
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-3 mt-4">
          <input
            type="checkbox"
            id="is_active"
            checked={currentConfig.is_active}
            onChange={(e) => handleInputChange('is_active', e.target.checked.toString())}
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Activer ce mode de paiement
          </label>
        </div>
      </div>
    );
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
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuration des API de Paiement</h2>

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Provider Selection */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Méthodes de Paiement</h3>
          <div className="space-y-2">
            {PAYMENT_PROVIDERS.map(provider => {
              const isConfigured = configs.some(c => c.provider === provider.id && c.client_id);
              const isActive = configs.some(c => c.provider === provider.id && c.is_active);
              
              return (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left ${
                    selectedProvider === provider.id
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-full bg-${provider.color}-100`}>
                    <provider.icon className={`w-5 h-5 text-${provider.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{provider.name}</p>
                    <p className="text-xs text-gray-500">
                      {isConfigured 
                        ? isActive 
                          ? 'Configuré et actif' 
                          : 'Configuré mais inactif'
                        : 'Non configuré'}
                    </p>
                  </div>
                  {isConfigured && isActive && (
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuration Form */}
        <div className="md:col-span-3">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configuration de {PROVIDER_FIELDS[selectedProvider]?.name || selectedProvider}
            </h3>
            
            {renderProviderFields()}

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 mt-6">
              <button
                onClick={loadConfigs}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Informations sur les API de paiement</h3>
        <p className="text-sm text-blue-600">
          Configurez les API de paiement pour permettre aux utilisateurs de payer via différentes méthodes. 
          Chaque méthode de paiement nécessite des informations d'identification spécifiques que vous pouvez 
          obtenir auprès du fournisseur de services correspondant. Assurez-vous de garder ces informations 
          confidentielles et de ne les partager avec personne.
        </p>
      </div>
    </div>
  );
};

export default PaymentApiConfig;