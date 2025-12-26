import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Target,
  Gavel,
  Flag,
  ScrollText,
  Settings,
  LogOut,
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
  { path: '/admin/moderation', label: 'Moderation', icon: Flag },
  { path: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { path: '/admin/config', label: 'Config', icon: Settings },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user } = useAuthSession();
  const navigate = useNavigate();

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
              {item.label}
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
            onClick={() => navigate('/')}
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

