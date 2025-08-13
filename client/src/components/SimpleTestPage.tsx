import React from 'react';

const SimpleTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">🎯 Fan Club Z v2.0</h1>
        <p className="text-gray-700 mb-6">Routing Test Page</p>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Page is rendering!</h2>
          <p className="text-gray-600">
            If you can see this, the basic React rendering is working.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Current URL: {window.location.pathname}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTestPage;
