'use client';

import React, { useState } from 'react';
import { GitCommit, Search, Clock, CheckCircle2, XCircle, ArrowRight, Layers } from 'lucide-react';
import { TraceTimeline } from '@careerforge/types';

export default function DistributedTraceExplorerPage() {
  const [searchId, setSearchId] = useState('trace_sample_event_123');
  const [trace, setTrace] = useState<TraceTimeline>({
    traceId: 'trace_sample_event_123',
    correlationId: 'corr_match_eval_998',
    requestId: 'req_881920',
    eventId: 'evt_match_completed_001',
    totalDurationMs: 245,
    status: 'SUCCESS',
    spans: [
      {
        spanId: 'span_1',
        name: 'HTTP POST /api/v1/jobs/match',
        service: 'careerforge-api',
        timestamp: '2026-09-02T12:00:00.000Z',
        durationMs: 45,
        status: 'SUCCESS',
        metadata: { statusCode: 200, candidateId: 'cand_123' },
      },
      {
        spanId: 'span_2',
        parentSpanId: 'span_1',
        name: 'FAISS Dense Vector Retrieval',
        service: 'ai-service',
        timestamp: '2026-09-02T12:00:00.045Z',
        durationMs: 38,
        status: 'SUCCESS',
        metadata: { topK: 20, indexDimension: 768 },
      },
      {
        spanId: 'span_3',
        parentSpanId: 'span_1',
        name: 'Kafka match.completed Publish',
        service: 'careerforge-api',
        timestamp: '2026-09-02T12:00:00.083Z',
        durationMs: 12,
        status: 'SUCCESS',
        metadata: { topic: 'match.events', partition: 0 },
      },
      {
        spanId: 'span_4',
        name: 'Worker Notification Dispatch',
        service: 'notification-worker',
        timestamp: '2026-09-02T12:00:00.095Z',
        durationMs: 150,
        status: 'SUCCESS',
        metadata: { channel: 'IN_APP', candidateId: 'cand_123' },
      },
    ],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId) return;
    // Set active trace
    setTrace((prev) => ({
      ...prev,
      traceId: searchId,
      correlationId: searchId,
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Distributed Trace Explorer</h1>
        </div>
        <p className="text-sm text-slate-400">
          End-to-end request lifecycle and cross-service event timeline across API, AI Service, Kafka, and Background Workers.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Search by Trace ID, Correlation ID, Request ID, or Event ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
        >
          Inspect Trace
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Trace Metadata Overview */}
      {trace && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Trace ID</span>
                <p className="text-sm font-mono font-bold text-white">{trace.traceId}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-500 block">Correlation ID</span>
                <span className="font-mono text-slate-300">{trace.correlationId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Latency</span>
                <span className="font-mono font-bold text-indigo-400">{trace.totalDurationMs} ms</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {trace.status}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Spans Visualization */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Span Lifecycle Timeline</h3>
            <div className="space-y-3">
              {trace.spans.map((span) => (
                <div
                  key={span.spanId}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {span.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{span.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-indigo-400 border border-slate-700">
                          {span.service}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Span: {span.spanId}</span>
                        {span.parentSpanId && <span>Parent: {span.parentSpanId}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono font-bold text-slate-200">{span.durationMs} ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
