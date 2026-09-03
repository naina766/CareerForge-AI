import React from 'react';
import Link from 'next/link';
import {
  Layers,
  Database,
  Cpu,
  BrainCircuit,
  Zap,
  ShieldCheck,
  Activity,
  ArrowLeft,
  Server,
  Network,
} from 'lucide-react';
import { Footer } from '../../components/Footer';

export default function ArchitecturePage() {
  const pillars = [
    {
      title: 'PostgreSQL (Transactional Ground Truth)',
      description:
        'Single source of truth for accounts, candidate profiles, resumes, jobs, applications, match scores, and observability logs.',
      icon: <Database className="w-5 h-5 text-teal-400" />,
      tag: 'PostgreSQL 16',
    },
    {
      title: 'FAISS Semantic Vector Retrieval',
      description:
        'High-dimensional resume chunk retrieval engine embedded via sentence-transformers in FastAPI. Zero pgvector dependency, ensuring high retrieval performance and isolated vector index snapshots.',
      icon: <BrainCircuit className="w-5 h-5 text-cyan-400" />,
      tag: 'FAISS IndexFlatIP',
    },
    {
      title: 'Apache Kafka Event Backbone',
      description:
        'Asynchronous event-driven pipelines for resume ingestion, automated candidate match generation, DLQ dead-letter handling, and real-time notifications.',
      icon: <Zap className="w-5 h-5 text-indigo-400" />,
      tag: 'KRaft Mode 3.7',
    },
    {
      title: 'Redis Distributed Cache & Rate Limiting',
      description:
        'Multi-tier sliding window rate limiting, distributed locking for idempotent consumers, and low-latency cache for candidate session state.',
      icon: <Activity className="w-5 h-5 text-rose-400" />,
      tag: 'Redis 7 Alpine',
    },
    {
      title: 'Hybrid Match Intelligence Engine',
      description:
        'Transparent multi-factor scoring: 40% Verified Skills, 25% FAISS Semantic Cosine, 20% Experience Depth, 15% Preference & Role Fit.',
      icon: <Cpu className="w-5 h-5 text-blue-400" />,
      tag: 'Deterministic + ML',
    },
    {
      title: 'Candidate-Scoped RAG Assistant',
      description:
        'Career copilot grounded strictly in verified candidate profiles, target job requirements, and skill gap analyses with strict isolation.',
      icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
      tag: 'Grounded RAG',
    },
  ];

  return (
    <main className="min-h-screen py-10 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Top Breadcrumb */}
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      {/* Header Banner */}
      <section className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#090d16] shadow-2xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span>System Design & Architectural Topology</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          CareerForge AI{' '}
          <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Architecture
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
          An event-driven distributed system combining transactional consistency, semantic vector search, streaming pipelines, and microservices observability.
        </p>
      </section>

      {/* Microservices Topology */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-teal-400" /> Microservices Grid
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              PORT 3000
            </span>
            <h3 className="text-base font-bold text-white">Next.js 14 Frontend</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              SSR & Client components, App Router, responsive dashboard, real-time alerts, and interactive candidate telemetry.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              PORT 4000
            </span>
            <h3 className="text-base font-bold text-white">Express REST API</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prisma ORM, JWT authentication, correlation-ID request tracing, rate limiting, and Kafka event producers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              PORT 8000
            </span>
            <h3 className="text-base font-bold text-white">FastAPI AI Microservice</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              FAISS vector retrieval, sentence-transformers, ATS parser, and LLM orchestration with Prometheus metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Pillars */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" /> Architectural Invariants
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  {pillar.icon}
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                  {pillar.tag}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{pillar.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
