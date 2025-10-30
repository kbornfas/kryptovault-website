import { useNotifications } from '@/context/NotificationContext';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }
  return date.toLocaleString();
};

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isRealtimeConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const toggleOpen = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0) {
      return;
    }
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    } finally {
      setMarkingAll(false);
    }
  }, [markAllAsRead, unreadCount]);

  const handleNotificationClick = useCallback(
    async (notificationId: string, read: boolean) => {
      if (read) {
        return;
      }
      setPendingNotificationId(notificationId);
      try {
        await markAsRead(notificationId);
      } catch (error) {
        console.error('Failed to mark notification as read', error);
      } finally {
        setPendingNotificationId(null);
      }
    },
    [markAsRead],
  );

  const displayedNotifications = useMemo(() => notifications, [notifications]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex items-center justify-center rounded-full border border-purple-400/50 bg-purple-500/10 p-2 text-purple-100 transition hover:border-purple-300/70 hover:bg-purple-500/20"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-pink-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-3 w-80 max-w-xs rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="text-xs text-slate-400">
                {isRealtimeConnected ? 'Live updates enabled' : 'Reconnecting to live feed...'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || markingAll}
              className="inline-flex items-center gap-1 rounded-full border border-purple-400/50 px-3 py-1 text-xs font-semibold text-purple-200 transition hover:border-purple-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
            >
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Mark all
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading notifications...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                You are all caught up.
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {displayedNotifications.map((notification) => {
                  const isPending = pendingNotificationId === notification.id;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification.id, notification.read)}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                          notification.read
                            ? 'bg-transparent text-slate-300 hover:bg-slate-900'
                            : 'bg-slate-900/60 text-white hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                          <span className="font-semibold text-purple-200">{notification.title}</span>
                          <span className="text-[11px] text-slate-400">{formatTimestamp(notification.createdAt)}</span>
                        </div>
                        <p className="text-sm leading-snug text-slate-200">{notification.message}</p>
                        {!notification.read && (
                          <div className="flex items-center gap-2 pt-1 text-xs text-purple-300">
                            {isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Marking as read...
                              </>
                            ) : (
                              'Tap to mark as read'
                            )}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
