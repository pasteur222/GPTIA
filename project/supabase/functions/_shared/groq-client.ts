import { Groq } from "npm:groq-sdk@0.26.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// Default model to use if none is specified
const DEFAULT_MODEL = "llama3-70b-8192"; 
// List of deprecated models that should never be used
const DEPRECATED_MODELS = ["mixtral-8x7b-32768"];

/**
 * Get Groq configuration for a user
 * @param userId The user ID to get configuration for
 * @returns The Groq configuration
 */
export async function getGroqConfig(userId: string) {
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's Groq configuration
    const { data, error } = await supabase
      .from('user_groq_config')
      .select('api_key, model')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Groq configuration:', error);
      throw new Error(`Failed to fetch Groq configuration: ${error.message}`);
    }

    if (!data || !data.api_key) {
      throw new Error('No Groq API key found for this user');
    }

    // Check if the model is deprecated and replace it if needed
    let modelToUse = data.model || DEFAULT_MODEL;
    if (DEPRECATED_MODELS.includes(modelToUse)) {
      console.warn(`[SECURITY] Detected deprecated model ${modelToUse} in database for user ${userId}, replacing with ${DEFAULT_MODEL}`);
      modelToUse = DEFAULT_MODEL;
      
      // Try to update the database to prevent future issues
      try {
        await supabase
          .from('user_groq_config')
          .update({ model: DEFAULT_MODEL })
          .eq('user_id', userId);
        console.log(`Successfully updated user ${userId}'s model from ${data.model} to ${DEFAULT_MODEL}`);
      } catch (updateError) {
        console.error('Failed to update deprecated model in database:', updateError);
      }
    }

    return {
      apiKey: data.api_key,
      model: modelToUse
    };
  } catch (error) {
    console.error('Error getting Groq configuration:', error);
    throw error;
  }
}

/**
 * Create a Groq client for a specific user
 * @param userId The user ID to create a client for
 * @returns A configured Groq client
 */
export async function createGroqClient(userId: string): Promise<Groq> {
  try {
    // Get the Groq configuration for this user
    const config = await getGroqConfig(userId).catch(async (error) => {
      console.warn(`Error getting Groq config for user ${userId}: ${error.message}`);
      
      // Fallback: Get any available Groq configuration
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: anyConfig, error: configError } = await supabase
        .from('user_groq_config')
        .select('api_key, model')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (configError || !anyConfig || !anyConfig.api_key) {
        throw new Error('No Groq configuration found in the system');
      }
      
      console.log('Using fallback Groq configuration');
      return {
        apiKey: anyConfig.api_key,
        model: anyConfig.model || DEFAULT_MODEL
      };
    });

    // Create and return Groq client with the configuration
    return new Groq({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true
    });
  } catch (error) {
    console.error('Error creating Groq client:', error);
    throw error;
  }
}

/**
 * Get a Groq client with fallback options
 * This function will try multiple approaches to get a working Groq client
 * @returns A configured Groq client
 */
export async function getSystemGroqClient(): Promise<Groq> {
  try {
    // Try to get any available Groq configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: anyConfig, error: configError } = await supabase
      .from('user_groq_config')
      .select('user_id, api_key, model')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (configError || !anyConfig || !anyConfig.api_key) {
      throw new Error('No Groq configuration found in the system');
    }
    
    console.log(`Using Groq configuration from user: ${anyConfig.user_id}`);
    
    // Ensure we're not using the deprecated model
    let modelToUse = anyConfig.model || DEFAULT_MODEL;
    if (DEPRECATED_MODELS.includes(modelToUse)) {
      console.warn(`[SECURITY] Detected deprecated model ${modelToUse} in system-wide config, switching to ${DEFAULT_MODEL}`);
      modelToUse = DEFAULT_MODEL;
      
      // Update the database to prevent future issues
      try {
        await supabase
          .from('user_groq_config')
          .update({ model: DEFAULT_MODEL })
          .eq('user_id', anyConfig.user_id);
        console.log(`Successfully updated user ${anyConfig.user_id}'s model from ${anyConfig.model} to ${DEFAULT_MODEL}`);
      } catch (updateError) {
        console.error('Failed to update deprecated model in database:', updateError);
      }
    }

    // Log the model being used
    console.log(`[GROQ-CLIENT] Using Groq model: ${modelToUse} for system-wide client`);

    // Create and return Groq client
    return new Groq({
      apiKey: anyConfig.api_key,
      dangerouslyAllowBrowser: true
    });
  } catch (error) {
    console.error('Error creating Groq client:', error);
    
    // Last resort fallback - create a client with environment variable if available
    const fallbackApiKey = Deno.env.get('GROQ_API_KEY');
    if (fallbackApiKey) {
      console.log('Using fallback GROQ_API_KEY from environment variables');
      return new Groq({
        apiKey: fallbackApiKey,
        dangerouslyAllowBrowser: true
      });
    } else {
      throw error;
    }
  }
}