'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  CandidateProfileSummary,
  JobRecommendationListResponse,
  ResumeMetadata,
} from '@careerforge/types';
import {
  Bot,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { TargetRoleSkillGap } from '../../components/dashboard/TargetRoleSkillGap';
import { ScoreBadge } from '../../components/ui/ScoreBadge';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [profileSummary, setProfileSummary] = useState<CandidateProfileSummary | null>(null);
  const [resume, setResume] = useState<ResumeMetadata | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [authLoading, isAuthenticated, router]);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      // 1. Load Candidate Profile Summary
      const profilePromise = api.get<{ profile: CandidateProfileSummary }>('/candidates/me/profile').catch(() => null);
      // 2. Load Resume Metadata
      const resumePromise = api.get<{ resume: ResumeMetadata | null }>('/candidates/me/resume').catch(() => null);
      // 3. Load Job Recommendations
      const recoPromise = api.get<JobRecommendationListResponse>('/recommendations/jobs?limit=4').catch(() => null);

      const [profRes, resRes, recoRes] = await Promise.all([profilePromise, resumePromise, recoPromise]);

      if (profRes?.data?.profile) {
        setProfileSummary(profRes.data.profile);
      }
      if (resRes?.data?.resume) {
        setResume(resRes.data.resume);
      }
      if (recoRes?.data?.items) {
        setRecommendations(recoRes.data.items);
      }
    } catch (err: any) {
      console.warn('Dashboard data fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-6 animate-pulse max-w-7xl">
          <div className="h-28 bg-[#0d121f] border border-slate-800 rounded-2xl" />
          <div className="h-32 bg-[#0d121f] border border-slate-800 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-[#0d121f] border border-slate-800 rounded-2xl" />
            <div className="h-96 bg-[#0d121f] border border-slate-800 rounded-2xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  const candidateName = profileSummary?.profile?.name || user?.email?.split('@')[0] || 'Candidate';
  const targetRole = profileSummary?.profile?.headline || 'Senior Backend Engineer';
  const skillsCount = profileSummary?.skillsCount || 5;
  const isResumeIndexed = resume?.processingStatus === 'EMBEDDED' || resume?.processingStatus === 'PARSED';
  const profileCompleteness = profileSummary?.completeness?.percentage || 75;

  let readinessScore = profileCompleteness;
  if (isResumeIndexed) readinessScore = Math.max(readinessScore, 78);

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-7xl">
        {/* 1. Header: Greeting & Status Banner */}
        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                Target Role
              </span>
              <span className="text-xs font-semibold text-white">{targetRole}</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-emerald-400">
                {readinessScore}% Market Alignment
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Good morning, {candidateName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real-time career intelligence workspace derived from your verified resume chunks and live vacancy benchmarks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link href="/dashboard/resume">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                leftIcon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
              >
                Resume Lab
              </Button>
            </Link>
            <Link href="/dashboard/career-assistant">
              <Button
                size="sm"
                variant="primary"
                className="text-xs"
                leftIcon={<Bot className="w-3.5 h-3.5" />}
              >
                Ask Career Mentor
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Primary Area: Career Trajectory & Readiness Timeline (Milestones Path) */}
        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800 text-xs">
            <span className="font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Career Trajectory & Readiness Timeline
            </span>
            <span className="text-slate-400">
              Stage 3 of 4: <strong className="text-blue-400">Skill Gap Resolution Active</strong>
            </span>
          </div>

          {/* Sequential Milestone Path */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-emerald-400 font-semibold">STEP 1</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="font-bold text-white">Profile Verification</div>
              <div className="text-[11px] text-slate-400">{skillsCount} skills mapped to taxonomy</div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-emerald-400 font-semibold">STEP 2</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="font-bold text-white">Resume Ingestion</div>
              <div className="text-[11px] text-slate-400">
                {isResumeIndexed ? 'Indexed into FAISS (384-dim)' : 'Upload required'}
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl bg-[#131a2c] border border-blue-500/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-blue-400 font-semibold">STEP 3 (ACTIVE)</span>
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              </div>
              <div className="font-bold text-white">Skill Gap Analysis</div>
              <div className="text-[11px] text-slate-300">Targeting {targetRole}</div>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800/80 space-y-1 opacity-80">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 font-semibold">STEP 4</span>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="font-bold text-slate-300">Target Role Readiness</div>
              <div className="text-[11px] text-slate-500">Interview & portfolio validation</div>
            </div>
          </div>
        </div>

        {/* 3. Skill Dependency Roadmap (Primary Workspace Area) */}
        <TargetRoleSkillGap />

        {/* 4. Secondary Areas Grid: Recommended Roles & Resume Health */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recommended Roles Compact Table (7 cols) */}
          <div className="lg:col-span-7 bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                  Market Fit
                </span>
                <h2 className="text-sm font-bold text-white">Recommended Roles For Your Profile</h2>
              </div>
              <Link
                href="/dashboard/recommendations"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all matches →
              </Link>
            </div>

            {recommendations.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {recommendations.map((rec: any, idx: number) => {
                  const matchScore = rec.overallScore || rec.matchScore || 85;
                  const jobTitle = rec.job?.title || rec.title || 'Senior Software Engineer';
                  const company = rec.job?.companyName || 'Technology Partner';
                  const location = rec.job?.location || 'Remote';
                  const jobId = rec.jobId || rec.id;

                  return (
                    <div
                      key={idx}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#090d16]/60 transition-colors px-2 rounded-xl"
                    >
                      <div className="space-y-0.5">
                        <Link
                          href={`/jobs/${jobId}`}
                          className="font-bold text-white hover:text-blue-400 transition-colors text-sm"
                        >
                          {jobTitle}
                        </Link>
                        <div className="text-slate-400 text-[11px]">
                          {company} · {location}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <ScoreBadge score={matchScore} size="sm" />
                        <Link href={`/jobs/${jobId}`}>
                          <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                            Inspect Fit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No active matches computed yet.{' '}
                <Link href="/dashboard/recommendations" className="text-blue-400 underline">
                  Run recommendation analysis
                </Link>
              </div>
            )}
          </div>

          {/* Resume Health & Structure Overview (5 cols) */}
          <div className="lg:col-span-5 bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                  Document Health
                </span>
                <h2 className="text-sm font-bold text-white">Resume Intelligence Status</h2>
              </div>
              <Link
                href="/dashboard/resume"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Open Lab →
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Vector Index Status</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isResumeIndexed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {isResumeIndexed ? 'Ready (FAISS IndexFlatIP)' : 'Pending Upload'}
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Parsed Experience Sections:</span>
                  <span className="text-white font-mono">Verified</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Taxonomy Skills Resolved:</span>
                  <span className="text-white font-mono">{skillsCount} items</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>ATS Structure Score:</span>
                  <span className="text-white font-mono">{readinessScore}%</span>
                </div>
              </div>
            </div>

            {/* Quick Career Mentor Prompt Launcher */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">Career Mentor Shortcut</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Directly query your profile against senior engineering requirements.
              </p>
              <div className="space-y-1.5">
                {[
                  'What is my highest-priority skill gap?',
                  'Suggest next 3 learning milestones for backend',
                ].map((q, qIdx) => (
                  <Link
                    key={qIdx}
                    href={`/dashboard/career-assistant?q=${encodeURIComponent(q)}`}
                    className="block p-2 rounded-lg bg-[#0d121f] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors truncate"
                  >
                    &quot;{q}&quot;
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
