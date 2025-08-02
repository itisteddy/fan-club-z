import React from 'react';
import useNotificationStore from '../../store/notificationStore';
import Notification from './Notification';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <>
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
          show={true}
        />
      ))}
    </>
  );
};

export default NotificationContainer; 