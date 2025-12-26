import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { getApiUrl } from '../../config';
import { Shield, Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that only renders children if user is admin
 * Checks against ADMIN_USER_IDS env or profiles.is_admin flag
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, loading: authLoading, initialized } = useAuthSession();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!initialized) return;
      
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        // Try to access an admin endpoint to verify access
        const res = await fetch(`${getApiUrl()}/api/v2/admin/audit?limit=1&actorId=${user.id}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          setIsAdmin(true);
        } else if (res.status === 403 || res.status === 401) {
          setIsAdmin(false);
        } else {
          // Other errors - assume not admin
          setIsAdmin(false);
        }
      } catch (e) {
        console.error('[AdminGuard] Failed to check admin status:', e);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [user, initialized]);

  if (authLoading || !initialized || checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Required</h1>
          <p className="text-slate-400 mb-6">Please sign in to access the admin dashboard.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Go to App
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">
            You don't have permission to access the admin dashboard.
            Contact support if you believe this is an error.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;

