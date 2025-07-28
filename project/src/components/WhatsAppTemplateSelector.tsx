import React, { useState, useEffect } from 'react';
import { Search, X, AlertCircle, CheckCircle, RefreshCw, Image, Video, File, Info, Upload, Trash2, Loader2, Plus, Edit, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getWhatsAppTemplates } from '../lib/whatsapp';
import { uploadTemplateMedia } from '../lib/whatsapp-template';

interface WhatsAppTemplate {
  id: string;
  template_name: string;
  language?: string;
  status?: string;
  category?: string;
  parameters?: {
    components: TemplateComponent[];
  };
  createdAt?: string;
}

interface TemplateComponent {
  type: string;
  parameters?: TemplateParameter[];
  format?: string;
  text?: string;
  example?: {
    header_handle?: string;
    header_text?: string[];
  };
}

interface TemplateParameter {
  type: string;
  text?: string;
  image_url?: string;
  video_url?: string;
  document_url?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

interface WhatsAppTemplateSelectorProps {
  onSelectTemplate: (template: WhatsAppTemplate, parameters: Record<string, string>) => void;
  onClose: () => void;
}

const WhatsAppTemplateSelector: React.FC<WhatsAppTemplateSelectorProps> = ({
  onSelectTemplate,
  onClose
}) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [mediaFiles, setMediaFiles] = useState<Record<string, File | null>>({});
  const [mediaUploading, setMediaUploading] = useState<Record<string, boolean>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('fr');
  const [refreshing, setRefreshing] = useState(false);
  const [fetchSource, setFetchSource] = useState<'api' | 'database' | 'mock' | null>(null);
  const [customBody, setCustomBody] = useState('');
  const [customFooter, setCustomFooter] = useState('');
  const [editingBody, setEditingBody] = useState(false);
  const [editingFooter, setEditingFooter] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = templates.filter(template => 
        template.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTemplates(filtered);
    } else {
      setFilteredTemplates(templates);
    }
  }, [searchTerm, templates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      setRefreshing(true);
      console.log('Fetching WhatsApp templates...');

      // Implement cascade fallback as requested
      try {
        // 1. First try to fetch from Meta API
        console.log('Trying to fetch from Meta API...');
        const templatesData = await getWhatsAppTemplates();
        
        if (templatesData && templatesData.length > 0) {
          console.log(`Received ${templatesData.length} templates from Meta API`);
          setFetchSource('api');
          
          // Process templates to extract components and parameters
          const processedTemplates = templatesData.map((template: any) => ({
            id: template.id,
            template_name: template.template_name,
            language: template.language,
            status: template.status,
            category: template.category,
            parameters: template.parameters || {},
            createdAt: template.created_at
          }));

          setTemplates(processedTemplates);
          setFilteredTemplates(processedTemplates);
          return;
        } else {
          console.warn('Meta API returned empty templates array, falling back to database');
        }
      } catch (apiError) {
        console.warn('Error fetching from Meta API, falling back to database:', apiError);
      }

      // 2. If Meta API fails or returns empty, try database
      try {
        console.log('Trying to fetch from Supabase database...');
        const { data, error: dbError } = await supabase
          .from('whatsapp_templates')
          .select('*');
          
        if (dbError) {
          console.warn('Database fetch failed:', dbError);
          throw dbError;
        }
        
        if (data && data.length > 0) {
          console.log(`Found ${data.length} templates in database`);
          setFetchSource('database');
          setTemplates(data);
          setFilteredTemplates(data);
          return;
        } else {
          console.warn('No templates found in database, falling back to mock templates');
        }
      } catch (dbError) {
        console.warn('Error fetching from database, falling back to mock templates:', dbError);
      }

      // 3. Final fallback: use mock templates
      console.log('Using mock templates as fallback');
      const mockTemplates = getMockTemplates();
      setFetchSource('mock');
      setTemplates(mockTemplates);
      setFilteredTemplates(mockTemplates);
      
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    
    // Initialize parameters based on template components
    const initialParams: Record<string, string> = {};
    const initialMediaFiles: Record<string, File | null> = {};
    const initialMediaUploading: Record<string, boolean> = {};
    const initialMediaUrls: Record<string, string> = {};
    
    template.parameters?.components?.forEach(component => {
      if (component.parameters) {
        component.parameters.forEach((param, index) => {
          initialParams[`${component.type}_${index}`] = '';
        });
      }
      
      // Initialize media file state for header, body, and footer components
      if (component.format && component.format !== 'text') {
        initialMediaFiles[`${component.type}_media`] = null;
        initialMediaUploading[`${component.type}_media`] = false;
        initialMediaUrls[`${component.type}_media`] = '';
      }
    });
    
    setParameters(initialParams);
    setMediaFiles(initialMediaFiles);
    setMediaUploading(initialMediaUploading);
    setMediaUrls(initialMediaUrls);
    
    // Initialize custom body and footer text
    const bodyComponent = template.parameters?.components?.find(c => c.type === 'body');
    const footerComponent = template.parameters?.components?.find(c => c.type === 'footer');
    
    setCustomBody(bodyComponent?.text || '');
    setCustomFooter(footerComponent?.text || '');
    setEditingBody(false);
    setEditingFooter(false);
  };

  const handleParameterChange = (key: string, value: string) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Update the file state
    setMediaFiles(prev => ({
      ...prev,
      [key]: file
    }));
    
    // Start upload process
    await handleMediaUpload(file, key);
  };
  
  const handleMediaUpload = async (file: File, key: string) => {
    try {
      setMediaUploading(prev => ({
        ...prev,
        [key]: true
      }));
      
      // Use the utility function to upload the file
      const publicUrl = await uploadTemplateMedia(file);
      
      // Update the URL state
      setMediaUrls(prev => ({
        ...prev,
        [key]: publicUrl
      }));
      
    } catch (error) {
      console.error('Error uploading media:', error);
      setError('Failed to upload media file. Please try again.');
    } finally {
      setMediaUploading(prev => ({
        ...prev,
        [key]: false
      }));
    }
  };
  
  const handleRemoveMedia = (key: string) => {
    setMediaFiles(prev => ({
      ...prev,
      [key]: null
    }));
    
    setMediaUrls(prev => ({
      ...prev,
      [key]: ''
    }));
  };

  const handleConfirm = () => {
    if (!selectedTemplate) return;
    
    // Check if all required parameters are filled
    const missingParams = Object.entries(parameters).filter(([_, value]) => !value);
    if (missingParams.length > 0) {
      setError('Please fill in all template parameters');
      return;
    }
    
    // Add media URLs to parameters if present
    const finalParameters = { ...parameters };
    
    // Add media URLs for header, body, and footer
    Object.entries(mediaUrls).forEach(([key, url]) => {
      if (url) {
        finalParameters[key] = url;
      }
    });
    
    // Add custom body and footer text if edited
    if (editingBody) {
      finalParameters['custom_body'] = customBody;
    }
    
    if (editingFooter) {
      finalParameters['custom_footer'] = customFooter;
    }
    
    onSelectTemplate(selectedTemplate, finalParameters);
  };

  const getHeaderPreview = (template: WhatsAppTemplate) => {
    const headerComponent = template.parameters?.components?.find(c => c.type === 'header');
    if (!headerComponent) return null;
    
    if (headerComponent.format === 'image') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Image className="w-4 h-4" />
          <span>Image Header</span>
        </div>
      );
    } else if (headerComponent.format === 'video') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Video className="w-4 h-4" />
          <span>Video Header</span>
        </div>
      );
    } else if (headerComponent.format === 'document') {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <File className="w-4 h-4" />
          <span>Document Header</span>
        </div>
      );
    }
    
    return null;
  };

  const renderParameterInput = (component: TemplateComponent, paramIndex: number) => {
    const param = component.parameters?.[paramIndex];
    if (!param) return null;
    
    const paramKey = `${component.type}_${paramIndex}`;
    
    return (
      <div key={paramKey} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Parameter {paramIndex + 1} {component.type === 'header' ? '(Header)' : component.type === 'body' ? '(Body)' : component.type === 'footer' ? '(Footer)' : ''}
        </label>
        <input
          type="text"
          value={parameters[paramKey] || ''}
          onChange={(e) => handleParameterChange(paramKey, e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder={`Enter value for parameter ${paramIndex + 1}`}
        />
      </div>
    );
  };
  
  const renderMediaUpload = (component: TemplateComponent) => {
    if (!component.format || component.format === 'text') {
      return null;
    }
    
    const key = `${component.type}_media`;
    const mediaType = component.format;
    const isUploading = mediaUploading[key];
    const file = mediaFiles[key];
    const url = mediaUrls[key];
    
    let acceptTypes = '';
    let mediaTypeLabel = '';
    
    switch (mediaType) {
      case 'image':
        acceptTypes = 'image/*';
        mediaTypeLabel = 'Image';
        break;
      case 'video':
        acceptTypes = 'video/*';
        mediaTypeLabel = 'Video';
        break;
      case 'document':
        acceptTypes = '.pdf,.doc,.docx';
        mediaTypeLabel = 'Document';
        break;
      default:
        return null;
    }
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {mediaTypeLabel} {component.type === 'header' ? 'Header' : component.type === 'body' ? 'Body' : 'Footer'}
        </label>
        
        {!file && !url ? (
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {mediaType === 'image' && <Image className="mx-auto h-12 w-12 text-gray-400" />}
              {mediaType === 'video' && <Video className="mx-auto h-12 w-12 text-gray-400" />}
              {mediaType === 'document' && <File className="mx-auto h-12 w-12 text-gray-400" />}
              
              <div className="flex text-sm text-gray-600">
                <label htmlFor={`file-upload-${key}`} className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500">
                  <span>Upload a {mediaTypeLabel.toLowerCase()}</span>
                  <input 
                    id={`file-upload-${key}`} 
                    name={`file-upload-${key}`} 
                    type="file" 
                    className="sr-only" 
                    accept={acceptTypes}
                    onChange={(e) => handleMediaFileChange(e, key)}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                {mediaType === 'image' && 'PNG, JPG, GIF up to 5MB'}
                {mediaType === 'video' && 'MP4, MOV up to 16MB'}
                {mediaType === 'document' && 'PDF, DOC up to 5MB'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center">
            <div className="flex-1 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {isUploading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                  <span className="ml-2 text-gray-600">Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  {mediaType === 'image' && url && (
                    <img src={url} alt="Uploaded" className="h-20 w-20 object-cover rounded-md mr-4" />
                  )}
                  {mediaType === 'video' && (
                    <Video className="h-20 w-20 p-4 bg-gray-200 rounded-md mr-4" />
                  )}
                  {mediaType === 'document' && (
                    <File className="h-20 w-20 p-4 bg-gray-200 rounded-md mr-4" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file?.name || 'Uploaded file'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {file && `${(file.size / 1024).toFixed(2)} KB`}
                      {!file && url && 'File uploaded successfully'}
                    </p>
                    {url && (
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {url}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleRemoveMedia(key)}
              className="ml-2 bg-white p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null;
    
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Template Preview</h3>
        
        {/* Header Preview */}
        {selectedTemplate.parameters?.components?.find(c => c.type === 'header') && (
          <div className="mb-3 p-3 bg-white rounded border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">HEADER</div>
            {getHeaderPreview(selectedTemplate) || (
              <div className="text-sm">
                {selectedTemplate.parameters.components.find(c => c.type === 'header')?.text || 'Text Header'}
              </div>
            )}
          </div>
        )}
        
        {/* Body Preview */}
        {selectedTemplate.parameters?.components?.find(c => c.type === 'body') && (
          <div className="mb-3 p-3 bg-white rounded border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-500">BODY</div>
              {!editingBody ? (
                <button 
                  onClick={() => setEditingBody(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Customize
                </button>
              ) : (
                <button 
                  onClick={() => setEditingBody(false)}
                  className="text-xs text-green-600 hover:text-green-800 flex items-center"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </button>
              )}
            </div>
            {editingBody ? (
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
              />
            ) : (
              <div className="text-sm whitespace-pre-wrap">
                {customBody || selectedTemplate.parameters.components.find(c => c.type === 'body')?.text || 'No body text'}
              </div>
            )}
          </div>
        )}
        
        {/* Footer Preview */}
        {selectedTemplate.parameters?.components?.find(c => c.type === 'footer') && (
          <div className="p-3 bg-white rounded border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-500">FOOTER</div>
              {!editingFooter ? (
                <button 
                  onClick={() => setEditingFooter(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Customize
                </button>
              ) : (
                <button 
                  onClick={() => setEditingFooter(false)}
                  className="text-xs text-green-600 hover:text-green-800 flex items-center"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </button>
              )}
            </div>
            {editingFooter ? (
              <textarea
                value={customFooter}
                onChange={(e) => setCustomFooter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={2}
              />
            ) : (
              <div className="text-sm text-gray-600">
                {customFooter || selectedTemplate.parameters.components.find(c => c.type === 'footer')?.text || 'No footer text'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Get mock templates for fallback
  const getMockTemplates = (): WhatsAppTemplate[] => {
    return [
      {
        id: "1234567890",
        template_name: "welcome_message",
        status: "APPROVED",
        category: "MARKETING",
        language: "fr",
        parameters: {
          components: [
            {
              type: "header",
              format: "text",
              text: "Bienvenue {{1}}!"
            },
            {
              type: "body",
              text: "Merci de vous être inscrit à notre service. Nous sommes ravis de vous avoir parmi nous.\n\nVotre compte est maintenant actif et vous pouvez commencer à utiliser nos services.",
              parameters: [
                {
                  type: "text"
                }
              ]
            },
            {
              type: "footer",
              text: "Envoyé par Airtel GPT"
            }
          ]
        }
      },
      {
        id: "0987654321",
        template_name: "appointment_reminder",
        status: "APPROVED",
        category: "UTILITY",
        language: "fr",
        parameters: {
          components: [
            {
              type: "header",
              format: "image",
              example: {
                header_handle: "https://images.pexels.com/photos/3845456/pexels-photo-3845456.jpeg"
              }
            },
            {
              type: "body",
              text: "Bonjour {{1}},\n\nCeci est un rappel pour votre rendez-vous {{2}} le {{3}} à {{4}}.\n\nVeuillez confirmer votre présence en répondant à ce message.",
              parameters: [
                {
                  type: "text"
                },
                {
                  type: "text"
                },
                {
                  type: "text"
                },
                {
                  type: "text"
                }
              ]
            },
            {
              type: "footer",
              format: "text",
              text: "Merci de votre confiance. N'hésitez pas à nous contacter pour toute question."
            }
          ]
        }
      },
      {
        id: "1122334455",
        template_name: "order_confirmation",
        status: "APPROVED",
        category: "UTILITY",
        language: "fr",
        parameters: {
          components: [
            {
              type: "header",
              format: "text",
              text: "Confirmation de commande #{{1}}"
            },
            {
              type: "body",
              text: "Bonjour {{1}},\n\nVotre commande #{{2}} a été confirmée et est en cours de traitement.\n\nMontant total: {{3}}\nDate de livraison estimée: {{4}}",
              parameters: [
                {
                  type: "text"
                },
                {
                  type: "text"
                },
                {
                  type: "text"
                },
                {
                  type: "text"
                }
              ]
            },
            {
              type: "footer",
              text: "Merci pour votre achat!"
            }
          ]
        }
      },
      {
        id: "2233445566",
        template_name: "payment_receipt",
        status: "APPROVED",
        category: "UTILITY",
        language: "fr",
        parameters: {
          components: [
            {
              type: "header",
              format: "document",
              example: {
                header_handle: "https://example.com/receipt.pdf"
              }
            },
            {
              type: "body",
              text: "Bonjour {{1}},\n\nVoici votre reçu pour le paiement de {{2}} effectué le {{3}}.\n\nMerci pour votre confiance!",
              parameters: [
                {
                  type: "text"
                },
                {
                  type: "text"
                },
                {
                  type: "text"
                }
              ]
            },
            {
              type: "footer",
              format: "image",
              text: "Merci pour votre confiance! Votre satisfaction est notre priorité."
            }
          ]
        }
      },
      {
        id: "3344556677",
        template_name: "promotional_offer",
        status: "APPROVED",
        category: "MARKETING",
        language: "fr",
        parameters: {
          components: [
            {
              type: "header",
              format: "video",
              example: {
                header_handle: "https://example.com/promo.mp4"
              }
            },
            {
              type: "body",
              text: "Bonjour {{1}},\n\nNous avons une offre spéciale pour vous! Profitez de {{2}}% de réduction sur tous nos produits jusqu'au {{3}}.\n\nUtilisez le code promo: {{4}}",
              parameters: [
                {
                  type: "text"
                },
                {
                  type: "text"
                },
                {
                  type: "text"
                },
                {
                  type: "text"
                }
              ]
            },
            {
              type: "footer",
              format: "document",
              text: "Offre soumise à conditions"
            }
          ]
        }
      }
    ];
  };

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-6 bg-white border-b">
          <h2 className="text-xl font-semibold text-gray-900">WhatsApp Templates</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          {fetchSource && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              <p>
                Templates loaded from: <strong>{fetchSource === 'api' ? 'Meta API' : fetchSource === 'database' ? 'Database' : 'Mock Templates'}</strong>
                {fetchSource !== 'api' && ' (fallback)'}
              </p>
            </div>
          )}

          {selectedTemplate ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedTemplate.template_name}
                </h3>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Back to templates
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Language:
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="fr">French</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="pt_BR">Portuguese</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>

                {/* Media upload for header, body, and footer if applicable */}
                {selectedTemplate.parameters?.components?.map((component, index) => {
                  if (component.format && component.format !== 'text') {
                    return renderMediaUpload(component);
                  }
                  return null;
                })}

                {/* Parameter inputs */}
                <div className="space-y-4">
                  {selectedTemplate.parameters?.components?.map((component, componentIndex) => 
                    component.parameters?.map((_, paramIndex) => 
                      renderParameterInput(component, paramIndex)
                    )
                  )}
                </div>
              </div>

              {renderTemplatePreview()}

              <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Use Template
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={fetchTemplates}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 ml-4"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
                    <Info className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">No templates found</p>
                  <p className="mt-1">
                    {searchTerm ? 'Try a different search term' : 'Create templates in your WhatsApp Business account'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{template.template_name}</h3>
                          <span className="text-sm text-gray-500">{template.category || 'Uncategorized'}</span>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          {template.parameters?.components?.find(c => c.type === 'header')?.format || 'text'}
                        </span>
                      </div>
                      
                      {getHeaderPreview(template)}
                      
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {template.parameters?.components?.find(c => c.type === 'body')?.text || 'No body text'}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {template.status === 'APPROVED' ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approved
                            </span>
                          ) : (
                            <span className="flex items-center text-yellow-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {template.status || 'Pending'}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          {template.language || 'fr'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTemplateSelector;