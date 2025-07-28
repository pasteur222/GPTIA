import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    const { messageId } = await req.json()
    
    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'Missing messageId parameter' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    console.log('🔍 [CHECK-MESSAGE-STATUS] Checking status for messageId:', messageId)

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check message status in database
    const { data: messageLog, error } = await supabase
      .from('message_logs')
      .select('*')
      .eq('message_id', messageId)
      .maybeSingle()

    if (error) {
      console.error('❌ [CHECK-MESSAGE-STATUS] Database error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    if (messageLog) {
      console.log('✅ [CHECK-MESSAGE-STATUS] Found message in database:', {
        messageId,
        status: messageLog.status,
        phoneNumber: messageLog.phone_number
      })
      
      return new Response(
        JSON.stringify({
          success: true,
          status: messageLog.status,
          messageData: messageLog,
          source: 'database'
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    // If not found in database, try to get WhatsApp config and check via API
    const { data: whatsappConfig } = await supabase
      .from('user_whatsapp_config')
      .select('access_token, phone_number_id')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (whatsappConfig?.access_token) {
      console.log('📡 [CHECK-MESSAGE-STATUS] Attempting to check via WhatsApp API')
      
      try {
        // Note: WhatsApp API doesn't provide a direct message status endpoint
        // This is a placeholder for potential webhook-based status tracking
        // In practice, status updates come via webhooks, not polling
        
        console.log('⚠️ [CHECK-MESSAGE-STATUS] WhatsApp API status check not implemented - using webhook-based updates')
        
        return new Response(
          JSON.stringify({
            success: true,
            status: 'pending',
            message: 'Status will be updated via webhook when available',
            source: 'api_placeholder'
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        )
      } catch (apiError) {
        console.error('❌ [CHECK-MESSAGE-STATUS] WhatsApp API error:', apiError)
      }
    }

    // Default response when no status is found
    console.log('⚠️ [CHECK-MESSAGE-STATUS] No status found, returning pending')
    
    return new Response(
      JSON.stringify({
        success: true,
        status: 'pending',
        message: 'Message status not yet available',
        source: 'default'
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )

  } catch (error) {
    console.error('❌ [CHECK-MESSAGE-STATUS] Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        status: 'failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
})