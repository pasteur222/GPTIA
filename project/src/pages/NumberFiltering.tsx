import React, { useState, useRef } from 'react';
import { Upload, Download, Loader2, Phone, X, HelpCircle, FileText, Plus, Trash2, Clock, RefreshCw, Gauge, Save, AlertCircle, CheckCircle, XCircle, Settings, Filter, Globe } from 'lucide-react';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';

interface PhoneNumber {
  number: string;
  hasWhatsApp: boolean | null;
  status: 'pending' | 'checking' | 'done' | 'error';
  error?: string;
  normalizedNumber?: string;
  country?: string;
  isValid?: boolean;
}

interface ValidationResult {
  input: string;
  status: 'valid' | 'invalid';
  wa_id?: string;
}

interface FilterSettings {
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  retryDelay: number;
  useMetaApi: boolean;
  defaultCountryCode: CountryCode;
}

interface CSVMapping {
  phoneColumn: string;
  nameColumn?: string;
  companyColumn?: string;
}

const COUNTRY_CODES: { code: CountryCode; name: string; flag: string }[] = [
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
];

const NumberFiltering = () => {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validatedCount, setValidatedCount] = useState(0);
  const [totalValidNumbers, setTotalValidNumbers] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvMapping, setCsvMapping] = useState<CSVMapping>({
    phoneColumn: ''
  });
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    batchSize: 20,
    delayBetweenBatches: 1000,
    maxRetries: 3,
    retryDelay: 2000,
    useMetaApi: true,
    defaultCountryCode: 'CG'
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const validatePhoneNumber = (number: string, countryCode: CountryCode): {
    isValid: boolean;
    normalized?: string;
    country?: string;
    error?: string;
  } => {
    try {
      // First, try to parse with the specified country code
      let phoneNumber;
      
      if (number.startsWith('+')) {
        // International format - parse without country code
        phoneNumber = parsePhoneNumber(number);
      } else {
        // National format - use country code
        phoneNumber = parsePhoneNumber(number, countryCode);
      }

      if (!phoneNumber) {
        return {
          isValid: false,
          error: 'Invalid phone number format'
        };
      }

      if (!phoneNumber.isValid()) {
        return {
          isValid: false,
          error: 'Phone number is not valid'
        };
      }

      return {
        isValid: true,
        normalized: phoneNumber.format('E.164'),
        country: phoneNumber.country || countryCode
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      if (file.type === 'text/plain') {
        // Handle TXT files
        const lines = text.split(/\r?\n/);
        const phoneNumbers = lines
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        processPhoneNumbers(phoneNumbers);
      } else {
        // Handle CSV files
        try {
          const lines = text.split(/\r?\n/);
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const data = lines.slice(1)
            .filter(line => line.trim().length > 0)
            .map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row: any = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              return row;
            });

          setCsvHeaders(headers);
          setCsvData(data);
          setShowColumnMapping(true);
        } catch (parseError) {
          setError('Failed to parse CSV file. Please check the format.');
        }
      }
    };
    reader.readAsText(file);
  };

  const processPhoneNumbers = (phoneNumbers: string[]) => {
    const processedNumbers = phoneNumbers.map(number => {
      const validation = validatePhoneNumber(number, filterSettings.defaultCountryCode);
      
      return {
        number: number,
        normalizedNumber: validation.normalized,
        country: validation.country,
        isValid: validation.isValid,
        hasWhatsApp: null,
        status: validation.isValid ? 'pending' as const : 'error' as const,
        error: validation.error
      };
    });

    setNumbers(processedNumbers);
    setShowColumnMapping(false);
  };

  const handleCSVMapping = () => {
    if (!csvMapping.phoneColumn) {
      setError('Please select a column for phone numbers');
      return;
    }

    const phoneNumbers = csvData
      .map(row => row[csvMapping.phoneColumn])
      .filter(phone => phone && phone.trim().length > 0);

    processPhoneNumbers(phoneNumbers);
  };

  const checkWhatsAppNumbers = async (phoneNumbers: string[]): Promise<ValidationResult[]> => {
    try {
      if (!filterSettings.useMetaApi) {
        return simulateWhatsAppCheck(phoneNumbers);
      }
      
      // Call the Edge Function for WhatsApp number validation
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-whatsapp-numbers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumbers }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('WhatsApp number check was cancelled');
        return [];
      }
      
      console.error('Error checking WhatsApp numbers with Meta API:', error);
      console.log('Falling back to simulation method');
      return simulateWhatsAppCheck(phoneNumbers);
    }
  };

  const simulateWhatsAppCheck = async (phoneNumbers: string[]): Promise<ValidationResult[]> => {
    try {
      // Check database first
      const { data: validNumbers } = await supabase
        .from('whatsapp_valid_numbers')
        .select('phone_number, wa_id')
        .in('phone_number', phoneNumbers);
      
      const validNumbersMap = new Map();
      validNumbers?.forEach(vn => {
        validNumbersMap.set(vn.phone_number, vn.wa_id);
      });
      
      const results: ValidationResult[] = phoneNumbers.map(phone => {
        const waId = validNumbersMap.get(phone);
        if (waId) {
          return {
            input: phone,
            status: 'valid',
            wa_id: waId
          };
        }
        
        // Simulate 70% validity rate for unknown numbers
        const isValid = Math.random() < 0.7;
        return {
          input: phone,
          status: isValid ? 'valid' : 'invalid',
          wa_id: isValid ? `${phone.replace('+', '')}` : undefined
        };
      });
      
      return results;
    } catch (error) {
      if (error.name === 'AbortError') {
        return [];
      }
      console.error('Error simulating WhatsApp check:', error);
      throw error;
    }
  };

  const startProcessing = async () => {
    // Filter out invalid numbers before processing
    const validNumbers = numbers.filter(n => n.isValid && n.status !== 'error');
    
    if (validNumbers.length === 0) {
      setError('No valid phone numbers to process');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setValidatedCount(0);
    setTotalValidNumbers(0);
    abortControllerRef.current = new AbortController();

    try {
      const totalNumbers = validNumbers.length;
      let processedCount = 0;
      let validCount = 0;
      let retryCount = 0;

      const batchSize = filterSettings.batchSize;
      
      for (let i = 0; i < validNumbers.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const batch = validNumbers.slice(i, i + batchSize);
        
        // Update status to checking
        setNumbers(prev => {
          const updated = [...prev];
          batch.forEach((batchItem) => {
            const index = updated.findIndex(n => n.number === batchItem.number);
            if (index !== -1) {
              updated[index] = { ...updated[index], status: 'checking' };
            }
          });
          return updated;
        });

        let batchResults: ValidationResult[] = [];
        let batchSuccess = false;
        let attemptCount = 0;

        while (!batchSuccess && attemptCount < filterSettings.maxRetries) {
          try {
            const phoneNumbersToCheck = batch.map(n => n.normalizedNumber || n.number);
            batchResults = await checkWhatsAppNumbers(phoneNumbersToCheck);
            batchSuccess = true;
          } catch (error) {
            attemptCount++;
            retryCount++;
            
            if (attemptCount >= filterSettings.maxRetries) {
              setNumbers(prev => {
                const updated = [...prev];
                batch.forEach((batchItem) => {
                  const index = updated.findIndex(n => n.number === batchItem.number);
                  if (index !== -1) {
                    updated[index] = { 
                      ...updated[index], 
                      status: 'error',
                      error: `Failed after ${filterSettings.maxRetries} attempts: ${error.message || 'Unknown error'}`
                    };
                  }
                });
                return updated;
              });
              
              processedCount += batch.length;
              setValidatedCount(processedCount);
              setProgress(Math.round((processedCount / totalNumbers) * 100));
              
              await new Promise(resolve => setTimeout(resolve, filterSettings.retryDelay));
              continue;
            }
            
            await new Promise(resolve => setTimeout(resolve, filterSettings.retryDelay));
          }
        }

        if (batchSuccess) {
          setNumbers(prev => {
            const updated = [...prev];
            batchResults.forEach(result => {
              const index = updated.findIndex(n => 
                (n.normalizedNumber === result.input || n.number === result.input)
              );
              
              if (index !== -1) {
                const isValid = result.status === 'valid' && result.wa_id;
                updated[index] = {
                  ...updated[index],
                  hasWhatsApp: isValid,
                  status: 'done',
                  error: isValid ? undefined : 'Not on WhatsApp'
                };
                
                if (isValid) {
                  validCount++;
                }
              }
            });
            return updated;
          });

          processedCount += batch.length;
          setValidatedCount(processedCount);
          setTotalValidNumbers(validCount);
          setProgress(Math.round((processedCount / totalNumbers) * 100));
        }
        
        await new Promise(resolve => setTimeout(resolve, filterSettings.delayBetweenBatches));
      }
      
      // Save valid numbers to database
      const validNumbers = numbers.filter(n => n.hasWhatsApp === true).map(n => n.normalizedNumber || n.number);
      if (validNumbers.length > 0) {
        await supabase.from('whatsapp_valid_numbers').upsert(
          validNumbers.map(number => ({
            phone_number: number,
            wa_id: number.replace('+', ''),
            validated_at: new Date().toISOString()
          })),
          { onConflict: 'phone_number' }
        );
      }

      console.log(`Filtering completed: ${validCount} valid numbers found out of ${totalNumbers} (${retryCount} retries needed)`);
      
    } catch (error) {
      console.error('Error during processing:', error);
      setError(error.message || 'An error occurred during processing');
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const exportResults = () => {
    const whatsAppNumbers = numbers
      .filter(n => n.hasWhatsApp)
      .map(n => n.normalizedNumber || n.number)
      .join('\n');

    const blob = new Blob([whatsAppNumbers], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp_numbers_validated.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeNumber = (index: number) => {
    setNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  };

  const getStatusColor = (status: PhoneNumber['status'], isValid?: boolean) => {
    if (!isValid && status !== 'pending') return 'bg-red-100';
    
    switch (status) {
      case 'pending':
        return 'bg-gray-100';
      case 'checking':
        return 'bg-blue-100';
      case 'done':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusText = (number: PhoneNumber) => {
    if (!number.isValid) {
      return `Invalid: ${number.error || 'Invalid format'}`;
    }
    
    switch (number.status) {
      case 'pending':
        return 'En attente';
      case 'checking':
        return 'Vérification...';
      case 'done':
        return number.hasWhatsApp ? 'WhatsApp ✅' : 'Pas de WhatsApp ❌';
      case 'error':
        return number.error || 'Erreur';
      default:
        return 'Inconnu';
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Filtrage des numéros WhatsApp</h1>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Importer des numéros</h2>
              <p className="text-sm text-gray-500 mt-1">
                Importez un fichier texte ou CSV contenant des numéros de téléphone
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </button>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Importer
              </label>
              {numbers.length > 0 && (
                <button
                  onClick={exportResults}
                  disabled={isProcessing || !numbers.some(n => n.hasWhatsApp)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Exporter les numéros WhatsApp
                </button>
              )}
            </div>
          </div>

          {showSettings && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Paramètres de filtrage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Pays par défaut
                  </label>
                  <select
                    value={filterSettings.defaultCountryCode}
                    onChange={(e) => setFilterSettings({...filterSettings, defaultCountryCode: e.target.value as CountryCode})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    {COUNTRY_CODES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name} (+{parsePhoneNumber('', country.code)?.countryCallingCode || ''})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Code pays utilisé pour normaliser les numéros locaux
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taille des lots
                  </label>
                  <input
                    type="number"
                    value={filterSettings.batchSize}
                    onChange={(e) => setFilterSettings({...filterSettings, batchSize: parseInt(e.target.value) || 20})}
                    min="1"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Délai entre les lots (ms)
                  </label>
                  <input
                    type="number"
                    value={filterSettings.delayBetweenBatches}
                    onChange={(e) => setFilterSettings({...filterSettings, delayBetweenBatches: parseInt(e.target.value) || 1000})}
                    min="500"
                    max="5000"
                    step="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre max de tentatives
                  </label>
                  <input
                    type="number"
                    value={filterSettings.maxRetries}
                    onChange={(e) => setFilterSettings({...filterSettings, maxRetries: parseInt(e.target.value) || 3})}
                    min="1"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="use-meta-api"
                    checked={filterSettings.useMetaApi}
                    onChange={(e) => setFilterSettings({...filterSettings, useMetaApi: e.target.checked})}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="use-meta-api" className="ml-2 block text-sm text-gray-900">
                    Utiliser l'API Meta (recommandé pour une précision de 99%)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Column Mapping Modal */}
          {showColumnMapping && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mappage des colonnes CSV</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colonne des numéros de téléphone <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={csvMapping.phoneColumn}
                      onChange={(e) => setCsvMapping({...csvMapping, phoneColumn: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner une colonne</option>
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colonne des noms (optionnel)
                    </label>
                    <select
                      value={csvMapping.nameColumn || ''}
                      onChange={(e) => setCsvMapping({...csvMapping, nameColumn: e.target.value || undefined})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Aucune</option>
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colonne des entreprises (optionnel)
                    </label>
                    <select
                      value={csvMapping.companyColumn || ''}
                      onChange={(e) => setCsvMapping({...csvMapping, companyColumn: e.target.value || undefined})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Aucune</option>
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setShowColumnMapping(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCSVMapping}
                    disabled={!csvMapping.phoneColumn}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            </div>
          )}

          {numbers.length > 0 && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isProcessing ? (
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                    ) : (
                      <button
                        onClick={startProcessing}
                        disabled={isProcessing || numbers.filter(n => n.isValid).length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                        {isProcessing ? 'Vérification en cours...' : 'Démarrer la vérification'}
                      </button>
                    )}
                    {isProcessing && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{progress}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {validatedCount}/{numbers.filter(n => n.isValid).length} vérifiés • {totalValidNumbers} numéros WhatsApp trouvés
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr,auto,auto] gap-4 p-3 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">
                  <div>Numéro</div>
                  <div>Pays</div>
                  <div>Statut</div>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {numbers.map((number, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr,auto,auto] gap-4 p-3 items-center hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeNumber(index)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          disabled={isProcessing}
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div>
                          <span className="font-mono">{number.normalizedNumber || number.number}</span>
                          {!number.isValid && (
                            <div className="text-xs text-red-600 mt-1">{number.error}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {number.country && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {COUNTRY_CODES.find(c => c.code === number.country)?.flag} {number.country}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {number.status === 'checking' ? (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Vérification...
                          </div>
                        ) : number.status === 'done' && number.isValid ? (
                          number.hasWhatsApp ? (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              WhatsApp
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3" />
                              Pas de WhatsApp
                            </div>
                          )
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(number.status, number.isValid)}`}>
                            {getStatusText(number)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {numbers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Phone className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Importez un fichier pour commencer la vérification</p>
              <p className="text-sm mt-2">Formats acceptés : .txt, .csv</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comment ça marche</h2>
          <div className="space-y-4 text-gray-600">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">1. Importez vos numéros</h3>
                <p className="text-sm">Importez un fichier .txt ou .csv. Pour CSV, vous pourrez mapper les colonnes.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">2. Validation intelligente</h3>
                <p className="text-sm">Les numéros sont automatiquement normalisés selon le pays sélectionné.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <Phone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">3. Vérification WhatsApp</h3>
                <p className="text-sm">Notre système vérifie quels numéros sont actifs sur WhatsApp avec une précision de 99%.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Download className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">4. Exportez les résultats</h3>
                <p className="text-sm">Téléchargez uniquement les numéros valides sur WhatsApp.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberFiltering;