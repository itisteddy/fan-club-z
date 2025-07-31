import React, { useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import './index.css';

console.log('Step 3: Testing Routing...');

// Simple page components
const HomePage = () => (
  <div className="p-6 bg-green-50 rounded-lg">
    <h2 className="text-xl font-bold text-green-800 mb-2">🏠 Home Page</h2>
    <p className="text-green-700">You're on the home page!</p>
    <p className="text-sm text-green-600 mt-2">If you see this, routing is working.</p>
  </div>
);

const AboutPage = () => (
  <div className="p-6 bg-blue-50 rounded-lg">
    <h2 className="text-xl font-bold text-blue-800 mb-2">ℹ️ About Page</h2>
    <p className="text-blue-700">This is the about page!</p>
    <p className="text-sm text-blue-600 mt-2">Navigation worked correctly.</p>
  </div>
);

const ContactPage = () => (
  <div className="p-6 bg-purple-50 rounded-lg">
    <h2 className="text-xl font-bold text-purple-800 mb-2">📧 Contact Page</h2>
    <p className="text-purple-700">Contact us here!</p>
    <p className="text-sm text-purple-600 mt-2">Wouter routing successful.</p>
  </div>
);

function App() {
  console.log('Step 3 App rendering...');
  const [location, navigate] = useLocation();
  
  console.log('Current location:', location);
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Step 3: Routing Test
          </h1>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button 
              onClick={() => navigate('/')}
              className={`p-3 rounded-lg font-medium transition-colors ${
                location === '/' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => navigate('/about')}
              className={`p-3 rounded-lg font-medium transition-colors ${
                location === '/about' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              About
            </button>
            <button 
              onClick={() => navigate('/contact')}
              className={`p-3 rounded-lg font-medium transition-colors ${
                location === '/contact' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Contact
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>Current route: <code className="bg-gray-100 px-2 py-1 rounded">{location}</code></p>
            <p className="mt-1">✅ If buttons change color and content below changes, routing works!</p>
          </div>
        </div>

        {/* Route Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/contact" component={ContactPage} />
            <Route>
              <div className="p-6 bg-red-50 rounded-lg">
                <h2 className="text-xl font-bold text-red-800 mb-2">❌ 404 Not Found</h2>
                <p className="text-red-700">Page not found: {location}</p>
              </div>
            </Route>
          </Switch>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Debug Info:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>⏰ Time: {new Date().toLocaleTimeString()}</p>
            <p>🌐 Location: {location}</p>
            <p>🔧 Wouter imported successfully</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
