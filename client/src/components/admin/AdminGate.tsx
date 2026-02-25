import React, { useState, useEffect } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { useAuthSession } from '../../providers/AuthSessionProvider';

interface AdminGateProps {
  children: React.ReactNode;
}

const ADMIN_KEY_STORAGE = 'fcz_admin_key';

/**
 * AdminGate - Simple admin key gate for admin access
 * Stores admin key in localStorage and requires it for all admin API calls
 */
export const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const { user } = useAuthSession();
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [sessionAllowed, setSessionAllowed] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdminAccess = async () => {
      setChecking(true);
      setSessionAllowed(false);

      // Load admin key from localStorage first (works across builds on same origin)
      const stored = localStorage.getItem(ADMIN_KEY_STORAGE);
      if (stored) {
        if (!mounted) return;
        setAdminKey(stored);
        setChecking(false);
        return;
      }

      if (!user?.id) {
        if (!mounted) return;
        setAdminKey(null);
        setChecking(false);
        return;
      }

      // Fallback: allow a logged-in admin session (no local admin key required).
      try {
        const url = `/api/v2/admin/audit?limit=1&actorId=${encodeURIComponent(user.id)}`;
        const res = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!mounted) return;
        if (res.ok) {
          setSessionAllowed(true);
          setAdminKey(null);
          setChecking(false);
          return;
        }
      } catch (e) {
        // Fall through to the admin-key prompt on network/proxy issues.
        console.warn('[AdminGate] Session-based admin check failed, falling back to key prompt', e);
      }

      if (!mounted) return;
      setAdminKey(null);
      setSessionAllowed(false);
      setChecking(false);
    };

    checkAdminAccess();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inputKey.trim()) {
      setError('Please enter an admin key');
      return;
    }

    // Store the key
    localStorage.setItem(ADMIN_KEY_STORAGE, inputKey.trim());
    setAdminKey(inputKey.trim());
    setInputKey('');
  };

  const handleClear = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey(null);
    setSessionAllowed(false);
    setInputKey('');
    setError(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!adminKey && !sessionAllowed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access Required</h1>
          <p className="text-slate-400 mb-6">
            Sign in as an admin or enter your admin key to continue.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setError(null);
                }}
                placeholder="Enter admin key"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Access Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Get admin key from localStorage
 */
export function getAdminKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_KEY_STORAGE);
}

export default AdminGate;
