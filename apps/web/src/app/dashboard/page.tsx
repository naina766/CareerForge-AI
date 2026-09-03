'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  CandidateProfileSummary,
} from '@careerforge/types';
import {
  User,
  Briefcase,
  ShieldAlert,
  LogOut,
  FileText,
  BrainCircuit,
  TrendingUp,
  Users,
  Activity,
  Layers,
  Zap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TargetRoleSkillGap } from '../../components/dashboard/TargetRoleSkillGap';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading workspace session...</span>
        </div>
      </div>
    );
  }

  const role = user.role;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-slate-800/90 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center font-bold text-xl text-teal-300 uppercase">
              {user.email.slice(0, 2)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Welcome back, {user.email.split('@')[0]}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  role === 'ADMIN'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                    : role === 'RECRUITER'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                }`}
              >
                {role} Persona
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authenticated via Short-Lived JWT & Rotated Refresh Session • {user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4 text-slate-400" />}
            className="w-full sm:w-auto"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Role-Specific Workspace View */}
      {role === 'CANDIDATE' && <CandidateWorkspace />}
      {role === 'RECRUITER' && <RecruiterWorkspace />}
      {role === 'ADMIN' && <AdminWorkspace />}
    </div>
  );
}

function CandidateWorkspace() {
  const [summary, setSummary] = useState<CandidateProfileSummary | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await api.get<CandidateProfileSummary>('/candidates/me/profile/summary');
        setSummary(res.data);
      } catch (e) {
        console.warn('Could not load candidate summary:', e);
      }
    }
    loadSummary();
  }, []);

  const percentage = summary?.completeness.percentage ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-teal-400" /> Candidate Intelligence Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Resume analysis, explainable job matches, and career assistance</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
          Profile Ready
        </span>
      </div>

      {/* Interactive Target Role & Skill Gap Analysis Widget */}
      <TargetRoleSkillGap />

      {/* Candidate Profile Strength Spotlight Card */}
      <div className="glass-panel rounded-3xl p-6 border border-teal-500/30 bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-teal-950/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Career Profile Strength</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
              {percentage}% Complete
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            {percentage === 100
              ? 'Your profile is fully completed and primed for precision career matching.'
              : 'Add structured skills, education, and career preferences to maximize your match ranking accuracy.'}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
            <span>⚡ Skills: {summary?.skillsCount ?? 0}</span>
            <span>💼 Roles: {summary?.experiencesCount ?? 0}</span>
            <span>🎓 Education: {summary?.educationsCount ?? 0}</span>
            <span>🎯 Preferences: {summary?.hasPreferences ? 'Set' : 'Pending'}</span>
          </div>
        </div>

        <Link href="/dashboard/profile">
          <Button size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Manage Career Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Link href="/dashboard/career-assistant" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 hover:border-indigo-400 border-indigo-500/30 bg-indigo-500/5 transition-all cursor-pointer shadow-lg shadow-indigo-500/5">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                AI Advisor <Sparkles className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Career Assistant</h3>
              <p className="text-xs text-slate-400 mt-1">
                Grounded career copilot with personalized citations.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/recommendations" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 hover:border-teal-400 border-teal-500/30 bg-teal-500/5 transition-all cursor-pointer shadow-lg shadow-teal-500/5">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                Top Match <Sparkles className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">AI Recommendations</h3>
              <p className="text-xs text-slate-400 mt-1">
                Explainable scoring & semantic matched vacancies.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/profile" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 hover:border-teal-500/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-teal-400">Profile Active</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Career Profile</h3>
              <p className="text-xs text-slate-400 mt-1">Manage technical skills, education, and job preferences.</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/resume" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 hover:border-cyan-500/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-cyan-400">
                {summary?.resume ? 'Resume Stored' : 'Upload Resume'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Resume Pipeline</h3>
              <p className="text-xs text-slate-400 mt-1">
                {summary?.resume
                  ? `${summary.resume.originalFileName} (Ready)`
                  : 'Upload your latest PDF resume for secure storage & processing.'}
              </p>
            </div>
          </div>
        </Link>

        <Link href="/jobs" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 hover:border-emerald-500/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                Live Openings <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Explore Vacancies</h3>
              <p className="text-xs text-slate-400 mt-1">
                Browse verified openings, filter by work mode, canonical skills, and salaries.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/applications" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 hover:border-purple-500/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                Active Pipeline <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">My Applications</h3>
              <p className="text-xs text-slate-400 mt-1">Track submitted applications, interview stages, and offers.</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function RecruiterWorkspace() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-400" /> Recruiter Talent Portal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Job lifecycle management, candidate ranking, and hiring pipeline</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
          Recruiter Persona
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/recruiter/jobs" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 border border-cyan-500/30 hover:border-cyan-400/60 transition-all hover:scale-[1.01] cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                Active Portal <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Job Postings & Lifecycle</h3>
              <p className="text-xs text-slate-400 mt-1">
                Create, draft, publish, and manage job listings with canonical skill taxonomy.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/recruiter/jobs" className="block">
          <div className="glass-card rounded-2xl p-5 space-y-3 hover:border-indigo-500/50 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                Phase 12 Active <ArrowRight className="w-3 h-3" />
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Kanban Pipeline</h3>
              <p className="text-xs text-slate-400 mt-1">Move candidates across Applied, Screening, Interview, and Offer.</p>
            </div>
          </div>
        </Link>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Phase 17</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Kafka Event Stream</h3>
            <p className="text-xs text-slate-400 mt-1">Instant updates when new candidates match your open roles.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminWorkspace() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-400" /> Administrative Governance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Platform telemetry, user moderation, and security audit logs</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
          Admin Persona
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Users</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">User Management</h3>
            <p className="text-xs text-slate-400 mt-1">Inspect candidate, recruiter, and administrator accounts.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Health</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">System Health</h3>
            <p className="text-xs text-slate-400 mt-1">PostgreSQL, FAISS, Redis, and Kafka cluster telemetry.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Security</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Audit Logs</h3>
            <p className="text-xs text-slate-400 mt-1">Track login attempts, token rotations, and authorization events.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Phase 23</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">AI Usage & Cost</h3>
            <p className="text-xs text-slate-400 mt-1">Monitor token consumption, prompt latency, and LLM costs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
