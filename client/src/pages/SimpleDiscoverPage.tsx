import React from 'react';

const SimpleDiscoverPage: React.FC = () => {
  return (
    <div style={{
      padding: '20px',
      background: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Modern Header */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '36px',
          marginBottom: '16px'
        }}>👋</div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '8px'
        }}>
          Welcome back, Alex!
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280'
        }}>
          Discover trending predictions and join the conversation
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#22c55e',
            marginBottom: '8px'
          }}>42</div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>Active Predictions</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#22c55e',
            marginBottom: '8px'
          }}>₦2.5M</div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>Total Volume</div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#22c55e',
            marginBottom: '8px'
          }}>1,247</div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>Active Predictors</div>
        </div>
      </div>

      {/* Featured Prediction */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            fontSize: '24px',
            marginRight: '12px'
          }}>🔥</div>
          <span style={{
            background: '#fef3c7',
            color: '#d97706',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>HOT</span>
        </div>

        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '12px'
        }}>
          Today's Hottest Prediction
        </h2>

        <div style={{
          background: '#f0fdf4',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid #bbf7d0'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#15803d',
            marginBottom: '8px'
          }}>
            Will Bitcoin reach $100k by end of 2025?
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#166534',
            marginBottom: '16px'
          }}>
            With recent market trends and institutional adoption...
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <button style={{
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              Yes - 64%
            </button>
            <button style={{
              background: 'white',
              color: '#22c55e',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              No - 36%
            </button>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#15803d'
          }}>
            💰 Pool: ₦70,000 | 👥 23 predictors
          </div>
        </div>
      </div>

      {/* Bottom spacing for navigation */}
      <div style={{ height: '100px' }}></div>
    </div>
  );
};

export default SimpleDiscoverPage;