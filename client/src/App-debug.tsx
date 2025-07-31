import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Fan Club Z Debug
          </h1>
          <p className="text-gray-600 mb-4">
            If you can see this, the app is loading correctly.
          </p>
          
          <div className="space-y-4">
            <div className="bg-green-500 text-white p-3 rounded">
              ✅ React is working
            </div>
            <div className="bg-blue-500 text-white p-3 rounded">
              ✅ Tailwind CSS is working
            </div>
            <div className="bg-purple-500 text-white p-3 rounded">
              ✅ Styles are applied
            </div>
          </div>

          <button 
            className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            onClick={() => alert('Button clicked!')}
          >
            Test Interaction
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <div>React version: {React.version}</div>
            <div>Environment: {import.meta.env.MODE}</div>
            <div>Time: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
