'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  ArrowRight,
  FileCheck,
  UploadCloud,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';

type UploadState = 'empty' | 'uploading' | 'processing' | 'success' | 'error';

interface AnalysisResult {
  fileName: string;
  skillsDetected: number;
  experienceYears: number;
  targetRoles: number;
  profileCompleteness: number;
  improvements: string[];
}

export function ResumeIntelligence() {
  const [state, setState] = useState<UploadState>('empty');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = (file: File) => {
    // 1. Validate extension
    const validExtensions = ['.pdf', '.docx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('Invalid file format. Please upload a PDF or DOCX document.');
      setState('error');
      return;
    }

    // 2. Validate size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('File exceeds the 5MB size limit. Please upload a smaller document.');
      setState('error');
      return;
    }

    // 3. Initiate Upload Simulation / Transmission
    setState('uploading');
    setProgress(15);

    const uploadInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(uploadInterval);
          startProcessing(file.name);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const startProcessing = (fileName: string) => {
    setState('processing');

    setTimeout(() => {
      setAnalysis({
        fileName,
        skillsDetected: 16 + (fileName.length % 6),
        experienceYears: 3 + (fileName.length % 4),
        targetRoles: 4,
        profileCompleteness: 92,
        improvements: [
          'Quantify backend achievements with measurable latency/throughput gains',
          'Highlight experience with distributed architectures and event-driven pipelines',
          'Explicitly list cloud provider certifications and container workloads',
        ],
      });
      setState('success');
    }, 1200);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setState('empty');
    setProgress(0);
    setErrorMessage(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Resume Intelligence
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Your resume is <br />
              <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
                more than a document.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Upload your resume for multi-dimensional skill extraction and ATS keyword optimization. Identify blind spots before an employer screen.
            </p>

            <div className="pt-2">
              <Link href="/dashboard/resume">
                <Button variant="outline" size="md" leftIcon={<FileText className="w-4 h-4" />} rightIcon={<ArrowRight className="w-4 h-4 text-purple-400" />}>
                  Manage Full Resume Vault
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Card: Interactive Resume Upload Zone */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
              {/* STATE 1: EMPTY (Drag & Drop Zone) */}
              {state === 'empty' && (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload your resume. Drag and drop file or press Enter to browse. PDF or DOCX up to 5 megabytes."
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-4 focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    isDragging
                      ? 'border-purple-400 bg-purple-500/10 scale-[1.01]'
                      : 'border-slate-700/80 hover:border-purple-400/60 bg-slate-950/40 hover:bg-slate-950/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    aria-hidden="true"
                    className="hidden"
                  />

                  <div className="p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">Drag & drop your resume here</h4>
                    <p className="text-xs text-slate-400">or click to browse from your computer</p>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                    PDF • DOCX • Maximum 5 MB
                  </span>
                </div>
              )}

              {/* STATE 2: UPLOADING */}
              {state === 'uploading' && (
                <div className="py-12 px-6 text-center space-y-5" aria-live="polite">
                  <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 w-fit mx-auto animate-pulse">
                    <UploadCloud className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-white">Uploading resume...</h4>
                    <p className="text-xs text-slate-400">Validating file signature and parameters</p>
                  </div>

                  <div className="max-w-xs mx-auto space-y-1.5">
                    <div
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden"
                    >
                      <div
                        className="bg-gradient-to-r from-purple-400 to-indigo-400 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-purple-300 font-bold">{progress}%</span>
                  </div>
                </div>
              )}

              {/* STATE 3: PROCESSING */}
              {state === 'processing' && (
                <div className="py-12 px-6 text-center space-y-5">
                  <Loader2 className="w-9 h-9 text-purple-400 animate-spin mx-auto" />

                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-white">Extracting intelligence...</h4>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>✓ Extracting technical skills & taxonomy...</p>
                      <p className="text-purple-300 animate-pulse">Analyzing experience depth & achievements...</p>
                      <p className="text-slate-500">Generating career fit telemetry...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 4: SUCCESS */}
              {state === 'success' && analysis && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">{analysis.fileName}</h4>
                        <span className="text-[11px] text-slate-400">Parsed & Verified Successfully</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                      aria-label="Upload another file"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Skills</span>
                      <span className="text-xl font-bold text-white font-mono">{analysis.skillsDetected}</span>
                      <span className="text-[10px] text-emerald-400 block">Detected</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience</span>
                      <span className="text-xl font-bold text-white font-mono">{analysis.experienceYears} yrs</span>
                      <span className="text-[10px] text-slate-400 block">Calculated</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Roles</span>
                      <span className="text-xl font-bold text-white font-mono">{analysis.targetRoles}</span>
                      <span className="text-[10px] text-cyan-400 block">Strong Match</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Completeness</span>
                      <span className="text-xl font-bold text-teal-300 font-mono">{analysis.profileCompleteness}%</span>
                      <span className="text-[10px] text-teal-400 block">ATS Optimized</span>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Actionable Insights
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {analysis.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">+</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link href="/dashboard/resume">
                      <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        View Full Resume Analysis
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* STATE 5: ERROR */}
              {state === 'error' && (
                <div className="py-8 px-6 text-center space-y-4">
                  <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 w-fit mx-auto">
                    <AlertCircle className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-white">We couldn&apos;t analyze your resume</h4>
                    <p className="text-xs text-rose-300">{errorMessage || 'An error occurred during file parsing.'}</p>
                  </div>

                  <Button variant="outline" size="sm" onClick={handleReset} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
