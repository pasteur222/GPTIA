import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RestrictedRouteProps {
  children: React.ReactNode;
  allowedModules?: string[];
}

const RestrictedRoute: React.FC<RestrictedRouteProps> = ({ 
  children
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Grant access to all authenticated users
  return <>{children}</>;
};

export default RestrictedRoute;