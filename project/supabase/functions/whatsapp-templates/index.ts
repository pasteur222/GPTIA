// Follow this setup guide to integrate the Deno runtime and Supabase functions in your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
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

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from query parameters or authorization header
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
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

    // Get user's WhatsApp configuration
    const { data: userConfig, error: userConfigError } = await supabase
      .from('user_whatsapp_config')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (userConfigError) {
      console.error('Error fetching user WhatsApp config:', userConfigError);
      return fallbackResponse(supabase);
    }

    if (!userConfig || !userConfig.access_token || !userConfig.phone_number_id) {
      console.warn('User WhatsApp configuration not found or incomplete');
      return fallbackResponse(supabase);
    }
    
    // Fetch templates from WhatsApp API
    let url: string;
    
    // First priority: Use WhatsApp Business Account ID if available
    if (userConfig.whatsapp_business_account_id && userConfig.whatsapp_business_account_id.trim() !== '') {
      url = `https://graph.facebook.com/v19.0/${userConfig.whatsapp_business_account_id}/message_templates?limit=100`;
      console.log('Using WhatsApp Business Account ID to fetch templates:', userConfig.whatsapp_business_account_id);
    }
    // Second priority: Use App ID if available
    else if (userConfig.app_id && userConfig.app_id.trim() !== '') {
      url = `https://graph.facebook.com/v19.0/${userConfig.app_id}/message_templates?limit=100`;
      console.log('Using App ID to fetch templates:', userConfig.app_id);
    } 
    // Last resort: Use Phone Number ID
    else {
      url = `https://graph.facebook.com/v19.0/${userConfig.phone_number_id}/message_templates?limit=100`;
      console.log('Using Phone Number ID to fetch templates:', userConfig.phone_number_id);
    }

    console.log('Fetching templates from URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${userConfig.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp API error response:', errorText);
      return fallbackResponse(supabase);
    }

    const result = await response.json();
    console.log('WhatsApp API response:', JSON.stringify(result, null, 2));
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        templates: result.data || [],
        source: 'api'
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
    console.error('Error in whatsapp-templates function:', error);
    
    // Return fallback templates
    return new Response(
      JSON.stringify({ 
        success: false, 
        templates: getMockTemplates(),
        source: 'fallback',
        error: error.message || 'An unknown error occurred'
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});

// Fallback to database or mock templates
async function fallbackResponse(supabase) {
  try {
    // Try to get templates from database
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*');
      
    if (error) {
      console.error('Error fetching templates from database:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          templates: data,
          source: 'database'
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    } else {
      // If no templates in database, return mock templates
      return new Response(
        JSON.stringify({ 
          success: true, 
          templates: getMockTemplates(),
          source: 'mock'
        }),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  } catch (error) {
    console.error('Error in fallback response:', error);
    
    // Return mock templates as last resort
    return new Response(
      JSON.stringify({ 
        success: true, 
        templates: getMockTemplates(),
        source: 'mock'
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}

// Mock templates for testing
function getMockTemplates() {
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
            text: "Offre soumise à conditions"
          },
          {
            type: "buttons",
            buttons: [
              {
                type: "quick_reply",
                text: "En savoir plus"
              },
              {
                type: "url",
                text: "Voir l'offre",
                url: "https://example.com/offer"
              }
            ]
          }
        ]
      }
    }
  ];
}