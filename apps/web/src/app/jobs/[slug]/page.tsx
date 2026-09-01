'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  Job,
  ResumeSummary,
  MatchReport,
  SkillGapAnalysisReport,
  LearningPathResponse,
  LearningItemStatus,
} from '@careerforge/types';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Layers,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  Share2,
  Check,
  Send,
  X,
  RefreshCw,
  Target,
  GraduationCap,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function PublicJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, isAuthenticated } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Match Report State (Phase 13)
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Skill Gap & Learning Path State (Phase 14)
  const [gapReport, setGapReport] = useState<SkillGapAnalysisReport | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathResponse | null>(null);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [loadingPath, setLoadingPath] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Application State
  const [hasApplied, setHasApplied] = useState(false);
  const [existingApplicationId, setExistingApplicationId] = useState<string | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [candidateResume, setCandidateResume] = useState<ResumeSummary | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [appSuccess, setAppSuccess] = useState(false);

  useEffect(() => {
    async function fetchPublicJob() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<Job>(`/jobs/${slug}`);
        setJob(res.data || null);
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || 'Job vacancy not found or no longer active');
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) {
      fetchPublicJob();
    }
  }, [slug]);

  // Fetch candidate match score against this job
  const fetchMatchReport = async (refresh: boolean = false) => {
    if (!isAuthenticated || user?.role !== 'CANDIDATE' || !job) return;
    setLoadingMatch(true);
    setMatchError(null);
    try {
      const url = `/jobs/${job.id}/match${refresh ? '?refresh=true' : ''}`;
      const res = await api.get<MatchReport>(url);
      setMatchReport(res.data || null);
    } catch (err: unknown) {
      const e = err as Error;
      setMatchError(e.message || 'Unable to load match score');
    } finally {
      setLoadingMatch(false);
    }
  };

  // Fetch Skill Gap Analysis (Phase 14)
  const fetchSkillGaps = async (refresh: boolean = false) => {
    if (!isAuthenticated || user?.role !== 'CANDIDATE' || !job) return;
    setLoadingGaps(true);
    try {
      const url = `/jobs/${job.id}/skill-gaps${refresh ? '?refresh=true' : ''}`;
      const res = await api.get<SkillGapAnalysisReport>(url);
      setGapReport(res.data || null);
    } catch {
      setGapReport(null);
    } finally {
      setLoadingGaps(false);
    }
  };

  // Fetch Personalized Learning Path (Phase 14)
  const fetchLearningPath = async (refresh: boolean = false) => {
    if (!isAuthenticated || user?.role !== 'CANDIDATE' || !job) return;
    setLoadingPath(true);
    try {
      const url = `/jobs/${job.id}/learning-path${refresh ? '?refresh=true' : ''}`;
      const res = await api.get<LearningPathResponse>(url);
      setLearningPath(res.data || null);
    } catch {
      setLearningPath(null);
    } finally {
      setLoadingPath(false);
    }
  };

  // Handle Learning Item Progress Toggle
  const handleUpdateItemProgress = async (itemId: string, newStatus: LearningItemStatus) => {
    setUpdatingItemId(itemId);
    try {
      const res = await api.patch<LearningPathResponse>(`/learning-path/items/${itemId}`, {
        status: newStatus,
      });
      if (res.data) {
        setLearningPath(res.data);
      }
    } catch {
      // Revert or show alert
    } finally {
      setUpdatingItemId(null);
    }
  };

  useEffect(() => {
    if (job && isAuthenticated && user?.role === 'CANDIDATE') {
      fetchMatchReport();
      fetchSkillGaps();
      fetchLearningPath();
    }
  }, [job, isAuthenticated, user]);

  // Check if candidate already applied to this job
  useEffect(() => {
    async function checkExistingApplication() {
      if (!isAuthenticated || user?.role !== 'CANDIDATE' || !job) return;
      try {
        const res = await api.get<any[]>('/applications/me?limit=50');
        const match = (res.data || []).find((app: any) => app.jobId === job.id);
        if (match) {
          setHasApplied(true);
          setExistingApplicationId(match.id);
        }
      } catch {
        // Silently continue
      }
    }
    checkExistingApplication();
  }, [isAuthenticated, user, job]);

  const handleOpenApplyModal = async () => {
    setApplyModalOpen(true);
    setAppError(null);
    setLoadingResume(true);
    try {
      const res = await api.get<ResumeSummary>('/candidates/me/resume');
      setCandidateResume(res.data || null);
    } catch {
      setCandidateResume(null);
    } finally {
      setLoadingResume(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateResume) {
      setAppError('Please upload a resume first before applying.');
      return;
    }
    if (!job) return;

    setIsSubmittingApp(true);
    setAppError(null);
    try {
      const res = await api.post<any>(`/jobs/${job.id}/applications`, {
        resumeId: candidateResume.id,
        coverLetter: coverLetter.trim() || undefined,
      });

      setAppSuccess(true);
      setHasApplied(true);
      setExistingApplicationId(res.data?.id || null);
      setTimeout(() => {
        setApplyModalOpen(false);
        router.push('/dashboard/applications');
      }, 1500);
    } catch (err: unknown) {
      const e = err as Error;
      setAppError(e.message || 'Failed to submit application.');
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="glass-panel rounded-3xl p-10 border border-slate-800/90 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Job Unavailable</h2>
          <p className="text-xs text-slate-400">
            {error || 'This job posting does not exist, has expired, or is currently private.'}
          </p>
          <Link href="/jobs">
            <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Job Discovery
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = job.applicationDeadline && new Date(job.applicationDeadline) < new Date();
  const requiredSkills = (job.skills as any[])?.filter(
    (s) => (s as any).importance === 'REQUIRED' || (s as any).required === true
  ) || [];
  const preferredSkills = (job.skills as any[])?.filter(
    (s) => (s as any).importance === 'PREFERRED' || (s as any).required === false
  ) || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all jobs
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" /> {copied ? 'Link Copied!' : 'Share'}
        </button>
      </div>

      {/* Main Job Hero Card */}
      <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-slate-800/90 shadow-2xl space-y-6 relative overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-950/90">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                {job.workMode}
              </span>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {job.employmentType.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Verified Vacancy
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {job.title}
            </h1>

            <p className="text-sm text-slate-400 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <Building className="w-4 h-4 text-teal-400" /> {job.companyName}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" /> {job.location || 'Remote'}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Posted {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </p>
          </div>

          {/* Right Hero Specs */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800/80 space-y-3 min-w-[240px]">
            {job.salaryMin ? (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Compensation
                </span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                  ${job.salaryMin.toLocaleString()}
                  {job.salaryMax ? ` – $${job.salaryMax.toLocaleString()}` : '+'}
                  <span className="text-xs text-slate-400 font-normal ml-1">
                    / {job.salaryPeriod ? job.salaryPeriod.toLowerCase() : 'yr'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Compensation
                </span>
                <span className="text-xs text-slate-400">Competitive / Undisclosed</span>
              </div>
            )}

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Experience Requirement
              </span>
              <span className="text-xs text-white font-semibold">
                {job.experienceMin}
                {job.experienceMax ? ` – ${job.experienceMax} years` : '+ years'}
              </span>
            </div>

            {job.applicationDeadline && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Application Deadline
                </span>
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(job.applicationDeadline).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Apply Action Button */}
            <div className="pt-2">
              {!isAuthenticated ? (
                <Link href={`/login?redirect=/jobs/${job.slug}`}>
                  <Button size="md" className="w-full">
                    Sign in to Apply
                  </Button>
                </Link>
              ) : user?.role !== 'CANDIDATE' ? (
                <div className="text-center p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  Logged in as {user?.role}
                </div>
              ) : isExpired ? (
                <Button size="md" className="w-full bg-slate-800 text-slate-500 cursor-not-allowed" disabled>
                  Applications Closed
                </Button>
              ) : hasApplied ? (
                <Link href={`/dashboard/applications/${existingApplicationId || ''}`}>
                  <Button size="md" variant="outline" className="w-full border-teal-500/50 text-teal-300" leftIcon={<Check className="w-4 h-4" />}>
                    View Submitted Application
                  </Button>
                </Link>
              ) : (
                <Button
                  size="md"
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold"
                  onClick={handleOpenApplyModal}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Apply Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left 2 Cols: Description, Responsibilities, Requirements, Benefits */}
        <div className="md:col-span-2 space-y-6">
          {/* Phase 13: Hybrid AI Match Score & Explanation Widget */}
          {isAuthenticated && user?.role === 'CANDIDATE' && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-teal-500/30 bg-gradient-to-b from-teal-950/20 via-slate-900/60 to-slate-900/90 space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">Your AI Match Compatibility</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Phase 13 Hybrid Engine
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deterministic 5-signal evaluation grounded in your verified profile and resume
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {loadingMatch ? (
                    <div className="flex items-center gap-2 text-xs text-teal-400 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating...
                    </div>
                  ) : matchReport ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-black text-white leading-none tracking-tight">
                          {matchReport.overallScore}
                          <span className="text-xs font-normal text-slate-400">/100</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                            matchReport.matchLevel === 'EXCELLENT'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : matchReport.matchLevel === 'STRONG'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : matchReport.matchLevel === 'MODERATE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {matchReport.matchLevel} MATCH
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchMatchReport(true)}
                        title="Recompute fresh match"
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {matchError ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
                  <span>{matchError}</span>
                  <Button size="sm" variant="outline" onClick={() => fetchMatchReport(true)}>
                    Retry
                  </Button>
                </div>
              ) : matchReport ? (
                <div className="space-y-6">
                  {/* Signal Breakdown Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Skills 40% */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400">Skills (40%)</span>
                        <span className="font-bold text-teal-400">{matchReport.skillScore}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-teal-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, matchReport.skillScore)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {matchReport.matchedSkills.length} matched
                      </span>
                    </div>

                    {/* Semantic 25% */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400">FAISS (25%)</span>
                        <span className="font-bold text-cyan-400">{matchReport.semanticScore}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, matchReport.semanticScore)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">Vector retrieval</span>
                    </div>

                    {/* Experience 20% */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400">Experience (20%)</span>
                        <span className="font-bold text-indigo-400">{matchReport.experienceScore}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, matchReport.experienceScore)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {matchReport.candidateYears ?? 0} yrs of {matchReport.requiredYears ?? 0}
                      </span>
                    </div>

                    {/* Education 10% */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400">Education (10%)</span>
                        <span className="font-bold text-purple-400">{matchReport.educationScore}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, matchReport.educationScore)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">Qualifications</span>
                    </div>

                    {/* Location 5% */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-400">Location (5%)</span>
                        <span className="font-bold text-pink-400">{matchReport.locationScore}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-pink-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, matchReport.locationScore)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block">{job.workMode}</span>
                    </div>
                  </div>

                  {/* Grounded Factual Explanation */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2">
                    <span className="text-[11px] uppercase font-bold text-teal-400 tracking-wider block">
                      Deterministic Match Analysis
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {matchReport.explanation}
                    </p>
                  </div>

                  {/* Matched vs Missing Skills Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Matched Skills */}
                    <div className="space-y-2">
                      <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider block">
                        Matched Skills ({matchReport.matchedSkills.length})
                      </span>
                      {matchReport.matchedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {matchReport.matchedSkills.map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No overlapping skills detected yet</p>
                      )}
                    </div>

                    {/* Missing Required Skills */}
                    <div className="space-y-2">
                      <span className="text-[11px] uppercase font-bold text-rose-400 tracking-wider block">
                        Missing Required Skills ({(matchReport.missingRequiredSkills || []).length})
                      </span>
                      {(matchReport.missingRequiredSkills || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(matchReport.missingRequiredSkills || []).map((sk, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-0.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-400 font-medium">All mandatory skills matched!</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Phase 14: Skill Gap Analysis & Personalized Learning Roadmap */}
          {isAuthenticated && user?.role === 'CANDIDATE' && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 via-slate-900/60 to-slate-900/90 space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">Skill Gap Analysis & Learning Roadmap</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Phase 14 Engine
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Prerequisite-aware topological learning path grounded in approved database resources
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {loadingGaps || loadingPath ? (
                    <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Sequencing...
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        fetchSkillGaps(true);
                        fetchLearningPath(true);
                      }}
                      title="Recompute fresh roadmap"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Job Readiness Card */}
              {gapReport && (
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Your Job Readiness
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-white">
                          {gapReport.overallReadiness}%
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            gapReport.readinessLevel === 'JOB_READY'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : gapReport.readinessLevel === 'NEARLY_READY'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : gapReport.readinessLevel === 'DEVELOPING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {gapReport.readinessLevel.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center sm:text-right">
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-[9px] text-slate-400 block">High Gaps</span>
                        <span className="text-xs font-bold text-rose-400">{gapReport.highPriorityCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-[9px] text-slate-400 block">Medium</span>
                        <span className="text-xs font-bold text-amber-400">{gapReport.mediumPriorityCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-[9px] text-slate-400 block">Est. Hours</span>
                        <span className="text-xs font-bold text-cyan-400">
                          {learningPath?.totalEstimatedHours ?? gapReport.estimatedLearningHours}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Top Skill Gaps Grid */}
              {gapReport && gapReport.gaps.length > 0 ? (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Prioritized Missing Skills ({gapReport.gaps.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {gapReport.gaps.map((gap) => (
                      <div
                        key={gap.id || gap.skillName}
                        className={`p-4 rounded-2xl bg-slate-950 border transition-all space-y-2.5 ${
                          gap.priority === 'HIGH'
                            ? 'border-rose-500/40 shadow-rose-950/20'
                            : gap.priority === 'MEDIUM'
                            ? 'border-amber-500/30 shadow-amber-950/20'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-white">{gap.skillName}</h4>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {gap.requirementType === 'REQUIRED' ? 'Mandatory Requirement' : 'Preferred Nice-to-Have'}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              gap.priority === 'HIGH'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : gap.priority === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {gap.priority} PRIORITY ({gap.priorityScore})
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                          {gap.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : gapReport && gapReport.gaps.length === 0 ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No Critical Skill Gaps Detected</h4>
                  <p className="text-xs text-slate-300">
                    Your profile possesses all mandatory and preferred technical skills specified for this vacancy.
                  </p>
                </div>
              ) : null}

              {/* 3. Personalized Learning Roadmap Timeline */}
              {learningPath && learningPath.items.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Personalized Learning Roadmap
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sequenced foundational prerequisites first with cataloged learning materials
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-cyan-400">
                        {learningPath.progressPercentage}% Completed
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {learningPath.items.filter((i) => i.status === 'COMPLETED').length} of {learningPath.items.length} skills done
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-teal-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, learningPath.progressPercentage)}%` }}
                    />
                  </div>

                  {/* Timeline Stream */}
                  <div className="space-y-3">
                    {learningPath.items.map((item, idx) => {
                      const isCompleted = item.status === 'COMPLETED';
                      const isInProgress = item.status === 'IN_PROGRESS';
                      const isUpdating = updatingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCompleted
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : isInProgress
                              ? 'bg-cyan-950/20 border-cyan-500/40'
                              : 'bg-slate-950 border-slate-800/80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black flex-shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-slate-950'
                                    : isInProgress
                                    ? 'bg-cyan-500 text-slate-950'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                                }`}
                              >
                                {String(idx + 1).padStart(2, '0')}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-white">{item.skillName}</h4>
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      item.priority === 'HIGH'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {item.priority}
                                  </span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-400" /> {item.estimatedHours}h
                                  </span>
                                </div>

                                {item.resource ? (
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    <span className="text-[11px] text-slate-300 font-medium">
                                      {item.resource.title}
                                    </span>
                                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-800">
                                      {item.resource.provider}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-500">
                                    No approved catalog resource currently mapped
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Resource Actions & Status Toggle */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {item.resource?.url && (
                                <a
                                  href={item.resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors"
                                >
                                  <span>Open Resource</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateItemProgress(item.id, 'NOT_STARTED')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    item.status === 'NOT_STARTED'
                                      ? 'bg-slate-800 text-white'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  To Do
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateItemProgress(item.id, 'IN_PROGRESS')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    item.status === 'IN_PROGRESS'
                                      ? 'bg-cyan-500 text-slate-950'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  In Progress
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateItemProgress(item.id, 'COMPLETED')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    item.status === 'COMPLETED'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* About the Role */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" /> About the Opportunity
            </h2>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </div>

          {/* Key Responsibilities */}
          {job.responsibilities && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" /> Key Responsibilities
              </h2>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {job.responsibilities}
              </div>
            </div>
          )}

          {/* Requirements & Qualifications */}
          {job.requirements && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" /> Requirements & Qualifications
              </h2>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {job.requirements}
              </div>
            </div>
          )}

          {/* Perks & Benefits */}
          {job.benefits && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Perks & Benefits
              </h2>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {job.benefits}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Required Skills & Stack Breakdown */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-800/80 space-y-6 sticky top-20">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-400" /> Skill Requirements
            </h2>

            {/* Required Skills */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                Required Technical Skills
              </span>
              {requiredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {requiredSkills.map((sk: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold"
                    >
                      {sk.name || sk.skill?.name || 'Skill'}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">None explicitly marked as mandatory</p>
              )}
            </div>

            {/* Preferred Skills */}
            <div className="space-y-2.5 pt-4 border-t border-slate-800/60">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                Preferred & Nice-to-Have
              </span>
              {preferredSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {preferredSkills.map((sk: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold"
                    >
                      {sk.name || sk.skill?.name || 'Skill'}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">None explicitly specified</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Now Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setApplyModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Apply for Position</h3>
                <p className="text-xs text-slate-400 mt-0.5">{job.title} • {job.companyName}</p>
              </div>
              <button type="button" onClick={() => setApplyModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {appSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-teal-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Application Submitted!</h4>
                <p className="text-xs text-slate-400">Redirecting to your application dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-5">
                {appError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{appError}</span>
                  </div>
                )}

                {/* Resume Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Attached Resume <span className="text-rose-400">*</span>
                  </label>
                  {loadingResume ? (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 animate-pulse">
                      Loading your active resume...
                    </div>
                  ) : candidateResume ? (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-teal-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{candidateResume.originalFileName}</p>
                          <p className="text-[10px] text-slate-400">Uploaded {new Date(candidateResume.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        Selected
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 text-center space-y-2">
                      <p className="text-xs text-rose-300">No active resume found in your account.</p>
                      <Link href="/dashboard/resume">
                        <Button size="sm" variant="outline">
                          Upload Resume First
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Cover Letter <span className="text-slate-500 text-[10px]">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {coverLetter.length} / 5000
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={5000}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Briefly introduce yourself and highlight your relevant experience for this role..."
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setApplyModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingApp || !candidateResume}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold"
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    {isSubmittingApp ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
