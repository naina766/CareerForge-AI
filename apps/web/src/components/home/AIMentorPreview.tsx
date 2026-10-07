'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bot,
  User,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';

export function AIMentorPreview() {
  return (
    <section className="py-16 md:py-24 border-t border-slate-800/80 bg-[#090d16]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
              Grounded Career Guidance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              An assistant that actually understands your profile.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Generic chatbots provide generic career advice. CareerForge AI Mentor is anchored directly in your verified resume chunks, identified skill gaps, and active role benchmarks with verified source citations.
            </p>
          </div>

          <Link href="/dashboard/career-assistant" className="shrink-0">
            <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Career Mentor
            </Button>
          </Link>
        </div>

        {/* Integrated Product Workspace (Context Drawer + Conversation) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0d121f] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Left: Active Candidate Context Panel (4 cols) */}
          <div className="lg:col-span-4 bg-[#090d16] border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-semibold text-white uppercase font-mono tracking-wider text-[11px]">
                Active Profile Context
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Target Position</span>
                <span className="font-bold text-white">Senior Backend Engineer</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Verified Skills</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Node.js', 'PostgreSQL', 'TypeScript', 'Docker'].map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Primary Gap</span>
                <span className="font-medium text-amber-400">System Design & Kafka Streams</span>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Data Source</span>
                <span className="font-mono text-slate-300 text-[11px]">resume_chunks.faiss (384-dim)</span>
              </div>
            </div>
          </div>

          {/* Right: Grounded Conversation Thread (8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* User Question */}
              <div className="flex items-start gap-3 justify-end">
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3.5 max-w-lg text-xs text-white">
                  What specific distributed systems concepts should I focus on for my Senior Backend interviews?
                </div>
                <div className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Mentor Answer with Citations */}
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>

                <div className="bg-[#090d16] border border-slate-800 rounded-xl p-4 sm:p-5 max-w-2xl space-y-3 text-xs leading-relaxed">
                  <p className="text-slate-200">
                    Based on your verified experience with high-throughput PostgreSQL and REST microservices{' '}
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      [Doc 1: CloudScale Experience]
                    </span>
                    , I recommend focusing on these two critical gaps for your target role:
                  </p>

                  <div className="space-y-2 pl-2 border-l-2 border-slate-800">
                    <div>
                      <strong className="text-white">1. Event Streaming & Consensus:</strong> Master Apache Kafka partitioning, offset commits, and consumer rebalancing.
                    </div>
                    <div>
                      <strong className="text-white">2. Distributed Cache Invalidation:</strong> Cache-aside vs write-through patterns in Redis, mitigating thundering herds.
                    </div>
                  </div>

                  {/* Grounded Citation Footer */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Grounded in candidate resume & role requirements
                    </span>
                    <span className="font-mono text-slate-500">FastAPI LangGraph RAG</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested Follow-up Actions */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500">Suggested Action:</span>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-[#090d16] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
              >
                Draft 2-week Kafka study roadmap
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-[#090d16] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
              >
                Compare against Staff Engineer expectations
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
