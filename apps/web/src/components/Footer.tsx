'use client';

import React from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Footer() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <footer className="border-t border-slate-800 bg-[#070b13] text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Compass className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                CareerForge Platform
              </span>
            </Link>

            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              Professional career intelligence platform helping engineers discover suitable roles, benchmark capability gaps, and navigate verified learning milestones.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-mono text-slate-400">All services operational</span>
            </div>
          </div>

          {/* Column: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/jobs" className="hover:text-white transition-colors">
                  Explore Jobs
                </Link>
              </li>
              <li>
                <Link href="/dashboard/career-assistant" className="hover:text-white transition-colors">
                  AI Career Mentor
                </Link>
              </li>
              <li>
                <Link href="/dashboard#skill-gap" className="hover:text-white transition-colors">
                  Skill Gap Analysis
                </Link>
              </li>
              <li>
                <Link href="/dashboard#learning-roadmap" className="hover:text-white transition-colors">
                  Learning Roadmap
                </Link>
              </li>
              <li>
                <Link href="/dashboard/resume" className="hover:text-white transition-colors">
                  Resume Intelligence
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Platform & Docs */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/architecture" className="hover:text-white transition-colors">
                  System Architecture
                </Link>
              </li>
              <li>
                <Link href="/dashboard/recommendations" className="hover:text-white transition-colors">
                  Match Intelligence
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link href="/dashboard/admin/observability" className="hover:text-white transition-colors">
                    Admin Observability
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column: Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Access</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Candidate Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} CareerForge. Professional career intelligence.
          </div>
          <div className="font-mono text-slate-500">
            Node.js 22 LTS · PostgreSQL 16 · Kafka 3.7 · FAISS
          </div>
        </div>
      </div>
    </footer>
  );
}
