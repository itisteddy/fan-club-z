import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, TrendingUp, Plus, Users, Wallet, Search, Clock, Heart, MessageCircle, Share2, User } from 'lucide-react';
import { usePredictionsStore } from './stores/predictionsStore';
import { useAuthStore } from './stores/authStore';

// Import all page components
import CreatePredictionPage from './pages/CreatePredictionPage';
import PredictionsTab from './pages/PredictionsTab';
import ClubsPage from './pages/ClubsPage';
import ProfilePage from './pages/ProfilePage';

import BottomNavigation from './components/BottomNavigation';

// Compact Prediction Card with reduced spacing
const PredictionCard: React.FC<{ prediction: any }> = ({ prediction }) => {
  if (!prediction?.options?.length) return null;

  return (
    <div 
      className="mx-3 mb-3"
      style={{
        margin: '0 0.75rem 0.75rem 0.75rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f3f4f6'
      }}
    >
      {/* Compact Header */}
      <div 
        className="flex items-center gap-2 mb-3"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}
      >
        <div 
          style={{
            width: '2rem',
            height: '2rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ color: 'white', fontWeight: '700', fontSize: '12px' }}>FC</span>
        </div>
        <div style={{ flex: '1' }}>
          <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>Fan Club Z</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>2h ago</div>
        </div>
        <div 
          style={{
            padding: '2px 6px',
            backgroundColor: '#ecfdf5',
            color: '#047857',
            fontSize: '10px',
            fontWeight: '600',
            borderRadius: '6px',
            textTransform: 'capitalize'
          }}
        >
          {prediction.category}
        </div>
      </div>

      {/* Compact Content */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '700', 
          color: '#111827', 
          marginBottom: '4px',
          lineHeight: '1.3'
        }}>
          {prediction.title}
        </h3>
        {prediction.description && (
          <p style={{ 
            color: '#6b7280', 
            fontSize: '13px',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {prediction.description}
          </p>
        )}
      </div>

      {/* Compact Stats */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderTop: '1px solid #f3f4f6',
          borderBottom: '1px solid #f3f4f6',
          marginBottom: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div 
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#10b981',
                borderRadius: '50%'
              }}
            />
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '700', 
              color: '#111827' 
            }}>
              ₦{(prediction.poolTotal || 0).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {prediction.participantCount || 0} predictors
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
          <Clock size={12} />
          <span style={{ fontSize: '12px', fontWeight: '600' }}>5h left</span>
        </div>
      </div>

      {/* Compact Options */}
      <div style={{ marginBottom: '0.75rem' }}>
        {prediction.options.slice(0, 2).map((option: any, index: number) => {
          const percentage = Math.round((option.totalStaked / (prediction.poolTotal || 1)) * 100);
          
          return (
            <button
              key={option.id}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                marginBottom: index === 0 ? '6px' : '0',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div 
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: index === 0 ? '#10b981' : '#3b82f6'
                    }}
                  />
                  <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                    {option.label}
                  </span>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                    {percentage}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {option.currentOdds.toFixed(2)}x odds
                  </div>
                </div>
              </div>
              
              <div 
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: '2px',
                    backgroundColor: index === 0 ? '#10b981' : '#3b82f6',
                    width: `${Math.max(percentage, 2)}%`,
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Compact Engagement */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid #f3f4f6'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Heart size={16} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>24</span>
          </button>
          
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <MessageCircle size={16} />
            <span style={{ fontSize: '12px', fontWeight: '600' }}>12</span>
          </button>
          
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Share2 size={16} />
          </button>
        </div>
        
        <button 
          style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            fontWeight: '600',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
          }}
        >
          Predict Now
        </button>
      </div>
    </div>
  );
};

// Discover Page with compact design
const DiscoverPage: React.FC<{ onNavigateToProfile: () => void }> = ({ onNavigateToProfile }) => {
  const { predictions } = usePredictionsStore();
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'sports', label: 'Sports' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'entertainment', label: 'Entertainment' },
  ];

  const stats = {
    totalVolume: 2547892,
    activePredictions: 1247,
    todayVolume: 89234,
  };

  const filteredPredictions = predictions?.filter(prediction => 
    selectedCategory === 'all' || prediction.category === selectedCategory
  ) || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '60px' }}>
      {/* Compact Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ height: '44px' }} />
        
        <div style={{ padding: '0 0.75rem 0.75rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#111827', 
                marginBottom: '2px',
                lineHeight: '1.2'
              }}>
                Welcome back, {user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Ready to make some winning predictions?
              </p>
            </div>
            <button 
              style={{
                width: '36px', height: '36px', background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
              }}
              onClick={onNavigateToProfile}
            >
              <User size={18} style={{ color: 'white' }} />
            </button>
          </div>

          <div 
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <div 
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'white',
                  borderRadius: '50%'
                }}
              />
              <span style={{ 
                color: 'white', 
                fontSize: '12px', 
                fontWeight: '600', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Live Market
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>
                  ₦{stats.totalVolume.toLocaleString()}
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '10px', 
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Total Volume
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>
                  {stats.activePredictions}
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '10px', 
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Active
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>
                  ₦{stats.todayVolume.toLocaleString()}
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '10px', 
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Today
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}
            />
            <input
              type="text"
              placeholder="Search predictions, categories..."
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: '12px',
                paddingTop: '10px',
                paddingBottom: '10px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                color: '#111827',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
                e.target.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* Compact Categories */}
      <div style={{ padding: '12px 0.75rem', backgroundColor: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...(selectedCategory === category.id 
                  ? {
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
                    }
                  : {
                      backgroundColor: '#f3f4f6',
                      color: '#374151'
                    }
                )
              }}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: '12px' }}>
        <div style={{ padding: '0 0.75rem', marginBottom: '12px' }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            color: '#111827', 
            marginBottom: '2px' 
          }}>
            {selectedCategory === 'all' ? 'All Predictions' : `${selectedCategory} Predictions`}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            {filteredPredictions.length} predictions available
          </p>
        </div>

        <div>
          {filteredPredictions.map((prediction) => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))}
        </div>

        {filteredPredictions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0.75rem' }}>
            <div 
              style={{
                width: '3rem',
                height: '3rem',
                backgroundColor: '#f3f4f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem auto'
              }}
            >
              <TrendingUp size={24} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>
              No predictions found
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Try adjusting your category filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const WalletPage: React.FC<{ onNavigateToProfile: () => void }> = ({ onNavigateToProfile }) => {
  const { user } = useAuthStore();
  
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '60px' }}>
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ height: '44px' }} />
        <div style={{ padding: '0 0.75rem 0.75rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>Wallet</h1>
            <button 
              style={{
                width: '36px', height: '36px', background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
              }}
              onClick={onNavigateToProfile}
            >
              <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>
                {(user?.email?.charAt(0) || 'U').toUpperCase()}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Balance Card */}
      <div style={{ padding: '12px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: '12px', padding: '16px', marginBottom: '12px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
        }}>
          <h2 style={{ color: 'white', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Total Balance</h2>
          <div style={{ color: 'white', fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>₦0.00</div>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Nigerian Naira</p>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <button style={{
            padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white', fontWeight: '600', borderRadius: '10px', border: 'none',
            cursor: 'pointer', fontSize: '14px'
          }}>
            Deposit
          </button>
          <button style={{
            padding: '12px', backgroundColor: 'white', color: '#374151',
            fontWeight: '600', borderRadius: '10px', border: '1px solid #e5e7eb',
            cursor: 'pointer', fontSize: '14px'
          }}>
            Withdraw
          </button>
        </div>
        
        {/* Transaction History */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>Recent Transactions</h3>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💳</div>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>No transactions yet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create the missing page components
const MyPredictionsPage: React.FC = () => {
  return <PredictionsTab />;
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('discover');

  const handleNavigateToProfile = () => {
    setActiveTab('profile');
  };

  const handleNavigateBackFromProfile = () => {
    setActiveTab('discover');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'discover':
        return <DiscoverPage onNavigateToProfile={handleNavigateToProfile} />;
      case 'predictions':
        return <MyPredictionsPage />;
      case 'create':
        return <CreatePredictionPage />;
      case 'clubs':
        return <ClubsPage />;
      case 'wallet':
        return <WalletPage onNavigateToProfile={handleNavigateToProfile} />;
      case 'profile':
        return <ProfilePage onNavigateBack={handleNavigateBackFromProfile} />;
      default:
        return <DiscoverPage onNavigateToProfile={handleNavigateToProfile} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {activeTab !== 'profile' && (
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
}

export default App;