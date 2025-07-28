import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Check, Palette, Type, Monitor, Sun, Moon, Zap, EyeOff, Shield, Code } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useLanguage } from '../contexts/LanguageContext';
import DOMPurify from 'dompurify';

interface AppearanceSettingsProps {
  onClose?: () => void;
}

interface AppearanceSettings {
  id?: string;
  theme_color: string;
  font_size: 'small' | 'normal' | 'large';
  dark_mode: boolean;
  reduced_motion: boolean;
  custom_css?: string;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  theme_color: 'yellow',
  font_size: 'normal',
  dark_mode: false,
  reduced_motion: false,
  custom_css: ''
};

const THEME_COLORS = [
  { name: 'Yellow (MTN)', value: 'yellow', hex: '#ffcc00' },
  { name: 'Blue', value: 'blue', hex: '#3b82f6' },
  { name: 'Green', value: 'green', hex: '#22c55e' },
  { name: 'Red', value: 'red', hex: '#ef4444' },
  { name: 'Purple', value: 'purple', hex: '#a855f7' }
];

// CSS sanitization configuration
const CSS_SANITIZE_CONFIG = {
  // Allowed CSS properties (whitelist approach)
  allowedProperties: [
    'color', 'background-color', 'font-size', 'font-family', 'font-weight',
    'margin', 'padding', 'border', 'border-radius', 'text-align',
    'line-height', 'letter-spacing', 'text-decoration', 'opacity',
    'box-shadow', 'text-shadow', 'transform', 'transition'
  ],
  // Dangerous patterns to remove
  dangerousPatterns: [
    /url\s*\(/gi,           // Remove url() functions
    /expression\s*\(/gi,    // Remove expression() functions  
    /behavior\s*:/gi,       // Remove behavior property
    /javascript\s*:/gi,     // Remove javascript: protocol
    /data\s*:/gi,          // Remove data: protocol
    /vbscript\s*:/gi,      // Remove vbscript: protocol
    /@import/gi,           // Remove @import rules
    /binding\s*:/gi,       // Remove binding property
    /-moz-binding/gi,      // Remove -moz-binding
    /eval\s*\(/gi,         // Remove eval() calls
    /script/gi             // Remove any script references
  ]
};

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('theme');
  const [originalSettings, setOriginalSettings] = useState<AppearanceSettings>(DEFAULT_SETTINGS);
  const [cssWarning, setCssWarning] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Apply settings to document
    applySettings(settings);
  }, [settings]);

  const sanitizeCSS = (css: string): { sanitized: string; warnings: string[] } => {
    if (!css || css.trim().length === 0) {
      return { sanitized: '', warnings: [] };
    }

    let sanitized = css;
    const warnings: string[] = [];

    // Remove dangerous patterns
    CSS_SANITIZE_CONFIG.dangerousPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        warnings.push(`Removed potentially dangerous CSS: ${pattern.source}`);
        sanitized = sanitized.replace(pattern, '/* REMOVED FOR SECURITY */');
      }
    });

    // Basic CSS structure validation
    try {
      // Remove comments first
      sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Check for balanced braces
      const openBraces = (sanitized.match(/\{/g) || []).length;
      const closeBraces = (sanitized.match(/\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        warnings.push('CSS syntax error: Unbalanced braces detected');
      }

      // Validate CSS properties (basic check)
      const rules = sanitized.split('}').filter(rule => rule.trim());
      rules.forEach(rule => {
        const properties = rule.split('{')[1];
        if (properties) {
          const props = properties.split(';').filter(prop => prop.trim());
          props.forEach(prop => {
            const [property] = prop.split(':').map(p => p.trim());
            if (property && !CSS_SANITIZE_CONFIG.allowedProperties.some(allowed => 
              property.toLowerCase().includes(allowed.toLowerCase())
            )) {
              warnings.push(`Potentially unsafe CSS property: ${property}`);
            }
          });
        }
      });

    } catch (parseError) {
      warnings.push('CSS parsing error detected');
    }

    // Use DOMPurify as additional sanitization layer
    try {
      sanitized = DOMPurify.sanitize(sanitized, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      });
    } catch (purifyError) {
      warnings.push('CSS sanitization error');
      sanitized = '/* CSS SANITIZATION FAILED - CONTENT REMOVED FOR SECURITY */';
    }

    return { sanitized, warnings };
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('appearance_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== '42P01') {
        throw fetchError;
      }
      
      if (data) {
        const loadedSettings = {
          id: data.id,
          theme_color: data.theme_color || DEFAULT_SETTINGS.theme_color,
          font_size: data.font_size || DEFAULT_SETTINGS.font_size,
          dark_mode: data.dark_mode !== undefined ? data.dark_mode : DEFAULT_SETTINGS.dark_mode,
          reduced_motion: data.reduced_motion !== undefined ? data.reduced_motion : DEFAULT_SETTINGS.reduced_motion,
          custom_css: data.custom_css || DEFAULT_SETTINGS.custom_css,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
        setOriginalSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error('Error loading appearance settings:', err);
      setError('Erreur lors du chargement des paramètres d\'apparence');
    } finally {
      setLoading(false);
    }
  };

  const applySettings = (settings: AppearanceSettings) => {
    // Apply theme color
    document.documentElement.setAttribute('data-theme-color', settings.theme_color);
    
    // Apply font size
    document.documentElement.setAttribute('data-font-size', settings.font_size);
    
    // Apply dark mode
    if (settings.dark_mode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Apply reduced motion
    if (settings.reduced_motion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
    
    // Apply custom CSS with sanitization
    let customStyleElement = document.getElementById('custom-theme-css');
    if (settings.custom_css && settings.custom_css.trim()) {
      const { sanitized, warnings } = sanitizeCSS(settings.custom_css);
      
      if (warnings.length > 0) {
        setCssWarning(`CSS sanitized: ${warnings.join(', ')}`);
      } else {
        setCssWarning(null);
      }
      
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'custom-theme-css';
        document.head.appendChild(customStyleElement);
      }
      
      customStyleElement.textContent = sanitized;
    } else {
      if (customStyleElement) {
        customStyleElement.textContent = '';
      }
      setCssWarning(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Sanitize custom CSS before saving
      const { sanitized: sanitizedCSS, warnings } = sanitizeCSS(settings.custom_css || '');
      
      if (warnings.length > 0) {
        setCssWarning(`CSS a été modifié pour la sécurité: ${warnings.join(', ')}`);
      }

      const dataToSave = {
        theme_color: settings.theme_color,
        font_size: settings.font_size,
        dark_mode: settings.dark_mode,
        reduced_motion: settings.reduced_motion,
        custom_css: sanitizedCSS,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        const { error } = await supabase
          .from('appearance_settings')
          .update(dataToSave)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('appearance_settings')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      // Update settings with sanitized CSS
      setSettings(prev => ({ ...prev, custom_css: sanitizedCSS }));
      setOriginalSettings({ ...settings, custom_css: sanitizedCSS });
      setSuccess('Paramètres d\'apparence enregistrés avec succès');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving appearance settings:', err);
      setError('Erreur lors de l\'enregistrement des paramètres d\'apparence');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setCssWarning(null);
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setCssWarning(null);
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const handleCSSChange = (value: string) => {
    setSettings(prev => ({ ...prev, custom_css: value }));
    
    // Real-time validation feedback
    if (value.trim()) {
      const { warnings } = sanitizeCSS(value);
      if (warnings.length > 0) {
        setCssWarning(`Attention: ${warnings.length} problème(s) détecté(s) dans le CSS`);
      } else {
        setCssWarning(null);
      }
    } else {
      setCssWarning(null);
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
        <h2 className="text-xl font-semibold text-gray-900">Paramètres d'Apparence</h2>
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

      {cssWarning && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <p>{cssWarning}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span>Thème</span>
          </TabsTrigger>
          <TabsTrigger value="typography" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <span>Typographie</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span>Préférences</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            <span>Avancé</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Couleur du Thème</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {THEME_COLORS.map((color) => (
                <div
                  key={color.value}
                  className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    settings.theme_color === color.value
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSettings({ ...settings, theme_color: color.value })}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: color.hex }}
                    ></div>
                    <span className="text-sm font-medium">{color.name}</span>
                  </div>
                  {settings.theme_color === color.value && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-yellow-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              La couleur du thème sera appliquée à tous les éléments principaux de l'interface.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mode d'Affichage</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  !settings.dark_mode
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSettings({ ...settings, dark_mode: false })}
              >
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium">Mode Clair</span>
                </div>
                {!settings.dark_mode && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-yellow-500" />
                  </div>
                )}
              </div>

              <div
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  settings.dark_mode
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSettings({ ...settings, dark_mode: true })}
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium">Mode Sombre</span>
                </div>
                {settings.dark_mode && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-yellow-500" />
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Le mode sombre réduit la fatigue oculaire dans les environnements peu éclairés.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="typography" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Taille de Police</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  settings.font_size === 'small'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSettings({ ...settings, font_size: 'small' })}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium">Petite</span>
                  <span className="text-xs">Aa</span>
                </div>
                {settings.font_size === 'small' && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-yellow-500" />
                  </div>
                )}
              </div>

              <div
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  settings.font_size === 'normal'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSettings({ ...settings, font_size: 'normal' })}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium">Normale</span>
                  <span className="text-sm">Aa</span>
                </div>
                {settings.font_size === 'normal' && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-yellow-500" />
                  </div>
                )}
              </div>

              <div
                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  settings.font_size === 'large'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSettings({ ...settings, font_size: 'large' })}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-base font-medium">Grande</span>
                  <span className="text-base">Aa</span>
                </div>
                {settings.font_size === 'large' && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-yellow-500" />
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              La taille de police affecte la lisibilité du texte dans toute l'application.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Accessibilité</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reduced-motion"
                  checked={settings.reduced_motion}
                  onChange={(e) => setSettings({ ...settings, reduced_motion: e.target.checked })}
                  className="h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <div>
                  <label htmlFor="reduced-motion" className="text-sm font-medium text-gray-900">
                    Réduire les animations
                  </label>
                  <p className="text-xs text-gray-500">
                    Désactive ou réduit les animations et les transitions pour améliorer l'accessibilité.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Security Warning */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-red-800">Avertissement de Sécurité</h3>
            </div>
            <div className="text-sm text-red-700 space-y-1">
              <p>• Le CSS personnalisé est automatiquement sanitisé pour votre sécurité</p>
              <p>• Les propriétés dangereuses comme url(), expression(), behavior sont supprimées</p>
              <p>• Testez toujours vos modifications sur un environnement de développement</p>
              <p>• N'utilisez que du CSS provenant de sources fiables</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">CSS Personnalisé</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Styles CSS personnalisés
                </label>
                <textarea
                  value={settings.custom_css || ''}
                  onChange={(e) => handleCSSChange(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm"
                  placeholder="/* Ajoutez votre CSS personnalisé ici */
:root {
  --custom-primary: #ffcc00;
  --custom-secondary: #333333;
}

.sidebar {
  background-color: var(--custom-primary);
}

.custom-button {
  background-color: var(--custom-secondary);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}"
                />
                <div className="mt-2 text-sm text-gray-500">
                  <p>Le CSS personnalisé est automatiquement sanitisé pour votre sécurité.</p>
                  <p className="mt-1">
                    <strong>Propriétés autorisées:</strong> color, background-color, font-size, font-family, 
                    margin, padding, border, border-radius, text-align, opacity, box-shadow, transform, transition
                  </p>
                </div>
              </div>

              {/* CSS Preview */}
              {settings.custom_css && settings.custom_css.trim() && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Aperçu du CSS sanitisé</h4>
                  <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-gray-300 text-xs whitespace-pre-wrap">
                      {sanitizeCSS(settings.custom_css).sanitized}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Réinitialisation</h3>
            <div className="flex gap-4">
              <button
                onClick={handleResetToDefaults}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Réinitialiser aux paramètres par défaut
              </button>
              <button
                onClick={handleReset}
                disabled={!hasChanges()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Annuler les modifications
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              La réinitialisation supprimera tous vos paramètres personnalisés.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 mt-6">
        <button
          onClick={handleReset}
          disabled={!hasChanges() || saving}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annuler les modifications
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges() || saving}
          className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">À propos des paramètres d'apparence</h3>
        <p className="text-sm text-blue-600">
          Les paramètres d'apparence vous permettent de personnaliser l'interface utilisateur pour correspondre à votre marque.
          Tous les CSS personnalisés sont automatiquement sanitisés pour prévenir les vulnérabilités de sécurité.
          Les modifications s'appliquent à toutes les pages de l'application et sont visibles par tous les utilisateurs.
        </p>
      </div>
    </div>
  );
};

export default AppearanceSettings;