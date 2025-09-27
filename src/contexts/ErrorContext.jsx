import React, { createContext, useContext, useState } from 'react';
import { toast } from '@/components/ui/use-toast';

const ErrorContext = createContext();

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [error, setError] = useState(null);

  const handleError = (error, title = 'Error', description = 'An unexpected error occurred') => {
    setError(error);
    toast({
      title,
      description: error?.message || description,
      variant: "destructive",
    });
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <ErrorContext.Provider value={{ error, handleError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
};
