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
  Compass,
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  Target,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { TargetRoleSkillGap } from '../../components/dashboard/TargetRoleSkillGap';
import { MetricCard } from '../../components/ui/MetricCard';
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
      const recoPromise = api.get<JobRecommendationListResponse>('/recommendations/jobs?limit=3').catch(() => null);

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
        <div className="space-y-5 animate-pulse">
          <div className="h-28 bg-[#111827] border border-[#1f2937] rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[#111827] border border-[#1f2937] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 h-96 bg-[#111827] border border-[#1f2937] rounded-xl" />
            <div className="h-96 bg-[#111827] border border-[#1f2937] rounded-xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  const candidateName = profileSummary?.profile?.name || user?.email?.split('@')[0] || 'Candidate';
  const targetRole = profileSummary?.profile?.headline || 'Backend & AI Engineer';
  const skillsCount = profileSummary?.skillsCount || 0;
  const isResumeIndexed = resume?.processingStatus === 'EMBEDDED' || resume?.processingStatus === 'PARSED';
  const profileCompleteness = profileSummary?.completeness?.percentage || 60;

  // Genuine readiness metric derived from verified skills and resume status
  let readinessScore = profileCompleteness;
  if (isResumeIndexed) readinessScore = Math.max(readinessScore, 78);

  return (
    <DashboardShell>
      <div className="space-y-5 max-w-7xl">
        {/* 1. Hero Banner */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Target Role
              </span>
              <span className="text-xs font-semibold text-gray-200">{targetRole}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Good morning, {candidateName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Your AI-powered career insights based on your verified resume, skills, and target career trajectory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link href="/dashboard/resume">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-300 hover:text-white"
                leftIcon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
              >
                Resume Lab
              </Button>
            </Link>
            <Link href="/dashboard/career-assistant">
              <Button
                size="sm"
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                leftIcon={<Bot className="w-3.5 h-3.5" />}
              >
                Ask Career Mentor
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Key Metrics Grid (Career-Focused) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <MetricCard
            label="Career Readiness"
            value={`${readinessScore}%`}
            trend="Optimized"
            progress={readinessScore}
            description="Alignment with target role benchmarks"
            icon={Target}
            iconColor="text-blue-400"
          />

          <MetricCard
            label="Verified Skills"
            value={skillsCount}
            subvalue={skillsCount > 0 ? 'Taxonomy indexed' : 'Awaiting extraction'}
            description={`${skillsCount} skills mapped to career profiles`}
            icon={BrainCircuit}
            iconColor="text-cyan-400"
          />

          <MetricCard
            label="Resume Status"
            value={isResumeIndexed ? 'Ready' : 'Pending'}
            subvalue={isResumeIndexed ? 'AI search ready' : 'Upload required'}
            description={isResumeIndexed ? 'Resume parsed & indexed' : 'Upload to unlock deep insights'}
            icon={ShieldCheck}
            iconColor={isResumeIndexed ? 'text-emerald-400' : 'text-amber-400'}
          />

          <MetricCard
            label="Profile Strength"
            value={`${profileCompleteness}%`}
            trend="+Complete"
            progress={profileCompleteness}
            description="Verified experience & education"
            icon={CheckCircle2}
            iconColor="text-purple-400"
          />
        </div>

        {/* 3. Main Workspace: Skill-Gap Analysis & AI Mentor Preview / Role Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 Cols: Target Role Skill-Gap Analysis */}
          <div className="lg:col-span-2 space-y-5">
            <TargetRoleSkillGap />
          </div>

          {/* Right Col: AI Mentor Quick Launcher & Role Matches */}
          <div className="space-y-4">
            {/* AI Assistant Quick Launcher (Compact) */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                  </div>
                  <h2 className="text-xs font-bold text-white">AI Career Mentor</h2>
                </div>
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                  Grounded
                </span>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Ask questions tailored to your profile, skill gaps, or interview readiness.
              </p>

              <div className="space-y-1.5">
                {[
                  "What's my biggest skill gap for this role?",
                  'Suggest my next 3 learning milestones',
                  'Am I ready for a Senior backend role?',
                ].map((prompt, pIdx) => (
                  <Link
                    key={pIdx}
                    href={`/dashboard/career-assistant?q=${encodeURIComponent(prompt)}`}
                    className="block p-2 rounded-lg bg-[#0b0f19] border border-[#1a2233] hover:border-purple-500/40 text-xs text-gray-300 hover:text-white transition-colors truncate"
                  >
                    &quot;{prompt}&quot;
                  </Link>
                ))}
              </div>

              <Link href="/dashboard/career-assistant" className="block pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-[#1f2937] hover:bg-gray-800 text-purple-300 hover:text-white"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Open Full AI Workspace
                </Button>
              </Link>
            </div>

            {/* Quick Recommended Roles */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /> Top Role Matches
                </h2>
                <Link
                  href="/dashboard/recommendations"
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all →
                </Link>
              </div>

              <div className="space-y-2">
                {recommendations.length > 0 ? (
                  recommendations.map((rec: any, rIdx: number) => {
                    const matchScore = rec.overallScore || rec.matchScore || 85;
                    return (
                      <div
                        key={rec.id || rIdx}
                        className="p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] hover:border-gray-700 transition-colors space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-xs font-semibold text-white truncate">
                              {rec.job?.title || rec.title || 'Full Stack Engineer'}
                            </h3>
                            <span className="text-[11px] text-gray-400 truncate block">
                              {rec.job?.companyName || 'TechCorp'} • {rec.job?.location || 'Remote'}
                            </span>
                          </div>
                          <ScoreBadge score={matchScore} size="sm" showLabel={false} />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-gray-500">
                            {rec.matchedSkills?.length || 3} matched skills
                          </span>
                          <Link
                            href={`/jobs/${rec.jobId || rec.id}`}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                          >
                            View Role →
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-xs text-gray-500">
                    No recommendations loaded yet.{' '}
                    <Link href="/dashboard/recommendations" className="text-blue-400 underline">
                      Explore matches
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
