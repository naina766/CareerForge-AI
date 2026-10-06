'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  LayoutDashboard,
  Bot,
  FileText,
  Compass,
  Briefcase,
  User,
  Activity,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationBell } from '../notifications/notification-bell';

interface DashboardShellProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerDescription?: string;
  actionButton?: React.ReactNode;
}

export function DashboardShell({
  children,
  headerTitle,
  headerDescription,
  actionButton,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'AI Career Mentor',
      href: '/dashboard/career-assistant',
      icon: Bot,
      badge: 'Grounded',
    },
    {
      label: 'Resume Lab',
      href: '/dashboard/resume',
      icon: FileText,
    },
    {
      label: 'Job Matches',
      href: '/dashboard/recommendations',
      icon: Compass,
    },
    {
      label: 'My Applications',
      href: '/dashboard/applications',
      icon: Briefcase,
    },
    {
      label: 'Profile & Goals',
      href: '/dashboard/profile',
      icon: User,
    },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({
      label: 'Telemetry & System',
      href: '/dashboard/admin/observability',
      icon: Activity,
      badge: 'Admin',
    });
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isActive = (itemHref: string, exact?: boolean) => {
    if (exact) return pathname === itemHref;
    return pathname.startsWith(itemHref);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-[#f8fafc] flex flex-col">
      {/* Mobile Top Header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[#111827]/95 backdrop-blur-md border-b border-[#1f2937]">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">CareerForge</span>
        </Link>
        <div className="flex items-center gap-2">
          {user?.role === 'CANDIDATE' && <NotificationBell />}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 min-h-[44px] min-w-[44px] rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar (240px wide, clean, calm) */}
        <aside className="hidden lg:flex flex-col w-60 border-r border-[#1f2937] bg-[#030712] shrink-0 p-3.5 space-y-5">
          {/* Brand */}
          <div className="px-2 pt-1.5 pb-0.5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block">
                  CareerForge
                </span>
                <span className="text-[11px] text-gray-400 block font-normal">
                  Career Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* Calm Status Pill */}
          <div className="bg-[#0b0f19] border border-[#1a2233] rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-300 font-medium truncate">Career OS Active</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-0.5" aria-label="Candidate Navigation">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-blue-600/10 text-blue-400 font-semibold border-l-2 border-blue-500 rounded-l-none'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-gray-500'}`} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                        item.badge === 'Admin'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                          : 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Sign Out Footer */}
          <div className="pt-3 border-t border-[#1f2937] space-y-2">
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="h-7 w-7 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-semibold text-xs text-gray-200 uppercase">
                {user?.email?.slice(0, 2) || 'CF'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-200 block truncate">
                  {user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-gray-500 block truncate uppercase tracking-wider">
                  {user?.role || 'CANDIDATE'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-xs justify-start border-[#1f2937] text-gray-400 hover:text-white hover:bg-gray-850 hover:bg-gray-800/60"
              leftIcon={<LogOut className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Mobile Navigation Drawer">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-[#111827] border-r border-[#1f2937] h-full p-4 flex flex-col space-y-5 z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                  <span className="font-bold text-sm text-white">CareerForge</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 min-h-[44px] min-w-[44px] rounded-lg text-gray-400 hover:text-white flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Mobile Drawer Navigation">
                {navItems.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-3 min-h-[44px] rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-gray-400'}`} aria-hidden="true" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase bg-blue-500/20 text-blue-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-[#1f2937] space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full text-xs min-h-[44px]"
                  leftIcon={<LogOut className="w-4 h-4" aria-hidden="true" />}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 flex flex-col min-w-0 bg-[#030712] px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          {/* Header Banner if provided */}
          {(headerTitle || actionButton) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1f2937]">
              <div>
                {headerTitle && (
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    {headerTitle}
                  </h1>
                )}
                {headerDescription && (
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                    {headerDescription}
                  </p>
                )}
              </div>
              {actionButton && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {actionButton}
                </div>
              )}
            </div>
          )}

          {/* Children Content */}
          <div className="flex-1 min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
