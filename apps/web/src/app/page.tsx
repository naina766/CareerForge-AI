'use client';

import React from 'react';
import { StatusBadge } from '../components/StatusBadge';
import {
  BrainCircuit,
  Database,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle,
  Terminal,
  Zap,
  Bot,
  Compass,
  FileCheck
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#090d16] shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            Phase 1 Monorepo & Infrastructure Initialized
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            AI-Powered Career & <br />
            <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Job Intelligence Platform
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Enterprise-grade career platform combining deterministic skill matching, vector embeddings,
            explainable ATS scoring, grounded candidate-scoped RAG career assistant, Kafka event streaming,
            and distributed asynchronous workers.
          </p>
        </div>
      </section>

      {/* Services & Infrastructure Status */}
      <section id="services" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-teal-400" /> Polyglot Monorepo Services
            </h2>
            <p className="text-xs text-slate-400 mt-1">Core services configured with correlation ID tracing</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300">
            pnpm workspaces
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusBadge serviceName="Next.js Frontend (apps/web)" status="ok" port={3000} />
          <StatusBadge serviceName="Express REST API (apps/api)" status="ok" port={4000} />
          <StatusBadge serviceName="FastAPI AI Engine (apps/ai-service)" status="ok" port={8000} />
        </div>
      </section>

      {/* Architecture Highlights Grid */}
      <section id="architecture" className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" /> System Architecture Pillars
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:translate-y-[-2px]">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">PostgreSQL + pgvector</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Unified relational and vector database. Keeps relational transactional data and semantic embeddings in a single consistency boundary.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:translate-y-[-2px]">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Deterministic + AI Hybrid Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              40% Skill Match, 25% Semantic, 20% Experience, 10% Education, 5% Location. Deterministic scoring with LLM reasoning and explanation.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:translate-y-[-2px]">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Kafka in KRaft Mode</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Lightweight ZooKeeper-less event backbone distributing domain events (<code className="text-xs text-teal-300">resume.uploaded</code>, <code className="text-xs text-teal-300">match.completed</code>).
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:translate-y-[-2px]">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Candidate-Scoped RAG</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Career assistant strictly scoped to authenticated user context with prompt-injection defense and insufficient context fallbacks.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:translate-y-[-2px]">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Distributed Tracing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              End-to-end correlation ID tracking across HTTP headers, Express API, FastAPI AI service, and Kafka events.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:translate-y-[-2px]">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Strict Schema Validation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Zod on TypeScript boundaries and Pydantic on Python AI boundaries. Zero unchecked LLM responses.
            </p>
          </div>
        </div>
      </section>

      {/* Phased Roadmap Progress */}
      <section id="pipeline" className="glass-panel rounded-3xl p-8 space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-400" /> Milestone 1 — Foundation Progress
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-teal-500/30">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-teal-400" />
              <div>
                <span className="font-medium text-sm text-white">Phase 1: Repository Foundation & Core Scaffolding</span>
                <p className="text-xs text-slate-400">pnpm monorepo, Docker Compose (KRaft), Next.js, Express, FastAPI, Types & Config</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-teal-500/20 text-teal-300">
              COMPLETED
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-slate-500" />
              <div>
                <span className="font-medium text-sm text-slate-300">Phase 2: PostgreSQL + Prisma + pgvector Schema</span>
                <p className="text-xs text-slate-500">Relational schema, pgvector vector column, seed data, and repositories</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-400">
              UPCOMING
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
