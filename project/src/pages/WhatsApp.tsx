import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Upload, BarChart2, Clock, Plus, Settings, Gauge, X, Loader2, CheckCircle, AlertTriangle, FileText, Image, FileVideo, File as FilePdf, MessageCircle, FileCheck, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import BulkUpload from '../components/BulkUpload';
import MessageScheduler from '../components/MessageScheduler';
import WhatsAppAnalytics from '../components/WhatsAppAnalytics';
import WhatsAppConfig from '../components/WhatsAppConfig';
import RichTextEditor from '../components/RichTextEditor';
import WhatsAppTemplateSelector from '../components/WhatsAppTemplateSelector';
import { useAuth } from '../contexts/AuthContext';
import { checkWhatsAppConnection, sendWhatsAppMessages, checkMessageStatus, sendWhatsAppTemplate } from '../lib/whatsapp';
import { sendWhatsAppTemplateMessage } from '../lib/whatsapp-template';
import { uploadTemplateMedia } from '../lib/whatsapp-template';

const WhatsApp = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [statusCheckErrors, setStatusCheckErrors] = useState<Record<string, string>>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [componentError, setComponentError] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingSpeed, setSendingSpeed] = useState(1000); // Default 1 second delay
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [sendResult, setSendResult] = useState<{status: 'success' | 'error', message: string} | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [sendProgress, setSendProgress] = useState(0);
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'sent' | 'delivered' | 'failed' | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [messageType, setMessageType] = useState<'regular' | 'template'>('regular');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateConfirmation, setTemplateConfirmation] = useState<{
    show: boolean;
    template: any;
    parameters: Record<string, string>;
  } | null>(null);
  const [templateStatus, setTemplateStatus] = useState<{
    status: 'selected' | 'confirmed' | 'sending' | 'sent' | 'error';
    message: string;
  } | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    // Validate Supabase configuration on component mount
    validateSupabaseConfig();
    checkConnection();
    checkWebhookStatus();
  }, [user]);

  const validateSupabaseConfig = () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        });
        setSendResult({
          status: 'error',
          message: 'Supabase configuration missing. Please check environment variables.'
        });
        return;
      }
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        setSendResult({
          status: 'error',
          message: 'Supabase client initialization failed.'
        });
        return;
      }
      
      setSupabaseReady(true);
      console.log('Supabase configuration validated successfully');
    } catch (error) {
      console.error('Error validating Supabase configuration:', error);
      setSendResult({
        status: 'error',
        message: 'Failed to validate Supabase configuration.'
      });
    }
  };

  useEffect(() => {
    // Check delivery status if we have a messageId
    if (messageId && deliveryStatus === 'sent') {
      const checkDeliveryStatus = async () => {
        try {
          setCheckingDelivery(true);
          const result = await checkMessageStatus(messageId);
          
          if (result.status === 'delivered') {
            setDeliveryStatus('delivered');
            setSendResult({
              status: 'success',
              message: 'Message delivered successfully!'
            });
            
            // Update analytics
            await supabase.from('message_logs').update({
              status: 'delivered'
            }).eq('message_id', messageId);
            
          } else if (result.status === 'failed') {
            setDeliveryStatus('failed');
            setSendResult({
              status: 'error',
              message: 'Message delivery failed: ' + (result.details?.error || 'Unknown error')
            });
            
            // Update analytics
            await supabase.from('message_logs').update({
              status: 'failed',
              error: result.details?.error || 'Unknown error'
            }).eq('message_id', messageId);
          }
        } catch (error) {
          console.error('Error checking delivery status:', error);
        } finally {
          setCheckingDelivery(false);
        }
      };

      const intervalId = setInterval(checkDeliveryStatus, 5000); // Check every 5 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [messageId, deliveryStatus]);

  const checkConnection = async () => {
    if (!user) {
      setConnectionStatus('disconnected');
      return;
    }
    
    setConnectionStatus('checking');
    try {
      const isConnected = await checkWhatsAppConnection(user.id);
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Error checking WhatsApp connection:', error);
      setConnectionStatus('disconnected');
    }
  };

  const checkWebhookStatus = async () => {
    setWebhookStatus('checking');
    try {
      // Get webhook URL from user_whatsapp_config table
      const { data: userConfig, error } = await supabase
        .from('user_whatsapp_config')
        .select('webhook_url')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error || !userConfig || !userConfig.webhook_url) {
        console.warn('No active webhook configuration found');
        setWebhookStatus('disconnected');
        return;
      }
      
      // Use the webhook URL from the database
      const webhookUrl = userConfig.webhook_url;
      const webhookBaseUrl = new URL(webhookUrl).origin;
      
      // Use a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        // Simple ping to check if webhook is online
        const response = await fetch(`${webhookBaseUrl}/webhook`, {
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          mode: 'no-cors' // This prevents CORS errors but limits response access
        });
        
        clearTimeout(timeoutId);
        
        // With no-cors mode, we can't read the response, but if no error is thrown,
        // it means the request was sent successfully
        setWebhookStatus('connected');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.warn('Webhook status check timed out');
          setWebhookStatus('disconnected');
        } else {
          // For CORS or network errors, we'll assume the webhook might still be working
          // but we can't verify it from the browser
          console.warn('Webhook status check failed (this may be due to CORS restrictions):', fetchError.message);
          setWebhookStatus('disconnected');
        }
      }
    } catch (error) {
      console.error('Error checking webhook status:', error);
      setWebhookStatus('disconnected');
    }
  };

  const handleSend = async () => {
    if (!message && !file) return;
    if (!phoneNumber) return;
    
    // Validate Supabase configuration before proceeding
    if (!supabaseReady) {
      setSendResult({
        status: 'error',
        message: 'Supabase not ready. Please refresh the page and try again.'
      });
      return;
    }
    
    if (!user) {
      setSendResult({
        status: 'error',
        message: 'You must be logged in to send messages'
      });
      return;
    }

    try {
      setSending(true);
      setSendResult(null);
      setDeliveryStatus('pending');
      setMessageId(null);
      setSendProgress(10); // Start progress
      abortControllerRef.current = new AbortController();

      let mediaUrl: string | undefined;
      // Handle media upload if present
      if (file) {
        try {
          setSendProgress(20);
          // Upload file to Supabase Storage and get public URL
          mediaUrl = await uploadTemplateMedia(file, 'whatsapp-direct-media');
          setSendProgress(40);
        } catch (uploadError) {
          throw new Error(`Failed to upload media: ${uploadError.message}`);
        }
      }

      // Validate environment variables before API call
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration not found. Please check environment variables.');
      }

      // Send message via WhatsApp API with proper error handling
      const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{
            phoneNumber,
            message,
            mediaUrl: mediaUrl
          }],
          userId: user.id
        }),
        signal: abortControllerRef.current.signal
      });

      setSendProgress(50); // Update progress

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();
      
      // Extract message ID from the response
      const msgId = result.result?.messages?.[0]?.id || result.messages?.[0]?.id || null;
      setMessageId(msgId);
      
      // Update progress and status
      setSendProgress(80);
      setDeliveryStatus('sent');
      
      // Show initial success message
      setSendResult({
        status: 'success',
        message: 'Message sent successfully! Checking delivery status...'
      });

      // Clear form
      setMessage('');
      setPhoneNumber('');
      setFile(null);
      
      // Final progress
      setSendProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setSendProgress(0);
      }, 2000);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Message sending cancelled');
        setSendProgress(0);
      } else {
        console.error('Error sending message:', error);
        setSendResult({
          status: 'error',
          message: error.message || 'Failed to send message'
        });
        setDeliveryStatus('failed');
        setSendProgress(0);
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleBulkSend = async (data: any[]) => {
    // Validate Supabase configuration before proceeding
    if (!supabaseReady) {
      setSendResult({
        status: 'error',
        message: 'Supabase not ready. Please refresh the page and try again.'
      });
      return;
    }
    
    if (!user) {
      setSendResult({
        status: 'error',
        message: 'You must be logged in to send messages'
      });
      return;
    }
    
    try {
      setSending(true);
      setSendResult(null);
      setSendProgress(0);
      abortControllerRef.current = new AbortController();

      // Process messages with delay
      const totalMessages = data.length;
      let successCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < data.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const item = data[i];
        setSendProgress(Math.round((i / totalMessages) * 100));
        
        try {
          await new Promise(resolve => setTimeout(resolve, sendingSpeed));
          
          // Validate environment variables for each request
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration not found');
          }
          
          const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              messages: [{
                phoneNumber: item.phoneNumber,
                message: item.message || message,
                variables: item.variables
              }],
              userId: user.id
            }),
            signal: abortControllerRef.current.signal
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to send message to ${item.phoneNumber}`);
          }
          
          successCount++;
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error; // Re-throw to be caught by outer catch
          }
          console.error(`Error sending to ${item.phoneNumber}:`, error);
          failedCount++;
        }
      }

      setSendProgress(100);
      
      // Show final results
      setSendResult({
        status: successCount > 0 ? 'success' : 'error',
        message: `Sent ${successCount}/${totalMessages} messages successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`
      });
      
      setShowBulkUpload(false);
      
      // Reset progress after a delay
      setTimeout(() => {
        setSendProgress(0);
      }, 2000);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Bulk sending cancelled');
        setSendProgress(0);
      } else {
        console.error('Error sending bulk messages:', error);
        setSendResult({
          status: 'error',
          message: error.message || 'Failed to send bulk messages'
        });
        setSendProgress(0);
      }
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendTemplate = async (template: any, parameters: Record<string, string>) => {
    // Validate Supabase configuration before proceeding
    if (!supabaseReady) {
      setSendResult({
        status: 'error',
        message: 'Supabase not ready. Please refresh the page and try again.'
      });
      return;
    }
    
    if (!phoneNumber) {
      setSendResult({
        status: 'error',
        message: 'Please enter a phone number'
      });
      return;
    }

    if (!user) {
      setSendResult({
        status: 'error',
        message: 'You must be logged in to send messages'
      });
      return;
    }

    try {
      setSending(true);
      setTemplateStatus({
        status: 'sending',
        message: 'Sending template message...'
      });
      setSendResult(null);
      setDeliveryStatus('pending');
      setMessageId(null);
      setSendProgress(10); // Start progress

      // Extract media URLs and custom text from parameters
      const headerMediaUrl = parameters['header_media'] || '';
      const bodyMediaUrl = parameters['body_media'] || '';
      const footerMediaUrl = parameters['footer_media'] || '';
      const customBody = parameters['custom_body'] || '';
      const customFooter = parameters['custom_footer'] || '';
      
      // Determine media types based on file extensions
      const getMediaType = (url: string): 'image' | 'video' | 'document' | undefined => {
        if (!url) return undefined;
        
        const extension = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
          return 'image';
        } else if (['mp4', 'mov', 'avi', 'webm'].includes(extension || '')) {
          return 'video';
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
          return 'document';
        }
        
        return undefined;
      };

      // Prepare components with parameters
      const components: any[] = [];
      
      template.parameters?.components?.forEach((component: any) => {
        if (component.parameters && component.parameters.length > 0) {
          const componentParams = component.parameters.map((_: any, index: number) => {
            const paramKey = `${component.type}_${index}`;
            const paramValue = parameters[paramKey] || '';
            
            return {
              type: 'text',
              text: paramValue
            };
          });
          
          components.push({
            type: component.type,
            parameters: componentParams
          });
        }
      });

      // Send template message with media and custom text
      const result = await sendWhatsAppTemplateMessage(
        {
          to: phoneNumber,
          templateName: template.template_name,
          language: template.language || 'fr',
          components: components.length > 0 ? components : undefined,
          headerMediaUrl: headerMediaUrl,
          headerMediaType: getMediaType(headerMediaUrl),
          bodyMediaUrl: bodyMediaUrl,
          bodyMediaType: getMediaType(bodyMediaUrl),
          footerMediaUrl: footerMediaUrl,
          footerMediaType: getMediaType(footerMediaUrl),
          customBody: customBody,
          customFooter: customFooter
        },
        user.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send template message');
      }

      // Extract message ID from the response
      setMessageId(result.messageId || null);
      
      // Update progress and status
      setSendProgress(80);
      setDeliveryStatus('sent');
      
      // Show initial success message
      setSendResult({
        status: 'success',
        message: 'Template message sent successfully! Checking delivery status...'
      });

      setTemplateStatus({
        status: 'sent',
        message: 'Template message sent successfully!'
      });

      // Clear form
      setPhoneNumber('');
      
      // Close template selector
      setShowTemplateSelector(false);
      setTemplateConfirmation(null);
      
      // Final progress
      setSendProgress(100);
      
      // Reset progress after a delay
      setTimeout(() => {
        setSendProgress(0);
      }, 2000);

      // Reset template status after a delay
      setTimeout(() => {
        setTemplateStatus(null);
        setMessageType('regular');
      }, 5000);

    } catch (error) {
      console.error('Error sending template message:', error);
      setSendResult({
        status: 'error',
        message: error.message || 'Failed to send template message'
      });
      setTemplateStatus({
        status: 'error',
        message: error.message || 'Failed to send template message'
      });
      setDeliveryStatus('failed');
      setSendProgress(0);
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setSending(false);
      setSendProgress(0);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
      case 'checking':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'disconnected':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'sent':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'delivered':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'checking':
        return <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />;
      case 'disconnected':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const handleTemplateSelect = (template: any, parameters: Record<string, string>) => {
    setSelectedTemplate(template);
    setTemplateConfirmation({
      show: true,
      template,
      parameters
    });
    setTemplateStatus({
      status: 'selected',
      message: 'Template selected and ready to use'
    });
  };

  const confirmTemplate = () => {
    if (!templateConfirmation) return;
    
    setTemplateStatus({
      status: 'confirmed',
      message: 'Template confirmed and ready to send'
    });
    
    handleSendTemplate(templateConfirmation.template, templateConfirmation.parameters);
  };

  const cancelTemplateConfirmation = () => {
    setTemplateConfirmation(null);
    setTemplateStatus(null);
  };

  if (showConfig) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 border-b bg-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-yellow-500" />
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Configuration</h1>
            </div>
            <button
              onClick={() => setShowConfig(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <WhatsAppConfig />
        </div>
      </div>
    );
  }

  // Early return for component errors
  if (componentError) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 bg-gray-50">
          <BackButton />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
              Component Error
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {componentError}
            </p>
            <button
              onClick={() => {
                setComponentError(null);
              }}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : connectionStatus === 'checking'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' 
                  ? 'bg-green-500' 
                  : connectionStatus === 'checking'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}></span>
              <span>
                {connectionStatus === 'connected' 
                  ? 'API Connected' 
                  : connectionStatus === 'checking'
                  ? 'Checking...'
                  : 'API Disconnected'}
              </span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              webhookStatus === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : webhookStatus === 'checking'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                webhookStatus === 'connected' 
                  ? 'bg-green-500' 
                  : webhookStatus === 'checking'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}></span>
              <span>
                {webhookStatus === 'connected' 
                  ? 'Webhook Active' 
                  : webhookStatus === 'checking'
                  ? 'Checking...'
                  : 'Webhook Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-gray-500" />
              <select
                value={sendingSpeed}
                onChange={(e) => setSendingSpeed(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value={1000}>Normal (1s)</option>
                <option value={2000}>Slow (2s)</option>
                <option value={5000}>Very Slow (5s)</option>
              </select>
            </div>

            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <BarChart2 className="w-5 h-5" />
              Analytics
            </button>

            <button
              onClick={() => setShowScheduler(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <Clock className="w-5 h-5" />
              Schedule
            </button>

            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>

        {sendResult && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            sendResult.status === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {sendResult.status === 'success' 
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> 
              : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <p>{sendResult.message}</p>
            <button 
              onClick={() => setSendResult(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Template status indicator */}
        {templateStatus && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            templateStatus.status === 'selected' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
            templateStatus.status === 'confirmed' ? 'bg-purple-50 border border-purple-200 text-purple-700' :
            templateStatus.status === 'sending' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
            templateStatus.status === 'sent' ? 'bg-green-50 border border-green-200 text-green-700' :
            'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {templateStatus.status === 'selected' ? <Info className="w-5 h-5 flex-shrink-0" /> :
             templateStatus.status === 'confirmed' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
             templateStatus.status === 'sending' ? <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" /> :
             templateStatus.status === 'sent' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
             <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <p>{templateStatus.message}</p>
            <button 
              onClick={() => setTemplateStatus(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Progress bar */}
        {sendProgress > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {deliveryStatus === 'pending' ? 'Sending message...' : 
                 deliveryStatus === 'sent' ? 'Message sent, checking delivery...' :
                 deliveryStatus === 'delivered' ? 'Message delivered!' :
                 deliveryStatus === 'failed' ? 'Message delivery failed' :
                 'Processing...'}
              </span>
              <span className="text-sm text-gray-500">{sendProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  deliveryStatus === 'failed' ? 'bg-red-600' :
                  deliveryStatus === 'delivered' ? 'bg-green-600' :
                  'bg-blue-600'
                }`}
                style={{ width: `${sendProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Delivery status indicator */}
        {deliveryStatus && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${getStatusColor(deliveryStatus)}`}>
            {getStatusIcon(deliveryStatus)}
            <div>
              <p className="font-medium">
                {deliveryStatus === 'pending' ? 'Sending message...' : 
                 deliveryStatus === 'sent' ? 'Message sent' :
                 deliveryStatus === 'delivered' ? 'Message delivered' :
                 'Message delivery failed'}
              </p>
              <p className="text-sm">
                {deliveryStatus === 'pending' ? 'Your message is being processed' : 
                 deliveryStatus === 'sent' ? 'Message has been sent to WhatsApp servers' :
                 deliveryStatus === 'delivered' ? 'Message has been delivered to the recipient' :
                 'There was a problem delivering your message'}
              </p>
            </div>
            {checkingDelivery && (
              <Loader2 className="w-4 h-4 ml-auto animate-spin" />
            )}
          </div>
        )}

        {/* Template confirmation dialog */}
        {templateConfirmation && (
          <div className="mb-6 p-6 bg-white rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Template Message</h3>
              <button
                onClick={cancelTemplateConfirmation}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                You are about to send the following template message to <span className="font-semibold">{phoneNumber}</span>:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">{templateConfirmation.template.template_name}</span>
                </div>
                
                <div className="mt-3 space-y-2">
                  {Object.entries(templateConfirmation.parameters).map(([key, value]) => {
                    // Skip media URLs and custom text in this view
                    if (key.endsWith('_media') || key === 'custom_body' || key === 'custom_footer') {
                      return null;
                    }
                    return (
                      <div key={key} className="flex items-start gap-2">
                        <span className="text-sm font-medium text-gray-700 min-w-[120px]">{key}:</span>
                        <span className="text-sm text-gray-600">{value}</span>
                      </div>
                    );
                  })}
                  
                  {/* Show media files if present */}
                  {Object.entries(templateConfirmation.parameters).map(([key, value]) => {
                    if (key.endsWith('_media') && value) {
                      const mediaType = key.split('_')[0]; // header, body, or footer
                      return (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-sm font-medium text-gray-700 min-w-[120px]">{mediaType} media:</span>
                          <span className="text-sm text-green-600">✓ Media attached</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                  
                  {/* Show custom text if present */}
                  {templateConfirmation.parameters['custom_body'] && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-700 min-w-[120px]">Custom body:</span>
                      <span className="text-sm text-gray-600">{templateConfirmation.parameters['custom_body']}</span>
                    </div>
                  )}
                  
                  {templateConfirmation.parameters['custom_footer'] && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-700 min-w-[120px]">Custom footer:</span>
                      <span className="text-sm text-gray-600">{templateConfirmation.parameters['custom_footer']}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelTemplateConfirmation}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={confirmTemplate}
                className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Send Template
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Send Message</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMessageType('regular');
                  setTemplateStatus(null);
                }}
                className={`px-4 py-2 rounded-lg ${
                  messageType === 'regular' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MessageCircle className="w-5 h-5 inline-block mr-2" />
                Regular Message
              </button>
              <button
                onClick={() => {
                  setShowTemplateSelector(true);
                  setMessageType('template');
                }}
                className={`px-4 py-2 rounded-lg ${
                  messageType === 'template' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileCheck className="w-5 h-5 inline-block mr-2" />
                Template Message
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+221 XX XXX XX XX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>

            {messageType === 'regular' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder="Type your message here..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="image/*,video/*,application/pdf"
                  />
                  {file ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                      {file.type.startsWith('image/') && <Image className="w-4 h-4" />}
                      {file.type.startsWith('video/') && <FileVideo className="w-4 h-4" />}
                      {file.type.startsWith('application/') && <FilePdf className="w-4 h-4" />}
                      <span className="truncate max-w-xs">{file.name}</span>
                      <button
                        onClick={handleFileRemove}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="file"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      Add Media
                    </label>
                  )}

                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Upload className="w-5 h-5" />
                    Bulk Upload
                  </button>

                  {sending ? (
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 ml-auto"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={(!message && !file) || !phoneNumber || connectionStatus !== 'connected' || !supabaseReady}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg ml-auto transition-colors ${
                        (!message && !file) || !phoneNumber || connectionStatus !== 'connected' || !supabaseReady
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                      }`}
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      Send
                    </button>
                  )}
                </div>
              </>
            )}

            {messageType === 'template' && !templateConfirmation && (
              <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileCheck className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Select a template to send</p>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Choose Template
                </button>
              </div>
            )}
          </div>
        </div>

        {!supabaseReady && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Configuration Error</h3>
                <p className="text-red-700 text-sm">Supabase configuration is not ready. Please check your environment variables and refresh the page.</p>
              </div>
            </div>
          </div>
        )}

        {connectionStatus === 'disconnected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">WhatsApp Connection Issue</h3>
                <p className="text-red-700 text-sm mb-3">
                  Your WhatsApp connection is not active. Please configure your WhatsApp API credentials in the settings.
                </p>
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Configure WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {webhookStatus === 'disconnected' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Webhook Status Issue</h3>
                <p className="text-yellow-700 text-sm mb-3">
                  The WhatsApp webhook is not responding. This may affect message delivery status updates and template retrieval.
                </p>
                <p className="text-yellow-700 text-sm">
                  Please ensure your webhook is properly deployed on Render and configured in the Meta Developer Dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            WhatsApp API Information
            {supabaseReady && (
              <span className="ml-2 text-sm text-green-600">✓ Ready</span>
            )}
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Configuration Status</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Supabase URL:</span>
                    <span className={`ml-2 ${import.meta.env.VITE_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}`}>
                      {import.meta.env.VITE_SUPABASE_URL ? '✓ Configured' : '✗ Missing'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Supabase Key:</span>
                    <span className={`ml-2 ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}`}>
                      {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Configured' : '✗ Missing'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Client Ready:</span>
                    <span className={`ml-2 ${supabaseReady ? 'text-green-600' : 'text-red-600'}`}>
                      {supabaseReady ? '✓ Ready' : '✗ Not Ready'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">User Authenticated:</span>
                    <span className={`ml-2 ${user ? 'text-green-600' : 'text-red-600'}`}>
                      {user ? '✓ Authenticated' : '✗ Not Authenticated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Configuration</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  You are using your personal WhatsApp Business API configuration for sending messages.
                </p>
                <p className="text-sm text-gray-600">
                  {connectionStatus === 'connected' 
                    ? 'Your WhatsApp API connection is working properly.' 
                    : 'Please configure your WhatsApp API credentials in the settings.'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Webhook Status</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  The webhook is responsible for receiving incoming messages and delivery status updates.
                </p>
                <p className="text-sm text-gray-600">
                  {webhookStatus === 'connected' 
                    ? 'Your webhook is active and properly configured.' 
                    : 'Your webhook is not responding. Please check your Render deployment.'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Getting Started</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  To use WhatsApp Business API, you need to:
                </p>
                <ol className="text-sm text-gray-600 list-decimal list-inside mt-2 space-y-1">
                  <li>Create a Meta Developer account</li>
                  <li>Set up a WhatsApp Business API application</li>
                  <li>Configure a phone number</li>
                  <li>Generate a permanent access token in Meta Business Manager</li>
                  <li>Set up a webhook endpoint (e.g., https://webhook-telecombusiness.onrender.com/webhook)</li>
                  <li>Configure your webhook URL in the WhatsApp settings</li>
                </ol>
                <p className="text-sm text-gray-600 mt-2">
                  Once configured, you can send messages, use templates, and manage your WhatsApp communications.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Message Format</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify({
                    messaging_product: "whatsapp",
                    to: "RECIPIENT_PHONE_NUMBER",
                    type: "text",
                    text: {
                      body: "Hello, this is a test message"
                    }
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBulkUpload && (
        <div className="fixed inset-0 bg-white z-50">
          <BulkUpload
            onClose={() => setShowBulkUpload(false)}
            onSend={handleBulkSend}
          />
        </div>
      )}

      {showScheduler && (
        <div className="fixed inset-0 bg-white z-50">
          <MessageScheduler onClose={() => setShowScheduler(false)} />
        </div>
      )}

      {showAnalytics && (
        <div className="fixed inset-0 bg-white z-50">
          <WhatsAppAnalytics onClose={() => setShowAnalytics(false)} />
        </div>
      )}

      {showTemplateSelector && (
        <WhatsAppTemplateSelector
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
};

export default WhatsApp;