'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/Button';

export function ResumeIntelligence() {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 5MB limit check
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('File exceeds the 5MB upload limit.');
      return;
    }

    const validExtensions = ['.pdf', '.docx'];
    if (!validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setUploadError('Invalid format. Only PDF and DOCX files are supported.');
      return;
    }

    setUploadError(null);
  };

  return (
    <section className="py-16 md:py-24 border-t border-slate-800/80 bg-[#070b13]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400">
              Document-Grade Intelligence
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Deep resume parsing and structural optimization.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Beyond simple keyword counting, CareerForge analyzes your resume like an executive technical reviewer. Inspect parsed document structure, technical keyword density, and concrete improvements for enterprise recruitment pipelines.
            </p>
          </div>

          <Link href="/dashboard/resume" className="shrink-0">
            <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Open Resume Lab
            </Button>
          </Link>
        </div>

        {/* Document-Style Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Structured Document Representation (6 cols) */}
          <div className="lg:col-span-6 bg-[#0d121f] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white">Parsed Document Structure</span>
              </div>
              <span className="font-mono text-emerald-400 text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                FAISS Indexed (384-dim)
              </span>
            </div>

            {/* Document Sheet Simulation */}
            <div className="bg-[#090d16] border border-slate-800/90 rounded-xl p-5 space-y-4 text-xs font-sans">
              {/* Header Info */}
              <div className="border-b border-slate-800 pb-3">
                <div className="font-bold text-white text-sm">Alex Morgan</div>
                <div className="text-slate-400 text-[11px]">
                  Senior Backend Engineer · Distributed Systems Focus
                </div>
              </div>

              {/* Experience Section */}
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Professional Experience
                </div>
                <div className="p-2.5 rounded-lg bg-[#0d121f] border border-slate-800/80 space-y-1">
                  <div className="flex justify-between font-medium text-slate-200">
                    <span>Staff Backend Engineer @ CloudScale</span>
                    <span className="text-[11px] font-mono text-slate-500">2021 – Present</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Architected high-throughput ingestion pipeline handling 18k req/sec with PostgreSQL and Redis. Reduced p99 latency by 34%.
                  </p>
                </div>
              </div>

              {/* Technical Skills Section */}
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Extracted Technical Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'REST APIs', 'Redis', 'CI/CD'].map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education Section */}
              <div className="space-y-1">
                <div className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Education & Verification
                </div>
                <div className="text-[11px] text-slate-300">
                  B.S. in Computer Science · Verified Technical Degree
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Intelligence & Actionable Audit (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* Structural Audit Card */}
            <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Structural Quality Audit
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800 flex items-start gap-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Verified Core Sections</span>
                    <span className="text-slate-400 text-[11px]">
                      Contact information, chronological employment, technical taxonomy, and education fully resolved.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800 flex items-start gap-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Quantified Impact Metrics</span>
                    <span className="text-slate-400 text-[11px]">
                      6 out of 8 project bullets contain quantifiable business or performance metrics (latency, throughput, cost).
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#090d16] border border-amber-500/30 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300 block">Missing High-Value Keywords for Target Role</span>
                    <span className="text-slate-400 text-[11px]">
                      For Senior Distributed Systems roles: consider highlighting Kafka partitioning, consensus protocols, and Kubernetes manifests.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Upload Dropzone Demonstration */}
            <div className="p-5 rounded-2xl bg-[#090d16] border border-dashed border-slate-700/80 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">
                  Evaluate Your Own Resume
                </span>
                <span className="text-[11px] text-slate-400 block">
                  PDF or DOCX format · Max 5MB file limit
                </span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.docx"
                className="hidden"
                aria-label="Upload resume document"
              />
              {uploadError && (
                <div className="text-xs text-rose-400 font-medium">{uploadError}</div>
              )}
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Document
                </Button>
                <Link href="/dashboard/resume">
                  <Button size="sm" variant="outline" className="text-xs">
                    Open Resume Lab
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
