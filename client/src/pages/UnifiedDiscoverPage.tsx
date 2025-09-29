import React from 'react';
import { Search } from 'lucide-react';
import Header from '../components/layout/Header/Header';
import Page from '../components/ui/layout/Page';

interface DiscoverPageProps {
  children?: React.ReactNode;
}

const UnifiedDiscoverPage: React.FC<DiscoverPageProps> = ({ children }) => {
  return (
    <>
      {/* Minimal Header - no avatar, no logo, no descriptive text */}
      <Header title="Discover" />
      
      <Page>
        {/* Search input stays in content, not header */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search predictions..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content passed from parent component */}
        {children}
      </Page>
    </>
  );
};

export default UnifiedDiscoverPage;
