import React, { useState } from 'react';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('discover');
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const testBackendConnection = async () => {
    try {
      const response = await fetch('/api/v2/test');
      const data = await response.json();
      alert('✅ Backend Connected: ' + data.message);
    } catch (error) {
      alert('❌ Backend Error: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">F</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Fan Club Z</h1>
            <p className="text-gray-600 mt-2">Social Predictions Platform</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-center mb-6">Welcome Back</h2>
            
            <div className="space-y-4">
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your email"
              />
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter your password"
              />
              <button
                onClick={() => setIsAuthenticated(true)}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'discover':
        return (
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Discover Predictions</h1>
              <button
                onClick={testBackendConnection}
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
              >
                Test API
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Trending Section */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">🔥 Trending Now</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold">Will it rain in Lagos tomorrow?</h3>
                  <p className="text-gray-600 text-sm mt-1">Created by @weatherpro</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex space-x-4">
                      <span className="text-sm text-green-600">Yes: 60%</span>
                      <span className="text-sm text-red-600">No: 40%</span>
                    </div>
                    <span className="text-sm text-gray-600">₦12,500 pool</span>
                  </div>
                  <button className="mt-3 bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
                    Place Prediction
                  </button>
                </div>
              </section>
              
              {/* Sports Section */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">⚽ Sports</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold">Will Arsenal win their next match?</h3>
                  <p className="text-gray-600 text-sm mt-1">Created by @arsenalfc</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex space-x-4">
                      <span className="text-sm text-green-600">Yes: 75%</span>
                      <span className="text-sm text-red-600">No: 25%</span>
                    </div>
                    <span className="text-sm text-gray-600">₦45,200 pool</span>
                  </div>
                  <button className="mt-3 bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
                    Place Prediction
                  </button>
                </div>
              </section>
              
              {/* Pop Culture Section */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">🎭 Pop Culture</h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold">Who will win Big Brother Naija?</h3>
                  <p className="text-gray-600 text-sm mt-1">Created by @bbnfan</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex space-x-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Alex: 30%</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Sarah: 45%</span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Mike: 25%</span>
                    </div>
                    <span className="text-sm text-gray-600">₦78,900 pool</span>
                  </div>
                  <button className="mt-3 bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600">
                    Place Prediction
                  </button>
                </div>
              </section>
            </div>
          </div>
        );
      
      case 'predictions':
        return (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Predictions</h1>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No predictions yet</h2>
              <p className="text-gray-600 mb-6">Start making predictions to see them here</p>
              <button
                onClick={() => setCurrentPage('discover')}
                className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600"
              >
                Explore Predictions
              </button>
            </div>
          </div>
        );
      
      case 'wallet':
        return (
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Balance</h2>
              <div className="text-3xl font-bold text-green-500">₦0.00</div>
              <p className="text-gray-600 text-sm mt-1">Nigerian Naira</p>
            </div>
            <div className="space-y-3">
              <button className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600">
                Deposit Funds
              </button>
              <button className="w-full border border-gray-300 text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50">
                Withdraw
              </button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="p-4">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
              <p className="text-gray-600">This feature is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Fan Club Z</h1>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            <span className="text-gray-600">👤</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <NavItem 
            label="Discover" 
            icon="🏠" 
            active={currentPage === 'discover'}
            onClick={() => setCurrentPage('discover')}
          />
          <NavItem 
            label="Predictions" 
            icon="📊" 
            active={currentPage === 'predictions'}
            onClick={() => setCurrentPage('predictions')}
          />
          <NavItem 
            label="Create" 
            icon="➕" 
            active={currentPage === 'create'}
            onClick={() => setCurrentPage('create')}
          />
          <NavItem 
            label="Clubs" 
            icon="👥" 
            active={currentPage === 'clubs'}
            onClick={() => setCurrentPage('clubs')}
          />
          <NavItem 
            label="Wallet" 
            icon="💰" 
            active={currentPage === 'wallet'}
            onClick={() => setCurrentPage('wallet')}
          />
        </div>
      </nav>
    </div>
  );
}

interface NavItemProps {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
        active ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-600'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
};

export default App;