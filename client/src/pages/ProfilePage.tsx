import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  Trophy, 
  TrendingUp, 
  DollarSign, 
  Star,
  Edit3,
  Camera,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Save,
  X,
  ChevronLeft,
  Toggle,
  Lock,
  Mail,
  Phone,
  Globe,
  MessageCircle,
  FileText,
  Heart
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface ProfilePageProps {
  onNavigateBack?: () => void;
}

// Settings Components
const AccountSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, updateProfile } = useAuthStore();
  const [settings, setSettings] = useState({
    twoFactorEnabled: false,
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    publicProfile: true,
    showEarnings: false
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityStats, setSecurityStats] = useState({
    lastPasswordChange: '3 months ago',
    loginSessions: 1,
    suspiciousActivity: 0
  });

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }
    
    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      alert('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setIsUpdating(false);
      setSecurityStats({ ...securityStats, lastPasswordChange: 'Just now' });
    }, 2000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() === 'delete my account') {
      setIsUpdating(true);
      // Simulate API call
      setTimeout(() => {
        alert('Account deletion request submitted. You will receive a confirmation email.');
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
        setIsUpdating(false);
      }, 2000);
    } else {
      alert('Please type "delete my account" to confirm.');
    }
  };

  const handleToggleSetting = async (key: keyof typeof settings) => {
    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      setSettings({ ...settings, [key]: !settings[key] });
      setIsUpdating(false);
      // Show success message
      const element = document.createElement('div');
      element.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      element.textContent = 'Setting updated successfully!';
      document.body.appendChild(element);
      setTimeout(() => {
        document.body.removeChild(element);
      }, 3000);
    }, 500);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={24} style={{ color: '#374151' }} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>Account Settings</h1>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Profile Visibility</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Public Profile</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Allow others to see your profile</div>
              </div>
              <button
                onClick={() => handleToggleSetting('publicProfile')}
                disabled={isUpdating}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: settings.publicProfile ? '#10b981' : '#e5e7eb',
                  position: 'relative',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.publicProfile ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Show Earnings</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Display your earnings on profile</div>
              </div>
              <button
                onClick={() => handleToggleSetting('showEarnings')}
                disabled={isUpdating}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: settings.showEarnings ? '#10b981' : '#e5e7eb',
                  position: 'relative',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.showEarnings ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>
          </div>


        </div>

        {/* Security Status */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Security Status</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Last Password Change</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {securityStats.lastPasswordChange}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Active Sessions</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {securityStats.loginSessions}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Suspicious Activity</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: securityStats.suspiciousActivity > 0 ? '#dc2626' : '#10b981' }}>
                {securityStats.suspiciousActivity === 0 ? 'None detected' : `${securityStats.suspiciousActivity} incidents`}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Account Security</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '500', fontSize: '14px' }}>Two-Factor Authentication</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Add extra security to your account</div>
            </div>
            <button
              onClick={() => handleToggleSetting('twoFactorEnabled')}
              disabled={isUpdating}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                background: settings.twoFactorEnabled ? '#10b981' : '#e5e7eb',
                position: 'relative',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                opacity: isUpdating ? 0.6 : 1
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: settings.twoFactorEnabled ? '22px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Danger Zone</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0' }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
          </div>
          
          {!showDeleteConfirm ? (
            <button
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </button>
          ) : (
            <div style={{ border: '2px solid #ef4444', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', margin: '0 0 12px 0' }}>
                ⚠️ Confirm Account Deletion
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
                This action cannot be undone. This will permanently delete your account and all associated data.
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
                Type <strong>"delete my account"</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type: delete my account"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '16px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isUpdating || deleteConfirmText.toLowerCase() !== 'delete my account'}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: deleteConfirmText.toLowerCase() === 'delete my account' ? '#dc2626' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: deleteConfirmText.toLowerCase() === 'delete my account' && !isUpdating ? 'pointer' : 'not-allowed',
                    fontWeight: '500'
                  }}
                >
                  {isUpdating ? 'Processing...' : 'Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailEnabled: true,
    predictionUpdates: true,
    winLossAlerts: true,
    clubActivity: true,
    socialInteractions: false,
    marketingEmails: false,
    weeklyDigest: true
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');

  // Check notification permission on mount
  React.useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        // Show success message
        showSuccessMessage('Notifications enabled successfully!');
      } else {
        showSuccessMessage('You can enable notifications in your browser settings later.');
      }
    }
  };

  const showSuccessMessage = (message: string) => {
    const element = document.createElement('div');
    element.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
    }, 3000);
  };

  const toggleNotification = async (key: keyof typeof notifications) => {
    // Handle push notification permission
    if (key === 'pushEnabled' && !notifications.pushEnabled && permissionStatus !== 'granted') {
      await requestNotificationPermission();
      if (permissionStatus !== 'granted') return;
    }

    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      setNotifications({ ...notifications, [key]: !notifications[key] });
      setIsUpdating(false);
      showSuccessMessage('Notification setting updated!');
    }, 500);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={24} style={{ color: '#374151' }} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>Notifications</h1>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Notification Status */}
        {permissionStatus !== 'granted' && (
          <div style={{
            background: 'rgba(255, 176, 32, 0.1)',
            border: '1px solid rgba(255, 176, 32, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: '#ffb020',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>!</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#b45309', margin: '0 0 4px 0' }}>
                  Enable Browser Notifications
                </h4>
                <p style={{ fontSize: '12px', color: '#b45309', margin: 0 }}>
                  {permissionStatus === 'denied' 
                    ? 'Notifications are blocked. You can enable them in your browser settings.'
                    : 'Click to enable push notifications for real-time updates.'}
                </p>
              </div>
              {permissionStatus === 'default' && (
                <button
                  onClick={requestNotificationPermission}
                  style={{
                    padding: '6px 12px',
                    background: '#ffb020',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>General</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Push Notifications</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Receive notifications on your device</div>
              </div>
              <button
                onClick={() => toggleNotification('pushEnabled')}
                disabled={isUpdating}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: notifications.pushEnabled ? '#10b981' : '#e5e7eb',
                  position: 'relative',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: notifications.pushEnabled ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Email Notifications</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Receive notifications via email</div>
              </div>
              <button
                onClick={() => toggleNotification('emailEnabled')}
                disabled={isUpdating}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: notifications.emailEnabled ? '#10b981' : '#e5e7eb',
                  position: 'relative',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: notifications.emailEnabled ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Prediction Alerts</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Win/Loss Alerts</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Get notified when predictions resolve</div>
              </div>
              <button
                onClick={() => toggleNotification('winLossAlerts')}
                disabled={isUpdating}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: notifications.winLossAlerts ? '#10b981' : '#e5e7eb',
                  position: 'relative',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: notifications.winLossAlerts ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Club Activity</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Activity from clubs you've joined</div>
              </div>
              <button
                onClick={() => toggleNotification('clubActivity')}
                disabled={isUpdating}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: notifications.clubActivity ? '#10b981' : '#e5e7eb',
                  position: 'relative',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: notifications.clubActivity ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SecuritySettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [securityStats, setSecurityStats] = useState({
    lastPasswordChange: '3 months ago',
    loginSessions: 1,
    suspiciousActivity: 0
  });

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }
    
    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      alert('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setIsUpdating(false);
      setSecurityStats({ ...securityStats, lastPasswordChange: 'Just now' });
    }, 2000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={24} style={{ color: '#374151' }} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>Security & Privacy</h1>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Password & Authentication</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lock size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Change Password</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>

            {/* Password Change Form */}
            {showPasswordForm && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', margin: '0 0 12px 0' }}>
                  Change Password
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="password"
                    placeholder="New Password (min 8 characters)"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '14px'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasswordChange}
                      disabled={isUpdating || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: isUpdating || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isUpdating || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        fontSize: '14px'
                      }}
                    >
                      {isUpdating ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => alert('Two-factor authentication setup will be available in the next update!')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Two-Factor Authentication</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Privacy Controls</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => alert('Privacy settings will be available soon')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Profile Privacy</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => alert('Data management features coming soon')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Data & Privacy</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Login Activity</h3>
          
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
            Recent login activity and device management
          </div>
          
          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: '500', fontSize: '14px' }}>Current Device</span>
              <span style={{ fontSize: '12px', color: '#10b981' }}>Active Now</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              MacBook Pro • Chrome • Gainesville, GA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HelpSupport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={24} style={{ color: '#374151' }} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>Help & Support</h1>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Get Help</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => window.open('https://help.fanclubz.com/faq', '_blank') || alert('FAQ section will open in a new window')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HelpCircle size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Frequently Asked Questions</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => window.open('mailto:support@fanclubz.com')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Contact Support</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => alert('Live chat will be available 24/7 starting next week!')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MessageCircle size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Live Chat</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Resources</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => window.open('/terms', '_blank') || alert('Terms of Service will open in a new window')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Terms of Service</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => window.open('/privacy', '_blank') || alert('Privacy Policy will open in a new window')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Privacy Policy</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px',
                background: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => window.open('/community-guidelines', '_blank') || alert('Community Guidelines will open in a new window')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Heart size={20} style={{ color: '#6b7280' }} />
                <span style={{ fontWeight: '500' }}>Community Guidelines</span>
              </div>
              <ChevronRight size={16} style={{ color: '#9ca3af' }} />
            </button>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>App Information</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>App Version</span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>v2.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Build Number</span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>2024.07.30</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Last Updated</span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>July 30, 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateBack }) => {
  const { user, updateProfile, logout } = useAuthStore();
  const [activeSection, setActiveSection] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    bio: user?.bio || ''
  });

  // Mock user stats
  const userStats = {
    totalEarnings: 15420,
    totalInvested: 12000,
    winRate: 68.5,
    activePredictions: 8,
    totalPredictions: 45,
    rank: 147,
    joinedDate: 'January 2024',
    level: 'Gold Predictor'
  };

  const menuItems = [
    {
      id: 'account',
      label: 'Account Settings',
      icon: Settings,
      description: 'Manage your account preferences',
      action: () => setActiveSection('account')
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Control your notification settings',
      action: () => setActiveSection('notifications')
    },
    {
      id: 'security',
      label: 'Security & Privacy',
      icon: Shield,
      description: 'Manage security settings',
      action: () => setActiveSection('security')
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      description: 'Get help and contact support',
      action: () => setActiveSection('help')
    }
  ];

  const achievements = [
    { id: 1, title: 'First Prediction', icon: '🎯', unlocked: true },
    { id: 2, title: 'Winning Streak', icon: '🔥', unlocked: true },
    { id: 3, title: 'Top Predictor', icon: '👑', unlocked: false },
    { id: 4, title: 'Community Leader', icon: '⭐', unlocked: false }
  ];

  const handleSaveProfile = () => {
    updateProfile({
      ...user,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      bio: editForm.bio
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      bio: user?.bio || ''
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      if (onNavigateBack) {
        onNavigateBack();
      }
    }
  };

  // Render different sections based on activeSection
  if (activeSection === 'account') {
    return <AccountSettings onBack={() => setActiveSection('overview')} />;
  }

  if (activeSection === 'notifications') {
    return <NotificationSettings onBack={() => setActiveSection('overview')} />;
  }

  if (activeSection === 'security') {
    return <SecuritySettings onBack={() => setActiveSection('overview')} />;
  }

  if (activeSection === 'help') {
    return <HelpSupport onBack={() => setActiveSection('overview')} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '20px' }}>
      {/* Header with Gradient Background */}
      <div style={{ position: 'relative', overflow: 'visible', zIndex: 1000 }}>
        <div 
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            minHeight: '300px',
            position: 'relative'
          }}
        >
          {/* Decorative elements */}
          <div 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(20px)'
            }}
          />
          <div 
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '30px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(15px)'
            }}
          />

          {/* Status bar space */}
          <div style={{ height: '44px' }} />
          
          {/* Header content with back button - Fixed positioning and spacing */}
          <div style={{ padding: '20px 16px', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {onNavigateBack && (
                  <button 
                    onClick={onNavigateBack}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <ArrowLeft size={20} style={{ color: 'white' }} />
                  </button>
                )}
                <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '700', margin: 0 }}>Profile</h1>
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {isEditing ? <X size={20} style={{ color: 'white' }} /> : <Edit3 size={20} style={{ color: 'white' }} />}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Card - Fixed positioning and z-index */}
        <div 
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '16px',
            right: '16px',
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minHeight: '180px'
          }}
        >
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div 
                      style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '4px solid white'
                      }}
                    >
                      <span style={{ color: 'white', fontSize: '28px', fontWeight: '700' }}>
                        {(editForm.firstName?.charAt(0) || editForm.email?.charAt(0) || 'U').toUpperCase()}
                      </span>
                    </div>
                    <button 
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        width: '28px',
                        height: '28px',
                        background: '#10b981',
                        border: '2px solid white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Camera size={12} style={{ color: 'white' }} />
                    </button>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#10b981'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#10b981'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '13px',
                        marginBottom: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#10b981'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <textarea
                      placeholder="Bio (optional)"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '13px',
                        resize: 'none',
                        height: '50px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#10b981'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '8px 16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="viewing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div 
                      style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '4px solid white'
                      }}
                    >
                      <span style={{ color: 'white', fontSize: '28px', fontWeight: '700' }}>
                        {(user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '4px', margin: 0, lineHeight: '1.2' }}>
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user?.email?.split('@')[0] || 'User'
                      }
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px', margin: '4px 0', lineHeight: '1.3' }}>
                      {user?.email || 'No email provided'}
                    </p>
                    {user?.bio && (
                      <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0', lineHeight: '1.3' }}>
                        {user.bio}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <Star size={14} style={{ color: '#fbbf24' }} />
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                        Rank #{userStats.rank} • {userStats.level}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                      {userStats.totalPredictions}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Predictions</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                      {userStats.winRate}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Win Rate</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                      ₦{(userStats.totalEarnings - userStats.totalInvested).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Net Profit</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content - Fixed spacing to account for profile card */}
      <div style={{ paddingTop: '140px', padding: '140px 24px 0 24px' }}>
        {/* Performance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Performance Overview
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <DollarSign size={20} style={{ color: '#10b981' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                  ₦{userStats.totalEarnings.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Earnings</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <TrendingUp size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                  {userStats.activePredictions}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Active</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Achievements
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: achievement.unlocked ? 'rgba(16, 185, 129, 0.05)' : '#f9fafb',
                  opacity: achievement.unlocked ? 1 : 0.6
                }}
              >
                <div style={{ fontSize: '20px', flexShrink: 0 }}>{achievement.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {achievement.title}
                  </div>
                </div>
                {achievement.unlocked && (
                  <div style={{ flexShrink: 0 }}>
                    <Trophy size={16} style={{ color: '#10b981' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Settings Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Settings
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background-color 0.2s',
                    borderBottom: index < menuItems.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={item.action}
                >
                  <div 
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(107, 114, 128, 0.1)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={20} style={{ color: '#6b7280' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px' }}>
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: '#9ca3af', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Account Information
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Email</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {user?.email || 'Not provided'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Member Since</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {userStats.joinedDate}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Account Status</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#10b981' }}>
                Active
              </span>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '20px',
            transition: 'background-color 0.2s'
          }}
          onClick={handleLogout}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </motion.button>
      </div>
    </div>
  );
};

export default ProfilePage;