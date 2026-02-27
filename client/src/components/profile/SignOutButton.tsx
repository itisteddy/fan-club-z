import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth } from '../../lib/supabase';
import { resetNativeOAuthState } from '@/lib/auth/nativeOAuth';
import { resetBrowserContextCache } from '@/lib/browserContext';
// import { resetAllStores } from '../../stores/resetAllStores'; // Module not found - commented out

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton(props: ButtonProps) {
  const navigate = useNavigate();

  const onClick = async () => {
    try {
      resetNativeOAuthState();
      resetBrowserContextCache();
      await auth.signOut();
      // Clear client stores so the UI doesn't show stale state
      // resetAllStores?.(); // Module not found - commented out
      toast.success('Signed out');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      data-qa="signout"
      className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium hover:bg-white/80 active:scale-[0.99]"
      {...props}
    >
      Sign Out
    </button>
  );
}
