import React from 'react';
import Link from 'next/link';
import { Clock, PlayCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export function SkillGapSection() {
  const gaps = [
    { skill: 'Kubernetes', priority: 'High', category: 'Infrastructure', delta: '-28%' },
    { skill: 'System Design', priority: 'High', category: 'Architecture', delta: '-22%' },
    { skill: 'Kafka', priority: 'Medium', category: 'Event Streaming', delta: '-15%' },
    { skill: 'AWS', priority: 'Medium', category: 'Cloud Platforms', delta: '-14%' },
  ];

  const roadmap = [
    {
      title: 'System Design Fundamentals',
      duration: '12 hours',
      status: 'In Progress',
      progress: 65,
      isCurrent: true,
    },
    {
      title: 'Redis & Distributed Caching',
      duration: '8 hours',
      status: 'Up Next',
      progress: 0,
      isCurrent: false,
    },
    {
      title: 'Kafka Event Streaming Architecture',
      duration: '14 hours',
      status: 'Queued',
      progress: 0,
      isCurrent: false,
    },
    {
      title: 'Microservices Design Patterns',
      duration: '10 hours',
      status: 'Queued',
      progress: 0,
      isCurrent: false,
    },
    {
      title: 'Kubernetes Orchestration & Clusters',
      duration: '16 hours',
      status: 'Target Goal',
      progress: 0,
      isCurrent: false,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-950/40 border-y border-slate-800/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
            Actionable Skill Intelligence
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Identify your gaps.{' '}
            <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Turn them into a plan.
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Stop guessing what skills to study next. Benchmark your current capabilities against real market expectations and follow structured, measurable milestones.
          </p>
        </div>

        {/* 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Skill Gap Discovery */}
          <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-3.5 h-3.5" /> See what&apos;s holding you back
              </span>
              <h3 className="text-xl font-bold text-white">Target Role: Senior Backend Engineer</h3>
              <p className="text-xs text-slate-400 mt-1">Benchmarked against 140+ active industry requirements</p>
            </div>

            {/* Current Readiness Meter */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300">Current Role Readiness</span>
                <span className="text-cyan-300 font-mono text-sm">76%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-400 to-cyan-400 h-2.5 rounded-full w-[76%]" />
              </div>
              <p className="text-[11px] text-slate-400 pt-0.5">
                Acquiring 2 high-priority skills will elevate your readiness to <strong className="text-emerald-400">92%</strong>.
              </p>
            </div>

            {/* Gap List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Identified Missing Capabilities
              </span>

              {gaps.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <div>
                      <span className="font-semibold text-white block">{gap.skill}</span>
                      <span className="text-[10px] text-slate-400">{gap.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        gap.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      {gap.priority} Priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Personalized Learning Roadmap */}
          <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5 mb-1">
                  <PlayCircle className="w-3.5 h-3.5" /> Turn gaps into a plan
                </span>
                <h3 className="text-xl font-bold text-white">Personalized Learning Roadmap</h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                5 Modules
              </span>
            </div>

            {/* Roadmap Timeline */}
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {roadmap.map((item, idx) => (
                <div key={idx} className="relative flex items-start gap-4 pl-1">
                  {/* Step Dot */}
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border z-10 ${
                      item.isCurrent
                        ? 'bg-teal-500 border-teal-300 text-slate-950 font-bold shadow-lg shadow-teal-500/30'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-mono">{idx + 1}</span>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.isCurrent
                            ? 'bg-teal-500/20 text-teal-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {item.duration}
                      </span>
                      {item.isCurrent && (
                        <span className="text-teal-300 font-mono font-medium">
                          {item.progress}% Completed
                        </span>
                      )}
                    </div>

                    {item.isCurrent && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                        <div
                          className="bg-teal-400 h-1.5 rounded-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href="/dashboard" className="block">
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Generate Your Learning Path
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
