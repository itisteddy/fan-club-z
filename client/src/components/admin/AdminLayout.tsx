import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { FRONTEND_URL } from '@/utils/environment';
import { adminGet } from '@/lib/adminApi';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Target,
  Gavel,
  Flag,
  ScrollText,
  Settings,
  Tag,
  ChevronLeft,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/wallets', label: 'Wallets', icon: Wallet },
  { path: '/admin/predictions', label: 'Predictions', icon: Target },
  { path: '/admin/settlements', label: 'Settlements', icon: Gavel },
  { path: '/admin/categories', label: 'Categories', icon: Tag },
  { path: '/admin/moderation', label: 'Moderation', icon: Flag },
  { path: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { path: '/admin/config', label: 'Config', icon: Settings },
];

const ADMIN_CANONICAL_ORIGIN = 'https://fanclubz.app';

function getCanonicalAdminRedirect(currentUrl: URL): string | null {
  const host = currentUrl.hostname.toLowerCase();
  const isProdAlias =
    host === 'app.fanclubz.app' || host === 'www.fanclubz.app';
  if (!isProdAlias) return null;
  if (!currentUrl.pathname.startsWith('/admin')) return null;
  return `${ADMIN_CANONICAL_ORIGIN}${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user } = useAuthSession();
  const location = useLocation();
  const appUrl = FRONTEND_URL || 'https://app.fanclubz.app';
  const [openReportsCount, setOpenReportsCount] = useState<number>(0);
  const [redirectingToCanonical, setRedirectingToCanonical] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const current = new URL(window.location.href);
      const redirectUrl = getCanonicalAdminRedirect(current);
      if (!redirectUrl) return;
      if (redirectUrl === window.location.href) return;
      setRedirectingToCanonical(true);
      window.location.replace(redirectUrl);
    } catch (e) {
      console.warn('[AdminLayout] canonical admin redirect check failed', e);
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    let mounted = true;
    if (redirectingToCanonical) return;
    const actorId = user?.id;
    if (!actorId) return;

    const fetchCount = async () => {
      try {
        const data = await adminGet<any>(`/api/v2/admin/moderation/reports`, actorId, {
          status: 'open',
          limit: 1,
        });
        if (!mounted) return;
        setOpenReportsCount(Number(data?.total || 0));
      } catch {
        if (!mounted) return;
        setOpenReportsCount(0);
      }
    };

    fetchCount();
    const timer = setInterval(fetchCount, 60000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [user?.id]);

  if (redirectingToCanonical) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-300">Redirecting to admin…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-white font-semibold">Fan Club Z</h1>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.path === '/admin/moderation' && openReportsCount > 0 && (
                <span className="min-w-[20px] px-2 py-0.5 text-xs rounded-full bg-amber-500 text-slate-900 font-semibold">
                  {openReportsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.email || 'Admin'}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>

          {/* Back to app button */}
          <button
            onClick={() => window.open(appUrl, '_self')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to App
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
