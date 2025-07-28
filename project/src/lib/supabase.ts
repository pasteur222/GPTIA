import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined',
    key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
  });
  throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`);
}

// Create a single instance of the Supabase client to be used throughout the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

// Export a function to validate Supabase configuration
export const validateSupabaseConfig = () => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        isValid: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey
        }
      };
    }
    
    if (!supabase) {
      return {
        isValid: false,
        error: 'Supabase client not initialized',
        details: {}
      };
    }
    
    return {
      isValid: true,
      error: null,
      details: {
        url: supabaseUrl,
        hasKey: !!supabaseAnonKey
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {}
    };
  }
};
// Vérifie si l'utilisateur est connecté
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Retourne l'utilisateur courant
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Retry function with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Wait 2^i * 1000 ms between retries (1s, 2s, 4s)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

// Get pricing data with improved error handling and retry logic
export const getPricing = async () => {
  try {
    // Increase timeout to 30 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 30000)
    );

    const fetchPricing = async () => {
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      if (!data) throw new Error('No pricing data received');
      return data;
    };

    // Race between fetch (with retry) and timeout
    const data = await Promise.race([
      retryWithBackoff(fetchPricing),
      timeoutPromise
    ]);

    return data;
  } catch (error) {
    console.error('Error in getPricing:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch pricing data');
  }
};

// ✅ Obtenir le profil utilisateur dans profils_utilisateurs (corrigé)
export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    // Vérifier si le profil existe
    const { data: profile, error } = await supabase
      .from('profils_utilisateurs')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // Si le profil n'existe pas, le créer
      if (error.code === 'PGRST116') {
        const { data: insertedProfile, error: insertError } = await supabase
          .from('profils_utilisateurs')
          .insert({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata.first_name,
            last_name: user.user_metadata.last_name,
            phone_number: user.user_metadata.phone_number || user.phone
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return null;
        }

        return insertedProfile;
      }
      
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

// ✅ Vérifie si l'utilisateur est admin depuis profils_utilisateurs (corrigé)
export const isAdmin = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  try {
    // Vérifier si le profil existe
    const { data: profile, error } = await supabase
      .from('profils_utilisateurs')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error) {
      // Si le profil n'existe pas, le créer avec is_admin = false
      if (error.code === 'PGRST116') {
        const { data: insertedProfile, error: insertError } = await supabase
          .from('profils_utilisateurs')
          .insert({
            id: user.id,
            email: user.email,
            is_admin: false
          })
          .select('is_admin')
          .single();

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return false;
        }

        return insertedProfile?.is_admin || false;
      }
      
      console.error('Error checking admin status:', error);
      return false;
    }

    return profile?.is_admin || false;
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return false;
  }
};