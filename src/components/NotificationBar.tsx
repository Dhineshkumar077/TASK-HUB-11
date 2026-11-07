import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  ExternalLink,
  Trash2,
  CheckCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { NotificationItem } from '../types.ts';

interface NotificationBarProps {
  navigate: (path: string) => void;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({ navigate }) => {
  const { lastEvent } = useRealtime();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      // In guest/unauthenticated state, fail silently
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [lastEvent?.timestamp]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'WARNING':
      case 'ALERT':
        return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
        title="Dynamic Activity Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-mono font-bold text-white shadow-lg ring-2 ring-slate-950 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh] animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications
                </h3>
                <p className="text-[10px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread dynamic alert${unreadCount > 1 ? 's' : ''}` : 'Real-time activity feed'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-indigo-300 hover:bg-slate-800 flex items-center gap-1 transition cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  Read All
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List or Zero State */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[380px]">
            {notifications.length === 0 ? (
              /* STRICT ZERO DEFAULT RULE: Clean, empty state */
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 mx-auto flex items-center justify-center text-slate-600">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">No notifications yet</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                    Dynamic updates for your shift bookings, applications, escrow releases, and approvals will appear here in real time.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 hover:bg-slate-800/60 transition cursor-pointer flex items-start gap-3 relative ${
                    !notif.isRead ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs font-bold truncate ${
                          !notif.isRead ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <div className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1 pt-0.5">
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500">
              ⚡ Real-time synchronization active across all devices
            </div>
          )}
        </div>
      )}
    </div>
  );
};
