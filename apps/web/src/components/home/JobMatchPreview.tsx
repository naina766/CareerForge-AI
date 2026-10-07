'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Briefcase,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';

export function JobMatchPreview() {
  const matchFactors = [
    { name: 'Skills Alignment', score: 92, status: 'Strong', description: '5 of 6 required core technologies verified in profile' },
    { name: 'Experience Depth', score: 85, status: 'Qualified', description: '4 years verified experience satisfies 3+ year requirement' },
    { name: 'Semantic Similarity', score: 88, status: 'High Fit', description: 'FAISS vector distance matches candidate project descriptions' },
    { name: 'Work Mode & Location', score: 100, status: 'Exact', description: 'Candidate preference matches Remote policy' },
  ];

  return (
    <section className="py-16 md:py-24 border-t border-slate-800/80 bg-[#070b13]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
              Deterministic Job Matching
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Know exactly why a role matches you.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              CareerForge replaces opaque black-box filtering with structured, explainable match factors. Inspect skill alignment, experience fit, and semantic vector distance before investing time in an application.
            </p>
          </div>

          <Link href="/jobs" className="shrink-0">
            <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Browse Vacancies
            </Button>
          </Link>
        </div>

        {/* Realistic Job Match Inspector Window */}
        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8">
          {/* Header Role Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Example Role · TechNova Systems
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Example Match Calculation
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Senior Distributed Systems Engineer
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> Remote (US / EMEA)
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" /> Full Time
                </span>
                <span>·</span>
                <span className="font-mono text-slate-200">
                  $140,000 – $175,000 USD
                </span>
              </div>
            </div>

            {/* Overall Composite Score Box */}
            <div className="flex items-center gap-4 bg-[#090d16] p-4 rounded-xl border border-slate-800 shrink-0 self-start lg:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block tracking-wider">
                  Overall Match Fit
                </span>
                <span className="text-3xl font-bold font-mono text-white leading-none">
                  87%
                </span>
              </div>
              <div className="h-10 w-[1px] bg-slate-800" />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-emerald-400 block">High Confidence</span>
                <span className="text-[11px] text-slate-400 block font-mono">Weighted Formula</span>
              </div>
            </div>
          </div>

          {/* Why This Role Matches You Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Why this role matches you
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#090d16] border border-slate-800/80 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{factor.name}</span>
                    <span className="font-mono text-white font-bold">{factor.score}%</span>
                  </div>

                  {/* Horizontal Segmented Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Concrete Skill Verification Breakdown */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-300">
                Skills Verification (Candidate vs Role Requirement)
              </span>
              <span className="text-[11px] font-mono text-slate-500">5 Matched · 1 Missing</span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'REST APIs'].map((sk) => (
                <span
                  key={sk}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {sk}
                </span>
              ))}

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Apache Kafka (Identified Gap)
              </span>
            </div>

            {/* Preview Disclaimer Note */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-800/80">
              <span>Example candidate vs. vacancy match calculation based on FAISS vector distance and skill taxonomy.</span>
              <span className="font-mono text-[11px] text-slate-500">Interactive Preview Data</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
