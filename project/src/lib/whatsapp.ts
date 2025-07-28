import { supabase } from './supabase';
import { checkSubscriptionStatus } from './subscription';

// Define the webhook endpoint for processing messages
const WEBHOOK_ENDPOINT = 'https://webhook-telecombusiness.onrender.com/webhook';

// Define the WhatsApp API URL
const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

// Create a function to get WhatsApp configuration
export async function getWhatsAppConfig(userId?: string) {
  try {
    console.log('Getting WhatsApp configuration for user:', userId);
    
    // If userId is provided, try to get user-specific config
    if (userId) {
      const { data: userConfig, error: userConfigError } = await supabase
        .from('user_whatsapp_config')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!userConfigError && userConfig && userConfig.access_token && userConfig.phone_number_id) {
        console.log('Found active WhatsApp configuration for user:', userId);
        return {
          accessToken: userConfig.access_token,
          phoneNumberId: userConfig.phone_number_id,
          whatsappBusinessAccountId: userConfig.whatsapp_business_account_id || null,
          source: 'user_config'
        };
      } else {
        console.log('No active WhatsApp configuration found for user:', userId);
      }
    }
    
    // If no user config or userId not provided, try to find any active user config
    const { data: anyUserConfig, error: anyUserConfigError } = await supabase
      .from('user_whatsapp_config')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!anyUserConfigError && anyUserConfig && anyUserConfig.access_token && anyUserConfig.phone_number_id) {
      console.log('Using another user\'s WhatsApp configuration as fallback');
      return {
        accessToken: anyUserConfig.access_token,
        phoneNumberId: anyUserConfig.phone_number_id,
        whatsappBusinessAccountId: anyUserConfig.whatsapp_business_account_id || null,
        source: 'fallback_user_config'
      };
    }
    
    // If all attempts fail, throw an error
    throw new Error('No active WhatsApp configuration found. Please configure your WhatsApp API credentials in the settings.');
  } catch (error) {
    console.error('Error getting WhatsApp configuration:', error);
    throw error;
  }
}

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    url: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    url: string;
  };
}

interface AutoReplyRule {
  id: string;
  trigger_words: string[];
  response: string;
  variables?: Record<string, string>;
  use_regex: boolean;
  pattern_flags: string;
  priority: number;
  is_active: boolean;
}

interface RateLimit {
  enabled: boolean;
  max_per_hour: number;
  cooldown_minutes: number;
}

// Module trigger messages
const TRIGGER_MESSAGES = {
  EDUCATION: "I want to learn",
  CUSTOMER_SERVICE: "Customer Service",
  QUIZ: "Game"
};

export async function initializeWhatsAppWebhook() {
  try {
    // Get WhatsApp configuration
    const config = await getWhatsAppConfig();
    const { accessToken, phoneNumberId } = config;

    // Validate access token format
    if (!accessToken.startsWith('EAA')) {
      console.error('Invalid WhatsApp access token format');
      return { error: 'Invalid token format' };
    }

    try {
      // Test connection to the WhatsApp API
      const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp API error:', errorData);
        
        if (errorData.error?.code === 190) {
          // Update the database to reflect the expired token
          if (config.source === 'user_config' || config.source === 'fallback_user_config') {
            await supabase
              .from('user_whatsapp_config')
              .update({
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('phone_number_id', phoneNumberId);
          }
            
          return { error: 'Token expired' };
        }
        
        return { error: 'API error: ' + (errorData.error?.message || response.statusText) };
      }

      // If config came from user_whatsapp_config, update it to reflect successful connection
      if (config.source === 'user_config' || config.source === 'fallback_user_config') {
        await supabase
          .from('user_whatsapp_config')
          .update({
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('phone_number_id', phoneNumberId);
      }
      
      return { success: true };
    } catch (apiError) {
      console.error('WhatsApp API error:', apiError);
      return { error: 'API connection failed: ' + (apiError instanceof Error ? apiError.message : String(apiError)) };
    }
  } catch (error) {
    console.error('Error initializing WhatsApp webhook:', error);
    return { error: 'Initialization failed: ' + (error instanceof Error ? error.message : String(error)) };
  }
}

export async function handleIncomingMessage(message: WhatsAppMessage) {
  try {
    if (!message.text?.body) {
      console.warn('Received message without text body');
      return;
    }

    // Save incoming message
    await supabase.from('customer_conversations').insert({
      phone_number: message.from,
      content: message.text.body,
      sender: 'user',
      created_at: new Date(message.timestamp).toISOString()
    });

    // Forward message to webhook for processing
    try {
      const response = await fetch(WEBHOOK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: message.from,
          text: message.text.body,
          timestamp: message.timestamp,
          messageId: message.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error forwarding message to webhook:', errorData);
        // Continue with fallback processing if webhook fails
      } else {
        // Message successfully processed by webhook, no need for fallback
        return;
      }
    } catch (error) {
      console.error('Error sending message to webhook:', error);
    }

    // Check if this is a trigger message
    const moduleType = getModuleType(message.text.body);
    
    // If not a trigger message and no active session, send help message
    if (!moduleType && !await hasActiveSession(message.from)) {
      await sendWhatsAppResponse(message.from, 
        "Welcome! To start, please send one of these messages:\n" +
        "- 'I want to learn' for education\n" +
        "- 'Customer Service' for support\n" +
        "- 'Game' to play quiz"
      );
      return;
    }

    // Handle module-specific trigger messages
    if (moduleType) {
      // Start module session (always grant access)
      await startModuleSession(message.from, moduleType);
      return;
    }

    // Handle ongoing session
    const activeSession = await getActiveSession(message.from);
    if (!activeSession) return;

    switch (activeSession.type) {
      case 'EDUCATION':
        await handleEducationMessage(message);
        break;
        
      case 'CUSTOMER_SERVICE':
        await handleCustomerServiceMessage(message);
        break;
        
      case 'QUIZ':
        await handleQuizMessage(message);
        break;
    }

  } catch (error) {
    console.error('Error handling incoming message:', error);
    throw error;
  }
}

function getModuleType(message: string): string | null {
  const normalizedMessage = message.trim().toLowerCase();
  
  if (normalizedMessage === TRIGGER_MESSAGES.EDUCATION.toLowerCase()) {
    return 'EDUCATION';
  }
  if (normalizedMessage === TRIGGER_MESSAGES.CUSTOMER_SERVICE.toLowerCase()) {
    return 'CUSTOMER_SERVICE';
  }
  if (normalizedMessage === TRIGGER_MESSAGES.QUIZ.toLowerCase()) {
    return 'QUIZ';
  }
  
  return null;
}

async function hasActiveSession(phoneNumber: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('education_sessions')
      .select('id')
      .eq('phone_number', phoneNumber)
      .is('end_time', null)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error('Error checking active session:', error);
    return false;
  }
}

async function getActiveSession(phoneNumber: string) {
  const { data: educationSession } = await supabase
    .from('education_sessions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .is('end_time', null)
    .maybeSingle();

  if (educationSession) {
    return { type: 'EDUCATION', session: educationSession };
  }

  // Check other session types similarly...
  return null;
}

async function endSession(sessionId: string) {
  await supabase
    .from('education_sessions')
    .update({
      end_time: new Date().toISOString()
    })
    .eq('id', sessionId);
}

async function startModuleSession(phoneNumber: string, moduleType: string) {
  let welcomeMessage = '';

  switch (moduleType) {
    case 'EDUCATION':
      // Get student profile
      const { data: student } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
        
      if (student) {
        await supabase.from('education_sessions').insert({
          student_id: student.id,
          phone_number: phoneNumber,
          subject: 'general',
          start_time: new Date().toISOString()
        });
      }
      
      welcomeMessage = "Bienvenue dans le module Éducation! Quelle matière souhaitez-vous étudier? Vous pouvez aussi m'envoyer une image d'un problème ou d'un exercice pour que je puisse vous aider.";
      break;

    case 'CUSTOMER_SERVICE':
      welcomeMessage = "Bienvenue au Service Client! Comment puis-je vous aider aujourd'hui?";
      break;

    case 'QUIZ':
      welcomeMessage = "Bienvenue au Quiz! Êtes-vous prêt à tester vos connaissances?";
      break;
  }

  await sendWhatsAppResponse(phoneNumber, welcomeMessage);
}

async function handleEducationMessage(phoneNumber: string, message: string) {
  try {
    // Get student profile
    const { data: student } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (!student) {
      await sendWhatsAppResponse(phoneNumber, "Votre profil étudiant n'a pas été trouvé. Veuillez contacter le support.");
      return;
    }

    // Analyze message
    const completion = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "system",
            content: `You are a teacher for ${student.level} students. Your goal is to help the student understand and progress.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const result = await completion.json();
    const response = result.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse appropriée.";

    // Save bot response
    await supabase.from('customer_conversations').insert({
      phone_number: phoneNumber,
      content: response,
      sender: 'bot',
      created_at: new Date().toISOString()
    });

    // Send response
    await sendWhatsAppResponse(phoneNumber, response);
  } catch (error) {
    console.error('Error handling education message:', error);
    await sendWhatsAppResponse(phoneNumber, "Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard.");
  }
}

async function handleCustomerServiceMessage(phoneNumber: string, message: string) {
  // Implement customer service logic
  await sendWhatsAppResponse(phoneNumber, "Merci pour votre message au service client. Un agent vous répondra bientôt.");
}

async function handleQuizMessage(phoneNumber: string, message: string) {
  // Implement quiz logic
  await sendWhatsAppResponse(phoneNumber, "Votre réponse au quiz a été enregistrée.");
}
import { uploadTemplateMedia } from './whatsapp-template';

export async function sendWhatsAppResponse(to: string, message: string, media?: { type: 'image' | 'video' | 'document'; url: string }, userId?: string) {
  try {
    console.log('📤 [WHATSAPP-RESPONSE] Sending response:', {
      to,
      messageLength: message.length,
      hasMedia: !!media,
      userId: userId || 'not provided'
    });

    // Sanitize message content
    const sanitizedMessage = sanitizeMessageContent(message);
    console.log('🧹 [WHATSAPP-RESPONSE] Message sanitized');

    // Get WhatsApp configuration, prioritizing user-specific config if userId is provided
    const { accessToken, phoneNumberId } = await getWhatsAppConfig(userId);

    const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: media ? media.type : 'text',
        ...(media ? {
          [media.type]: { url: media.url }
        } : {
          text: { body: sanitizedMessage }
        })
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [WHATSAPP-RESPONSE] API error:', errorData);
      throw new Error('Failed to send WhatsApp response: ' + (errorData.error?.message || response.statusText));
    }

    const result = await response.json();
    const messageId = result.messages?.[0]?.id;
    
    console.log('✅ [WHATSAPP-RESPONSE] Response sent successfully:', {
      messageId,
      to
    });
    
    // Log the message
    await supabase.from('message_logs').insert({
      status: 'sent',
      phone_number: to,
      message_preview: sanitizedMessage.substring(0, 100),
      message_id: messageId,
      created_at: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    console.error('❌ [WHATSAPP-RESPONSE] Critical error:', {
      to,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export interface MessageResult {
  status: 'success' | 'error';
  phoneNumber: string;
  message: string;
  timestamp: Date;
  messageId?: string;
  error?: string;
}

export interface MessageVariable {
  name: string;
  value: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
}

export function parseMessageVariables(message: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = [...message.matchAll(variableRegex)];
  return matches.map(match => match[1]);
}

export function replaceMessageVariables(message: string, variables: MessageVariable[]): string {
  let result = message;
  variables.forEach(variable => {
    const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
    result = result.replace(regex, variable.value);
  });
  return result;
}

/**
 * Sanitizes message content by removing HTML tags and normalizing text
 * @param message Raw message content
 * @returns Clean plain text message
 */
export function sanitizeMessageContent(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Remove HTML/JSX tags
  let cleanMessage = message.replace(/<\/?[^>]+(>|$)/g, '');
  
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = cleanMessage;
  cleanMessage = textarea.value;
  
  // Remove extra whitespace and normalize
  cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim();
  
  // Ensure message is not empty after sanitization
  if (cleanMessage.length === 0) {
    throw new Error('Message is empty after sanitization');
  }
  
  // Limit message length (WhatsApp limit is 4096 characters)
  if (cleanMessage.length > 4096) {
    cleanMessage = cleanMessage.substring(0, 4093) + '...';
  }
  
  return cleanMessage;
}

export async function sendWhatsAppMessages(
  messages: Array<{ 
    phoneNumber: string; 
    message: string;
    variables?: MessageVariable[];
    media?: {
      type: 'image' | 'video' | 'document';
      url?: string;
    };
  }>,
  userId?: string
): Promise<MessageResult[]> {
  try {
    console.log('📤 [WHATSAPP-SEND] Starting to send messages:', {
      messageCount: messages.length,
      userId: userId || 'not provided'
    });

    // Get WhatsApp configuration, prioritizing user-specific config if userId is provided
    const { accessToken, phoneNumberId } = await getWhatsAppConfig(userId);

    console.log('✅ [WHATSAPP-SEND] WhatsApp config retrieved:', {
      hasAccessToken: !!accessToken,
      phoneNumberId: phoneNumberId || 'not found'
    });
    // Validate phone numbers
    const validMessages = messages.filter(msg => {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      return phoneRegex.test(msg.phoneNumber);
    });

    if (validMessages.length === 0) {
      throw new Error('No valid phone numbers found');
    }

    console.log('📋 [WHATSAPP-SEND] Validated messages:', {
      originalCount: messages.length,
      validCount: validMessages.length
    });
    // Process messages with variables
    const processedMessages = validMessages.map(msg => ({
      ...msg,
      message: sanitizeMessageContent(
        msg.variables ? replaceMessageVariables(msg.message, msg.variables) : msg.message
      )
    }));

    console.log('🧹 [WHATSAPP-SEND] Messages sanitized and processed');
    // Send messages with rate limiting
    const results = await Promise.allSettled(
      processedMessages.map(async (msg, index) => {
        try {
          console.log(`📨 [WHATSAPP-SEND] Sending message ${index + 1}/${processedMessages.length}:`, {
            to: msg.phoneNumber,
            messageLength: msg.message.length,
            hasMedia: !!msg.media
          });

          // Add delay between messages to respect rate limits
          await new Promise(resolve => setTimeout(resolve, index * 1000));

          // Prepare the WhatsApp message payload
          const messagePayload: any = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: msg.phoneNumber,
            type: msg.media ? msg.media.type : 'text'
          };

          // Add the appropriate content based on message type
          if (msg.media && msg.media.url) {
            console.log(`🖼️ [WHATSAPP-SEND] Adding media to message:`, {
              type: msg.media.type,
              url: msg.media.url.substring(0, 50) + '...'
            });
            messagePayload[msg.media.type] = { url: msg.media.url };
          } else {
            messagePayload.text = { body: msg.message };
          }

          console.log(`🚀 [WHATSAPP-SEND] Calling WhatsApp API for message ${index + 1}`);
          const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messagePayload)
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`❌ [WHATSAPP-SEND] API error for message ${index + 1}:`, {
              status: response.status,
              statusText: response.statusText,
              errorData
            });
            throw new Error(errorData.error?.message || 'WhatsApp API error');
          }

          const data = await response.json();
          const messageId = data.messages?.[0]?.id;
          
          console.log(`✅ [WHATSAPP-SEND] Message ${index + 1} sent successfully:`, {
            messageId,
            to: msg.phoneNumber
          });
          
          // Log message to database for tracking
          await supabase.from('message_logs').insert({
            status: 'sent',
            phone_number: msg.phoneNumber,
            message_preview: msg.message.substring(0, 100),
            message_id: messageId,
            created_at: new Date().toISOString()
          });
          
          return {
            status: 'success' as const,
            phoneNumber: msg.phoneNumber,
            message: msg.message,
            timestamp: new Date(),
            messageId: messageId
          };
        } catch (error) {
          console.error(`❌ [WHATSAPP-SEND] Error sending to ${msg.phoneNumber}:`, {
            error: error.message,
            stack: error.stack,
            messageIndex: index + 1
          });
          
          // Log the error
          await supabase.from('message_logs').insert({
            status: 'error',
            phone_number: msg.phoneNumber,
            message_preview: msg.message.substring(0, 100),
            error: error.message,
            created_at: new Date().toISOString()
          });
          
          return {
            status: 'error' as const,
            phoneNumber: msg.phoneNumber,
            message: msg.message,
            timestamp: new Date(),
            error: error.message
          };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
    console.log(`📊 [WHATSAPP-SEND] Batch complete:`, {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount
    });
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        status: 'error' as const,
        phoneNumber: 'unknown',
        message: '',
        timestamp: new Date(),
        error: result.reason?.message || 'Unknown error'
      };
    });
  } catch (error) {
    console.error('❌ [WHATSAPP-SEND] Critical error in sendWhatsAppMessages:', {
      error: error.message,
      stack: error.stack,
      messageCount: messages.length
    });
    return messages.map(msg => ({
      status: 'error' as const,
      phoneNumber: msg.phoneNumber,
      message: msg.message,
      timestamp: new Date(),
      error: error.message
    }));
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  language: string = 'fr',
  components?: any[],
  userId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get WhatsApp configuration
    const { accessToken, phoneNumberId } = await getWhatsAppConfig(userId);
    
    // Prepare template message payload
    const templatePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language
        }
      }
    };
    
    // Add components if provided
    if (components && components.length > 0) {
      templatePayload.template.components = components;
    }
    
    // Send template message
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templatePayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'WhatsApp API error');
    }
    
    const data = await response.json();
    
    // Log message to database
    await supabase.from('message_logs').insert({
      status: 'sent',
      phone_number: to,
      message_preview: `Template: ${templateName}`,
      message_id: data.messages?.[0]?.id,
      created_at: new Date().toISOString()
    });
    
    return {
      success: true,
      messageId: data.messages?.[0]?.id
    };
  } catch (error) {
    console.error('Error sending WhatsApp template:', error);
    
    // Log error to database
    await supabase.from('message_logs').insert({
      status: 'error',
      phone_number: to,
      message_preview: `Template: ${templateName}`,
      error: error.message,
      created_at: new Date().toISOString()
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

export async function checkMessageStatus(messageId: string): Promise<{
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  details?: any;
}> {
  try {
    // Validate messageId parameter
    if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
      console.error('❌ [MESSAGE-STATUS] Invalid messageId provided:', messageId);
      throw new Error('Invalid message ID provided for status check');
    }

    console.log('🔍 [MESSAGE-STATUS] Checking status for messageId:', messageId);

    // First check our local database for status
    const { data: messageLog, error } = await supabase
      .from('message_logs')
      .select('*')
      .eq('message_id', messageId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ [MESSAGE-STATUS] Database error:', error);
      throw error;
    }
    
    if (messageLog) {
      console.log('✅ [MESSAGE-STATUS] Found status in database:', {
        messageId,
        status: messageLog.status,
        createdAt: messageLog.created_at
      });
      return {
        status: messageLog.status as 'pending' | 'sent' | 'delivered' | 'failed',
        details: messageLog
      };
    }
    
    console.log('⚠️ [MESSAGE-STATUS] Message not found in database, checking via Edge Function');

    // If not found in database, check via Edge Function
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-message-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageId })
      });

      console.log('📡 [MESSAGE-STATUS] Edge Function response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MESSAGE-STATUS] Edge Function error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Edge Function error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [MESSAGE-STATUS] Edge Function response:', data);
      
      return {
        status: data.status || 'pending',
        details: data
      };
    } catch (edgeFunctionError) {
      console.error('❌ [MESSAGE-STATUS] Edge Function call failed:', edgeFunctionError);
      // Don't throw here, fall through to default
    }
    
    // If all methods fail, return pending status
    console.log('⚠️ [MESSAGE-STATUS] All status check methods failed, returning pending');
    return { status: 'pending' };
  } catch (error) {
    console.error('❌ [MESSAGE-STATUS] Critical error in checkMessageStatus:', {
      messageId,
      error: error.message,
      stack: error.stack
    });
    return { status: 'failed' };
  }
}

export async function checkWhatsAppConnection(userId?: string): Promise<boolean> {
  try {
    // Get WhatsApp configuration, prioritizing user-specific config if userId is provided
    const config = await getWhatsAppConfig(userId).catch(() => null);
    
    if (!config) {
      console.warn('No active WhatsApp configuration found');
      return false;
    }
    
    const { accessToken, phoneNumberId } = config;

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error checking WhatsApp connection:', error);
    return false;
  }
}

export async function getWhatsAppTemplates(userId?: string): Promise<any[]> {
  try {
    console.log('Fetching WhatsApp templates from Meta API...');
    
    // First try to fetch from Meta API via Edge Function or webhook
    try {
      // Get the user's configuration to check for whatsapp_business_account_id
      const userConfig = userId ? await getWhatsAppConfig(userId).catch(() => null) : null;
      
      if (!userConfig || !userConfig.whatsappBusinessAccountId) {
        console.warn('No WhatsApp Business Account ID found, falling back to database');
        throw new Error('No WhatsApp Business Account ID found');
      }
      
      // Get webhook URL from user_whatsapp_config table
      const { data: webhookConfig } = await supabase
        .from('user_whatsapp_config')
        .select('webhook_url')
        .eq('is_active', true)
        .maybeSingle();
      
      // Use webhook URL if available, otherwise use default
      const webhookBaseUrl = webhookConfig?.webhook_url 
        ? new URL(webhookConfig.webhook_url).origin 
        : 'https://webhook-telecombusiness.onrender.com';
      
      // Try to fetch templates from webhook
      const response = await fetch(
        `${webhookBaseUrl}/templates/${userConfig.whatsappBusinessAccountId}`,
        {
          headers: {
            'Authorization': `Bearer ${userConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.warn(`Webhook response not OK: ${response.status} ${response.statusText}`);
        
        // Fall back to edge function
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-templates?userId=${userId}`;
        const edgeFunctionResponse = await fetch(edgeFunctionUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!edgeFunctionResponse.ok) {
          console.warn(`Edge function response not OK: ${edgeFunctionResponse.status}`);
          throw new Error(`Failed to fetch WhatsApp templates: ${edgeFunctionResponse.status}`);
        }
        
        const edgeFunctionData = await edgeFunctionResponse.json();
        console.log(`Received ${edgeFunctionData.templates?.length || 0} templates from edge function`);
        
        if (edgeFunctionData.templates && edgeFunctionData.templates.length > 0) {
          return edgeFunctionData.templates;
        } else {
          throw new Error('No templates returned from edge function');
        }
      }

      const data = await response.json();
      console.log(`Received ${data.data?.length || 0} templates from webhook`);
      
      // If we got templates from the webhook, return them
      if (data.data && data.data.length > 0) {
        return data.data;
      } else {
        console.warn('Webhook returned empty templates array, falling back to database');
        throw new Error('No templates returned from webhook');
      }
    } catch (apiError) {
      console.warn('Error fetching from Meta API, falling back to database:', apiError);
      
      // Fallback to database if API fails
      console.log('Fetching templates from Supabase database...');
      const { data, error: dbError } = await supabase
        .from('whatsapp_templates')
        .select('*');
        
      if (dbError) {
        console.warn('Database fetch failed, falling back to mock templates:', dbError);
        throw dbError;
      }
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} templates in database`);
        return data;
      } else {
        console.warn('No templates found in database, falling back to mock templates');
        throw new Error('No templates found in database');
      }
    }
  } catch (error) {
    console.warn('All template sources failed, using mock templates');
    
    // Final fallback: return mock templates
    return getMockTemplates();
  }
}

// Mock templates for testing
function getMockTemplates() {
  console.log('Returning mock templates');
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
            text: "Envoyé par MTN GPT"
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