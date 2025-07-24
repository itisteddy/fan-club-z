import React, { useState } from 'react';
import { UserPlusIcon, LoaderIcon } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';

interface JoinButtonProps {
  clubId: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  disabled?: boolean;
}

export function JoinButton({
  clubId,
  size = 'sm',
  text = 'Join',
  onSuccess,
  onError,
  className = '',
  disabled = false
}: JoinButtonProps) {
  const { success, error } = useToast();
  const [, navigate] = useLocation();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (isJoining || disabled) return;

    // Get current user
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!user.id) {
      // Better UX for unauthenticated users
      error('Please sign in to join clubs');
      
      // Redirect to login page with return URL
      setTimeout(() => {
        navigate('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      }, 2000);
      return;
    }

    setIsJoining(true);

    try {
      const response = await fetch(`/api/clubs/${clubId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        success('Successfully joined the club!');
        if (onSuccess) onSuccess();
      } else {
        const errorMessage = responseData.error || 'Failed to join club';
        error(errorMessage);
        if (onError) onError(new Error(errorMessage));
      }
    } catch (err: any) {
      const errorMessage = 'Failed to join club. Please try again.';
      error(errorMessage);
      if (onError) onError(err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Button
      size={size as any}
      onClick={handleJoin}
      disabled={isJoining || disabled}
      className={`
        bg-green-500 hover:bg-green-600 text-white 
        min-w-[80px] transition-all duration-200 font-medium
        ${className}
      `}
      aria-label={`Join club`}
    >
      {isJoining ? (
        <div className="flex items-center justify-center">
          <LoaderIcon className="w-4 h-4 animate-spin mr-2" />
          <span>Joining...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <UserPlusIcon className="w-4 h-4 mr-2" />
          <span>{text}</span>
        </div>
      )}
    </Button>
  );
}

export default JoinButton;