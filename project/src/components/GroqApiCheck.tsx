import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; 
import { getGroqConfig } from '../lib/groq-config'; 
import { supabase } from '../lib/supabase';

interface GroqApiCheckProps {
  children: React.ReactNode;
}

const GroqApiCheck: React.FC<GroqApiCheckProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasGroqConfig, setHasGroqConfig] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkGroqConfig();
    }
  }, [user]);

  const checkGroqConfig = async () => {
    if (!user?.id) {
      setLoading(false);
      setHasGroqConfig(false);
      return;
    }

    try {
      setLoading(true);
      
      // First try with the current user's ID
      try {
        await getGroqConfig(user.id);
        setHasGroqConfig(true);
        return;
      } catch (userError) {
        console.log('No Groq configuration found for current user:', userError);
        
        // If that fails, check if any user has a Groq configuration
        const { data: anyGroqConfig } = await supabase
          .from('user_groq_config')
          .select('*')
          .limit(1)
          .maybeSingle();
          
        if (anyGroqConfig) {
          setHasGroqConfig(true);
          return;
        }
        
        // If no configuration found at all
        setHasGroqConfig(false);
      }
    } catch (error) {
      console.log('No Groq configuration found:', error);
      setHasGroqConfig(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (hasGroqConfig === false) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Key className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
            Groq API Configuration Required
          </h2>
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-yellow-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              To use AI features, you need to configure your Groq API key. This enables advanced image analysis and educational assistance features.
            </p>
          </div>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Enhanced Image Analysis</h3>
            <p className="text-blue-600 text-sm">
              With Groq API configured, the educational chatbot can intelligently analyze images to:
            </p>
            <ul className="text-blue-600 text-sm mt-2 list-disc list-inside space-y-1">
              <li>Distinguish between text/literature and mathematical content</li>
              <li>Provide appropriate responses for essays, letters, and written assignments</li>
              <li>Solve math and science problems accurately</li>
              <li>Prevent hallucinations and irrelevant responses</li>
            </ul>
          </div>
          <button
            onClick={() => navigate('/groq-setup')}
            className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors shadow-sm"
          >
            Configure Groq API for Enhanced Image Analysis
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GroqApiCheck;