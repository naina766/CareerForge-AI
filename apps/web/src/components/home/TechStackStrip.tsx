'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Server } from 'lucide-react';

export function TechStackStrip() {
  const technologies = [
    { name: 'FastAPI & LangGraph', role: 'Stateful RAG' },
    { name: 'FAISS IndexFlatIP', role: 'CPU Vector Search' },
    { name: 'PostgreSQL 16', role: 'Relational Truth' },
    { name: 'Apache Kafka 3.7', role: 'KRaft Event Stream' },
    { name: 'Redis 7', role: 'Distributed Cache' },
    { name: 'Express & Node 22', role: 'Core Platform API' },
  ];

  return (
    <section className="py-12 border-t border-slate-800/80 bg-[#070b13]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Production-Grade Microservices Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Low-latency vector similarity, deterministic scoring, and event-driven asynchronous pipelines.
            </p>
          </div>

          <Link
            href="/architecture"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors shrink-0"
          >
            <span>Inspect System Architecture</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Engineering Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {technologies.map((tech, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#0d121f] border border-slate-800 text-xs flex flex-col justify-between"
            >
              <span className="font-semibold text-white">{tech.name}</span>
              <span className="text-[10px] font-mono text-slate-400 mt-1">{tech.role}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
