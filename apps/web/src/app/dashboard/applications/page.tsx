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
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { StatusPill } from '../../../components/ui/StatusPill';
import { MetricCard } from '../../../components/ui/MetricCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonCardGrid } from '../../../components/ui/Skeleton';

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

  function getStatusVariant(status: ApplicationStatus): 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ai' {
    switch (status) {
      case 'HIRED':
        return 'success';
      case 'OFFERED':
      case 'OFFER':
        return 'ai';
      case 'INTERVIEW':
        return 'warning';
      case 'SCREENING':
      case 'SHORTLISTED':
        return 'info';
      case 'REJECTED':
      case 'WITHDRAWN':
        return 'error';
      default:
        return 'neutral';
    }
  }

  return (
    <DashboardShell
      headerTitle="My Applications"
      headerDescription="Track your active job applications, interview schedules, and offers in one place."
      actionButton={
        <Link href="/jobs">
          <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-500 text-white">
            Explore Open Roles
          </Button>
        </Link>
      }
    >
      <div className="space-y-5 max-w-6xl">
        {/* KPI Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <MetricCard
            label="Total Submitted"
            value={stats.total || applications.length}
            description="All-time applications"
            icon={Briefcase}
            iconColor="text-blue-400"
          />

          <MetricCard
            label="Active Pipeline"
            value={stats.active || applications.filter((a) => !['REJECTED', 'WITHDRAWN', 'HIRED'].includes(a.status)).length}
            subvalue="In review"
            description="Applications currently in progress"
            icon={Clock}
            iconColor="text-cyan-400"
          />

          <MetricCard
            label="Interviews"
            value={stats.interviews || applications.filter((a) => a.status === 'INTERVIEW').length}
            subvalue="Scheduled"
            description="Interview stages reached"
            icon={TrendingUp}
            iconColor="text-amber-400"
          />

          <MetricCard
            label="Offers & Hires"
            value={(stats.offers || 0) + (stats.hired || 0) || applications.filter((a) => ['OFFER', 'OFFERED', 'HIRED'].includes(a.status)).length}
            subvalue="Extended"
            description="Offers received"
            icon={CheckCircle2}
            iconColor="text-emerald-400"
          />
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-[#111827] rounded-xl p-3.5 border border-[#1f2937] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 min-w-[200px] max-w-md items-center relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" aria-hidden="true" />
            <input
              id="applications-search"
              name="search"
              type="text"
              aria-label="Search applications by job title or company"
              placeholder="Search by job title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0b0f19] border border-[#1f2937] text-xs text-white placeholder:text-gray-500 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="applications-status-filter" className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" /> Filter:
            </label>
            <select
              id="applications-status-filter"
              aria-label="Filter applications by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0b0f19] border border-[#1f2937] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPLIED">Applied</option>
              <option value="SCREENING">Screening</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="INTERVIEW">Interview</option>
              <option value="OFFERED">Offer Extended</option>
              <option value="HIRED">Hired</option>
              <option value="REJECTED">Closed</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={fetchApplications}>
              Retry
            </Button>
          </div>
        )}

        {/* Applications List */}
        {isLoading ? (
          <SkeletonCardGrid count={3} />
        ) : applications.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications found"
            description={
              statusFilter !== 'ALL' || searchQuery
                ? 'No applications match your active filter or search term.'
                : "You haven't submitted any job applications yet."
            }
            actionLabel="Discover Matching Jobs"
            actionHref="/dashboard/recommendations"
          />
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-[#111827] rounded-xl p-4 sm:p-5 border border-[#1f2937] hover:border-gray-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/dashboard/applications/${app.id}`}
                      className="text-sm font-bold text-white hover:text-blue-400 transition-colors"
                    >
                      {app.jobTitle || 'Engineering Role'}
                    </Link>
                    <StatusPill status={app.status} variant={getStatusVariant(app.status)} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1 font-medium text-gray-300">
                      <Building className="w-3.5 h-3.5 text-gray-500" />
                      {app.companyName || 'Technology Company'}
                    </span>
                    {app.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        {app.location}
                      </span>
                    )}
                    <span>•</span>
                    <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <Link href={`/dashboard/applications/${app.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-300"
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Details & History
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
