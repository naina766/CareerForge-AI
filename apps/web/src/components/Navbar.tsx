'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Briefcase,
  User,
  LogIn,
  UserPlus,
  LogOut,
  Bot,
  Menu,
  X,
  FileText,
  Target,
  GraduationCap,
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

  const navLinks = [
    { label: 'Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Career Intelligence', href: '/dashboard/recommendations', icon: Compass },
    { label: 'Skill Gap', href: '/dashboard#skill-gap', icon: Target },
    { label: 'Learning', href: '/dashboard#learning-roadmap', icon: GraduationCap },
    { label: 'Resume', href: '/dashboard/resume', icon: FileText },
    { label: 'AI Mentor', href: '/dashboard/career-assistant', icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="CareerForge Home">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm" aria-hidden="true">
            <Compass className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">
              CareerForge
            </span>
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Platform
            </span>
          </div>
        </Link>

        {/* Center: Structured Professional Navigation (Desktop) */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-300" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href) && link.href !== '/dashboard');
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`transition-colors flex items-center gap-1.5 py-1 ${
                  isActive
                    ? 'text-white font-semibold border-b-2 border-blue-500'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} aria-hidden="true" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Notifications, Profile & Auth Controls */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {user.role === 'CANDIDATE' && <NotificationBell />}

              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-[#0d121f] border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors"
              >
                <div className="h-5 w-5 rounded bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-[10px] uppercase">
                  {user.email.slice(0, 1)}
                </div>
                <span className="max-w-[120px] truncate">{user.email}</span>
                <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                  {user.role}
                </span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-slate-400 hover:text-rose-400 p-1.5 min-h-[36px]"
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
                <Button variant="primary" size="sm" className="text-xs" leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#0d121f] border border-slate-800 text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
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
          className="lg:hidden border-t border-slate-800 bg-[#090d16] px-4 pt-3 pb-5 space-y-3"
        >
          <nav className="flex flex-col space-y-1 text-xs font-medium text-slate-300">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-slate-800 flex items-center gap-2.5 text-white"
                >
                  <Icon className="w-4 h-4 text-blue-400" aria-hidden="true" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {isAuthenticated && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-slate-800 flex items-center gap-2.5 text-blue-400 font-semibold"
              >
                <User className="w-4 h-4" aria-hidden="true" /> Dashboard
              </Link>
            )}
          </nav>

          {!isAuthenticated && (
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-xs min-h-[44px]">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full text-xs min-h-[44px]">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
