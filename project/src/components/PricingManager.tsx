import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Check, DollarSign, Repeat } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BUSINESS_PLANS } from '../lib/business-subscription';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';

interface PricingManagerProps {
  onClose?: () => void;
}

interface BusinessPricingState {
  basic: number;
  pro: number;
  enterprise: number;
}

interface EducationPricingState {
  daily: number;
  weekly: number;
  monthly: number;
}

const PricingManager: React.FC<PricingManagerProps> = ({ onClose }) => {
  const [businessPrices, setBusinessPrices] = useState<BusinessPricingState>({
    basic: BUSINESS_PLANS[0].price,
    pro: BUSINESS_PLANS[1].price,
    enterprise: BUSINESS_PLANS[2].price
  });
  const [educationPrices, setEducationPrices] = useState<EducationPricingState>({
    daily: SUBSCRIPTION_PLANS[0].price,
    weekly: SUBSCRIPTION_PLANS[1].price,
    monthly: SUBSCRIPTION_PLANS[2].price
  });
  const [originalBusinessPrices, setOriginalBusinessPrices] = useState<BusinessPricingState>({
    basic: BUSINESS_PLANS[0].price,
    pro: BUSINESS_PLANS[1].price,
    enterprise: BUSINESS_PLANS[2].price
  });
  const [originalEducationPrices, setOriginalEducationPrices] = useState<EducationPricingState>({
    daily: SUBSCRIPTION_PLANS[0].price,
    weekly: SUBSCRIPTION_PLANS[1].price,
    monthly: SUBSCRIPTION_PLANS[2].price
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'FCFA' | 'USD'>('FCFA');
  const [activeTab, setActiveTab] = useState<'business' | 'education'>('business');
  const exchangeRate = 0.00165; // 1 FCFA = 0.00165 USD (approximate)

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get business prices from the database
      const { data: businessData, error: businessError } = await supabase
        .from('pricing')
        .select('*');

      if (businessError) throw businessError;

      // If we have business pricing data, use it
      if (businessData && businessData.length > 0) {
        const businessPricingData: Record<string, number> = {};
        
        businessData.forEach(item => {
          if (item['plan tarifaire'] === 'basic') {
            businessPricingData.basic = item.price;
          } else if (item['plan tarifaire'] === 'pro') {
            businessPricingData.pro = item.price;
          } else if (item['plan tarifaire'] === 'enterprise') {
            businessPricingData.enterprise = item.price;
          }
        });

        // Update state with database values
        const newBusinessPrices = {
          basic: businessPricingData.basic || BUSINESS_PLANS[0].price,
          pro: businessPricingData.pro || BUSINESS_PLANS[1].price,
          enterprise: businessPricingData.enterprise || BUSINESS_PLANS[2].price
        };
        
        setBusinessPrices(newBusinessPrices);
        setOriginalBusinessPrices(newBusinessPrices);
      }

      // Try to get education prices from the database
      const { data: educationData, error: educationError } = await supabase
        .from('pricing')
        .select('*')
        .in('plan tarifaire', ['daily', 'weekly', 'monthly']);

      if (educationError) throw educationError;

      // If we have education pricing data, use it
      if (educationData && educationData.length > 0) {
        const educationPricingData: Record<string, number> = {};
        
        educationData.forEach(item => {
          if (item['plan tarifaire'] === 'daily') {
            educationPricingData.daily = item.price;
          } else if (item['plan tarifaire'] === 'weekly') {
            educationPricingData.weekly = item.price;
          } else if (item['plan tarifaire'] === 'monthly') {
            educationPricingData.monthly = item.price;
          }
        });

        // Update state with database values
        const newEducationPrices = {
          daily: educationPricingData.daily || SUBSCRIPTION_PLANS[0].price,
          weekly: educationPricingData.weekly || SUBSCRIPTION_PLANS[1].price,
          monthly: educationPricingData.monthly || SUBSCRIPTION_PLANS[2].price
        };
        
        setEducationPrices(newEducationPrices);
        setOriginalEducationPrices(newEducationPrices);
      }
    } catch (err) {
      console.error('Error loading prices:', err);
      setError('Erreur lors du chargement des prix');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Make sure we're saving FCFA values
      const fcfaBusinessPrices = currency === 'USD' ? {
        basic: Math.round(businessPrices.basic / exchangeRate),
        pro: Math.round(businessPrices.pro / exchangeRate),
        enterprise: Math.round(businessPrices.enterprise / exchangeRate)
      } : businessPrices;

      const fcfaEducationPrices = currency === 'USD' ? {
        daily: Math.round(educationPrices.daily / exchangeRate),
        weekly: Math.round(educationPrices.weekly / exchangeRate),
        monthly: Math.round(educationPrices.monthly / exchangeRate)
      } : educationPrices;

      // Prepare updates based on active tab
      let updates = [];
      
      if (activeTab === 'business') {
        updates = [
          { 'plan tarifaire': 'basic', price: fcfaBusinessPrices.basic },
          { 'plan tarifaire': 'pro', price: fcfaBusinessPrices.pro },
          { 'plan tarifaire': 'enterprise', price: fcfaBusinessPrices.enterprise }
        ];
      } else {
        updates = [
          { 'plan tarifaire': 'daily', price: fcfaEducationPrices.daily },
          { 'plan tarifaire': 'weekly', price: fcfaEducationPrices.weekly },
          { 'plan tarifaire': 'monthly', price: fcfaEducationPrices.monthly }
        ];
      }

      // Upsert prices to the database
      for (const update of updates) {
        const { error } = await supabase
          .from('pricing')
          .upsert(update, { onConflict: 'plan tarifaire' });

        if (error) throw error;
      }

      // Update original prices based on active tab
      if (activeTab === 'business') {
        setOriginalBusinessPrices({ ...fcfaBusinessPrices });
      } else {
        setOriginalEducationPrices({ ...fcfaEducationPrices });
      }
      
      setSuccess('Prix mis à jour avec succès');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving prices:', err);
      setError('Erreur lors de la sauvegarde des prix');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (activeTab === 'business') {
      setBusinessPrices({
        basic: BUSINESS_PLANS[0].price,
        pro: BUSINESS_PLANS[1].price,
        enterprise: BUSINESS_PLANS[2].price
      });
    } else {
      setEducationPrices({
        daily: SUBSCRIPTION_PLANS[0].price,
        weekly: SUBSCRIPTION_PLANS[1].price,
        monthly: SUBSCRIPTION_PLANS[2].price
      });
    }
  };

  const handleCancel = () => {
    if (activeTab === 'business') {
      setBusinessPrices({ ...originalBusinessPrices });
    } else {
      setEducationPrices({ ...originalEducationPrices });
    }
    
    if (onClose) onClose();
  };

  const hasChanges = () => {
    if (activeTab === 'business') {
      if (currency === 'USD') {
        const fcfaPrices = {
          basic: Math.round(businessPrices.basic / exchangeRate),
          pro: Math.round(businessPrices.pro / exchangeRate),
          enterprise: Math.round(businessPrices.enterprise / exchangeRate)
        };
        
        return fcfaPrices.basic !== originalBusinessPrices.basic ||
               fcfaPrices.pro !== originalBusinessPrices.pro ||
               fcfaPrices.enterprise !== originalBusinessPrices.enterprise;
      }
      
      return businessPrices.basic !== originalBusinessPrices.basic ||
             businessPrices.pro !== originalBusinessPrices.pro ||
             businessPrices.enterprise !== originalBusinessPrices.enterprise;
    } else {
      if (currency === 'USD') {
        const fcfaPrices = {
          daily: Math.round(educationPrices.daily / exchangeRate),
          weekly: Math.round(educationPrices.weekly / exchangeRate),
          monthly: Math.round(educationPrices.monthly / exchangeRate)
        };
        
        return fcfaPrices.daily !== originalEducationPrices.daily ||
               fcfaPrices.weekly !== originalEducationPrices.weekly ||
               fcfaPrices.monthly !== originalEducationPrices.monthly;
      }
      
      return educationPrices.daily !== originalEducationPrices.daily ||
             educationPrices.weekly !== originalEducationPrices.weekly ||
             educationPrices.monthly !== originalEducationPrices.monthly;
    }
  };

  const toggleCurrency = () => {
    if (currency === 'FCFA') {
      // Convert to USD
      setBusinessPrices({
        basic: Math.round(businessPrices.basic * exchangeRate * 100) / 100,
        pro: Math.round(businessPrices.pro * exchangeRate * 100) / 100,
        enterprise: Math.round(businessPrices.enterprise * exchangeRate * 100) / 100
      });
      
      setEducationPrices({
        daily: Math.round(educationPrices.daily * exchangeRate * 100) / 100,
        weekly: Math.round(educationPrices.weekly * exchangeRate * 100) / 100,
        monthly: Math.round(educationPrices.monthly * exchangeRate * 100) / 100
      });
      
      setCurrency('USD');
    } else {
      // Convert to FCFA
      setBusinessPrices({
        basic: Math.round(businessPrices.basic / exchangeRate),
        pro: Math.round(businessPrices.pro / exchangeRate),
        enterprise: Math.round(businessPrices.enterprise / exchangeRate)
      });
      
      setEducationPrices({
        daily: Math.round(educationPrices.daily / exchangeRate),
        weekly: Math.round(educationPrices.weekly / exchangeRate),
        monthly: Math.round(educationPrices.monthly / exchangeRate)
      });
      
      setCurrency('FCFA');
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
        <h2 className="text-xl font-semibold text-gray-900">Gestion des Prix d'Abonnement</h2>
        <div className="flex items-center gap-4">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab('business')}
              className={`px-4 py-2 ${
                activeTab === 'business' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Professionnel
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className={`px-4 py-2 ${
                activeTab === 'education' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Éducatif
            </button>
          </div>
          
          <button
            onClick={toggleCurrency}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Repeat className="w-4 h-4" />
            {currency === 'FCFA' ? 'Afficher en USD' : 'Afficher en FCFA'}
          </button>
        </div>
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

      {activeTab === 'business' ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Basique ({currency})
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={businessPrices.basic}
                onChange={(e) => setBusinessPrices({ ...businessPrices, basic: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step={currency === 'FCFA' ? '1000' : '1'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Pro ({currency})
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={businessPrices.pro}
                onChange={(e) => setBusinessPrices({ ...businessPrices, pro: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step={currency === 'FCFA' ? '1000' : '1'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Enterprise ({currency})
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={businessPrices.enterprise}
                onChange={(e) => setBusinessPrices({ ...businessPrices, enterprise: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step={currency === 'FCFA' ? '1000' : '1'}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forfait Journalier ({currency})
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={educationPrices.daily}
                onChange={(e) => setEducationPrices({ ...educationPrices, daily: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step={currency === 'FCFA' ? '100' : '0.1'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forfait Hebdomadaire ({currency})
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={educationPrices.weekly}
                onChange={(e) => setEducationPrices({ ...educationPrices, weekly: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step={currency === 'FCFA' ? '500' : '0.5'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forfait Mensuel ({currency})
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={educationPrices.monthly}
                onChange={(e) => setEducationPrices({ ...educationPrices, monthly: parseFloat(e.target.value) || 0 })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min="0"
                step={currency === 'FCFA' ? '1000' : '1'}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 mt-6">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          Réinitialiser
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges()}
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
  );
};

export default PricingManager;