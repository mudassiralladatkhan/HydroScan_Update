import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <motion.div 
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        ></motion.div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    toast({
      title: "Access Denied",
      description: `You do not have the required permissions (${requiredRole}) to view this page.`,
      variant: "destructive",
    });
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;