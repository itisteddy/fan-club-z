import React from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { ToastContainer } from '../notifications/ToastNotification';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  // Transform our notifications to match the ToastNotification format
  const toastNotifications = notifications.map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    duration: notification.duration
  }));

  return (
    <ToastContainer
      toasts={toastNotifications}
      onRemoveToast={removeNotification}
    />
  );
};

export default NotificationContainer;
