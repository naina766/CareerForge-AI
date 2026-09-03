'use client';

import React, { useState } from 'react';
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
      badge: 'RAG',
    },
    {
      label: 'Resume & Vector Index',
      href: '/dashboard/resume',
      icon: FileText,
    },
    {
      label: 'Role Recommendations',
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
      label: 'Telemetry & Health',
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
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-16 bg-[#111827]/90 backdrop-blur-md border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            CareerForge AI
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-gray-800/80 bg-[#030712] shrink-0 p-4 space-y-6">
          {/* Brand */}
          <div className="flex items-center justify-between px-2 pt-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent block">
                  CareerForge
                </span>
                <span className="text-[10px] text-gray-400 font-medium block">
                  AI Career Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* System Badge */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-3 flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-gray-200 block truncate">
                RAG Engine Active
              </span>
              <span className="text-[10px] text-gray-400 block truncate">
                FAISS · 384-Dim BGE Embeddings
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-850 hover:bg-gray-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        item.badge === 'Admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
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
          <div className="pt-4 border-t border-gray-800/80 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-400 uppercase">
                {user?.email?.slice(0, 2) || 'CF'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-gray-200 block truncate">
                  {user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-gray-400 block truncate">
                  {user?.role || 'CANDIDATE'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-xs justify-start border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900"
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-[#111827] border-r border-gray-800 h-full p-4 flex flex-col space-y-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-sm text-white">CareerForge AI</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-gray-800 space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full text-xs"
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#030712] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header Banner if provided */}
          {(headerTitle || actionButton) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
              <div>
                {headerTitle && (
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    {headerTitle}
                  </h1>
                )}
                {headerDescription && (
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
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
          <div className="flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
}
