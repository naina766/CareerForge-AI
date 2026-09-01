'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Compass, Briefcase, User, LogIn, UserPlus, LogOut, Bot } from 'lucide-react';
import { Button } from './ui/Button';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 glass-panel">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 glow-teal">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-teal-400" />
            </div>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              CareerForge AI
            </span>
            <span className="ml-2 text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              v1.0
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="/jobs" className="hover:text-teal-300 transition-colors flex items-center gap-1.5 font-semibold text-white">
            <Briefcase className="w-4 h-4 text-teal-400" /> Explore Jobs
          </Link>
          <Link href="/#architecture" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-slate-400" /> Architecture
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/dashboard" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-400" /> Dashboard
              </Link>
              {user?.role === 'CANDIDATE' && (
                <>
                  <Link href="/dashboard/career-assistant" className="hover:text-indigo-300 transition-colors flex items-center gap-1.5 text-indigo-300 font-semibold">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" /> Career AI
                  </Link>
                  <Link href="/dashboard/recommendations" className="hover:text-teal-300 transition-colors flex items-center gap-1.5 text-teal-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Recommendations
                  </Link>
                  <Link href="/dashboard/applications" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                    Applications
                  </Link>
                  <Link href="/dashboard/profile" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                    Profile
                  </Link>
                  <Link href="/dashboard/resume" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                    Resume
                  </Link>
                </>
              )}
              {user?.role === 'RECRUITER' && (
                <Link href="/dashboard/recruiter/jobs" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                  Job Postings
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-slate-200 transition-all"
              >
                <div className="h-5 w-5 rounded-md bg-teal-500/20 text-teal-300 font-bold flex items-center justify-center text-[10px] uppercase">
                  {user.email.slice(0, 1)}
                </div>
                <span className="max-w-[120px] truncate">{user.email}</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                  {user.role}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-slate-400 hover:text-rose-400"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" leftIcon={<LogIn className="w-4 h-4" />}>
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
