import { useToast } from '@chakra-ui/react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    NotificationRecord,
    useNotificationService,
} from '../hooks/useNotificationService';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: NotificationRecord[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  refresh: () => Promise<NotificationRecord[]>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();
  const { user } = useAuth();
  const { connect, disconnect, fetchNotifications, markAsRead: serviceMarkAsRead, markAllAsRead: serviceMarkAllAsRead } =
    useNotificationService();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const realtimeErrorToastShownRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setError(null);
      setIsRealtimeConnected(false);
      return [];
    }

    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Failed to load notifications', err);
      setError('Unable to load notifications');
      toast({
        title: 'Notifications unavailable',
        description: 'We could not load your notifications. Please try again shortly.',
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [fetchNotifications, toast, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) {
      disconnect();
      setIsRealtimeConnected(false);
      return () => {
        realtimeErrorToastShownRef.current = false;
      };
    }

    let isMounted = true;

    const cleanup = connect({
      onConnect: () => {
        if (!isMounted) {
          return;
        }
        realtimeErrorToastShownRef.current = false;
        setIsRealtimeConnected(true);
      },
      onDisconnect: () => {
        if (!isMounted) {
          return;
        }
        setIsRealtimeConnected(false);
      },
      onNotification: (notification) => {
        if (!isMounted) {
          return;
        }
        setNotifications((previous) => {
          const withoutDuplicate = previous.filter((item) => item.id !== notification.id);
          return [notification, ...withoutDuplicate];
        });
        toast({
          title: notification.title,
          description: notification.message,
          status: 'info',
          duration: 6000,
          isClosable: true,
        });
      },
      onError: (socketError) => {
        console.error('Notification socket error', socketError);
        if (!isMounted) {
          return;
        }
        setIsRealtimeConnected(false);
        if (!realtimeErrorToastShownRef.current) {
          toast({
            title: 'Real-time connection lost',
            description: 'We will keep retrying in the background.',
            status: 'warning',
            duration: 6000,
            isClosable: true,
          });
          realtimeErrorToastShownRef.current = true;
        }
      },
    });

    return () => {
      isMounted = false;
      realtimeErrorToastShownRef.current = false;
      cleanup?.();
    };
  }, [connect, disconnect, toast, user]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) {
        return;
      }

      try {
        const updated = await serviceMarkAsRead(notificationId);
        if (updated) {
          setNotifications((previous) =>
            previous.map((notification) =>
              notification.id === updated.id ? { ...notification, read: true } : notification,
            ),
          );
        }
      } catch (err) {
        console.error('Failed to mark notification as read', err);
        toast({
          title: 'Unable to update notification',
          description: 'Please try again in a moment.',
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
        throw err;
      }
    },
    [serviceMarkAsRead, toast, user],
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      await serviceMarkAllAsRead();
      setNotifications((previous) => previous.map((notification) => ({ ...notification, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
      toast({
        title: 'Unable to update notifications',
        description: 'Please try again in a moment.',
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
      throw err;
    }
  }, [serviceMarkAllAsRead, toast, user]);

  const contextValue = useMemo<NotificationContextValue>(() => {
    const unreadCount = notifications.reduce((count, notification) => (notification.read ? count : count + 1), 0);

    return {
      notifications,
      unreadCount,
      isLoading,
      error,
      isRealtimeConnected,
      refresh,
      markAsRead: markNotificationAsRead,
      markAllAsRead: markAllNotificationsAsRead,
    };
  }, [error, isLoading, isRealtimeConnected, markAllNotificationsAsRead, markNotificationAsRead, notifications, refresh]);

  return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};
