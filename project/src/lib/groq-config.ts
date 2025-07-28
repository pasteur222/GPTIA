import { supabase } from './supabase';
import { Groq } from 'groq-sdk';
import { DEFAULT_GROQ_MODEL } from './constants';

/**
 * Get Groq configuration for a user or any available configuration
 * @param userId User ID to get configuration for
 * @returns Groq configuration object
 */
interface GroqConfig {
  apiKey: string;
  model: string;
}

/**
 * Get Groq configuration for a user
 * @param userId User ID to get configuration for
 * @returns Groq configuration object
 */
export async function getGroqConfig(userId?: string): Promise<GroqConfig> {
  try {
    if (!userId) {
      // Try to get any available Groq configuration
      const { data, error } = await supabase
        .from('user_groq_config')
        .select('*')
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching any Groq configuration:', error);
        throw error;
      }
      
      if (data) {
        return {
          apiKey: data.api_key,
          model: data.model || DEFAULT_GROQ_MODEL
        };
      }
      
      throw new Error('No Groq configuration found');
    }

    // Get user's Groq configuration from database
    const { data, error } = await supabase
      .from('user_groq_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error(`Error in getGroqConfig for userId ${userId}:`, error);
      throw error;
    }

    // If configuration exists, return it
    if (data) {
      return {
        apiKey: data.api_key,
        model: data.model ||  DEFAULT_GROQ_MODEL
      };
    }

    // If no configuration exists, throw error
    throw new Error('No Groq configuration found for this user');
  } catch (error) {
    console.error('Error in getGroqConfig:', error);
    throw error;
  }
}

/**
 * Save Groq configuration for a user
 * @param userId User ID to save configuration for
 * @param config Groq configuration object
 */
export async function saveGroqConfig(userId: string, config: GroqConfig): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required to save Groq configuration');
    }

    // Check if configuration already exists
    const { data: existingConfig, error: checkError } = await supabase
      .from('user_groq_config')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing Groq configuration:', checkError);
      throw checkError;
    }

    if (existingConfig) {
      // Update existing configuration
      const { error: updateError } = await supabase
        .from('user_groq_config')
        .update({
          api_key: config.apiKey,
          model: config.model,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id);

      if (updateError) {
        console.error('Error updating Groq configuration:', updateError);
        throw updateError;
      }
    } else {
      // Insert new configuration
      const { error: insertError } = await supabase
        .from('user_groq_config')
        .insert([{
          user_id: userId,
          api_key: config.apiKey,
          model: config.model
        }]);

      if (insertError) {
        console.error('Error inserting Groq configuration:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error in saveGroqConfig:', error);
    throw error;
  }
}

/**
 * Create a Groq client instance for a user
 * @param userId User ID to create client for, or undefined to use any available configuration
 * @returns Groq client instance
 */
export async function createGroqClient(userId: string): Promise<Groq> {
  try {
    let config;
    
    try {
      // First try with the provided user ID
      config = await getGroqConfig(userId);
    } catch (userError) {
      console.warn(`No Groq config found for user ${userId}, trying any available config`);
      
      // If that fails, try to get any available configuration
      config = await getGroqConfig();
    }
    
    return new Groq({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
      // Note: The model is not set here because it's passed in the completion request
    });
  } catch (error) {
    console.error('Error creating Groq client:', error);
    throw error;
  }
}