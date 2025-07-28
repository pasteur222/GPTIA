import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase, validateSupabaseConfig } from '../lib/supabase';

interface SupabaseHealthCheckProps {
  onStatusChange?: (isHealthy: boolean) => void;
}

const SupabaseHealthCheck: React.FC<SupabaseHealthCheckProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    checkSupabaseHealth();
  }, []);

  const checkSupabaseHealth = async () => {
    try {
      setStatus('checking');
      setError(null);

      // Step 1: Validate configuration
      const configValidation = validateSupabaseConfig();
      if (!configValidation.isValid) {
        throw new Error(configValidation.error || 'Configuration validation failed');
      }

      // Step 2: Test database connection
      const { data, error: dbError } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1);

      if (dbError) {
        throw new Error(`Database connection failed: ${dbError.message}`);
      }

      // Step 3: Test authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.warn('Auth check failed:', authError.message);
      }

      setStatus('healthy');
      setDetails({
        config: configValidation.details,
        database: 'Connected',
        auth: session ? 'Authenticated' : 'Anonymous'
      });
      
      onStatusChange?.(true);
    } catch (error) {
      console.error('Supabase health check failed:', error);
      setStatus('error');
      setError(error instanceof Error ? error.message : 'Unknown error');
      setDetails(null);
      onStatusChange?.(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking Supabase connection...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800">Supabase Connection Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={checkSupabaseHealth}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-green-800">Supabase Connected</h3>
          {details && (
            <div className="text-green-700 text-sm mt-1">
              <div>Database: {details.database}</div>
              <div>Auth: {details.auth}</div>
              <div>URL: {details.config?.url ? '✓ Configured' : '✗ Missing'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseHealthCheck;