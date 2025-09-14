import React from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import Notification from './Notification';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <>
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          type="info" // Default type for 2.0.77
          message={notification.message}
          duration={5000} // Default duration
          onClose={() => removeNotification(notification.id)}
          show={true}
        />
      ))}
    </>
  );
};

export default NotificationContainer; 