import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { resetAllStores } from '../../stores/resetAllStores';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function SignOutButton(props: ButtonProps) {
  const navigate = useNavigate();

  const onClick = async () => {
    try {
      await supabase.auth.signOut();
      // Clear client stores so the UI doesn't show stale state
      resetAllStores?.();
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
