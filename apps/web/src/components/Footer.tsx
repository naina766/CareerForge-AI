'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Footer() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5">
                <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-teal-400" />
                </div>
              </div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
                CareerForge AI
              </span>
            </Link>

            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              AI-powered career intelligence platform helping professionals discover best-fit opportunities, understand skill gaps, and build verified career readiness.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-slate-400">All microservices operational</span>
            </div>
          </div>

          {/* Column: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/jobs" className="hover:text-teal-300 transition-colors">
                  Explore Jobs
                </Link>
              </li>
              <li>
                <Link href="/dashboard/career-assistant" className="hover:text-teal-300 transition-colors">
                  AI Career Mentor
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal-300 transition-colors">
                  Skill Gap Analysis
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal-300 transition-colors">
                  Learning Paths
                </Link>
              </li>
              <li>
                <Link href="/dashboard/recommendations" className="hover:text-teal-300 transition-colors">
                  Job Recommendations
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Platform & Engineering */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/architecture" className="hover:text-teal-300 transition-colors">
                  Architecture Overview
                </Link>
              </li>
              {isAdmin && (
                <>
                  <li>
                    <Link href="/dashboard/admin/observability" className="hover:text-teal-300 transition-colors">
                      System Observability
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/admin/traces" className="hover:text-teal-300 transition-colors">
                      Trace Explorer
                    </Link>
                  </li>
                </>
              )}
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-teal-300 transition-colors"
                >
                  FastAPI Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Column: Resources & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/naina766/CareerForge-AI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-teal-300 transition-colors flex items-center gap-1"
                >
                  <Github className="w-3.5 h-3.5" /> GitHub Repository
                </a>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-teal-300 transition-colors">
                  Candidate Portal
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Security Policy</span>
              </li>
              <li>
                <span className="text-slate-500">Privacy & Terms</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-[11px]">
            &copy; 2026 CareerForge AI. Built for smarter careers.
          </p>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>PostgreSQL &bull; FAISS &bull; Redis &bull; Kafka</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
