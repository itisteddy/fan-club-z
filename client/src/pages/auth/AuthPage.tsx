import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const AuthPage: React.FC = () => {
  const { login, register } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string; firstName?: string; lastName?: string; confirmPassword?: string }>({});

  const validateForm = () => {
    const errors: { email?: string; password?: string; firstName?: string; lastName?: string; confirmPassword?: string } = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!isLoginMode) {
      if (!firstName) {
        errors.firstName = 'First name is required';
      }
      
      if (!lastName) {
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
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setFormErrors({});
    
    // Simulate API call
    setTimeout(() => {
      if (isLoginMode) {
        login(email, password);
      } else {
        register(email, password, firstName, lastName);
      }
      setIsLoading(false);
    }, 1200);
  };

  const handleSocialAuth = async (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      if (isLoginMode) {
        login(`${provider}@example.com`, `${provider}-auth`);
      } else {
        register(`${provider}@example.com`, `${provider}-auth`, provider.charAt(0).toUpperCase() + provider.slice(1), 'User');
      }
      setIsLoading(false);
    }, 800);
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormErrors({});
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setConfirmPassword('');
  };

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  // Clean, production-ready styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 30%, #ecfdf5 70%, #f0fdfa 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative' as const,
      overflow: 'hidden'
    },
    
    backgroundOrb1: {
      position: 'absolute' as const,
      top: '-160px',
      right: '-160px',
      width: '320px',
      height: '320px',
      background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 100%)',
      borderRadius: '50%',
      filter: 'blur(40px)',
      animation: 'float 8s ease-in-out infinite'
    },
    
    backgroundOrb2: {
      position: 'absolute' as const,
      bottom: '-160px',
      left: '-160px',
      width: '320px',
      height: '320px',
      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
      borderRadius: '50%',
      filter: 'blur(40px)',
      animation: 'float 10s ease-in-out infinite reverse'
    },
    
    card: {
      width: '100%',
      maxWidth: '420px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      padding: '48px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      position: 'relative' as const,
      zIndex: 10
    },
    
    logoContainer: {
      textAlign: 'center' as const,
      marginBottom: '40px'
    },
    
    logo: {
      width: '88px',
      height: '88px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      borderRadius: '20px',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 12px 24px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative' as const,
      overflow: 'hidden'
    },
    
    logoText: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    
    title: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '8px',
      margin: '0 0 8px 0',
      background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      lineHeight: '1.2'
    },
    
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
      margin: '0',
      lineHeight: '1.5'
    },
    
    form: {
      marginBottom: '32px'
    },
    
    inputGroup: {
      marginBottom: '24px',
      position: 'relative' as const
    },
    
    input: {
      width: '100%',
      padding: '18px 20px',
      paddingRight: '50px',
      border: '2px solid #e5e7eb',
      borderRadius: '16px',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxSizing: 'border-box' as const,
      backgroundColor: '#ffffff',
      fontFamily: 'inherit'
    },
    
    inputFocused: {
      borderColor: '#10b981',
      boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)',
      transform: 'translateY(-1px)'
    },
    
    inputError: {
      borderColor: '#ef4444',
      boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.1)'
    },
    
    inputIcon: {
      position: 'absolute' as const,
      right: '16px',
      top: '18px',
      width: '20px',
      height: '20px',
      color: '#9ca3af',
      pointerEvents: 'none' as const
    },
    
    passwordToggle: {
      position: 'absolute' as const,
      right: '16px',
      top: '16px',
      width: '24px',
      height: '24px',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '6px',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    
    errorMessage: {
      marginTop: '8px',
      fontSize: '14px',
      color: '#ef4444',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    
    forgotPassword: {
      textAlign: 'right' as const,
      marginBottom: '32px'
    },
    
    forgotLink: {
      color: '#10b981',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: '500',
      padding: '4px 8px',
      borderRadius: '6px',
      transition: 'all 0.2s'
    },
    
    signInButton: {
      width: '100%',
      height: '56px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '16px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      opacity: isLoading ? '0.8' : '1',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
      position: 'relative' as const,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    
    divider: {
      position: 'relative' as const,
      textAlign: 'center' as const,
      margin: '32px 0',
      fontSize: '14px',
      color: '#6b7280'
    },
    
    dividerLine: {
      position: 'absolute' as const,
      top: '50%',
      left: '0',
      right: '0',
      height: '1px',
      backgroundColor: '#e5e7eb'
    },
    
    dividerText: {
      backgroundColor: 'white',
      padding: '0 16px',
      position: 'relative' as const,
      zIndex: 1
    },
    
    socialButtons: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      marginBottom: '32px'
    },
    
    socialButton: {
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
      cursor: isLoading ? 'not-allowed' : 'pointer',
      opacity: isLoading ? '0.7' : '1',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    
    appleButton: {
      backgroundColor: '#1f2937',
      color: 'white',
      border: '1.5px solid #1f2937'
    },
    
    signUpSection: {
      textAlign: 'center' as const,
      paddingTop: '24px',
      borderTop: '1px solid #f3f4f6'
    },
    
    signUpText: {
      color: '#6b7280',
      fontSize: '15px',
      margin: '0'
    },
    
    signUpLink: {
      color: '#10b981',
      textDecoration: 'none',
      fontWeight: '600',
      padding: '2px 4px',
      borderRadius: '4px',
      transition: 'all 0.2s'
    }
  };

  return (
    <div style={styles.container}>
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
          
          .logo-hover:hover {
            transform: scale(1.05) rotate(5deg);
          }
          
          .button-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(16, 185, 129, 0.4);
          }
          
          .social-hover:hover {
            background-color: #f9fafb;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          
          .apple-hover:hover {
            background-color: #111827 !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          }
          
          .link-hover:hover {
            background-color: rgba(16, 185, 129, 0.1);
            transform: scale(1.02);
          }
          
          .password-toggle:hover {
            background-color: #f3f4f6;
            color: #374151;
          }
        `}
      </style>

      {/* Animated background elements */}
      <div style={styles.backgroundOrb1}></div>
      <div style={styles.backgroundOrb2}></div>

      {/* Main card */}
      <div style={styles.card}>
        {/* Logo section */}
        <div style={styles.logoContainer}>
          <div style={styles.logo} className="logo-hover">
            <span style={styles.logoText}>Z</span>
          </div>
          <h1 style={styles.title}>{isLoginMode ? 'Welcome Back' : 'Join Fan Club Z'}</h1>
          <p style={styles.subtitle}>
            {isLoginMode 
              ? 'Sign in to continue your prediction journey'
              : 'Create your account and start making predictions'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name fields for registration */}
          {!isLoginMode && (
            <>
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  style={{
                    ...styles.input,
                    ...(firstName ? styles.inputFocused : {}),
                    ...(formErrors.firstName ? styles.inputError : {})
                  }}
                  disabled={isLoading}
                  required={!isLoginMode}
                />
                <svg style={styles.inputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {formErrors.firstName && (
                  <div style={styles.errorMessage}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {formErrors.firstName}
                  </div>
                )}
              </div>
              
              <div style={styles.inputGroup}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  style={{
                    ...styles.input,
                    ...(lastName ? styles.inputFocused : {}),
                    ...(formErrors.lastName ? styles.inputError : {})
                  }}
                  disabled={isLoading}
                  required={!isLoginMode}
                />
                <svg style={styles.inputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {formErrors.lastName && (
                  <div style={styles.errorMessage}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {formErrors.lastName}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Email field */}
          <div style={styles.inputGroup}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                ...styles.input,
                ...(email ? styles.inputFocused : {}),
                ...(formErrors.email ? styles.inputError : {})
              }}
              disabled={isLoading}
              required
            />
            <svg style={styles.inputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            {formErrors.email && (
              <div style={styles.errorMessage}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {formErrors.email}
              </div>
            )}
          </div>

          {/* Password field */}
          <div style={styles.inputGroup}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                ...styles.input,
                paddingRight: '60px',
                ...(password ? styles.inputFocused : {}),
                ...(formErrors.password ? styles.inputError : {})
              }}
              disabled={isLoading}
              required
            />
            <div 
              style={styles.passwordToggle}
              className="password-toggle"
              onClick={togglePassword}
            >
              {showPassword ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </div>
            {formErrors.password && (
              <div style={styles.errorMessage}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {formErrors.password}
              </div>
            )}
          </div>

          {/* Confirm Password field for registration */}
          {!isLoginMode && (
            <div style={styles.inputGroup}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                style={{
                  ...styles.input,
                  paddingRight: '60px',
                  ...(confirmPassword ? styles.inputFocused : {}),
                  ...(formErrors.confirmPassword ? styles.inputError : {})
                }}
                disabled={isLoading}
                required={!isLoginMode}
              />
              <div 
                style={styles.passwordToggle}
                className="password-toggle"
                onClick={toggleConfirmPassword}
              >
                {showConfirmPassword ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </div>
              {formErrors.confirmPassword && (
                <div style={styles.errorMessage}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {formErrors.confirmPassword}
                </div>
              )}
            </div>
          )}

          {/* Forgot password - only show for login */}
          {isLoginMode && (
            <div style={styles.forgotPassword}>
              <a 
                href="#" 
                onClick={(e) => e.preventDefault()} 
                style={styles.forgotLink}
                className="link-hover"
              >
                Forgot your password?
              </a>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            style={styles.signInButton}
            className="button-hover"
          >
            {isLoading ? (
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
        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>Or {isLoginMode ? 'continue' : 'sign up'} with</span>
        </div>

        {/* Social buttons */}
        <div style={styles.socialButtons}>
          <button
            type="button"
            onClick={() => handleSocialAuth('google')}
            disabled={isLoading}
            style={styles.socialButton}
            className="social-hover"
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
            disabled={isLoading}
            style={{...styles.socialButton, ...styles.appleButton}}
            className="apple-hover"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        {/* Toggle between login/signup */}
        <div style={styles.signUpSection}>
          <p style={styles.signUpText}>
            {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                toggleMode();
              }} 
              style={styles.signUpLink}
              className="link-hover"
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