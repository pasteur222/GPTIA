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
    const statusData = await req.json();
    
    // Validate request data
    if (!statusData.messageId && !statusData.status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: messageId or status' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Handle cases where we only have partial data
    if (!statusData.messageId) {
      console.log("⚠️ Status update without messageId, skipping database update");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Status update received but no messageId provided"
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

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update message status in database
    const { error: updateError } = await supabase
      .from('message_logs')
      .update({
        status: statusData.status,
        updated_at: new Date().toISOString()
      })
      .eq('message_id', statusData.messageId);

    if (updateError) {
      console.error('Error updating message status:', updateError);
      console.warn('Continuing despite database update error');
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Status updated to ${statusData.status}`
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
    console.error('Error in status-handler function:', error);
    
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