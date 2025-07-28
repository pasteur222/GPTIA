// Follow this setup guide to integrate the Deno runtime and Supabase functions in your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface WhatsAppMessage {
  phoneNumber: string; 
  message: string;
  mediaUrl?: string; // Public URL from Supabase Storage or external source
  variables?: Record<string, string>;
}

interface WhatsAppRequest {
  messages: WhatsAppMessage | WhatsAppMessage[];
  userId: string;
}

// Enhanced logging function
function logInfo(message: string, data?: any) {
  console.log(`[WHATSAPP-FUNCTION] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function logError(message: string, error?: any) {
  console.error(`[WHATSAPP-FUNCTION] ERROR: ${message}`, error);
}
serve(async (req) => {
  try {
    logInfo('Function invoked', { method: req.method, url: req.url });
    
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      logInfo('CORS preflight request handled');
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      logError('Method not allowed', { method: req.method });
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Parse request body
    let requestData: WhatsAppRequest;
    try {
      requestData = await req.json();
      logInfo('Request data parsed', { 
        hasMessages: !!requestData.messages,
        hasUserId: !!requestData.userId,
        messageCount: Array.isArray(requestData.messages) ? requestData.messages.length : 1
      });
    } catch (parseError) {
      logError('Failed to parse request JSON', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
    
    // Validate request data
    if (!requestData.messages) {
      logError('No messages provided in request');
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Validate userId is provided
    if (!requestData.userId) {
      logError('No userId provided in request');
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Get WhatsApp configuration from database
    logInfo('Getting WhatsApp configuration', { userId: requestData.userId });
    const config = await getWhatsAppConfig(requestData.userId);
    logInfo('WhatsApp configuration retrieved', { hasConfig: !!config });
    
    // Process messages
    const messages = Array.isArray(requestData.messages) 
      ? requestData.messages 
      : [requestData.messages];
    
    logInfo('Processing messages', { count: messages.length });
    
    const results = await Promise.all(
      messages.map(msg => sendWhatsAppMessage(msg, config))
    );
    
    logInfo('Messages processed', { 
      successCount: results.filter(r => r.success).length,
      totalCount: results.length
    });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        result: { 
          messages: results.map(r => ({ id: r.messageId }))
        }
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  } catch (error) {
    logError('Function execution failed', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});

// Get WhatsApp configuration from database
async function getWhatsAppConfig(userId: string) {
  try {
    logInfo('Getting WhatsApp config for user', { userId });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      logError('Missing Supabase environment variables', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      throw new Error('Supabase configuration not found in environment variables');
    }
    
    // Import createClient dynamically to avoid issues
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user-specific config
    logInfo('Querying user WhatsApp config', { userId });
    const { data: userConfig } = await supabase
      .from('user_whatsapp_config')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (!userConfig || !userConfig.access_token || !userConfig.phone_number_id) {
      logError('No active WhatsApp configuration found', { 
        userId,
        hasConfig: !!userConfig,
        hasToken: !!userConfig?.access_token,
        hasPhoneId: !!userConfig?.phone_number_id
      });
      throw new Error(`No active WhatsApp configuration found for user ${userId}`);
    }
    
    logInfo('WhatsApp configuration found', {
      userId,
      phoneNumberId: userConfig.phone_number_id,
      hasToken: !!userConfig.access_token
    });
    
    return {
      accessToken: userConfig.access_token,
      phoneNumberId: userConfig.phone_number_id
    };
  } catch (error) {
    logError('Error getting WhatsApp configuration', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Send WhatsApp message
async function sendWhatsAppMessage(message: WhatsAppMessage, config: { accessToken: string, phoneNumberId: string }) {
  try {
    logInfo('Sending WhatsApp message', {
      to: message.phoneNumber,
      hasMessage: !!message.message,
      hasMedia: !!message.mediaUrl,
      hasVariables: !!message.variables
    });
    
    // Process message variables if present
    let processedMessage = message.message;
    if (message.variables) {
      logInfo('Processing message variables', { variableCount: Object.keys(message.variables).length });
      Object.entries(message.variables).forEach(([key, value]) => {
        processedMessage = processedMessage.replace(
          new RegExp(`{{${key}}}`, 'g'),
          value
        );
      });
    }

    // Determine message type and prepare payload
    let messageType = 'text';
    let mediaType: 'image' | 'video' | 'document' | null = null;
    
    if (message.mediaUrl) {
      logInfo('Processing media message', { mediaUrl: message.mediaUrl });
      // Determine media type from URL or file extension
      const url = message.mediaUrl.toLowerCase();
      if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')) {
        mediaType = 'image';
        messageType = 'image';
      } else if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') || url.includes('.webm')) {
        mediaType = 'video';
        messageType = 'video';
      } else if (url.includes('.pdf') || url.includes('.doc') || url.includes('.docx')) {
        mediaType = 'document';
        messageType = 'document';
      } else {
        // Default to document for unknown types
        mediaType = 'document';
        messageType = 'document';
      }
    }
    
    // Prepare the WhatsApp message payload
    const messagePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.phoneNumber,
      type: messageType
    };

    // Add the appropriate content based on message type
    if (message.mediaUrl && mediaType) {
      // Validate that mediaUrl is a proper URL
      try {
        new URL(message.mediaUrl);
        logInfo('Valid media URL provided', { mediaType, url: message.mediaUrl });
        messagePayload[mediaType] = { link: message.mediaUrl };
      } catch (urlError) {
        logError('Invalid media URL provided', { mediaUrl: message.mediaUrl, error: urlError.message });
        throw new Error('Invalid media URL provided');
      }
      
      // Add caption for media messages if there's text
      if (processedMessage && processedMessage.trim()) {
        messagePayload[mediaType].caption = processedMessage;
        logInfo('Added caption to media message');
      }
    } else {
      messagePayload.text = { body: processedMessage };
    }

    logInfo('Sending to WhatsApp API', {
      phoneNumberId: config.phoneNumberId,
      messageType,
      hasToken: !!config.accessToken
    });

    // Send the message to WhatsApp API
    const response = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messagePayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      logError('WhatsApp API error', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(errorData.error?.message || 'WhatsApp API error');
    }

    const data = await response.json();
    logInfo('Message sent successfully', {
      messageId: data.messages?.[0]?.id,
      to: message.phoneNumber
    });
    
    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (error) {
    logError('Error sending WhatsApp message', {
      to: message.phoneNumber,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}