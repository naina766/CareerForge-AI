'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Briefcase,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Bot,
  Menu,
  X,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Button } from './ui/Button';
import { NotificationBell } from './notifications/notification-bell';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & AI Badge */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-teal-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-300 via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              CareerForge
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              AI
            </span>
          </div>
        </Link>

        {/* Center: Main Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <Link
            href="/jobs"
            className="hover:text-teal-300 transition-colors flex items-center gap-1.5 font-semibold text-white"
          >
            <Briefcase className="w-4 h-4 text-teal-400" /> Explore Jobs
          </Link>
          <Link
            href={isAuthenticated ? '/dashboard/career-assistant' : '/login'}
            className="hover:text-indigo-300 transition-colors flex items-center gap-1.5"
          >
            <Bot className="w-4 h-4 text-indigo-400" /> AI Mentor
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" /> How It Works
          </Link>
          <Link
            href="/architecture"
            className="hover:text-teal-300 transition-colors flex items-center gap-1.5 text-slate-400"
          >
            <Layers className="w-4 h-4 text-slate-500" /> Architecture
          </Link>

          {isAuthenticated && (
            <>
              <Link href="/dashboard" className="hover:text-teal-300 transition-colors flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-400" /> Dashboard
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/dashboard/admin/observability"
                  className="hover:text-teal-300 transition-colors text-xs font-mono px-2 py-1 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20"
                >
                  Admin Telemetry
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right: Auth Controls & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {user.role === 'CANDIDATE' && <NotificationBell />}

              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 text-slate-200 transition-all"
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
            <div className="hidden sm:flex items-center gap-2">
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          role="navigation"
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-2xl px-4 pt-4 pb-6 space-y-4 animate-fadeIn"
        >
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
            <Link
              href="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-900 flex items-center gap-2 text-white"
            >
              <Briefcase className="w-4 h-4 text-teal-400" /> Explore Jobs
            </Link>
            <Link
              href={isAuthenticated ? '/dashboard/career-assistant' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-900 flex items-center gap-2 text-indigo-300"
            >
              <Bot className="w-4 h-4 text-indigo-400" /> AI Mentor
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-900 flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" /> How It Works
            </Link>
            <Link
              href="/architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-900 flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-slate-400" /> Architecture
            </Link>

            {isAuthenticated && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-900 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-teal-400" /> Dashboard
              </Link>
            )}
          </nav>

          {!isAuthenticated && (
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full">
                  Get Started Free
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
