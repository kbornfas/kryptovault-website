import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export const useNotificationService = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!user) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    socketRef.current = io('http://localhost:3000/notifications', {
      auth: {
        userId: user.id,
      },
    });

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    socket.on('connect', () => {
      console.log('Connected to notification service');
    });

    socket.on('notification', (notification: Notification) => {
      // You can handle new notifications here, e.g., show a toast or update a notification list
      console.log('New notification:', notification);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from notification service');
    });

    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const getNotifications = async () => {
    try {
      const response = await fetch('http://localhost:3000/notifications', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:3000/notifications/read-all', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  return {
    getNotifications,
    markAsRead,
    markAllAsRead,
  };
};