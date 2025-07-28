import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CreateAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    createAdminUser();
  }, []);

  const createAdminUser = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Call the edge function to create admin user
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.userId) {
        setAdminId(data.userId);
        setSuccess(true);
      } else {
        throw new Error(data.message || 'Failed to create admin user');
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Account Creation</h1>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
            <p className="text-gray-600">Creating admin account...</p>
          </div>
        ) : success === true ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <p className="text-xl font-semibold text-green-700 mb-2">✅ Admin account successfully created</p>
            <p className="text-gray-600 mb-6">
              Email: admin@airtelgpt.com<br />
              Password: Admin123!<br />
              User ID: {adminId}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Go to Login
            </button>
          </div>
        ) : success === false ? (
          <div className="flex flex-col items-center justify-center py-8">
            <XCircle className="w-16 h-16 text-red-600 mb-4" />
            <p className="text-xl font-semibold text-red-700 mb-2">❌ Error creating admin account</p>
            {error && <p className="text-gray-600 mb-6">{error}</p>}
            <button
              onClick={createAdminUser}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CreateAdmin;