import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft } from 'lucide-react';
import GroqApiKeySetup from '../components/GroqApiKeySetup';

const GroqSetup: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-12 h-12 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">Groq API Setup</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Configure your Groq API key to enable AI-powered features in the application
          </p>
        </div>

        <GroqApiKeySetup onComplete={handleComplete} />

        <div className="mt-12 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What is Groq?</h2>
          <p className="text-gray-600 mb-4">
            Groq is an AI inference platform that provides fast and efficient access to large language models.
            It powers the AI features in our application, including:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
            <li>Educational assistance and tutoring</li>
            <li>Customer service automation</li>
            <li>Content generation and analysis</li>
            <li>Quiz question generation and evaluation</li>
          </ul>
          <p className="text-gray-600">
            By using your own Groq API key, you maintain control over your usage and billing.
            Your key is stored securely and only used for your own requests.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroqSetup;