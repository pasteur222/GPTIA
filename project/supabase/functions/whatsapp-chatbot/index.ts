import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

console.log("Edge function 'whatsapp-chatbot' is running...");

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
    const { record: message } = await req.json();
    const webhookId = message.webhook_id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get the webhook config
    const { data: webhookConfig, error: webhookError } = await supabaseAdmin
      .from("webhook_config")
      .select("*")
      .eq("webhook_id", webhookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!webhookConfig) {
      console.error("Webhook config not found:", webhookError?.message);
      return new Response("Webhook config not found", { status: 404 });
    }

    // 2. Get the chatbot type from config
    const chatbotType = webhookConfig.chatbot_type || "education";

    // 3. Get the message and phone number
    const userMessage = message.message;
    const phoneNumber = message.phone_number;
    const userId = webhookConfig.user_id;

    if (!userMessage || !phoneNumber) {
      return new Response("Missing user message or phone number", {
        status: 400,
      });
    }

    // 4. Get the Groq configuration for the user
    const { data: groqConfig, error: groqError } = await supabaseAdmin
      .from("user_groq_config")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (groqError) {
      console.error("Error fetching Groq config:", groqError);
    }

    // Use user's configuration or fallback to any available configuration
    let apiKey = groqConfig?.api_key;
    let model = groqConfig?.model || "llama3-70b-8192";

    // If no user config found, try to get any available config
    if (!apiKey) {
      console.log("[WHATSAPP-CHATBOT] No user config found, trying system-wide config");
      const { data: anyConfig, error: anyConfigError } = await supabaseAdmin
        .from("user_groq_config")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyConfig && anyConfig.api_key) {
        apiKey = anyConfig.api_key;
        model = anyConfig.model || "llama3-70b-8192";
        console.log(`[WHATSAPP-CHATBOT] Using fallback config from user: ${anyConfig.user_id}`);
      } else {
        // Last resort: use environment variable
        apiKey = Deno.env.get("GROQ_API_KEY");
        if (!apiKey) {
          throw new Error("No Groq API key found in user config, system config, or environment variables");
        }
        console.log("[WHATSAPP-CHATBOT] Using environment variable GROQ_API_KEY");
      }
    }

    // Ensure we're not using deprecated models
    const DEPRECATED_MODELS = ["mixtral-8x7b-32768"];
    if (DEPRECATED_MODELS.includes(model)) {
      console.warn(`[WHATSAPP-CHATBOT] [SECURITY] Detected deprecated model ${model}, switching to llama3-70b-8192`);
      model = "llama3-70b-8192";
      
      // Update the database to prevent future issues
      if (groqConfig?.user_id) {
        try {
          await supabaseAdmin
            .from("user_groq_config")
            .update({ model: "llama3-70b-8192" })
            .eq("user_id", groqConfig.user_id);
          console.log(`[WHATSAPP-CHATBOT] Updated user ${groqConfig.user_id}'s model to llama3-70b-8192`);
        } catch (updateError) {
          console.error("Failed to update deprecated model in database:", updateError);
        }
      }
    }

    console.log(`[WHATSAPP-CHATBOT] Using Groq model: ${model} for user ${userId}`);

    // 5. Generate system prompt based on chatbot type
    let systemPrompt = "";
    switch (chatbotType) {
      case "education":
        systemPrompt = `You are an educational assistant specialized in helping students with their studies.
Your goal is to provide clear, accurate explanations and guide students through their learning process.
Be patient, encouraging, and adapt your explanations to different learning styles.`;
        break;
      case "quiz":
        systemPrompt = `You are a quiz master who creates engaging educational quizzes.
Your goal is to make learning fun through interactive questions and challenges.
Be enthusiastic, encouraging, and provide informative feedback on answers.`;
        break;
      default:
        systemPrompt = `You are a customer service assistant for a telecom company.
Your goal is to help customers with their inquiries, issues, and requests.
Be professional, courteous, and solution-oriented.`;
    }

    // 6. Make direct HTTP call to Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    }).catch(async (error) => {
      console.error("[WHATSAPP-CHATBOT] Groq API error:", error);
      
      // If the error is about a decommissioned model, try again with the default model
      if (error.message && (error.message.includes('decommissioned') || error.message.includes('deprecated'))) {
        console.warn(`[WHATSAPP-CHATBOT] [RECOVERY] Model error detected, retrying with llama3-70b-8192`);
        return fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            temperature: 0.7,
            max_tokens: 2048
          })
        });
      }
      
      throw error;
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error("[WHATSAPP-CHATBOT] Groq API error response:", errorData);
      
      // If the error is about a decommissioned model, try again with the default model
      if (errorData.error?.message?.includes('decommissioned') || errorData.error?.message?.includes('deprecated')) {
        console.warn(`[WHATSAPP-CHATBOT] [RECOVERY] Model error detected: ${errorData.error.message}`);
        console.log('[WHATSAPP-CHATBOT] Retrying with llama3-70b-8192');
        
        const retryResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            temperature: 0.7,
            max_tokens: 2048
          })
        });
        
        if (!retryResponse.ok) {
          const retryErrorData = await retryResponse.json();
          throw new Error(`Groq API error after retry: ${JSON.stringify(retryErrorData)}`);
        }
        
        const retryResult = await retryResponse.json();
        const aiResponse = retryResult.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse appropriée.";
        
        // Update the user's model in the database to prevent future issues
        if (groqConfig?.user_id) {
          try {
            await supabaseAdmin
              .from("user_groq_config")
              .update({ model: "llama3-70b-8192" })
              .eq("user_id", groqConfig.user_id);
            console.log(`[WHATSAPP-CHATBOT] Updated user ${groqConfig.user_id}'s model to llama3-70b-8192 after error`);
          } catch (updateError) {
            console.error("Failed to update model after error:", updateError);
          }
        }
        
        // Save the response to Supabase
        const { error: saveError } = await supabaseAdmin.from("chatbot_logs").insert({
          phone_number: phoneNumber,
          message: userMessage,
          response: aiResponse,
          chatbot_type: chatbotType,
          webhook_id: webhookId,
          user_id: userId,
        });

        if (saveError) {
          console.error("Failed to save chatbot log:", saveError.message);
        }

        return new Response(JSON.stringify({ reply: aiResponse }), {
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          },
        });
      }
      
      throw new Error(`Groq API error: ${JSON.stringify(errorData)}`);
    }

    const result = await groqResponse.json();
    const aiResponse = result.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse appropriée.";

    console.log(`[WHATSAPP-CHATBOT] Generated response using model ${model} for user ${userId}`);

    // 7. Save the response to Supabase
    const { error: saveError } = await supabaseAdmin.from("chatbot_logs").insert({
      phone_number: phoneNumber,
      message: userMessage,
      response: aiResponse,
      chatbot_type: chatbotType,
      webhook_id: webhookId,
      user_id: userId,
    });

    if (saveError) {
      console.error("Failed to save chatbot log:", saveError.message);
    }

    return new Response(JSON.stringify({ reply: aiResponse }), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  } catch (error) {
    console.error("[WHATSAPP-CHATBOT] Function error:", error);
    
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