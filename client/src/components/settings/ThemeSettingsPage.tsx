import React from 'react';
import StandardHeader from '../common/StandardHeader';
import ThemeSettings from './ThemeSettings';

interface ThemeSettingsPageProps {
  onBack: () => void;
}

const ThemeSettingsPage: React.FC<ThemeSettingsPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StandardHeader 
        title="Theme Settings"
        onBack={onBack}
        variant="default"
      />

      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <ThemeSettings />
        </div>
      </div>
    </div>
  );
};

export default ThemeSettingsPage;
