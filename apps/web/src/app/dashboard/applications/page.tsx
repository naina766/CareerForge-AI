'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { CandidateApplicationItem, CandidateApplicationStats, ApplicationStatus } from '@careerforge/types';
import {
  Briefcase,
  Search,
  MapPin,
  Building,
  RefreshCw,
  AlertCircle,
  FileText,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

function getStatusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case 'APPLIED':
      return 'bg-slate-800 text-slate-300 border-slate-700';
    case 'SCREENING':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'SHORTLISTED':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'INTERVIEW':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse';
    case 'OFFERED':
    case 'OFFER':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'HIRED':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    case 'REJECTED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'WITHDRAWN':
      return 'bg-slate-900 text-slate-500 border-slate-800';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [applications, setApplications] = useState<CandidateApplicationItem[]>([]);
  const [stats, setStats] = useState<CandidateApplicationStats>({
    total: 0,
    active: 0,
    interviews: 0,
    offers: 0,
    hired: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '50');

      const res = await api.get<CandidateApplicationItem[]>(`/applications/me?${params.toString()}`);

      setApplications(res.data || []);
      if ((res as any).meta?.stats) {
        setStats((res as any).meta.stats);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard/applications');
      return;
    }
    if (isAuthenticated) {
      fetchApplications();
    }
  }, [authLoading, isAuthenticated, statusFilter, searchQuery]);

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-teal-400" /> My Job Applications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your application lifecycle, interviews, offer status, and review submissions.
          </p>
        </div>
        <Link href="/jobs">
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Explore More Jobs
          </Button>
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Applied
          </span>
          <span className="text-2xl font-bold text-white font-mono">{stats.total}</span>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-blue-500/20 bg-blue-500/5 space-y-1">
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block">
            Active Review
          </span>
          <span className="text-2xl font-bold text-blue-300 font-mono">{stats.active}</span>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 space-y-1">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
            Interviews
          </span>
          <span className="text-2xl font-bold text-amber-300 font-mono">{stats.interviews}</span>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-purple-500/20 bg-purple-500/5 space-y-1">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
            Offers
          </span>
          <span className="text-2xl font-bold text-purple-300 font-mono">{stats.offers}</span>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5 space-y-1 col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Hired
          </span>
          <span className="text-2xl font-bold text-emerald-300 font-mono">{stats.hired}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role title or company..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED', 'WITHDRAWN'].map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-3xl p-6 border border-slate-800/60 animate-pulse h-28" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-panel rounded-3xl p-10 border border-rose-500/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-white">Unable to load applications</h3>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
          <Button size="sm" onClick={fetchApplications} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Retry
          </Button>
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 border border-slate-800/90 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7 text-teal-400" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white">No applications found</h3>
            <p className="text-xs text-slate-400">
              {statusFilter !== 'ALL'
                ? `No applications currently in ${statusFilter} status.`
                : 'You have not applied to any job vacancies yet. Explore open roles to begin!'}
            </p>
          </div>
          <Link href="/jobs">
            <Button size="sm">Browse Open Jobs</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="glass-panel rounded-3xl p-6 border border-slate-800/80 hover:border-teal-500/40 transition-all hover:scale-[1.005] group space-y-4 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/applications/${app.id}`}
                      className="text-base font-bold text-white group-hover:text-teal-300 transition-colors"
                    >
                      {app.jobTitle}
                    </Link>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {app.workMode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-500" /> {app.companyName} •{' '}
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {app.location}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right sm:text-right hidden sm:block">
                    <span className="text-[11px] text-slate-400 block">
                      Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                      <FileText className="w-3 h-3" /> {app.resumeName}
                    </span>
                  </div>

                  <Link href={`/dashboard/applications/${app.id}`}>
                    <Button size="sm" variant="outline" rightIcon={<ChevronRight className="w-4 h-4" />}>
                      View Timeline
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
