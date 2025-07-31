import React from 'react';

const ReliableDiscoverPage: React.FC = () => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#22c55e',
    color: 'white'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db'
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#22c55e',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              Z
            </div>
            <div>
              <h1 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: 0,
                lineHeight: 1
              }}>
                Fan Club Z
              </h1>
              <p style={{
                fontSize: '10px',
                color: '#6b7280',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Social Predictions
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '18px'
            }}>
              🔍
            </button>
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '18px',
              position: 'relative'
            }}>
              🔔
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '8px',
                height: '8px',
                backgroundColor: '#ef4444',
                borderRadius: '50%'
              }}></div>
            </button>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Welcome back, Alex! 👋
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: 0
          }}>
            Discover trending predictions and join the conversation
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div style={cardStyle}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#dcfce7',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📈
              </div>
              <span style={{
                fontSize: '12px',
                color: '#22c55e',
                fontWeight: '600'
              }}>
                +12%
              </span>
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              margin: '0 0 4px 0'
            }}>
              42
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Active Predictions
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#dbeafe',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                💰
              </div>
              <span style={{
                fontSize: '12px',
                color: '#22c55e',
                fontWeight: '600'
              }}>
                +₦250k
              </span>
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              margin: '0 0 4px 0'
            }}>
              ₦2.5M
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Total Volume
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#e0e7ff',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                👥
              </div>
              <span style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: '600'
              }}>
                +47
              </span>
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#111827',
              margin: '0 0 4px 0'
            }}>
              1,247
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Active Predictors
            </p>
          </div>
        </div>

        {/* Featured Prediction */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#ef4444',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Live
              </span>
            </div>
            <span style={{
              backgroundColor: '#fef3c7',
              color: '#d97706',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Featured
            </span>
          </div>

          <h3 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '12px',
            lineHeight: '1.3'
          }}>
            Will Bitcoin reach $100k by end of 2025?
          </h3>

          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.6',
            marginBottom: '24px'
          }}>
            With recent market trends and institutional adoption accelerating, what are the chances Bitcoin breaks the psychological $100,000 barrier before 2025 ends?
          </p>

          {/* Prediction Options */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <button style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #bbf7d0',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontWeight: '600',
                  color: '#166534',
                  fontSize: '16px'
                }}>
                  Yes
                </span>
                <span style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#22c55e'
                }}>
                  64%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#bbf7d0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '64%',
                  height: '100%',
                  backgroundColor: '#22c55e',
                  borderRadius: '4px'
                }}></div>
              </div>
            </button>

            <button style={{
              backgroundColor: '#f9fafb',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '16px'
                }}>
                  No
                </span>
                <span style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#6b7280'
                }}>
                  36%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '36%',
                  height: '100%',
                  backgroundColor: '#9ca3af',
                  borderRadius: '4px'
                }}></div>
              </div>
            </button>
          </div>

          {/* Meta Info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '20px',
            borderTop: '1px solid #f3f4f6',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span>💰 ₦70,000 pool</span>
              <span>👥 23 predictors</span>
              <span>⏰ 5 days left</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                ❤️ 24
              </button>
              <button style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                💬 8
              </button>
              <button style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                📤
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '80px'
        }}>
          <button style={{
            ...cardStyle,
            textAlign: 'left',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              fontSize: '16px'
            }}>
              📈
            </div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '4px'
            }}>
              Trending
            </h4>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Hot predictions
            </p>
          </button>

          <button style={{
            ...cardStyle,
            textAlign: 'left',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#dbeafe',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              fontSize: '16px'
            }}>
              👥
            </div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '4px'
            }}>
              Communities
            </h4>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              Join groups
            </p>
          </button>
        </div>
      </div>

      {/* Add some basic animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          button:hover {
            transform: translateY(-1px);
          }
        `}
      </style>
    </div>
  );
};

export default ReliableDiscoverPage;