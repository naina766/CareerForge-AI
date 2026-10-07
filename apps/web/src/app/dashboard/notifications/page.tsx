'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  Trash2,
  Target,
  Briefcase,
  Layers,
  BookOpen,
  Sliders,
  CheckCircle2,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { NotificationItem, NotificationPreference } from '@careerforge/types';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotificationCenterPage() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'APPLICATIONS' | 'JOBS' | 'LEARNING'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<NotificationItem[]>('/notifications');
      setNotifications(res.data || []);
    } catch {
      // Non-blocking fallback
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get<NotificationPreference>('/notifications/preferences');
      setPreferences(res.data);
    } catch {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [isAuthenticated]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' as const } : n))
      );
    } catch {
      // Non-blocking
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' as const })));
    } catch {
      // Non-blocking
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Non-blocking
    }
  };

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;
    setIsSavingPrefs(true);
    try {
      await api.patch('/notifications/preferences', {
        matchNotifications: preferences.matchNotifications,
        skillGapNotifications: preferences.skillGapNotifications,
        learningNotifications: preferences.learningNotifications,
        applicationNotifications: preferences.applicationNotifications,
        recommendationNotifications: preferences.recommendationNotifications,
        inAppNotifications: preferences.inAppNotifications,
        emailNotifications: preferences.emailNotifications,
      });
      setIsPrefModalOpen(false);
    } catch {
      // Non-blocking
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return item.status === 'UNREAD';
    if (activeTab === 'APPLICATIONS') return item.type === 'APPLICATION_STATUS_CHANGED';
    if (activeTab === 'JOBS') return item.type === 'MATCH_COMPLETED' || item.type === 'JOB_RECOMMENDED';
    if (activeTab === 'LEARNING') return item.type === 'SKILL_GAP_UPDATED' || item.type === 'LEARNING_PATH_UPDATED';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  const getActionLink = (item: NotificationItem) => {
    const meta = item.metadata as any;
    if (meta?.jobId) {
      if (item.type === 'SKILL_GAP_UPDATED' || item.type === 'LEARNING_PATH_UPDATED') {
        return (
          <Link
            href={`/jobs/${meta.jobId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors mt-1"
          >
            View Learning Path <ArrowUpRight className="w-3 h-3" />
          </Link>
        );
      }
      return (
        <Link
          href={`/jobs/${meta.jobId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors mt-1"
        >
          View Match Report <ArrowUpRight className="w-3 h-3" />
        </Link>
      );
    }
    if (item.type === 'JOB_RECOMMENDED') {
      return (
        <Link
          href="/dashboard/recommendations"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors mt-1"
        >
          View Recommendations <ArrowUpRight className="w-3 h-3" />
        </Link>
      );
    }
    if (meta?.applicationId) {
      return (
        <Link
          href={`/dashboard/applications/${meta.applicationId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors mt-1"
        >
          View Application <ArrowUpRight className="w-3 h-3" />
        </Link>
      );
    }
    return null;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'MATCH_COMPLETED':
        return <Target className="w-4 h-4 text-blue-400" />;
      case 'JOB_RECOMMENDED':
        return <Briefcase className="w-4 h-4 text-cyan-400" />;
      case 'SKILL_GAP_UPDATED':
      case 'LEARNING_PATH_UPDATED':
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case 'APPLICATION_STATUS_CHANGED':
        return <Layers className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <DashboardShell
      headerTitle="Notifications"
      headerDescription="Stay updated with match reports, interview stage updates, and career advice."
      actionButton={
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-300"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
            >
              Mark All as Read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrefModalOpen(true)}
            className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-300"
            leftIcon={<Sliders className="w-3.5 h-3.5 text-gray-400" />}
          >
            Preferences
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-w-5xl">
        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'JOBS', label: 'Match & Jobs' },
            { id: 'LEARNING', label: 'Learning & Gaps' },
            { id: 'APPLICATIONS', label: 'Applications' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30'
                  : 'bg-[#111827] border border-[#1f2937] text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All caught up!"
            description={
              activeTab !== 'ALL'
                ? 'No notifications in this filter category.'
                : 'You have no new alerts. Real-time updates on job matches and applications will appear here.'
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((item) => {
              const isUnread = item.status === 'UNREAD';
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-colors flex items-start gap-3.5 ${
                    isUnread
                      ? 'bg-[#111827] border-blue-500/30 shadow-sm'
                      : 'bg-[#0b0f19] border-[#1a2233] opacity-90'
                  }`}
                >
                  <div className="h-8 w-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-white truncate">
                        {item.title}
                      </h3>
                      <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed">
                      {item.message}
                    </p>

                    {getActionLink(item)}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 self-center">
                    {isUnread && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Mark as read"
                        aria-label="Mark notification as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(item.id)}
                      className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                      title="Delete"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {isPrefModalOpen && preferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]">
              <h3 className="text-sm font-bold text-white">Notification Preferences</h3>
              <button
                onClick={() => setIsPrefModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white"
                aria-label="Close preferences dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={savePreferences} className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0b0f19] border border-[#1a2233] cursor-pointer">
                <span className="text-gray-200">Job Match Notifications</span>
                <input
                  type="checkbox"
                  checked={preferences.matchNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, matchNotifications: e.target.checked })
                  }
                  className="rounded text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0b0f19] border border-[#1a2233] cursor-pointer">
                <span className="text-gray-200">Skill Gap & Learning Updates</span>
                <input
                  type="checkbox"
                  checked={preferences.skillGapNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, skillGapNotifications: e.target.checked })
                  }
                  className="rounded text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0b0f19] border border-[#1a2233] cursor-pointer">
                <span className="text-gray-200">Application Status Changes</span>
                <input
                  type="checkbox"
                  checked={preferences.applicationNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, applicationNotifications: e.target.checked })
                  }
                  className="rounded text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1f2937]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsPrefModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={isSavingPrefs} className="bg-blue-600 hover:bg-blue-500 text-white">
                  {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
