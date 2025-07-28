import { supabase } from '../lib/supabase';
import { createGroqClient } from '../lib/groq-config';
import { processCustomerMessage } from '../lib/education';
import { determineChatbotType, trackChatbotUsage } from '../lib/chatbot-router';

/**
 * Process incoming WhatsApp messages from webhook
 * @param data The message data from webhook
 * @returns Response with success status
 */
export async function processWebhookMessage(data: any) {
  try {
    if (!data.from || !data.text) {
      throw new Error('Missing required fields: from, text');
    }

    // Save incoming message to database
    const { error: saveError } = await supabase
      .from('customer_conversations')
      .insert({
        phone_number: data.from,
        content: data.text,
        sender: 'user',
        created_at: new Date(data.timestamp * 1000).toISOString()
      });

    if (saveError) {
      console.error('Error saving incoming message:', saveError);
    }

    // Get user profile from phone number
    const { data: userProfile } = await supabase
      .from('student_profiles')
      .select('id, user_id')
      .eq('phone_number', data.from)
      .maybeSingle();

    if (!userProfile) {
      console.warn(`No user profile found for phone number: ${data.from}`);
      return { success: false, error: 'User not found' };
    }
    
    // Determine which chatbot should handle this message
    const chatbotType = await determineChatbotType(data.text);
    
    // Track which chatbot was used
    await trackChatbotUsage(data.from, chatbotType);

    // Prepare message object
    const message = {
      phoneNumber: data.from,
      content: data.text,
      sender: 'user' as const
    };

    // Process message with appropriate chatbot
    let response;
    switch (chatbotType) {
      case 'client':
        // Process with customer service chatbot
        response = await processCustomerServiceMessage(message);
        break;
      case 'quiz':
        // Process with quiz chatbot
        response = await processQuizMessage(message);
        break;
      case 'education':
      default:
        // Process with education chatbot (default)
        response = await processCustomerMessage(message);
        break;
    }

    return { 
      success: true, 
      response: response.content,
      chatbotType: chatbotType
    };
  } catch (error) {
    console.error('Error processing webhook message:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Process message with customer service chatbot
 * @param message The message data
 * @returns Response with content
 */
async function processCustomerServiceMessage(message: any) {
  try {
    // Get user profile from phone number
    const { data: userProfile } = await supabase
      .from('profils_utilisateurs')
      .select('id')
      .eq('phone_number', message.phoneNumber)
      .maybeSingle();

    if (!userProfile) {
      console.warn(`No user profile found for phone number: ${message.phoneNumber}`);
      return { content: "Désolé, nous n'avons pas pu traiter votre demande. Veuillez réessayer." };
    }

    // Create Groq client with user's API key
    const groq = await createGroqClient(userProfile.id);

    // Generate response using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a customer service assistant for a telecom company.
Your goal is to help customers with their inquiries, issues, and requests.
Be professional, courteous, and solution-oriented.
Provide clear instructions and ask for clarification when needed.
If you cannot resolve an issue, offer to escalate it to a human agent.`
        },
        { role: "user", content: message.content }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const response = completion.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse appropriée.";

    // Save bot response
    await supabase
      .from('customer_conversations')
      .insert({
        phone_number: message.phoneNumber,
        content: response,
        sender: 'bot',
        intent: 'client',
        created_at: new Date().toISOString()
      });

    return { content: response };
  } catch (error) {
    console.error('Error processing customer service message:', error);
    return { content: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard." };
  }
}

/**
 * Process message with quiz chatbot
 * @param message The message data
 * @returns Response with content
 */
async function processQuizMessage(message: any) {
  try {
    // Get user profile from phone number
    const { data: userProfile } = await supabase
      .from('profils_utilisateurs')
      .select('id')
      .eq('phone_number', message.phoneNumber)
      .maybeSingle();

    if (!userProfile) {
      console.warn(`No user profile found for phone number: ${message.phoneNumber}`);
      return { content: "Désolé, nous n'avons pas pu traiter votre demande. Veuillez réessayer." };
    }

    // Create Groq client with user's API key
    const groq = await createGroqClient(userProfile.id);

    // Generate response using Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a quiz master who creates engaging educational quizzes.
Your goal is to make learning fun through interactive questions and challenges.
Be enthusiastic, encouraging, and provide informative feedback on answers.
Keep track of scores and progress, and adapt difficulty based on performance.`
        },
        { role: "user", content: message.content }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const response = completion.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse appropriée.";

    // Save bot response
    await supabase
      .from('customer_conversations')
      .insert({
        phone_number: message.phoneNumber,
        content: response,
        sender: 'bot',
        intent: 'quiz',
        created_at: new Date().toISOString()
      });

    return { content: response };
  } catch (error) {
    console.error('Error processing quiz message:', error);
    return { content: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard." };
  }
}

/**
 * Process message status updates from webhook
 * @param data The status update data from webhook
 * @returns Response with success status
 */
export async function processStatusUpdate(data: any) {
  try {
    if (!data.messageId || !data.status) {
      throw new Error('Missing required fields: messageId, status');
    }

    // Update message status in database
    const { error: updateError } = await supabase
      .from('message_logs')
      .update({
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('message_id', data.messageId);

    if (updateError) {
      console.error('Error updating message status:', updateError);
      return { success: false, error: updateError.message };
    }

    return { 
      success: true, 
      message: `Status updated to ${data.status}`
    };
  } catch (error) {
    console.error('Error processing status update:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error'
    };
  }
}