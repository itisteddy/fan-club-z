import React from 'react';
import { useLocation } from 'wouter';
import { Home, BarChart3, Plus, Users, Wallet, Bell, User } from 'lucide-react';
import { scrollToTop } from '../../utils/scroll';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [location, navigate] = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    // Always scroll to top when navigating (UI/UX best practice)
    scrollToTop({ behavior: 'instant' });
  };

  const navItems = [
    { 
      label: 'Discover', 
      href: '/', 
      icon: Home,
      isActive: location === '/' || location === '/discover'
    },
    { 
      label: 'My Bets', 
      href: '/predictions', 
      icon: BarChart3,
      isActive: location === '/predictions'
    },
    { 
      label: 'Create', 
      href: '/create', 
      icon: Plus,
      isActive: location === '/create',
      isSpecial: true
    },
    { 
      label: 'Clubs', 
      href: '/clubs', 
      icon: Users,
      isActive: location === '/clubs'
    },
    { 
      label: 'Profile', 
      href: '/profile', 
      icon: User,
      isActive: location === '/profile'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">Z</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Fan Club Z</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleNavigation('/wallet')}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-lg text-sm"
            >
              <Wallet className="w-4 h-4" />
              <span className="font-medium">$2,500</span>
            </button>
            <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              onClick={() => handleNavigation(item.href)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
};

interface NavItemProps {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isSpecial?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ 
  label, 
  icon: Icon, 
  isActive, 
  isSpecial, 
  onClick 
}) => {
  if (isSpecial) {
    return (
      <button
        onClick={onClick}
        className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"
      >
        <Icon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
        isActive ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-600'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </button>
  );
};
