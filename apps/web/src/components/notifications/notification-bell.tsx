'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  Sparkles,
  Briefcase,
  Layers,
  ChevronRight,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { NotificationItem } from '@careerforge/types';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/v1/notifications/unread-count');
      if (res.ok) {
        const json = await res.json();
        setUnreadCount(json.data?.count || 0);
      }
    } catch {
      // Background poll failure is non-blocking
    }
  };

  const fetchRecentNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/notifications?limit=5');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchRecentNotifications();
    }
    setIsOpen(!isOpen);
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' as const } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Non-blocking
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' as const })));
      setUnreadCount(0);
    } catch {
      // Non-blocking
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'MATCH_COMPLETED':
        return <Sparkles className="w-4 h-4 text-teal-400" />;
      case 'JOB_RECOMMENDED':
        return <Briefcase className="w-4 h-4 text-cyan-400" />;
      case 'SKILL_GAP_UPDATED':
      case 'LEARNING_PATH_UPDATED':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'APPLICATION_STATUS_CHANGED':
        return <Layers className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-slate-300 hover:text-white transition-all focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-slate-950 shadow-lg shadow-teal-500/50 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-xs font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-slate-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/50">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto text-slate-700 mb-2 stroke-1" />
                <p className="text-xs font-medium">No new notifications</p>
                <p className="text-[11px] text-slate-600 mt-1">You are all caught up!</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.status === 'UNREAD' && markAsRead(item.id)}
                  className={`p-3.5 hover:bg-slate-900/60 transition-all cursor-pointer flex items-start gap-3 ${
                    item.status === 'UNREAD' ? 'bg-teal-950/10' : 'opacity-75'
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                      {item.status === 'UNREAD' && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{item.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/50">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium text-teal-400 hover:bg-teal-500/10 transition-colors"
            >
              Open Notification Center <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
