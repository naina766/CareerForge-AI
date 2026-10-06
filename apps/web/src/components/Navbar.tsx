'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const pathname = usePathname();

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
    <header className="sticky top-0 z-50 w-full border-b border-[#1f2937] bg-[#030712]/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & AI Badge */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="CareerForge AI Home">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform" aria-hidden="true">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white">
              CareerForge
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              AI
            </span>
          </div>
        </Link>

        {/* Center: Main Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-gray-300" aria-label="Main Navigation">
          <Link
            href="/jobs"
            aria-current={pathname === '/jobs' ? 'page' : undefined}
            className={`hover:text-white transition-colors flex items-center gap-1.5 ${pathname === '/jobs' ? 'text-white font-semibold' : ''}`}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /> Explore Jobs
          </Link>
          <Link
            href={isAuthenticated ? '/dashboard/career-assistant' : '/login'}
            aria-current={pathname.startsWith('/dashboard/career-assistant') ? 'page' : undefined}
            className={`hover:text-purple-300 transition-colors flex items-center gap-1.5 ${pathname.startsWith('/dashboard/career-assistant') ? 'text-purple-300 font-semibold' : ''}`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" /> AI Mentor
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-white transition-colors flex items-center gap-1.5 text-gray-400"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" /> How It Works
          </Link>
          <Link
            href="/architecture"
            aria-current={pathname === '/architecture' ? 'page' : undefined}
            className={`hover:text-white transition-colors flex items-center gap-1.5 text-gray-400 ${pathname === '/architecture' ? 'text-white font-semibold' : ''}`}
          >
            <Layers className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" /> Architecture
          </Link>

          {isAuthenticated && (
            <>
              <Link
                href="/dashboard"
                aria-current={pathname === '/dashboard' ? 'page' : undefined}
                className="hover:text-white transition-colors flex items-center gap-1.5 text-blue-400 font-semibold"
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" /> Dashboard
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/dashboard/admin/observability"
                  aria-current={pathname.startsWith('/dashboard/admin') ? 'page' : undefined}
                  className="hover:text-purple-300 transition-colors text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right: Auth Controls & Mobile Toggle */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {user.role === 'CANDIDATE' && <NotificationBell />}

              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-200 transition-all"
              >
                <div className="h-5 w-5 rounded bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px] uppercase">
                  {user.email.slice(0, 1)}
                </div>
                <span className="max-w-[120px] truncate">{user.email}</span>
                <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-gray-800 text-gray-400">
                  {user.role}
                </span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-gray-400 hover:text-rose-400 p-1.5 min-h-[36px]"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-xs" leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="text-xs" leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
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
          className="md:hidden border-t border-[#1f2937] bg-[#030712]/98 backdrop-blur-xl px-4 pt-3 pb-5 space-y-3"
        >
          <nav className="flex flex-col space-y-1 text-xs font-medium text-gray-300">
            <Link
              href="/jobs"
              aria-current={pathname === '/jobs' ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-850 hover:bg-gray-800/60 flex items-center gap-2.5 text-white"
            >
              <Briefcase className="w-4 h-4 text-blue-400" aria-hidden="true" /> Explore Jobs
            </Link>
            <Link
              href={isAuthenticated ? '/dashboard/career-assistant' : '/login'}
              aria-current={pathname.startsWith('/dashboard/career-assistant') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-850 hover:bg-gray-800/60 flex items-center gap-2.5 text-purple-300"
            >
              <Bot className="w-4 h-4 text-purple-400" aria-hidden="true" /> AI Mentor
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-850 hover:bg-gray-800/60 flex items-center gap-2.5 text-gray-400"
            >
              <HelpCircle className="w-4 h-4 text-gray-500" aria-hidden="true" /> How It Works
            </Link>
            <Link
              href="/architecture"
              aria-current={pathname === '/architecture' ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-850 hover:bg-gray-800/60 flex items-center gap-2.5 text-gray-400"
            >
              <Layers className="w-4 h-4 text-gray-500" aria-hidden="true" /> Architecture
            </Link>

            {isAuthenticated && (
              <Link
                href="/dashboard"
                aria-current={pathname === '/dashboard' ? 'page' : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-850 hover:bg-gray-800/60 flex items-center gap-2.5 text-blue-400 font-semibold"
              >
                <User className="w-4 h-4" aria-hidden="true" /> Dashboard
              </Link>
            )}
          </nav>

          {!isAuthenticated && (
            <div className="pt-2 border-t border-[#1f2937] flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-xs min-h-[44px]">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" className="w-full text-xs min-h-[44px]">
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
