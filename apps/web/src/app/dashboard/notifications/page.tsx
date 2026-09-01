'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  Trash2,
  Settings,
  Sparkles,
  Briefcase,
  Layers,
  BookOpen,
  Sliders,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
  X,
} from 'lucide-react';
import { NotificationItem, NotificationPreference } from '@careerforge/types';

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'APPLICATIONS' | 'JOBS' | 'LEARNING'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/notifications');
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

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/v1/notifications/preferences');
      if (res.ok) {
        const json = await res.json();
        setPreferences(json.data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' as const } : n))
      );
    } catch {
      // Non-blocking
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' as const })));
    } catch {
      // Non-blocking
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/v1/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchNotifications: preferences.matchNotifications,
          skillGapNotifications: preferences.skillGapNotifications,
          learningNotifications: preferences.learningNotifications,
          applicationNotifications: preferences.applicationNotifications,
          recommendationNotifications: preferences.recommendationNotifications,
          inAppNotifications: preferences.inAppNotifications,
          emailNotifications: preferences.emailNotifications,
        }),
      });
      if (res.ok) {
        setIsPrefModalOpen(false);
      }
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
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors mt-2"
          >
            View Learning Path <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        );
      }
      return (
        <Link
          href={`/jobs/${meta.jobId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors mt-2"
        >
          View Match Report <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      );
    }
    if (item.type === 'JOB_RECOMMENDED') {
      return (
        <Link
          href="/dashboard/recommendations"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors mt-2"
        >
          View Recommendations <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      );
    }
    if (meta?.applicationId) {
      return (
        <Link
          href={`/dashboard/applications/${meta.applicationId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors mt-2"
        >
          View Application <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      );
    }
    return null;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'MATCH_COMPLETED':
        return <Sparkles className="w-5 h-5 text-teal-400" />;
      case 'JOB_RECOMMENDED':
        return <Briefcase className="w-5 h-5 text-cyan-400" />;
      case 'SKILL_GAP_UPDATED':
      case 'LEARNING_PATH_UPDATED':
        return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case 'APPLICATION_STATUS_CHANGED':
        return <Layers className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">Notification Center</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Manage your real-time alerts, match reports, learning roadmap updates, and preferences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-400" /> Mark All as Read
              </button>
            )}
            <button
              onClick={() => setIsPrefModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <Sliders className="w-4 h-4 text-teal-400" /> Preferences
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 pb-4 overflow-x-auto no-scrollbar mb-6">
          {[
            { id: 'ALL', label: 'All Notifications' },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'JOBS', label: 'Match & Jobs' },
            { id: 'LEARNING', label: 'Learning & Gaps' },
            { id: 'APPLICATIONS', label: 'Applications' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-16 text-center text-slate-400 rounded-2xl bg-slate-900/40 border border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400 mb-3" />
              <p className="text-sm font-medium">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center text-slate-500 rounded-2xl bg-slate-900/40 border border-slate-800">
              <Bell className="w-12 h-12 mx-auto text-slate-700 mb-3 stroke-1" />
              <h3 className="text-base font-semibold text-slate-300 mb-1">No notifications found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                There are no notifications matching your selected filter. New alerts will appear here as domain events occur.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  item.status === 'UNREAD'
                    ? 'bg-slate-900/90 border-teal-500/30 shadow-lg shadow-teal-950/20'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-85'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      {item.status === 'UNREAD' && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{item.message}</p>
                    {getActionLink(item)}
                    <span className="text-[11px] text-slate-500 mt-2 block">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'UNREAD' && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      className="p-2 rounded-lg bg-slate-950 hover:bg-teal-950/40 border border-slate-800 hover:border-teal-500/40 text-slate-400 hover:text-teal-300 transition-all text-xs"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item.id)}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all text-xs"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preferences Modal */}
      {isPrefModalOpen && preferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-base text-white">Notification Preferences</h3>
              </div>
              <button
                onClick={() => setIsPrefModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={savePreferences} className="mt-5 space-y-4">
              <div className="space-y-3">
                {[
                  { key: 'matchNotifications', label: 'Job Match Alerts', desc: 'Notify when match score is calculated' },
                  { key: 'skillGapNotifications', label: 'Skill Gap Updates', desc: 'Notify when new gaps or insights are found' },
                  { key: 'learningNotifications', label: 'Learning Roadmap Alerts', desc: 'Notify on curriculum additions' },
                  { key: 'applicationNotifications', label: 'Application Status Alerts', desc: 'Notify when application status changes' },
                  { key: 'recommendationNotifications', label: 'Job Recommendation Feed', desc: 'Notify when top matching jobs are found' },
                  { key: 'inAppNotifications', label: 'In-App Alerts', desc: 'Display alerts inside platform header' },
                ].map((pref) => (
                  <label
                    key={pref.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{pref.label}</div>
                      <div className="text-[11px] text-slate-400">{pref.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={(preferences as any)[pref.key]}
                      onChange={(e) =>
                        setPreferences({ ...preferences, [pref.key]: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-500"
                    />
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPrefModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrefs}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 transition-all shadow-md shadow-teal-500/20"
                >
                  {isSavingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
