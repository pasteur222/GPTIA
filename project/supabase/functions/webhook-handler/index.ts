// Follow this setup guide to integrate the Deno runtime and Supabase functions in your project:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createGroqClient } from "../_shared/groq-client.ts";


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
    const messageData = await req.json();
    
    // Validate request data
    if (!messageData.from || !messageData.text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: from, text' }),
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
    
    // Create a Supabase client with service role key to bypass RLS
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Save incoming message
    const { data: savedMessage, error: saveError } = await supabaseAdmin
      .from('customer_conversations')
      .insert({
        phone_number: messageData.from,
        content: messageData.text,
        sender: 'user',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message:', saveError);
      throw new Error(`Failed to save message: ${saveError.message}`);
    }

    // Get user profile from phone number
    const { data: userProfile, error: userError } = await supabase
      .from('student_profiles')
      .select('id, user_id')
      .eq('phone_number', messageData.from)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user profile:', userError);
      throw new Error(`Failed to fetch user profile: ${userError.message}`);
    }

    // Determine chatbot type from message content
    const chatbotType = determineChatbotType(messageData.text);

    // Get a system-wide Groq client that doesn't depend on a specific user
    const groq = await getSystemGroqClient();

    // Get the model from the Groq configuration
    const { data: groqConfig } = await supabase
      .from('user_groq_config')
      .select('id, user_id, api_key, model')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Ensure we're not using the deprecated model
    const DEPRECATED_MODELS = ["mixtral-8x7b-32768"];
    let groqModel = groqConfig?.model || "llama3-70b-8192"; // Default to llama3 if no model specified
    if (DEPRECATED_MODELS.includes(groqModel)) {
      console.warn(`[WEBHOOK-HANDLER] [SECURITY] Detected deprecated model ${groqModel}, switching to llama3-70b-8192`);
      groqModel = "llama3-70b-8192";
      
      // Update the database to prevent future issues
      if (groqConfig?.user_id) {
        try {
          await supabaseAdmin
            .from('user_groq_config')
            .update({ model: "llama3-70b-8192" })
            .eq('user_id', groqConfig.user_id);
          console.log(`Updated user ${groqConfig.user_id}'s model from mixtral-8x7b-32768 to llama3-70b-8192`);
          console.log(`[WEBHOOK-HANDLER] Updated user ${groqConfig.user_id}'s model from ${groqConfig.model} to llama3-70b-8192`);
        } catch (updateError) {
          console.error('Failed to update deprecated model in database:', updateError);
        }
      }
    }
    
    console.log(`[WEBHOOK-HANDLER] Using Groq model: ${groqModel} for user ${groqConfig?.user_id || 'unknown'}`);

    // Generate response using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: getChatbotSystemPrompt(chatbotType)
        },
        { role: "user", content: messageData.text }
      ],
      model: groqModel,
      temperature: 0.7,
      max_tokens: 2048,
    }).catch(error => {
      console.error('Groq API error:', error);
      
      // If the error is about a decommissioned model, try again with the default model
      if (error.message && (error.message.includes('decommissioned') || error.message.includes('deprecated'))) {
        console.warn(`[WEBHOOK-HANDLER] [RECOVERY] Model error detected: ${error.message}`);
        console.log('[WEBHOOK-HANDLER] Retrying with llama3-70b-8192');
        return groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: getChatbotSystemPrompt(chatbotType)
            },
            { role: "user", content: messageData.text }
          ],
          model: "llama3-70b-8192",
          temperature: 0.7,
          max_tokens: 2048,
        });
      }
      
      throw error;
    });

    const response = completion.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse appropriée.";

    // Save bot response
    const { data: savedResponse, error: responseError } = await supabaseAdmin
      .from('customer_conversations')
      .insert({
        phone_number: messageData.from,
        content: response,
        sender: 'bot',
        intent: chatbotType,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error saving response:', responseError);
      throw new Error(`Failed to save response: ${responseError.message}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        response: response,
        chatbotType: chatbotType
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
    console.error('Error in webhook-handler function:', error);
    
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

/**
 * Determine which chatbot should handle the message based on content analysis
 * @param message The message text to analyze
 * @returns The chatbot type: 'client', 'education', or 'quiz'
 */
function determineChatbotType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Handle direct chatbot type mentions
  if (lowerMessage === 'client' || lowerMessage === 'service client') {
    return 'client';
  }
  if (lowerMessage === 'education') {
    return 'education';
  }
  if (lowerMessage === 'quiz') {
    return 'quiz';
  }
  
  // Education keywords
  const educationKeywords = [
    'learn', 'study', 'course', 'education', 'school', 'homework', 
    'assignment', 'question', 'apprendre', 'étudier', 'cours', 'éducation', 
    'école', 'devoir', 'exercice'
  ];
  
  // Quiz keywords
  const quizKeywords = [
    'quiz', 'game', 'test', 'play', 'challenge', 'question', 'answer',
    'jeu', 'défi', 'réponse', 'questionnaire'
  ];
  
  // Check for education keywords
  if (educationKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'education';
  }
  
  // Check for quiz keywords
  if (quizKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'quiz';
  }
  
  // Default to education if no match found (changed from client to ensure compatibility)
  return 'education';
}

/**
 * Get the system prompt for a specific chatbot type
 * @param chatbotType The type of chatbot
 * @returns The system prompt
 */
function getChatbotSystemPrompt(chatbotType: string): string {
  switch (chatbotType) {
    case 'education':
      return `You are an educational assistant specialized in helping students with their studies.
Your goal is to provide clear, accurate explanations and guide students through their learning process.
Be patient, encouraging, and adapt your explanations to different learning styles.
Provide step-by-step solutions when appropriate and ask clarifying questions if needed.`;
    
    case 'quiz':
      return `You are a quiz master who creates engaging educational quizzes.
Your goal is to make learning fun through interactive questions and challenges.
Be enthusiastic, encouraging, and provide informative feedback on answers.
Keep track of scores and progress, and adapt difficulty based on performance.`;
    
    default: // client support
      return `You are a customer service assistant for a telecom company.
Your goal is to help customers with their inquiries, issues, and requests.
Be professional, courteous, and solution-oriented.
Provide clear instructions and ask for clarification when needed.
If you cannot resolve an issue, offer to escalate it to a human agent.`;
  }
}
