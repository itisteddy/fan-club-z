import React from 'react';
import { useLocation } from 'wouter';
import { Lock, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from './button';

interface AuthPromptProps {
  title?: string;
  message?: string;
  showRegister?: boolean;
  onClose?: () => void;
  intendedDestination?: string; // Add this prop
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({
  title = "Authentication Required",
  message = "Please log in to access this feature",
  showRegister = true,
  onClose,
  intendedDestination
}) => {
  const [location, setLocation] = useLocation();

  const handleLogin = () => {
    // Use the intended destination if provided, otherwise fall back to current location
    const destination = intendedDestination || (location !== '/auth' ? location : '/');
    console.log('🔐 Storing redirect URL:', destination);
    localStorage.setItem('authRedirectUrl', destination);
    
    setLocation('/auth');
    if (onClose) onClose();
  };

  const handleRegister = () => {
    // Use the intended destination if provided, otherwise fall back to current location
    const destination = intendedDestination || (location !== '/auth' ? location : '/');
    console.log('🔐 Storing redirect URL:', destination);
    localStorage.setItem('authRedirectUrl', destination);
    
    setLocation('/auth?mode=register');
    if (onClose) onClose();
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      // Navigate back to discover page as fallback
      setLocation('/');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
            {message}
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleLogin}
              className="w-full bg-gradient-to-br from-purple-500 to-emerald-600 hover:from-purple-600 hover:to-emerald-700 text-white shadow-sm font-medium"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Continue with Sign In
            </Button>
            
            {showRegister && (
              <Button
                onClick={handleRegister}
                variant="outline"
                className="w-full border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create New Account
              </Button>
            )}
            
            <button
              onClick={handleBack}
              className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium py-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
