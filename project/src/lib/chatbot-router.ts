import { supabase } from './supabase';

// Define types of chatbots
export type ChatbotType = 'client' | 'education' | 'quiz';

// Define trigger keywords for each chatbot type
const TRIGGER_KEYWORDS = {
  CLIENT: [
    'advisor', 'issue', 'complaint', 'help', 'service', 'contact',
    'conseiller', 'problème', 'plainte', 'aide', 'service', 'contact',
    'support', 'assistance', 'billing', 'facture', 'paiement', 'recharge'
  ],
  QUIZ: [
    'quiz', 'test', 'game', 'win', 'contest', 'question', 'play', 'score',
    'jeu', 'gagner', 'concours', 'question', 'jouer', 'score', 'challenge', 'défi'
  ],
  EDUCATION: [
    'learn', 'study', 'course', 'education', 'school', 'homework', 'assignment',
    'apprendre', 'étudier', 'cours', 'éducation', 'école', 'devoir', 'exercice',
    'math', 'physics', 'chemistry', 'biology', 'history', 'geography',
    'mathématiques', 'physique', 'chimie', 'biologie', 'histoire', 'géographie'
  ]
};

/**
 * Determines which chatbot should handle a message based on content analysis
 * @param message The message text to analyze
 * @returns Promise resolving to the appropriate chatbot type
 */
export async function determineChatbotType(message: string): Promise<ChatbotType> {
  if (!message) return 'education'; // Default to education if no message
  
  const lowerMessage = message.toLowerCase();
  
  // Step 1: Check for trigger keywords
  // Check for client service keywords
  if (TRIGGER_KEYWORDS.CLIENT.some(keyword => lowerMessage.includes(keyword))) {
    return 'client';
  }
  
  // Check for quiz keywords
  if (TRIGGER_KEYWORDS.QUIZ.some(keyword => lowerMessage.includes(keyword))) {
    return 'quiz';
  }
  
  // Check for education keywords
  if (TRIGGER_KEYWORDS.EDUCATION.some(keyword => lowerMessage.includes(keyword))) {
    return 'education';
  }
  
  // Step 2: Search knowledge base for matching patterns
  try {
    // Check customer service knowledge base
    const { data: clientKnowledge } = await supabase
      .from('knowledge_base')
      .select('patterns')
      .eq('intent', 'client_service');
      
    if (clientKnowledge && clientKnowledge.length > 0) {
      for (const entry of clientKnowledge) {
        if (entry.patterns.some((pattern: string) => lowerMessage.includes(pattern.toLowerCase()))) {
          return 'client';
        }
      }
    }
    
    // Check quiz knowledge base
    const { data: quizKnowledge } = await supabase
      .from('knowledge_base')
      .select('patterns')
      .eq('intent', 'quiz');
      
    if (quizKnowledge && quizKnowledge.length > 0) {
      for (const entry of quizKnowledge) {
        if (entry.patterns.some((pattern: string) => lowerMessage.includes(pattern.toLowerCase()))) {
          return 'quiz';
        }
      }
    }
    
    // Check all knowledge base entries
    const { data: allKnowledge } = await supabase
      .from('knowledge_base')
      .select('intent, patterns');
      
    if (allKnowledge && allKnowledge.length > 0) {
      for (const entry of allKnowledge) {
        if (entry.patterns.some((pattern: string) => lowerMessage.includes(pattern.toLowerCase()))) {
          // Map the intent to a chatbot type
          if (entry.intent.includes('billing') || 
              entry.intent.includes('support') || 
              entry.intent.includes('technical') ||
              entry.intent === 'greeting') {
            return 'client';
          } else if (entry.intent.includes('quiz') || 
                     entry.intent.includes('game') || 
                     entry.intent.includes('challenge')) {
            return 'quiz';
          }
        }
      }
    }
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    // Continue with default routing if knowledge base search fails
  }
  
  // Step 3: Default to education if no match found
  return 'education';
}

/**
 * Analyzes an image to determine which chatbot should handle it
 * @param imageUrl URL of the image to analyze
 * @returns Promise resolving to the appropriate chatbot type
 */
export async function determineImageChatbotType(imageUrl: string): Promise<ChatbotType> {
  // For images, we default to education as they're likely homework or study materials
  return 'education';
}

/**
 * Tracks the chatbot type used for a conversation
 * @param phoneNumber The user's phone number
 * @param chatbotType The chatbot type that was used
 */
export async function trackChatbotUsage(phoneNumber: string, chatbotType: ChatbotType): Promise<void> {
  try {
    await supabase
      .from('customer_conversations')
      .update({ intent: chatbotType })
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1);
  } catch (error) {
    console.error('Error tracking chatbot usage:', error);
  }
}