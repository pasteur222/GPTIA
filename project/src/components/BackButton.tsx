import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/dashboard')}
      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
      <span>Retour</span>
    </button>
  );
};

export default BackButton;