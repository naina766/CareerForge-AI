'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Zap,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Search,
  Code,
  X,
  Cpu,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { SystemHealthResponse, ObservabilitySummary } from '@careerforge/types';

export default function AdminObservabilityDashboard() {
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [workers, setWorkers] = useState<any | null>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [selectedError, setSelectedError] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorSearch, setErrorSearch] = useState<string>('');

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [summaryRes, healthRes, metricsRes, workersRes, errorsRes] = await Promise.all([
        fetch('/api/v1/admin/system-status'),
        fetch('/api/v1/admin/health'),
        fetch('/api/v1/admin/metrics'),
        fetch('/api/v1/admin/workers'),
        fetch('/api/v1/admin/errors'),
      ]);

      if (summaryRes.ok) {
        const json = await summaryRes.json();
        setSummary(json.data);
      }
      if (healthRes.ok) {
        const json = await healthRes.json();
        setHealth(json.data);
      }
      if (metricsRes.ok) {
        const json = await metricsRes.json();
        setMetrics(json.data);
      }
      if (workersRes.ok) {
        const json = await workersRes.json();
        setWorkers(json.data);
      }
      if (errorsRes.ok) {
        const json = await errorsRes.json();
        setErrors(json.data || []);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Healthy
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Degraded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Unhealthy
          </span>
        );
    }
  };

  const filteredErrors = errors.filter((err) => {
    if (!errorSearch) return true;
    const q = errorSearch.toLowerCase();
    return (
      err.error?.toLowerCase().includes(q) ||
      err.source?.toLowerCase().includes(q) ||
      err.eventId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-slate-950">
                <Activity className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">System Observability & Reliability</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold">
                Phase 18 Live
              </span>
              {isLoading && (
                <span className="flex items-center gap-1 text-xs text-teal-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Real-time telemetry, service health matrix, API latency percentiles, Kafka pipeline health, and distributed error tracing.
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm shrink-0"
          >
            <RefreshCw className={`w-4 h-4 text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>

        {/* Top KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Requests</span>
              <Server className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? summary.totalRequests.toLocaleString() : '—'}
            </div>
            <div className="text-[11px] text-teal-400/80 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-teal-400" /> Express REST API
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">System Error Rate</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? `${summary.errorRate}%` : '0%'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">HTTP 4xx / 5xx error percentage</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Latency (Avg / P95)</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? `${summary.avgLatencyMs}ms / ${summary.p95LatencyMs}ms` : '—'}
            </div>
            <div className="text-[11px] text-cyan-400/80 mt-1">Global endpoint execution duration</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Kafka Events / DLQ</span>
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? `${summary.kafkaEventsTotal} / ${summary.dlqTotal}` : '—'}
            </div>
            <div className="text-[11px] text-purple-400/80 mt-1">Domain events & DLQ isolations</div>
          </div>
        </div>

        {/* Service Health Matrix Grid */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-semibold text-white">Multi-Service Health Matrix</h2>
            </div>
            {health && getStatusBadge(health.status)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {health &&
              Object.entries(health.services).map(([key, svc]: [string, any]) => (
                <div
                  key={key}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase text-slate-300">
                      {svc.service}
                    </span>
                    {getStatusBadge(svc.status)}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mb-2">{svc.message}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-900">
                    <span>Latency:</span>
                    <span className="font-mono text-slate-300">{svc.latencyMs}ms</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Worker Performance & Latency Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Worker Performance */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Background Worker Telemetry</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 font-medium">Worker Name</th>
                      <th className="pb-3 font-medium">Executions</th>
                      <th className="pb-3 font-medium">Success</th>
                      <th className="pb-3 font-medium">Error Rate</th>
                      <th className="pb-3 font-medium">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {workers?.stats?.map((w: any) => (
                      <tr key={w.workerName} className="hover:bg-slate-800/30">
                        <td className="py-3 font-semibold text-white font-mono">{w.workerName}</td>
                        <td className="py-3">{w.totalExecutions}</td>
                        <td className="py-3 text-emerald-400">{w.successCount}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              w.errorRate > 5 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {w.errorRate}%
                          </span>
                        </td>
                        <td className="py-3 font-mono">{w.avgDurationMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* API Latency Stats */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <BarChart3 className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-semibold text-white">Route Latency Distribution (P95)</h2>
              </div>
              <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 font-medium">Endpoint</th>
                      <th className="pb-3 font-medium">Count</th>
                      <th className="pb-3 font-medium">Avg</th>
                      <th className="pb-3 font-medium">P50</th>
                      <th className="pb-3 font-medium">P95</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {metrics?.routes?.slice(0, 8).map((r: any) => (
                      <tr key={`${r.method}-${r.route}`} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-mono text-slate-200">
                          <span className="text-teal-400 mr-1.5 font-semibold">{r.method}</span>
                          {r.route}
                        </td>
                        <td className="py-2.5">{r.count}</td>
                        <td className="py-2.5 font-mono">{r.avgLatencyMs}ms</td>
                        <td className="py-2.5 font-mono text-slate-400">{r.p50LatencyMs}ms</td>
                        <td className="py-2.5 font-mono text-teal-300 font-semibold">{r.p95LatencyMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Centralized Error Explorer */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Centralized Error Explorer</h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search errors or event IDs..."
                value={errorSearch}
                onChange={(e) => setErrorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredErrors.length === 0 ? (
              <div className="p-10 text-center text-slate-500 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-slate-300">No active system errors</p>
                <p className="text-xs text-slate-500 mt-1">All Kafka consumers and workers are operating cleanly.</p>
              </div>
            ) : (
              filteredErrors.map((err) => (
                <div
                  key={err.id}
                  onClick={() => setSelectedError(err)}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {err.source}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{err.error}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Event: {err.eventId} ({err.eventType})
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(err.occurredAt).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-teal-400 hover:underline">Inspect →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Error Inspector Drawer */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-rose-400" />
                <h3 className="font-semibold text-base text-white">Error Trace Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Error Message</span>
                <p className="text-sm font-mono text-rose-300 mt-1 bg-slate-950 p-3 rounded-xl border border-rose-900/30">
                  {selectedError.error}
                </p>
              </div>

              {selectedError.stackTrace && (
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Stack Trace</span>
                  <pre className="text-[11px] font-mono text-slate-300 mt-1 bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {selectedError.stackTrace}
                  </pre>
                </div>
              )}

              {selectedError.metadata && (
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Event Metadata</span>
                  <pre className="text-[11px] font-mono text-teal-300 mt-1 bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
