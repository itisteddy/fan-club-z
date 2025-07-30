import React from 'react';
import { ArrowLeft, Zap, Users, Shield, TrendingUp } from 'lucide-react';
import { useLocation } from 'wouter';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const [location, navigate] = useLocation();
  const isLogin = location === '/' || location === '/login';

  const features = [
    {
      icon: Zap,
      title: 'Create Predictions',
      description: 'Design unique prediction scenarios on any topic'
    },
    {
      icon: Users,
      title: 'Join Communities',
      description: 'Connect with fans who share your interests'
    },
    {
      icon: Shield,
      title: 'Secure Transactions',
      description: 'Blockchain-backed security for all transactions'
    },
    {
      icon: TrendingUp,
      title: 'Earn Rewards',
      description: 'Win big by making accurate predictions'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="safe-top px-4 py-3">
        <div className="flex items-center justify-between">
          {!isLogin && (
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-muted transition-colors touch-manipulation"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <span className="text-body-md font-semibold text-foreground">Fan Club Z</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="px-4 py-8 text-center space-y-6">
          {/* Logo */}
          <div className="relative mx-auto w-24 h-24">
            {/* Animated rings */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
            <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
            
            {/* Main logo */}
            <div className="relative w-full h-full bg-gradient-primary rounded-full flex items-center justify-center shadow-fab">
              <span className="text-3xl font-bold text-white">F</span>
            </div>
          </div>

          {/* Hero Text */}
          <div className="space-y-3 max-w-sm mx-auto">
            <h1 className="text-display-lg font-bold text-foreground">
              Welcome to Fan Club Z
            </h1>
            <p className="text-body-md text-muted-foreground leading-relaxed">
              Predict outcomes, engage with your community, and earn rewards in the future of fan-powered entertainment.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-card rounded-xl border border-border p-4 text-center space-y-2">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-body-sm font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-caption text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auth Form Container */}
        <div className="flex-1 px-4 pb-8">
          <div className="max-w-md mx-auto">
            {children}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-4 py-6 text-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-6 text-caption text-muted-foreground">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Support</span>
            </div>
            <p className="text-caption text-muted-foreground">
              © 2024 Fan Club Z. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};
