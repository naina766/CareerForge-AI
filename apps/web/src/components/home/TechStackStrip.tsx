import React from 'react';
import Link from 'next/link';
import { ArrowRight, Cpu } from 'lucide-react';

export function TechStackStrip() {
  const technologies = [
    { name: 'Next.js 14', role: 'Interactive Web' },
    { name: 'TypeScript', role: 'Type-Safe Core' },
    { name: 'Express API', role: 'REST Services' },
    { name: 'FastAPI', role: 'AI & Inference' },
    { name: 'PostgreSQL', role: 'Transactional Truth' },
    { name: 'FAISS', role: 'Vector Retrieval' },
    { name: 'Redis', role: 'Distributed Cache' },
    { name: 'Kafka', role: 'Event Streaming' },
  ];

  return (
    <section className="py-12 relative border-t border-slate-800/60 bg-slate-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Built for intelligent career decisions
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Modern high-throughput microservices architecture delivering sub-second matching and vector recommendations.
            </p>
          </div>

          <Link
            href="/architecture"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors shrink-0"
          >
            <span>Explore System Architecture</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2.5 pt-6">
          {technologies.map((tech, idx) => (
            <div
              key={idx}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center gap-2"
            >
              <span className="font-semibold text-white">{tech.name}</span>
              <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-2">
                {tech.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
