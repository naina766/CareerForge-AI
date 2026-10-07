'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';

export function SkillGapSection() {
  const [selectedView, setSelectedView] = useState<'dependency' | 'roadmap'>('dependency');

  const learningPhases = [
    {
      phase: 'Phase 1',
      title: 'Foundation & Baseline Validation',
      status: 'Completed',
      skills: ['TypeScript Generics', 'PostgreSQL Indexes', 'Docker Compose'],
      effort: 'Completed 2 weeks ago',
      isCurrent: false,
    },
    {
      phase: 'Phase 2',
      title: 'Core Systems & Distributed Caching',
      status: 'In Progress (65%)',
      skills: ['Redis Cluster Architecture', 'Rate Limiting Algorithms', 'Idempotent API Design'],
      effort: 'Estimated 8 hours remaining',
      isCurrent: true,
    },
    {
      phase: 'Phase 3',
      title: 'Event Streaming & Real-Time Ingestion',
      status: 'Next Up',
      skills: ['Apache Kafka Partitioning', 'Consumer Rebalancing', 'Schema Registry'],
      effort: 'Estimated 14 hours',
      isCurrent: false,
    },
    {
      phase: 'Phase 4',
      title: 'Enterprise Project & Architecture Defense',
      status: 'Target Milestone',
      skills: ['High-Throughput Matching Engine', 'Failover & Circuit Breakers', 'Load Testing'],
      effort: 'Interview Readiness Goal',
      isCurrent: false,
    },
  ];

  return (
    <section className="py-16 md:py-24 border-t border-slate-800/80 bg-[#090d16]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
              Skill Gap & Dependency Intelligence
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              From current abilities to target role mastery.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Stop guessing what to learn next. CareerForge structures a dependency graph between what you know today, the exact gaps standing between you and your target position, and the sequential roadmap to bridge them.
            </p>
          </div>

          {/* Toggle between Dependency View and Roadmap View */}
          <div className="flex items-center gap-1.5 bg-[#0d121f] p-1 rounded-xl border border-slate-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedView('dependency')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedView === 'dependency'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Skill Dependency Graph
            </button>
            <button
              type="button"
              onClick={() => setSelectedView('roadmap')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedView === 'roadmap'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4-Phase Learning Path
            </button>
          </div>
        </div>

        {/* Dynamic Display Area */}
        {selectedView === 'dependency' ? (
          /* Dependency Graph View */
          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
              <span className="font-semibold text-slate-300">
                Target Role Benchmark: Senior Backend & Systems Engineer
              </span>
              <span className="font-mono text-slate-400">78% Current Readiness</span>
            </div>

            {/* 3-Stage Vertical / Horizontal Dependency Hierarchy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Column 1: What do I know? */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold font-mono">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">What Do I Know?</h3>
                    <p className="text-[11px] text-slate-400">Verified from resume</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { name: 'Node.js & TypeScript', depth: '4 yrs exp' },
                    { name: 'PostgreSQL Relational DB', depth: '4 yrs exp' },
                    { name: 'REST & gRPC Microservices', depth: '3 yrs exp' },
                    { name: 'Docker Containerization', depth: '3 yrs exp' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#090d16] border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-200 font-medium">{item.name}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {item.depth}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: What am I missing? */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <span className="h-6 w-6 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-bold font-mono">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">What Am I Missing?</h3>
                    <p className="text-[11px] text-slate-400">Target role prerequisites</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { name: 'System Design & Scalability', gap: '-22% Gap', priority: 'High' },
                    { name: 'Apache Kafka Event Streams', gap: '-18% Gap', priority: 'High' },
                    { name: 'Redis Distributed Caching', gap: '-12% Gap', priority: 'Medium' },
                    { name: 'Kubernetes Pod Scheduling', gap: '-28% Gap', priority: 'High' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#090d16] border border-amber-500/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="text-white font-semibold">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.gap}</div>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {item.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: What should I learn next? */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <span className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold font-mono">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">What Should I Learn Next?</h3>
                    <p className="text-[11px] text-slate-400">Highest-impact immediate action</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#090d16] border border-blue-500/40 space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block">
                    Immediate Focus Item
                  </span>
                  <div className="text-base font-bold text-white">
                    Distributed Caching & High-Throughput System Design
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bridges your existing Node.js & PostgreSQL expertise directly into distributed architecture patterns required for Senior engineering interviews.
                  </p>
                  <div className="pt-2">
                    <Link href="/dashboard">
                      <Button size="sm" variant="primary" className="w-full text-xs">
                        View Detailed Learning Plan
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sequential Timeline Roadmap View */
          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
              <span className="font-semibold text-slate-300">
                Curated Engineering Roadmap: Senior Backend & Systems Track
              </span>
              <span className="font-mono text-emerald-400">Step 2 of 4 Active</span>
            </div>

            <div className="space-y-4">
              {learningPhases.map((phase, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-xl border transition-colors ${
                    phase.isCurrent
                      ? 'bg-[#131a2c] border-blue-500/60 shadow-sm'
                      : 'bg-[#090d16] border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        {phase.phase}
                      </span>
                      <h4 className="text-sm font-bold text-white">{phase.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                          phase.status.includes('Completed')
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : phase.status.includes('In Progress')
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {phase.status}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{phase.effort}</span>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">Prerequisites & Core Focus:</span>
                    {phase.skills.map((sk) => (
                      <span
                        key={sk}
                        className="px-2.5 py-1 rounded-lg bg-[#0d121f] text-slate-300 border border-slate-800 text-[11px]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
