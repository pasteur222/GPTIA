import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, Check, Code, Copy, ExternalLink, Globe, BarChart2, Trash2, Edit, X, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DOMPurify from 'dompurify';

interface ExternalAnalyticsProps {
  onClose?: () => void;
}

interface AnalyticsScript {
  id?: string;
  name: string;
  platform: string;
  tracking_id: string;
  is_active: boolean;
  created_at?: string;
  script_code?: string; // For display only, not executed
}

interface PlatformConfig {
  id: string;
  name: string;
  description: string;
  idLabel: string;
  idPlaceholder: string;
  instructions: string;
  template: (id: string) => string;
}

const ANALYTICS_PLATFORMS: PlatformConfig[] = [
  {
    id: 'google_analytics',
    name: 'Google Analytics 4',
    description: 'Track website traffic and user behavior',
    idLabel: 'Measurement ID',
    idPlaceholder: 'G-XXXXXXXXXX',
    instructions: 'Find your Measurement ID in Google Analytics > Admin > Data Streams',
    template: (id: string) => `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`
  },
  {
    id: 'facebook_pixel',
    name: 'Meta Pixel',
    description: 'Track conversions and optimize ads',
    idLabel: 'Pixel ID',
    idPlaceholder: 'XXXXXXXXXXXXXXX',
    instructions: 'Find your Pixel ID in Meta Events Manager',
    template: (id: string) => `<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s) {
    if(f.fbq)return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;
    n.push=n;
    n.loaded=!0;
    n.version='2.0';
    n.queue=[];
    t=b.createElement(e);
    t.async=!0;
    t.src=v;
    s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  
  fbq('init', '${id}');
  fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/>
</noscript>`
  },
  {
    id: 'google_tag_manager',
    name: 'Google Tag Manager',
    description: 'Manage all your tracking tags in one place',
    idLabel: 'Container ID',
    idPlaceholder: 'GTM-XXXXXXX',
    instructions: 'Find your Container ID in Google Tag Manager workspace',
    template: (id: string) => `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`
  },
  {
    id: 'hotjar',
    name: 'Hotjar',
    description: 'Heatmaps and user session recordings',
    idLabel: 'Site ID',
    idPlaceholder: 'XXXXXXX',
    instructions: 'Find your Site ID in Hotjar > Settings > Sites & Organizations',
    template: (id: string) => `<!-- Hotjar Tracking Code -->
<script>
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${id},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>`
  },
  {
    id: 'microsoft_clarity',
    name: 'Microsoft Clarity',
    description: 'Free heatmaps and session recordings',
    idLabel: 'Project ID',
    idPlaceholder: 'XXXXXXXXXX',
    instructions: 'Find your Project ID in Microsoft Clarity dashboard',
    template: (id: string) => `<!-- Microsoft Clarity -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${id}");
</script>`
  }
];

const ExternalAnalytics: React.FC<ExternalAnalyticsProps> = ({ onClose }) => {
  const [scripts, setScripts] = useState<AnalyticsScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingScript, setEditingScript] = useState<AnalyticsScript | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('google_analytics');
  const [trackingId, setTrackingId] = useState<string>('');
  const [scriptName, setScriptName] = useState<string>('');
  const [showCode, setShowCode] = useState<Record<string, boolean>>({});
  const [codeCopied, setCodeCopied] = useState<string | null>(null);

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('analytics_scripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setScripts(data || []);
    } catch (err) {
      console.error('Error loading analytics scripts:', err);
      setError('Erreur lors du chargement des scripts d\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const validateTrackingId = (platform: string, id: string): boolean => {
    const patterns: Record<string, RegExp> = {
      google_analytics: /^G-[A-Z0-9]{10}$/,
      facebook_pixel: /^[0-9]{15,16}$/,
      google_tag_manager: /^GTM-[A-Z0-9]{7}$/,
      hotjar: /^[0-9]{6,8}$/,
      microsoft_clarity: /^[a-z0-9]{10}$/i
    };

    const pattern = patterns[platform];
    return pattern ? pattern.test(id) : id.length > 0;
  };

  const sanitizeInput = (input: string): string => {
    // Remove any HTML tags and dangerous characters
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    }).trim();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const sanitizedName = sanitizeInput(scriptName);
      const sanitizedTrackingId = sanitizeInput(trackingId);

      if (!sanitizedName || !sanitizedTrackingId || !selectedPlatform) {
        setError('Tous les champs sont requis');
        return;
      }

      if (!validateTrackingId(selectedPlatform, sanitizedTrackingId)) {
        setError('Format d\'ID de suivi invalide pour cette plateforme');
        return;
      }

      const platform = ANALYTICS_PLATFORMS.find(p => p.id === selectedPlatform);
      if (!platform) {
        setError('Plateforme non supportée');
        return;
      }

      // Generate the script code for display purposes only
      const generatedScript = platform.template(sanitizedTrackingId);

      if (editingScript) {
        // Update existing script
        const { error } = await supabase
          .from('analytics_scripts')
          .update({
            name: sanitizedName,
            platform: selectedPlatform,
            tracking_id: sanitizedTrackingId,
            script_code: generatedScript,
            is_active: true
          })
          .eq('id', editingScript.id);

        if (error) throw error;
        
        setSuccess('Script d\'analyse mis à jour avec succès');
      } else {
        // Create new script
        const { error } = await supabase
          .from('analytics_scripts')
          .insert([{
            name: sanitizedName,
            platform: selectedPlatform,
            tracking_id: sanitizedTrackingId,
            script_code: generatedScript,
            is_active: true
          }]);

        if (error) throw error;
        
        setSuccess('Script d\'analyse ajouté avec succès');
      }

      // Reset form and reload scripts
      resetForm();
      loadScripts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving analytics script:', err);
      setError('Erreur lors de l\'enregistrement du script d\'analyse');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setScriptName('');
    setTrackingId('');
    setSelectedPlatform('google_analytics');
    setIsCreating(false);
    setEditingScript(null);
  };

  const handleEdit = (script: AnalyticsScript) => {
    setEditingScript(script);
    setScriptName(script.name);
    setTrackingId(script.tracking_id);
    setSelectedPlatform(script.platform);
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce script ?')) {
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('analytics_scripts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Script supprimé avec succès');
      loadScripts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting analytics script:', err);
      setError('Erreur lors de la suppression du script');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('analytics_scripts')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setSuccess(`Script ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      loadScripts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error toggling script status:', err);
      setError('Erreur lors de la modification du statut du script');
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(id);
    setTimeout(() => setCodeCopied(null), 2000);
  };

  const toggleCodeVisibility = (id: string) => {
    setShowCode(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'google_analytics':
      case 'google_tag_manager':
        return <BarChart2 className="w-5 h-5 text-blue-600" />;
      case 'facebook_pixel':
        return <div className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold">f</div>;
      case 'hotjar':
        return <div className="w-5 h-5 flex items-center justify-center bg-red-600 text-white rounded-full text-xs font-bold">H</div>;
      case 'microsoft_clarity':
        return <div className="w-5 h-5 flex items-center justify-center bg-green-600 text-white rounded-full text-xs font-bold">M</div>;
      default:
        return <Code className="w-5 h-5 text-gray-600" />;
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
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Intégration d'Outils d'Analyse</h2>

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

      {/* Security Notice */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-blue-800">Sécurité et Confidentialité</h3>
        </div>
        <p className="text-sm text-blue-700">
          Pour votre sécurité, nous utilisons uniquement des templates pré-validés pour les plateformes d'analyse connues. 
          Les scripts sont générés automatiquement à partir de votre ID de suivi et ne peuvent pas être modifiés directement.
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingScript(null);
            resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Code className="w-4 h-4" />
          Ajouter un script d'analyse
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingScript ? 'Modifier le script' : 'Nouveau script d\'analyse'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du script
              </label>
              <input
                type="text"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Ex: Google Analytics Principal"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plateforme d'analyse
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {ANALYTICS_PLATFORMS.map(platform => (
                  <option key={platform.id} value={platform.id}>{platform.name}</option>
                ))}
              </select>
            </div>

            {selectedPlatform && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {ANALYTICS_PLATFORMS.find(p => p.id === selectedPlatform)?.idLabel}
                </label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={ANALYTICS_PLATFORMS.find(p => p.id === selectedPlatform)?.idPlaceholder}
                  maxLength={50}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {ANALYTICS_PLATFORMS.find(p => p.id === selectedPlatform)?.instructions}
                </p>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !scriptName || !trackingId}
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
      )}

      <div className="space-y-4">
        {scripts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun script d'analyse configuré</p>
            <p className="text-sm text-gray-500 mt-1">
              Ajoutez des scripts pour suivre les performances de votre site
            </p>
          </div>
        ) : (
          scripts.map(script => (
            <div
              key={script.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-red-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(script.platform)}
                  <div>
                    <h3 className="font-medium text-gray-900">{script.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">ID: {script.tracking_id}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        script.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {script.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCodeVisibility(script.id!)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title={showCode[script.id!] ? 'Masquer le code' : 'Voir le code'}
                  >
                    {showCode[script.id!] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleToggleActive(script.id!, script.is_active)}
                    className={`p-2 rounded-lg ${
                      script.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={script.is_active ? 'Désactiver' : 'Activer'}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(script)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Modifier"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(script.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {showCode[script.id!] && script.script_code && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Code d'intégration</h4>
                    <button
                      onClick={() => handleCopyCode(script.id!, script.script_code!)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {codeCopied === script.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copié !
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copier
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-xs overflow-x-auto bg-gray-800 text-gray-200 p-4 rounded-lg max-h-40">
                    {script.script_code}
                  </pre>
                  <p className="mt-2 text-xs text-gray-500">
                    Copiez ce code et collez-le dans la section &lt;head&gt; de votre site web.
                  </p>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                Ajouté le {new Date(script.created_at!).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Sécurité et Bonnes Pratiques
        </h3>
        <div className="text-sm text-amber-700 space-y-2">
          <p>
            • Les scripts sont générés automatiquement à partir de templates sécurisés
          </p>
          <p>
            • Seuls les IDs de suivi sont stockés, pas de code JavaScript arbitraire
          </p>
          <p>
            • Tous les inputs sont sanitisés pour prévenir les attaques XSS
          </p>
          <p>
            • Les scripts inactifs ne sont pas injectés dans vos pages
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Plateformes supportées
        </h3>
        <div className="flex flex-wrap gap-4">
          {ANALYTICS_PLATFORMS.map(platform => (
            <a 
              key={platform.id}
              href="#"
              className="flex items-center gap-1 text-sm text-blue-700 hover:underline"
              title={platform.description}
            >
              <ExternalLink className="w-4 h-4" />
              {platform.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExternalAnalytics;