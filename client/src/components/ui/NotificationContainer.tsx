import React from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import Notification from './Notification';

const typeMap: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
  prediction_outcome: 'success',
  payout: 'success',
  comment: 'info',
  market_close: 'warning',
  like: 'info',
  follow: 'info',
  settlement_ready: 'warning',
  settlement_completed: 'success',
};

const NotificationContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <>
      {toasts.map((toast) => (
        <Notification
          key={toast.id}
          type={typeMap[toast.type] ?? 'info'}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
          show={true}
        />
      ))}
    </>
  );
};

export default NotificationContainer; 