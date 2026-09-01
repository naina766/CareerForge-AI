'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { api } from '../../../../lib/api';
import { Job, JobStatus, RecruiterJobStats } from '@careerforge/types';
import {
  Briefcase,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  PauseCircle,
  PlayCircle,
  XCircle,
  Archive,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
  ChevronRight,
  Filter,
  Users,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

export default function RecruiterJobsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<RecruiterJobStats>({
    totalJobs: 0,
    published: 0,
    drafts: 0,
    paused: 0,
    closed: 0,
  });
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active action modal
  const [actionModal, setActionModal] = useState<{
    job: Job;
    action: 'PUBLISH' | 'PAUSE' | 'REOPEN' | 'CLOSE' | 'ARCHIVE';
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Active dropdown menu
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        api.get<{ items: Job[]; total: number }>(
          `/recruiter/jobs?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`
        ),
        api.get<RecruiterJobStats>('/recruiter/jobs/stats'),
      ]);

      setJobs(jobsRes.data.items || []);
      setStats(statsRes.data);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to load jobs' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDashboardData();
  };

  const handleDuplicateJob = async (jobId: string) => {
    setOpenDropdownId(null);
    try {
      const res = await api.post<{ id: string }>(`/recruiter/jobs/${jobId}/duplicate`);
      setMessage({ type: 'success', text: 'Job duplicated successfully as DRAFT.' });
      loadDashboardData();
      router.push(`/dashboard/recruiter/jobs/${res.data.id}/edit`);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to duplicate job' });
    }
  };

  const handleExecuteStatusTransition = async () => {
    if (!actionModal) return;
    setIsProcessingAction(true);
    try {
      const targetStatus: JobStatus =
        actionModal.action === 'PUBLISH' || actionModal.action === 'REOPEN'
          ? 'PUBLISHED'
          : actionModal.action === 'PAUSE'
          ? 'PAUSED'
          : actionModal.action === 'CLOSE'
          ? 'CLOSED'
          : 'ARCHIVED';

      if (actionModal.action === 'ARCHIVE') {
        await api.patch(`/recruiter/jobs/${actionModal.job.id}/archive`);
      } else {
        await api.patch(`/recruiter/jobs/${actionModal.job.id}/status`, { status: targetStatus });
      }

      setMessage({
        type: 'success',
        text: `Job "${actionModal.job.title}" successfully updated to ${targetStatus}.`,
      });
      setActionModal(null);
      loadDashboardData();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Status transition failed' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'PUBLISHED':
      case 'ACTIVE':
        return (
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Published
          </span>
        );
      case 'DRAFT':
        return (
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Draft
          </span>
        );
      case 'PAUSED':
        return (
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
            <PauseCircle className="w-3 h-3" />
            Paused
          </span>
        );
      case 'CLOSED':
        return (
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1.5">
            <XCircle className="w-3 h-3" />
            Closed
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
            <Archive className="w-3 h-3" />
            Archived
          </span>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-cyan-400" /> Job Postings & Lifecycle Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, publish, pause, and manage vacancy postings with canonical skill requirements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/recruiter/jobs/new">
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Recruiter Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block">Total Postings</span>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalJobs}</p>
        </div>

        <div
          onClick={() => setStatusFilter('PUBLISHED')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'PUBLISHED'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block">Published</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.published}</p>
        </div>

        <div
          onClick={() => setStatusFilter('DRAFT')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'DRAFT'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block">Drafts</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.drafts}</p>
        </div>

        <div
          onClick={() => setStatusFilter('PAUSED')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'PAUSED'
              ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block">Paused</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{stats.paused}</p>
        </div>

        <div
          onClick={() => setStatusFilter('CLOSED')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'CLOSED'
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block">Closed</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{stats.closed}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-slate-800/90 shadow-xl space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, location, or description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800/60 pt-3 text-xs">
          <span className="text-slate-500 mr-2 text-[11px] font-semibold uppercase flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {(['ALL', 'PUBLISHED', 'DRAFT', 'PAUSED', 'CLOSED', 'ARCHIVED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl font-medium transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-900/40 text-slate-400 border border-transparent hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Jobs' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Listing: Desktop Table & Mobile Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 border border-slate-800/60 animate-pulse h-24" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        /* Empty State */
        <div className="glass-panel rounded-3xl p-12 border border-slate-800/90 text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white">No jobs found</h3>
            <p className="text-xs text-slate-400">
              {statusFilter !== 'ALL'
                ? `No jobs found matching status "${statusFilter}".`
                : 'Create your first job posting to start building your talent pipeline.'}
            </p>
          </div>
          <Link href="/dashboard/recruiter/jobs/new">
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create Job Posting
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block glass-panel rounded-3xl border border-slate-800/90 shadow-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Job Title</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Work Mode</th>
                  <th className="py-3.5 px-4">Experience</th>
                  <th className="py-3.5 px-4">Salary</th>
                  <th className="py-3.5 px-4">Skills</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-900/40 transition-colors group">
                    <td className="py-4 px-6">
                      <Link
                        href={`/dashboard/recruiter/jobs/${job.id}`}
                        className="font-bold text-white hover:text-cyan-400 transition-colors block"
                      >
                        {job.title}
                      </Link>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" /> {job.location || 'Remote'} •{' '}
                        {job.employmentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(job.status)}</td>
                    <td className="py-4 px-4 text-slate-300 font-medium">{job.workMode}</td>
                    <td className="py-4 px-4 text-slate-300">
                      {job.experienceMin}
                      {job.experienceMax ? `–${job.experienceMax} yrs` : '+ yrs'}
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {job.salaryMin ? (
                        <span className="font-mono text-emerald-400">
                          ${job.salaryMin.toLocaleString()}
                          {job.salaryMax ? ` – $${job.salaryMax.toLocaleString()}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-500">Undisclosed</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(job.jobSkills || []).slice(0, 3).map((js, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[10px]"
                          >
                            {js.skill?.name || 'Skill'}
                          </span>
                        ))}
                        {(job.jobSkills || []).length > 3 && (
                          <span className="text-[10px] text-slate-500">
                            +{(job.jobSkills || []).length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-400 text-[11px]">
                      {new Date(job.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === job.id ? null : job.id)}
                          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {openDropdownId === job.id && (
                          <div className="absolute right-0 z-30 mt-2 w-48 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                            <Link
                              href={`/dashboard/recruiter/jobs/${job.id}/applications`}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-cyan-300 hover:bg-cyan-500/10 transition-colors font-semibold"
                            >
                              <Users className="w-3.5 h-3.5 text-cyan-400" /> View Pipeline
                            </Link>
                            <Link
                              href={`/dashboard/recruiter/jobs/${job.id}`}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> View Details
                            </Link>
                            <Link
                              href={`/dashboard/recruiter/jobs/${job.id}/edit`}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5 text-indigo-400" /> Edit Job
                            </Link>
                            <button
                              onClick={() => handleDuplicateJob(job.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition-colors text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-teal-400" /> Duplicate
                            </button>

                            {/* Status Specific Actions */}
                            {job.status === 'DRAFT' && (
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setActionModal({ job, action: 'PUBLISH' });
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left"
                              >
                                <PlayCircle className="w-3.5 h-3.5" /> Publish Job
                              </button>
                            )}

                            {job.status === 'PUBLISHED' && (
                              <>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setActionModal({ job, action: 'PAUSE' });
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-amber-400 hover:bg-amber-500/10 transition-colors text-left"
                                >
                                  <PauseCircle className="w-3.5 h-3.5" /> Pause Job
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setActionModal({ job, action: 'CLOSE' });
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Close Job
                                </button>
                              </>
                            )}

                            {job.status === 'PAUSED' && (
                              <>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setActionModal({ job, action: 'REOPEN' });
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" /> Reopen Job
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setActionModal({ job, action: 'CLOSE' });
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Close Job
                                </button>
                              </>
                            )}

                            {job.status === 'CLOSED' && (
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setActionModal({ job, action: 'ARCHIVE' });
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-900 transition-colors text-left"
                              >
                                <Archive className="w-3.5 h-3.5" /> Archive
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="lg:hidden space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="glass-panel rounded-2xl p-5 border border-slate-800/90 space-y-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/dashboard/recruiter/jobs/${job.id}`}
                      className="font-bold text-white hover:text-cyan-400 transition-colors block text-sm"
                    >
                      {job.title}
                    </Link>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {job.location || 'Remote'} • {job.employmentType.replace('_', ' ')}
                    </p>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Experience</span>
                    <span>
                      {job.experienceMin}
                      {job.experienceMax ? `–${job.experienceMax} yrs` : '+ yrs'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Salary</span>
                    {job.salaryMin ? (
                      <span className="text-emerald-400 font-mono text-[11px]">
                        ${job.salaryMin.toLocaleString()}+
                      </span>
                    ) : (
                      <span className="text-slate-500">Undisclosed</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500">
                    Updated {new Date(job.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/recruiter/jobs/${job.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    <Link href={`/dashboard/recruiter/jobs/${job.id}/edit`}>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation State Transition Dialog */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  actionModal.action === 'PUBLISH' || actionModal.action === 'REOPEN'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : actionModal.action === 'PAUSE'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {actionModal.action === 'PUBLISH'
                    ? 'Publish Job Posting?'
                    : actionModal.action === 'PAUSE'
                    ? 'Pause Active Job?'
                    : actionModal.action === 'REOPEN'
                    ? 'Reopen Job Posting?'
                    : actionModal.action === 'CLOSE'
                    ? 'Close Job Posting?'
                    : 'Archive Job Posting?'}
                </h3>
                <p className="text-xs text-slate-400">{actionModal.job.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {actionModal.action === 'PUBLISH'
                ? 'Publishing will activate this vacancy and make it visible for recruitment and candidate matching workflows.'
                : actionModal.action === 'PAUSE'
                ? 'Pausing will temporarily suspend new candidate interactions while keeping job specifications intact.'
                : actionModal.action === 'REOPEN'
                ? 'Reopening will reactivate this posting from paused status.'
                : actionModal.action === 'CLOSE'
                ? 'Once closed, the job will no longer be available for active recruitment.'
                : 'Archiving permanently stores this job record in your historical archive.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal(null)}
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={isProcessingAction}
                onClick={handleExecuteStatusTransition}
                variant={
                  actionModal.action === 'CLOSE' || actionModal.action === 'ARCHIVE'
                    ? 'danger'
                    : 'primary'
                }
              >
                Confirm {actionModal.action.toLowerCase()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
