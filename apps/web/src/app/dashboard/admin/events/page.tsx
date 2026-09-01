'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCw,
  Search,
  ShieldAlert,
  Code,
  X,
} from 'lucide-react';
import {
  EventStatsResponse,
  OutboxEventItem,
  DeadLetterEventItem,
} from '@careerforge/types';

export default function AdminEventsDashboardPage() {
  const [stats, setStats] = useState<EventStatsResponse | null>(null);
  const [events, setEvents] = useState<OutboxEventItem[]>([]);
  const [dlqItems, setDlqItems] = useState<DeadLetterEventItem[]>([]);
  const [activeTab, setActiveTab] = useState<'outbox' | 'dlq'>('outbox');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchStats();
    fetchEvents();
    fetchDLQ();
  }, [selectedStatus, selectedTopic]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/v1/admin/events/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to load event stats:', err);
    }
  }

  async function fetchEvents() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedTopic !== 'ALL') params.append('topic', selectedTopic);
      if (searchQuery) params.append('eventType', searchQuery);

      const res = await fetch(`/api/v1/admin/events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDLQ() {
    try {
      const res = await fetch('/api/v1/admin/events/dlq', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDlqItems(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load DLQ items:', err);
    }
  }

  async function handleRetryDLQ(eventId: string) {
    try {
      setIsRetrying(eventId);
      const res = await fetch(`/api/v1/admin/events/dlq/${eventId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchStats();
        await fetchDLQ();
        if (selectedEvent?.eventId === eventId) {
          setSelectedEvent(null);
        }
      }
    } catch (err) {
      console.error('Failed to retry DLQ event:', err);
    } finally {
      setIsRetrying(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Published
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-950/70 border border-amber-800/80 text-amber-300 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> Outbox Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-rose-950/70 border border-rose-800/80 text-rose-300 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-full">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Kafka Event Stream & Outbox Observability
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
              Phase 17
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event backbone telemetry, transactional outbox status, and dead-letter queue (DLQ) controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStats();
              fetchEvents();
              fetchDLQ();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" /> Refresh Pipeline
          </button>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Published Events
          </div>
          <div className="text-2xl font-bold text-white">
            {stats?.totalPublished?.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Outbox Pending
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {stats?.totalPending?.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Processed (Idempotent)
          </div>
          <div className="text-2xl font-bold text-indigo-300">
            {stats?.totalProcessed?.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Failed Outbox
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {stats?.totalFailed?.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> DLQ Dead Letters
          </div>
          <div className="text-2xl font-bold text-red-400">
            {stats?.totalDlq?.toLocaleString() ?? dlqItems.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('outbox')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'outbox'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Outbox Event Pipeline ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('dlq')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'dlq'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Dead Letter Queue (DLQ) ({dlqItems.length})
        </button>
      </div>

      {/* Outbox Event Stream Table */}
      {activeTab === 'outbox' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
                placeholder="Search event type (e.g. resume.uploaded, match.completed)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Topics</option>
              <option value="careerforge.resume">careerforge.resume</option>
              <option value="careerforge.matching">careerforge.matching</option>
              <option value="careerforge.skill-gap">careerforge.skill-gap</option>
              <option value="careerforge.learning-path">careerforge.learning-path</option>
              <option value="careerforge.application">careerforge.application</option>
              <option value="careerforge.recommendation">careerforge.recommendation</option>
              <option value="careerforge.notification">careerforge.notification</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Event Type</th>
                    <th className="p-3.5">Topic</th>
                    <th className="p-3.5">Aggregate</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Attempts</th>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Loading event stream...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No events found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-3.5 font-semibold text-indigo-300 font-mono">
                          {ev.eventType}
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">{ev.topic}</td>
                        <td className="p-3.5 text-slate-300">
                          {ev.aggregateType} <span className="text-[10px] text-slate-500">({ev.aggregateId.slice(0, 8)})</span>
                        </td>
                        <td className="p-3.5">{getStatusBadge(ev.status)}</td>
                        <td className="p-3.5 text-slate-400">{ev.attempts} / {ev.maxAttempts}</td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {new Date(ev.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedEvent(ev)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Dead Letter Queue (DLQ) Feed */}
      {activeTab === 'dlq' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Event ID</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Target Topic</th>
                  <th className="p-3.5">Consumer Group</th>
                  <th className="p-3.5">Error Reason</th>
                  <th className="p-3.5">Failed At</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dlqItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      🎉 Dead Letter Queue is clean! No failed unrecoverable events.
                    </td>
                  </tr>
                ) : (
                  dlqItems.map((dlq) => (
                    <tr key={dlq.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">{dlq.eventId.slice(0, 12)}</td>
                      <td className="p-3.5 font-semibold text-rose-300 font-mono">{dlq.eventType}</td>
                      <td className="p-3.5 text-slate-400">{dlq.topic}</td>
                      <td className="p-3.5 text-slate-400">{dlq.consumerGroup || 'N/A'}</td>
                      <td className="p-3.5 text-rose-400 max-w-xs truncate">{dlq.error}</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{new Date(dlq.failedAt).toLocaleString()}</td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedEvent(dlq)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => handleRetryDLQ(dlq.eventId)}
                          disabled={isRetrying === dlq.eventId}
                          className="px-2.5 py-1 rounded bg-red-600/80 hover:bg-red-500 text-white text-[11px] font-semibold disabled:opacity-50"
                        >
                          {isRetrying === dlq.eventId ? 'Re-queuing...' : 'Retry'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-Out Event Payload Inspector Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Event Payload Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Event ID:</span>
                <span className="font-mono text-slate-200">{selectedEvent.eventId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Event Type:</span>
                <span className="font-mono font-semibold text-indigo-300">{selectedEvent.eventType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Topic:</span>
                <span className="font-mono text-slate-200">{selectedEvent.topic}</span>
              </div>
              {selectedEvent.aggregateType && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Aggregate:</span>
                  <span className="text-slate-200">{selectedEvent.aggregateType} ({selectedEvent.aggregateId})</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">JSON Payload:</div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(selectedEvent.payload, null, 2)}
              </pre>
            </div>

            {selectedEvent.error && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-rose-400">Failure Reason & Stack Trace:</div>
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-[11px] text-rose-300 font-mono whitespace-pre-wrap">
                  {selectedEvent.error}
                  {selectedEvent.stackTrace && `\n\n${selectedEvent.stackTrace}`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
