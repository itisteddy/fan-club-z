import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

const AuthPage: React.FC = () => {
  const { login, register, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string; firstName?: string; lastName?: string; confirmPassword?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);

  // Ensure page starts at the top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Improved email validation - more permissive for common business domains
  const isValidEmail = (email: string): boolean => {
    // Basic format check
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!basicEmailRegex.test(email)) {
      return false;
    }
    
    // Allow common domains and business domains
    const domainPart = email.split('@')[1]?.toLowerCase();
    if (!domainPart) return false;
    
    // Common email providers and business domains
    const allowedDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
      'example.com', 'test.com', 'demo.com', 'dev.com',
      'company.com', 'business.com', 'org.com', 'net.com',
      'fcz.app', 'fanclubz.com', 'fanclub.com'
    ];
    
    // Check if it's a common domain
    if (allowedDomains.includes(domainPart)) {
      return true;
    }
    
    // Check if it looks like a valid business domain (has at least one dot and reasonable length)
    const domainParts = domainPart.split('.');
    if (domainParts.length >= 2 && domainParts.every(part => part.length > 0 && part.length <= 63)) {
      const tld = domainParts[domainParts.length - 1];
      // Allow common TLDs
      const commonTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'app', 'io', 'co', 'me'];
      if (commonTlds.includes(tld) || tld.length >= 2) {
        return true;
      }
    }
    
    return false;
  };

  const validateForm = () => {
    const errors: { email?: string; password?: string; firstName?: string; lastName?: string; confirmPassword?: string } = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!isLoginMode) {
      if (!firstName.trim()) {
        errors.firstName = 'First name is required';
      }
      
      if (!lastName.trim()) {
        errors.lastName = 'Last name is required';
      }
      
      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || loading) return;
    
    setFormErrors({});
    setAuthError(null);
    
    try {
      if (isLoginMode) {
        await login(email, password);
        // Success handled by auth store - user will be automatically redirected by App.tsx
      } else {
        await register(email, password, firstName, lastName);
        // Success handled by auth store - user will be automatically logged in and redirected
        // The auth store now handles auto-login after registration
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Create user-friendly error messages
      let friendlyMessage = 'Authentication failed. Please try again.';
      
      if (error.message) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('invalid') && errorMsg.includes('email')) {
          friendlyMessage = 'Invalid email format. Please use a valid email address like user@gmail.com';
        } else if (errorMsg.includes('invalid') && errorMsg.includes('credentials')) {
          friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorMsg.includes('user already registered') || errorMsg.includes('already exists')) {
          friendlyMessage = 'An account with this email already exists. Please try signing in instead.';
          // Auto-switch to login mode
          setTimeout(() => setIsLoginMode(true), 2000);
        } else if (errorMsg.includes('email not confirmed')) {
          friendlyMessage = 'Please check your email and confirm your account before signing in.';
        } else if (errorMsg.includes('too many requests') || errorMsg.includes('rate limit')) {
          friendlyMessage = 'Too many attempts. Please wait a moment and try again.';
        } else if (errorMsg.includes('user not found')) {
          friendlyMessage = 'No account found with this email. Please register first.';
          // Auto-switch to register mode
          if (isLoginMode) {
            setTimeout(() => setIsLoginMode(false), 2000);
          }
        } else if (errorMsg.includes('password') && errorMsg.includes('weak')) {
          friendlyMessage = 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
        } else if (errorMsg.includes('signup') && errorMsg.includes('disabled')) {
          friendlyMessage = 'Account registration is temporarily disabled. Please contact support.';
        } else {
          // Use the original message for other specific errors
          friendlyMessage = error.message;
        }
      }
      
      setAuthError(friendlyMessage);
    }
  };

  const handleTestLogin = async (testEmail: string, testPassword: string, testFirstName?: string, testLastName?: string) => {
    try {
      setEmail(testEmail);
      setPassword(testPassword);
      if (testFirstName) setFirstName(testFirstName);
      if (testLastName) setLastName(testLastName);
      setConfirmPassword(testPassword);
      setAuthError(null);
      
      if (isLoginMode) {
        await login(testEmail, testPassword);
      } else {
        await register(testEmail, testPassword, testFirstName || 'Test', testLastName || 'User');
      }
    } catch (error: any) {
      console.error('Test auth error:', error);
      setAuthError(error.message || 'Test authentication failed');
    }
  };

  const handleSocialAuth = async (provider: string) => {
    // This would integrate with Supabase social auth in the future
    alert(`${provider} authentication will be available soon!`);
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormErrors({});
    setAuthError(null);
    // Clear form fields when switching modes
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
    // Scroll to top when switching modes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 30%, #ecfdf5 70%, #f0fdfa 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '16px',
      position: 'relative',
      overflow: 'auto'
    }}>
      {/* Development Test Panel - Only show in development */}
      {import.meta.env.VITE_DEBUG === 'true' && (
        <div>
          <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 1001 }}>
            <button
              onClick={() => setShowTestPanel(!showTestPanel)}
              style={{
                padding: '8px 12px',
                background: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🧪 Test Mode
            </button>
          </div>

          {showTestPanel && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              zIndex: 1000,
              maxWidth: '280px'
            }}>
              <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#00ff88' }}>🚀 TEST AUTHENTICATION</div>
              <div style={{ marginBottom: '8px', fontSize: '10px', color: '#ccc' }}>
                These accounts work with Supabase:
              </div>
              <button
                style={{
                  margin: '4px 0',
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  width: '100%'
                }}
                onClick={() => handleTestLogin('userten@fcz.app', 'test123', 'User', 'Ten')}
              >
                {isLoginMode ? '🔑 Login userten@fcz.app' : '📝 Register userten@fcz.app'}
              </button>
              <button
                style={{
                  margin: '4px 0',
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  width: '100%'
                }}
                onClick={() => handleTestLogin('demo@example.com', 'demo123', 'Demo', 'User')}
              >
                {isLoginMode ? '🔑 Login demo@example.com' : '📝 Register demo@example.com'}
              </button>
              <button
                style={{
                  margin: '4px 0',
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  width: '100%'
                }}
                onClick={() => handleTestLogin('user@gmail.com', 'test123', 'Test', 'Person')}
              >
                {isLoginMode ? '🔑 Login user@gmail.com' : '📝 Register user@gmail.com'}
              </button>
              <div style={{ margin: '12px 0 8px 0', fontSize: '10px', color: '#ffaa00' }}>
                ⚠️ userten@fcz.app and other business domains now supported!
              </div>
              <button
                style={{
                  margin: '4px 0',
                  padding: '6px 12px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  width: '100%'
                }}
                onClick={() => setShowTestPanel(false)}
              >
                ❌ Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          
          @media (max-width: 768px) {
            .auth-card {
              padding: 24px !important;
              margin: 8px !important;
              max-width: 100% !important;
              width: 95% !important;
            }
            
            .auth-card h1 {
              font-size: 28px !important;
            }
            
            .auth-card p {
              font-size: 14px !important;
            }
          }
          
          .auth-error {
            animation: shake 0.5s ease-in-out;
          }
        `}
      </style>

      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-160px',
        right: '-160px',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 100%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        animation: 'float 8s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-160px',
        left: '-160px',
        width: '320px',
        height: '320px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        animation: 'float 10s ease-in-out infinite reverse'
      }}></div>

      {/* Main card - Improved layout for 95% coverage and top alignment */}
      <div 
        className="auth-card"
        style={{
          width: '95%',
          maxWidth: '680px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          position: 'relative',
          zIndex: 10,
          margin: '16px auto',
          marginTop: '8px', // Start closer to top
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start' // Changed from center to flex-start
        }}
      >
        {/* Logo section - Reduced margin */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '20px',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 24px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>Z</span>
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '8px',
            margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: '1.2'
          }}>{isLoginMode ? 'Welcome Back' : 'Join Fan Club Z'}</h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: '0',
            lineHeight: '1.5'
          }}>
            {isLoginMode 
              ? 'Sign in to continue your prediction journey'
              : 'Create your account and start making predictions'
            }
          </p>
        </div>

        {/* Display authentication error with improved styling */}
        {authError && (
          <div className="auth-error" style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#dc2626',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '2px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {isLoginMode ? 'Sign In Failed' : 'Registration Failed'}
              </div>
              <div style={{ lineHeight: '1.4' }}>{authError}</div>
              {(authError.includes('Invalid email format') || authError.includes('valid email')) && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#7c2d12', background: 'rgba(251, 191, 36, 0.1)', padding: '8px', borderRadius: '6px' }}>
                  💡 Try formats like: user@gmail.com, test@fcz.app, or demo@example.com
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form with improved layout */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          {/* Name fields for registration */}
          {!isLoginMode && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: `2px solid ${formErrors.firstName ? '#ef4444' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit',
                    minHeight: '52px'
                  }}
                  disabled={loading}
                  required={!isLoginMode}
                />
                {formErrors.firstName && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    {formErrors.firstName}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: `2px solid ${formErrors.lastName ? '#ef4444' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit',
                    minHeight: '52px'
                  }}
                  disabled={loading}
                  required={!isLoginMode}
                />
                {formErrors.lastName && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    {formErrors.lastName}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email field with improved icon positioning */}
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              style={{
                width: '100%',
                padding: '14px 16px',
                paddingRight: '48px',
                border: `2px solid ${formErrors.email ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                fontFamily: 'inherit',
                minHeight: '52px'
              }}
              disabled={loading}
              required
            />
            <div style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              color: '#9ca3af',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '12px' // Adjust for label
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            {formErrors.email && (
              <div style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {formErrors.email}
              </div>
            )}
          </div>

          {/* Password field with improved icon positioning */}
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '14px 16px',
                paddingRight: '52px',
                border: `2px solid ${formErrors.password ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                fontFamily: 'inherit',
                minHeight: '52px'
              }}
              disabled={loading}
              required
            />
            <button 
              type="button"
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '24px',
                height: '24px',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                outline: 'none',
                marginTop: '12px' // Adjust for label
              }}
              onClick={togglePassword}
            >
              {showPassword ? (
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
            {formErrors.password && (
              <div style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {formErrors.password}
              </div>
            )}
          </div>

          {/* Confirm Password field for registration */}
          {!isLoginMode && (
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Confirm Password
              </label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingRight: '52px',
                  border: `2px solid ${formErrors.confirmPassword ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  fontFamily: 'inherit',
                  minHeight: '52px'
                }}
                disabled={loading}
                required={!isLoginMode}
              />
              <button 
                type="button"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '24px',
                  height: '24px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  marginTop: '12px' // Adjust for label
                }}
                onClick={toggleConfirmPassword}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
              {formErrors.confirmPassword && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  {formErrors.confirmPassword}
                </div>
              )}
            </div>
          )}

          {/* Forgot password - only show for login */}
          {isLoginMode && (
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  alert('Password reset functionality will be available soon!');
                }} 
                style={{
                  color: '#10b981',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
              >
                Forgot your password?
              </a>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '56px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? '0.8' : '1',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}>
                </div>
                {isLoginMode ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              isLoginMode ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          position: 'relative',
          textAlign: 'center',
          margin: '32px 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0',
            height: '1px',
            backgroundColor: '#e5e7eb'
          }}></div>
          <span style={{
            backgroundColor: 'white',
            padding: '0 16px',
            position: 'relative',
            zIndex: 1
          }}>Or {isLoginMode ? 'continue' : 'sign up'} with</span>
        </div>

        {/* Social buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <button
            type="button"
            onClick={() => handleSocialAuth('google')}
            disabled={loading}
            style={{
              width: '100%',
              height: '52px',
              backgroundColor: 'white',
              border: '1.5px solid #e5e7eb',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '15px',
              fontWeight: '500',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? '0.7' : '1',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleSocialAuth('apple')}
            disabled={loading}
            style={{
              width: '100%',
              height: '52px',
              backgroundColor: '#1f2937',
              color: 'white',
              border: '1.5px solid #1f2937',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? '0.7' : '1',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        {/* Toggle between login/signup */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          paddingBottom: '16px',
          borderTop: '1px solid #f3f4f6'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '15px',
            margin: '0'
          }}>
            {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                toggleMode();
              }} 
              style={{
                color: '#10b981',
                textDecoration: 'none',
                fontWeight: '600',
                padding: '8px 12px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                display: 'inline-block',
                marginTop: '8px'
              }}
            >
              {isLoginMode ? 'Create one now' : 'Sign in'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;