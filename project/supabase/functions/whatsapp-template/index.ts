// Follow this setup guide to integrate the Deno runtime and Supabase functions in your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface TemplateParameter {
  type: string;
  text?: string;
  image?: {
    link: string;
  };
  video?: {
    link: string;
  };
  document?: {
    link: string;
  };
}

interface TemplateComponent {
  type: string;
  parameters?: TemplateParameter[];
  buttons?: TemplateButton[];
}

interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}

interface TemplateRequest {
  to: string;
  templateName: string;
  language: string;
  components?: TemplateComponent[];
  buttons?: TemplateButton[];
  media?: {
    type: 'image' | 'video' | 'document';
    url?: string;
    data?: string;
  };
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Parse request body
    const requestData: TemplateRequest = await req.json();
    
    // Validate request data
    if (!requestData.to || !requestData.templateName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, templateName' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Validate userId is provided
    if (!requestData.userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's WhatsApp configuration
    const { data: userConfig, error: userConfigError } = await supabase
      .from('user_whatsapp_config')
      .select('*')
      .eq('user_id', requestData.userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (userConfigError) {
      throw new Error('Failed to fetch WhatsApp configuration: ' + userConfigError.message);
    }
    
    if (!userConfig || !userConfig.access_token || !userConfig.phone_number_id) {
      throw new Error('WhatsApp configuration not found or incomplete for this user');
    }
    
    const config = {
      accessToken: userConfig.access_token,
      phoneNumberId: userConfig.phone_number_id
    };
    
    // Prepare the template message payload
    const templatePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: requestData.to,
      type: 'template',
      template: {
        name: requestData.templateName,
        language: {
          code: requestData.language || 'fr'
        }
      }
    };
    
    // Add components if provided
    if (requestData.components && requestData.components.length > 0) {
      templatePayload.template.components = requestData.components;
    }
    
    // Add buttons if provided separately
    if (requestData.buttons && requestData.buttons.length > 0) {
      // If components don't exist, create them
      if (!templatePayload.template.components) {
        templatePayload.template.components = [];
      }
      
      // Add buttons component
      templatePayload.template.components.push({
        type: 'buttons',
        buttons: requestData.buttons
      });
    }

    // Send template message
    const templateResult = await sendTemplateMessage(requestData, config, templatePayload);
    
    // Log the template message
    await supabase.from('message_logs').insert({
      status: 'sent',
      phone_number: requestData.to,
      message_preview: `Template: ${requestData.templateName}`,
      message_id: templateResult.messageId,
      created_at: new Date().toISOString()
    });
    
    // If there's additional media to send
    let mediaResult = null;
    if (requestData.media) {
      try {
        // Wait a bit before sending the media to ensure proper message order
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        mediaResult = await sendMediaMessage(
          requestData.to, 
          requestData.media, 
          config
        );
        
        // Log the media message
        await supabase.from('message_logs').insert({
          status: 'sent',
          phone_number: requestData.to,
          message_preview: `Media: ${requestData.media.type}`,
          message_id: mediaResult.messageId,
          created_at: new Date().toISOString()
        });
      } catch (mediaError) {
        console.error('Error sending media message:', mediaError);
        
        // Log the error
        await supabase.from('message_logs').insert({
          status: 'error',
          phone_number: requestData.to,
          message_preview: `Media: ${requestData.media.type}`,
          error: mediaError.message,
          created_at: new Date().toISOString()
        });
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        messages: [
          { id: templateResult.messageId },
          ...(mediaResult ? [{ id: mediaResult.messageId }] : [])
        ]
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Error in whatsapp-template function:', error);
    
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
          ...corsHeaders
        }
      }
    );
  }
});

// Send WhatsApp template message
async function sendTemplateMessage(
  request: TemplateRequest, 
  config: { accessToken: string, phoneNumberId: string },
  payload: any
) {
  try {
    // Send the template message to WhatsApp API
    const response = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (error) {
    console.error('Error sending WhatsApp template message:', error);
    throw error;
  }
}

// Send media message
async function sendMediaMessage(
  to: string,
  media: { type: 'image' | 'video' | 'document', url?: string, data?: string },
  config: { accessToken: string, phoneNumberId: string }
) {
  try {
    // Prepare the media message payload
    const mediaPayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: media.type
    };

    // Add the media content
    if (media.url) {
      mediaPayload[media.type] = { link: media.url };
    } else if (media.data) {
      // For base64 encoded media
      // This would need additional handling in a real implementation
      mediaPayload[media.type] = { link: media.data };
    }

    // Send the media message to WhatsApp API
    const response = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mediaPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `WhatsApp API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (error) {
    console.error('Error sending WhatsApp media message:', error);
    throw error;
  }
}