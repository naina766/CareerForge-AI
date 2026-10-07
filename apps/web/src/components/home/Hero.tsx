'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { CareerMapVisual } from './CareerMapVisual';

export function Hero() {
  return (
    <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Editorial Headline & Value Narrative */}
        <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
          {/* Subtle Platform Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d121f] border border-slate-800 text-xs text-slate-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Career Intelligence Platform</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 font-mono text-[11px]">v1.0 Production</span>
          </div>

          {/* Main Direct Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
            Build the career your skills deserve.
          </h1>

          {/* Value Narrative Body */}
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
            CareerForge analyzes your verified experience, benchmarks capability gaps against live market requirements, optimizes your resume for enterprise roles, and structures a measurable roadmap to your next engineering position.
          </p>

          {/* High-Intent CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/jobs" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="primary"
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Explore Open Roles
              </Button>
            </Link>

            <Link href="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-slate-200"
              >
                Create Career Profile
              </Button>
            </Link>
          </div>

          {/* Concrete Platform Capabilities */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Explainable match scoring
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              Taxonomy-backed skill gaps
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              Grounded candidate RAG
            </span>
          </div>
        </div>

        {/* Centerpiece: Signature Career Map Workspace Visualization */}
        <div className="pt-2 animate-fade-in">
          <CareerMapVisual />
        </div>
      </div>
    </section>
  );
}
