import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface ConnectHandlers {
  onNotification?: (notification: NotificationRecord) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

const normalizeNotification = (input: any): NotificationRecord => {
  const createdAtValue = (() => {
    if (input?.createdAt instanceof Date) {
      return input.createdAt.toISOString();
    }
    if (typeof input?.createdAt === 'string') {
      const parsed = new Date(input.createdAt);
      return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
    if (typeof input?.createdAt === 'number') {
      const parsed = new Date(input.createdAt);
      return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
    return new Date().toISOString();
  })();

  return {
    id:
      typeof input?.id === 'string' && input.id.trim().length > 0
        ? input.id
        : String(input?.id ?? `notification-${Date.now()}`),
    title: typeof input?.title === 'string' ? input.title : 'Notification',
    message: typeof input?.message === 'string' ? input.message : '',
    read: Boolean(input?.read),
    createdAt: createdAtValue,
  };
};

const buildNamespaceUrl = () => {
  try {
    return new URL(API_ENDPOINTS.NOTIFICATIONS, API_BASE_URL).toString();
  } catch (error) {
    console.error('Failed to build notification namespace URL', error);
    return `${API_BASE_URL.replace(/\/$/, '')}${API_ENDPOINTS.NOTIFICATIONS}`;
  }
};

type DisconnectFn = () => void;

export const useNotificationService = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const namespaceUrlRef = useRef<string>(buildNamespaceUrl());

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (handlers: ConnectHandlers = {}): DisconnectFn | undefined => {
      if (!user) {
        disconnect();
        return undefined;
      }

      disconnect();

      const token = localStorage.getItem('token');
      const socket = io(namespaceUrlRef.current, {
        transports: ['websocket'],
        auth: {
          userId: user.id,
          token: token ?? undefined,
        },
        withCredentials: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        handlers.onConnect?.();
      });

      socket.on('disconnect', () => {
        handlers.onDisconnect?.();
      });

      socket.on('notification', (payload: unknown) => {
        handlers.onNotification?.(normalizeNotification(payload));
      });

      socket.on('error', (error: Error) => {
        handlers.onError?.(error);
      });

      socket.on('connect_error', (error: Error) => {
        handlers.onError?.(error);
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('notification');
        socket.off('error');
        socket.off('connect_error');
        socket.disconnect();
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
      };
    },
    [disconnect, user],
  );

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const fetchNotifications = useCallback(async (): Promise<NotificationRecord[]> => {
    if (!user) {
      return [];
    }

    const response = await apiClient.get<unknown[]>(API_ENDPOINTS.NOTIFICATIONS);
    return Array.isArray(response.data)
      ? response.data.map((notification) => normalizeNotification(notification))
      : [];
  }, [user]);

  const markAsRead = useCallback(
    async (notificationId: string): Promise<NotificationRecord | null> => {
      if (!user) {
        return null;
      }

      const response = await apiClient.post<unknown>(
        API_ENDPOINTS.NOTIFICATIONS + `/${notificationId}/read`,
      );
      return normalizeNotification(response.data);
    },
    [user],
  );

  const markAllAsRead = useCallback(
    async (): Promise<number | null> => {
      if (!user) {
        return null;
      }

      const response = await apiClient.post<{ count?: number }>(
        API_ENDPOINTS.NOTIFICATIONS + '/read-all',
      );
      const count = response.data?.count;
      return typeof count === 'number' ? count : null;
    },
    [user],
  );

  return {
    connect,
    disconnect,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};