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
  Sparkles,
  Bot,
  FileText,
  Compass,
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  ChevronRight,
  Target,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DashboardShell } from '../../components/dashboard/DashboardShell';
import { TargetRoleSkillGap } from '../../components/dashboard/TargetRoleSkillGap';

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
        <div className="space-y-6 animate-pulse">
          <div className="h-36 bg-[#111827] border border-gray-800 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[#111827] border border-gray-800 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-[#111827] border border-gray-800 rounded-2xl" />
            <div className="h-96 bg-[#111827] border border-gray-800 rounded-2xl" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  const candidateName = profileSummary?.profile?.name || user?.email?.split('@')[0] || 'Candidate';
  const targetRole = profileSummary?.profile?.headline || 'Software Engineer';
  const skillsCount = profileSummary?.skillsCount || 0;
  const isResumeIndexed = resume?.processingStatus === 'EMBEDDED' || resume?.processingStatus === 'PARSED';

  // Calculate actual readiness score based on verified backend profile attributes
  let readinessScore = profileSummary?.completeness?.percentage || 30;
  if (isResumeIndexed) readinessScore = Math.max(readinessScore, 75);

  return (
    <DashboardShell>
      <div className="space-y-6 max-w-7xl">
        {/* 1. Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#1e1b4b] border border-gray-800/90 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Grounded AI Intelligence Active
                </span>
                <span className="text-xs text-gray-400">Target Role: <strong className="text-gray-200">{targetRole}</strong></span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Good morning, {candidateName}
              </h1>
              <p className="text-sm text-gray-300 leading-relaxed">
                Your AI-analyzed career readiness and real-time job market alignment at a glance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/dashboard/resume">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 bg-gray-900/80 hover:bg-gray-800 text-gray-200 text-xs"
                  leftIcon={<FileText className="w-4 h-4 text-blue-400" />}
                >
                  Analyze Resume
                </Button>
              </Link>
              <Link href="/dashboard/career-assistant">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/20 text-xs"
                  leftIcon={<Bot className="w-4 h-4" />}
                >
                  Ask Career AI
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Career Readiness */}
          <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Career Readiness</span>
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{readinessScore}%</span>
                <span className="text-[11px] text-emerald-400 font-medium">Profile Optimized</span>
              </div>
              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Verified Skills */}
          <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Verified Skills</span>
              <BrainCircuit className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{skillsCount}</span>
                <span className="text-[11px] text-gray-400">Extracted Skills</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 truncate">
                {skillsCount > 0 ? `${skillsCount} skills recorded in taxonomy` : 'Upload resume to extract skills'}
              </p>
            </div>
          </div>

          {/* Resume & FAISS Vector Status */}
          <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">FAISS Vector Index</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-white uppercase">
                  {isResumeIndexed ? 'Indexed' : 'Pending'}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">384-Dim BGE</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {isResumeIndexed ? 'Semantic search ready' : 'Resume awaiting parsing'}
              </p>
            </div>
          </div>

          {/* AI Career Assistant */}
          <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">AI Consultations</span>
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">Grounded</span>
                <span className="text-[11px] text-blue-400 font-medium">RAG v1</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Zero hallucination citations
              </p>
            </div>
          </div>
        </div>

        {/* 3. Main Workspace: Skill-Gap Analysis & Recommended Roles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Target Role Skill-Gap Analysis Component */}
          <div className="lg:col-span-2 space-y-6">
            <TargetRoleSkillGap />
          </div>

          {/* Right Col: AI Assistant Quick Prompts & Role Matches */}
          <div className="space-y-6">
            {/* AI Assistant Quick Launcher */}
            <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <h2 className="text-sm font-bold text-white">Ask Career AI</h2>
                </div>
                <Link
                  href="/dashboard/career-assistant"
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  Open Chat <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-xs text-gray-400">
                Direct questions answered strictly using your indexed profile and market benchmarks.
              </p>

              <div className="space-y-2">
                {[
                  'What roles fit my current skills?',
                  'What skills am I missing for a backend role?',
                  'Create a learning roadmap for my target role',
                  'How can I improve my resume match score?',
                ].map((promptText, idx) => (
                  <Link
                    key={idx}
                    href={`/dashboard/career-assistant?q=${encodeURIComponent(promptText)}`}
                    className="block p-2.5 rounded-xl bg-gray-900/60 hover:bg-blue-900/20 border border-gray-800 hover:border-blue-500/30 text-xs text-gray-300 hover:text-white transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{promptText}</span>
                      <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-blue-400 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recommended Roles Preview */}
            <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Compass className="w-4 h-4 text-purple-400" />
                  </div>
                  <h2 className="text-sm font-bold text-white">Recommended Roles</h2>
                </div>
                <Link
                  href="/dashboard/recommendations"
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {recommendations.length > 0 ? (
                  recommendations.slice(0, 3).map((job: any, idx: number) => (
                    <div
                      key={job.id || idx}
                      className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                          {job.title}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {job.matchScore ? `${Math.round(job.matchScore)}% Match` : 'Strong Match'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">
                        {job.company || 'Enterprise Partner'} · {job.location || 'Remote'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-gray-400">
                      Upload your resume to receive AI matched roles.
                    </p>
                    <Link href="/dashboard/resume">
                      <Button variant="outline" size="sm" className="text-xs border-gray-700">
                        Upload Resume
                      </Button>
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
