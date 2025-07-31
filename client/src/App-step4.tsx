import React, { useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Home, User, Settings, Heart, Star, ChevronRight, AlertCircle, CheckCircle, Info } from 'lucide-react';
import './index.css';

console.log('Step 4: Testing Lucide Icons...');

const HomePage = () => (
  <div className="p-6 bg-green-50 rounded-lg">
    <div className="flex items-center gap-3 mb-3">
      <Home className="w-6 h-6 text-green-600" />
      <h2 className="text-xl font-bold text-green-800">Home Page</h2>
    </div>
    <p className="text-green-700">You're on the home page!</p>
    <div className="flex items-center gap-2 mt-3">
      <CheckCircle className="w-4 h-4 text-green-600" />
      <span className="text-sm text-green-600">Icons are rendering correctly!</span>
    </div>
  </div>
);

const ProfilePage = () => (
  <div className="p-6 bg-blue-50 rounded-lg">
    <div className="flex items-center gap-3 mb-3">
      <User className="w-6 h-6 text-blue-600" />
      <h2 className="text-xl font-bold text-blue-800">Profile Page</h2>
    </div>
    <p className="text-blue-700">User profile and settings!</p>
    <div className="flex items-center gap-2 mt-3">
      <Star className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-blue-600">Lucide icons working!</span>
    </div>
  </div>
);

const SettingsPage = () => (
  <div className="p-6 bg-purple-50 rounded-lg">
    <div className="flex items-center gap-3 mb-3">
      <Settings className="w-6 h-6 text-purple-600" />
      <h2 className="text-xl font-bold text-purple-800">Settings Page</h2>
    </div>
    <p className="text-purple-700">App settings and preferences!</p>
    <div className="flex items-center gap-2 mt-3">
      <Heart className="w-4 h-4 text-purple-600" />
      <span className="text-sm text-purple-600">All icons loaded successfully!</span>
    </div>
  </div>
);

function App() {
  console.log('Step 4 App rendering...');
  const [location, navigate] = useLocation();
  const [likeCount, setLikeCount] = useState(0);
  
  console.log('Current location:', location);
  console.log('Lucide icons imported successfully');
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Step 4: Icon Test
            </h1>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button 
              onClick={() => navigate('/')}
              className={`p-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                location === '/' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className={`p-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                location === '/profile' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className={`p-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                location === '/settings' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
          
          {/* Interactive Icon Test */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Interactive Icon Test
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLikeCount(prev => prev + 1)}
                className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Heart className={`w-4 h-4 ${likeCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
                Like ({likeCount})
              </button>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Current route: <code className="bg-gray-100 px-2 py-1 rounded">{location}</code></span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span>✅ If you see icons above, Lucide React is working!</span>
            </div>
          </div>
        </div>

        {/* Route Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/settings" component={SettingsPage} />
            <Route>
              <div className="p-6 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-bold text-red-800">404 Not Found</h2>
                </div>
                <p className="text-red-700">Page not found: {location}</p>
              </div>
            </Route>
          </Switch>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Debug Info:
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>⏰ Time: {new Date().toLocaleTimeString()}</p>
            <p>🌐 Location: {location}</p>
            <p>❤️ Like count: {likeCount}</p>
            <p>🔧 Lucide icons imported and rendering</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
