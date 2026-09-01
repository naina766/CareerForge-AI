'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../../context/AuthContext';
import { api } from '../../../../../../lib/api';
import { RecruiterApplicationItem, ApplicationStatus, MatchReport } from '@careerforge/types';
import {
  ArrowLeft,
  Search,
  Users,
  FileText,
  Clock,
  MoreVertical,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  X,
  Download,
  Target,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../../../../components/ui/Button';

const KANBAN_STAGES: Array<{ id: ApplicationStatus; title: string; color: string }> = [
  { id: 'APPLIED', title: 'Applied', color: 'border-slate-700 bg-slate-900/50' },
  { id: 'SCREENING', title: 'Screening', color: 'border-blue-500/30 bg-blue-500/5' },
  { id: 'SHORTLISTED', title: 'Shortlisted', color: 'border-cyan-500/30 bg-cyan-500/5' },
  { id: 'INTERVIEW', title: 'Interview', color: 'border-amber-500/30 bg-amber-500/5' },
  { id: 'OFFERED', title: 'Offered', color: 'border-purple-500/30 bg-purple-500/5' },
  { id: 'HIRED', title: 'Hired 🎉', color: 'border-emerald-500/30 bg-emerald-500/5' },
  { id: 'REJECTED', title: 'Rejected', color: 'border-rose-500/30 bg-rose-500/5' },
];

export default function RecruiterJobApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [jobTitle, setJobTitle] = useState('');
  const [applications, setApplications] = useState<RecruiterApplicationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Transition Modal
  const [selectedApp, setSelectedApp] = useState<RecruiterApplicationItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Candidate Detail Modal
  const [inspectApp, setInspectApp] = useState<RecruiterApplicationItem | null>(null);
  const [inspectMatchReport, setInspectMatchReport] = useState<MatchReport | null>(null);
  const [loadingInspectMatch, setLoadingInspectMatch] = useState(false);

  // Fetch recruiter candidate match report
  const handleInspectCandidate = async (app: RecruiterApplicationItem) => {
    setInspectApp(app);
    setInspectMatchReport(null);
    setLoadingInspectMatch(true);
    try {
      const res = await api.get<MatchReport>(
        `/recruiter/jobs/${jobId}/candidates/${app.candidateId}/match`
      );
      setInspectMatchReport(res.data || null);
    } catch {
      setInspectMatchReport(null);
    } finally {
      setLoadingInspectMatch(false);
    }
  };

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<RecruiterApplicationItem[]>(
        `/recruiter/jobs/${jobId}/applications`
      );
      setApplications(res.data || []);
      if (res.data && res.data.length > 0 && res.data[0]?.jobTitle) {
        setJobTitle(res.data[0].jobTitle);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load job applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/dashboard/recruiter/jobs/${jobId}/applications`);
      return;
    }
    if (isAuthenticated && jobId) {
      fetchApplications();
    }
  }, [authLoading, isAuthenticated, jobId]);

  const handleOpenStatusModal = (app: RecruiterApplicationItem, defaultTarget?: ApplicationStatus) => {
    setSelectedApp(app);
    setTargetStatus(defaultTarget || '');
    setStatusNote('');
    setUpdateError(null);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !targetStatus) return;

    setIsUpdatingStatus(true);
    setUpdateError(null);
    try {
      await api.patch(`/applications/${selectedApp.id}/status`, {
        status: targetStatus,
        note: statusNote.trim() || undefined,
      });

      setSelectedApp(null);
      await fetchApplications();
    } catch (err: unknown) {
      const e = err as Error;
      setUpdateError(e.message || 'Failed to update application status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.candidateName.toLowerCase().includes(q) ||
      (app.candidateHeadline && app.candidateHeadline.toLowerCase().includes(q)) ||
      app.skills.some((sk) => sk.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/recruiter/jobs"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Job Postings
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" /> Candidate Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {jobTitle ? `${jobTitle} • ` : ''}
            {applications.length} candidate applications submitted
          </p>
        </div>

        {/* View Toggle & Search */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate or skill..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold transition-colors ${
                viewMode === 'kanban' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-semibold transition-colors ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Pipeline Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel rounded-3xl p-5 border border-slate-800/60 animate-pulse h-64" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-panel rounded-3xl p-10 border border-rose-500/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Unable to load candidate pipeline</h3>
          <p className="text-xs text-slate-400">{error}</p>
          <Button size="sm" onClick={fetchApplications}>
            Retry
          </Button>
        </div>
      ) : applications.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 border border-slate-800/90 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-cyan-400" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white">No applicants yet</h3>
            <p className="text-xs text-slate-400">
              When candidates apply to this vacancy, their profiles, resumes, and status progression will appear here.
            </p>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Horizontal Scroll Board */
        <div className="flex gap-4 overflow-x-auto pb-6">
          {KANBAN_STAGES.map((stage) => {
            const stageApps = filteredApps.filter((a) => a.status === stage.id);
            return (
              <div
                key={stage.id}
                className={`flex-shrink-0 w-80 rounded-3xl p-4 border ${stage.color} space-y-3 flex flex-col`}
              >
                {/* Stage Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{stage.title}</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                    {stageApps.length}
                  </span>
                </div>

                {/* Candidate Cards Stream */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
                  {stageApps.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-600 border border-dashed border-slate-800/60 rounded-2xl">
                      No candidates in this stage
                    </div>
                  ) : (
                    stageApps.map((app) => (
                      <div
                        key={app.id}
                        className="glass-card rounded-2xl p-4 border border-slate-800/90 hover:border-cyan-500/40 transition-all space-y-3 shadow-md bg-slate-950/70"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="cursor-pointer group flex-1 min-w-0"
                            onClick={() => handleInspectCandidate(app)}
                          >
                            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                              {app.candidateName}
                            </h4>
                            {app.candidateHeadline && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {app.candidateHeadline}
                              </p>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenStatusModal(app)}
                            className="text-slate-400 hover:text-white p-1 h-7 w-7"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Top Skills */}
                        {app.skills && app.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {app.skills.slice(0, 3).map((sk, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-900 text-[10px] text-slate-300 border border-slate-800"
                              >
                                {sk}
                              </span>
                            ))}
                            {app.skills.length > 3 && (
                              <span className="text-[10px] text-slate-500 pt-0.5">
                                +{app.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Card Footer: Timestamps & Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInspectCandidate(app)}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="glass-panel rounded-3xl border border-slate-800/80 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Candidate</th>
                <th className="p-4">Skills</th>
                <th className="p-4">Current Stage</th>
                <th className="p-4">Applied Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-white cursor-pointer hover:text-cyan-300" onClick={() => handleInspectCandidate(app)}>
                      {app.candidateName}
                    </p>
                    <p className="text-[11px] text-slate-400">{app.candidateEmail}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {app.skills.slice(0, 3).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-300 border border-slate-800">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-200">
                      {app.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => handleInspectCandidate(app)}>
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenStatusModal(app)}>
                      Stage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Transition Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Update Candidate Stage</h3>
              <button type="button" onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Moving <strong className="text-white">{selectedApp.candidateName}</strong> from{' '}
              <span className="font-mono text-cyan-400">{selectedApp.status}</span>.
            </p>

            {updateError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {updateError}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Target Stage</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ApplicationStatus)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select target stage...</option>
                  <option value="SCREENING">SCREENING</option>
                  <option value="SHORTLISTED">SHORTLISTED</option>
                  <option value="INTERVIEW">INTERVIEW</option>
                  <option value="OFFERED">OFFERED</option>
                  <option value="HIRED">HIRED 🎉</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Feedback / Internal Note <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Candidate passed technical screen with flying colors..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedApp(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdatingStatus || !targetStatus}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Confirm Stage Change'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Inspector Modal */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setInspectApp(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{inspectApp.candidateName}</h3>
                <p className="text-xs text-slate-400">{inspectApp.candidateEmail}</p>
              </div>
              <button type="button" onClick={() => setInspectApp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectApp.candidateHeadline && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Headline</span>
                <p className="text-xs text-slate-300 font-medium">{inspectApp.candidateHeadline}</p>
              </div>
            )}

            {/* Phase 13 AI Match Compatibility */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-white">Hybrid Match Score</span>
                </div>
                {loadingInspectMatch ? (
                  <span className="text-[10px] text-teal-400 animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Scoring...
                  </span>
                ) : inspectMatchReport ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{inspectMatchReport.overallScore}/100</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        inspectMatchReport.matchLevel === 'EXCELLENT'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : inspectMatchReport.matchLevel === 'STRONG'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : inspectMatchReport.matchLevel === 'MODERATE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {inspectMatchReport.matchLevel}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">Not computed</span>
                )}
              </div>

              {inspectMatchReport && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  {/* Mini-bars */}
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Skills</span>
                      <span className="text-[11px] font-bold text-teal-400">{inspectMatchReport.skillScore}%</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">FAISS</span>
                      <span className="text-[11px] font-bold text-cyan-400">{inspectMatchReport.semanticScore}%</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Exp</span>
                      <span className="text-[11px] font-bold text-indigo-400">{inspectMatchReport.experienceScore}%</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Edu</span>
                      <span className="text-[11px] font-bold text-purple-400">{inspectMatchReport.educationScore}%</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block">Loc</span>
                      <span className="text-[11px] font-bold text-pink-400">{inspectMatchReport.locationScore}%</span>
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    {inspectMatchReport.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Candidate Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {inspectApp.skills.map((sk, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Resume */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Submitted Resume</span>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-xs font-bold text-white">{inspectApp.resumeName}</p>
                    <p className="text-[10px] text-slate-400">Uploaded {new Date(inspectApp.appliedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {inspectApp.resumeFileUrl && (
                  <a href={inspectApp.resumeFileUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" leftIcon={<Download className="w-3.5 h-3.5" />}>
                      Download
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Cover Letter */}
            {inspectApp.coverLetter && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cover Letter</span>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {inspectApp.coverLetter}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                className="bg-cyan-500 text-slate-950 font-bold"
                onClick={() => {
                  setInspectApp(null);
                  handleOpenStatusModal(inspectApp);
                }}
              >
                Change Application Stage
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
