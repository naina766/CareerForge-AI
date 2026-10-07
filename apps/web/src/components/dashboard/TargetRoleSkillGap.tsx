'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import {
  Target,
  ChevronDown,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  GraduationCap,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface JobSummary {
  id: string;
  title: string;
  department?: string;
  location?: string;
  workMode?: string;
  requiredSkills?: Array<{ name: string } | string>;
}

interface GapItem {
  skill: string;
  priority: 'High' | 'Medium' | 'Low';
  category: string;
}

export function TargetRoleSkillGap() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedRole, setSelectedRole] = useState('Senior Backend Engineer');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [readinessScore, setReadinessScore] = useState(78);
  const [strongSkills, setStrongSkills] = useState<string[]>([
    'Node.js',
    'PostgreSQL',
    'TypeScript',
    'REST APIs',
    'Docker',
  ]);
  const [gaps, setGaps] = useState<GapItem[]>([
    { skill: 'Kubernetes', priority: 'High', category: 'Infrastructure' },
    { skill: 'System Design', priority: 'High', category: 'Architecture' },
    { skill: 'Kafka', priority: 'Medium', category: 'Event Streaming' },
    { skill: 'AWS Cloud', priority: 'Medium', category: 'Cloud Platforms' },
  ]);

  // Keyboard accessibility: Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Load real job taxonomy from backend
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get<{ items: JobSummary[] } | JobSummary[]>('/jobs?limit=20');
        const list = Array.isArray(res.data) ? res.data : res.data.items || [];
        if (list.length > 0) {
          setJobs(list);
          setSelectedJobId(list[0].id);
          setSelectedRole(list[0].title);
        }
      } catch (err) {
        console.warn('Could not load dynamic job list, using taxonomy fallback:', err);
      }
    }
    loadJobs();
  }, []);

  const handleSelectRole = async (job: JobSummary) => {
    setSelectedRole(job.title);
    setSelectedJobId(job.id);
    setIsModalOpen(false);
    setIsAnalyzing(true);

    try {
      // Fetch real grounded RAG skill gap analysis for this job role
      const ragRes = await api.post<{
        target_role: string;
        existing_skills: string[];
        missing_skills: string[];
        priority_skills: string[];
        grounding_evidence: string;
        citations: any[];
      }>('/career-assistant/skill-gap', { targetRole: job.title });

      if (ragRes.data) {
        const existing = ragRes.data.existing_skills || [];
        const missing = ragRes.data.missing_skills || [];
        const priority = new Set(ragRes.data.priority_skills || []);

        const total = existing.length + missing.length;
        const calculatedScore = total > 0 ? Math.round((existing.length / total) * 100) : 75;
        setReadinessScore(calculatedScore);

        if (existing.length > 0) {
          setStrongSkills(existing.slice(0, 6));
        }

        if (missing.length > 0) {
          const mappedGaps: GapItem[] = missing.slice(0, 4).map((skillName) => ({
            skill: skillName,
            priority: priority.has(skillName) ? 'High' : 'Medium',
            category: 'Target Competency',
          }));
          setGaps(mappedGaps);
        }
      }
    } catch (err) {
      console.warn('Real-time RAG skill-gap analysis warning:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredJobs = jobs.filter((j) =>
    j.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="skill-gap" className="bg-[#0d121f] rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-6">
      {/* Header Bar with Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Dependency Roadmap
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Skill-Gap Analysis & Progression Tree
          </h2>
        </div>

        {/* Change Target Role Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090d16] border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors text-xs font-medium self-start sm:self-center"
        >
          <span className="text-slate-400">Target Role:</span>
          <span className="text-white font-semibold">{selectedRole}</span>
          <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
        </button>
      </div>

      {/* Main Analysis Body */}
      {isAnalyzing ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-300">
            Benchmarking your verified profile against <strong className="text-white">{selectedRole}</strong>...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fit Progress Summary Bar */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Readiness Alignment</span>
                <span className="text-xs font-mono font-bold text-white">{readinessScore}%</span>
              </div>
              <div className="w-full sm:w-64 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400">
                <strong className="text-white font-mono">{strongSkills.length}</strong> Verified Strengths
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                <strong className="text-amber-400 font-mono">{gaps.length}</strong> Missing Gaps
              </span>
            </div>
          </div>

          {/* Visual Roadmap / Dependency Tree (What I Know -> What I'm Missing -> What to Learn Next) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Branch 1: What Do I Know? */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  What Do I Know?
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  Verified
                </span>
              </div>

              <div className="space-y-2">
                {strongSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0d121f] border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <span className="text-slate-200 font-medium">{skill}</span>
                    <span className="text-[10px] font-mono text-slate-500">Taxonomy match</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch 2: What Am I Missing? */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  What Am I Missing?
                </span>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">Priority</span>
              </div>

              <div className="space-y-2">
                {gaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0d121f] border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="text-white font-medium block">{gap.skill}</span>
                      <span className="text-[10px] text-slate-400">{gap.category}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                        gap.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {gap.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch 3: What Should I Learn Next? */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-blue-500/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    What Should I Learn Next?
                  </span>
                  <span className="text-[10px] font-mono text-blue-400 uppercase">Actionable</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-[#0d121f] border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">
                      Recommended Focus #1
                    </span>
                    <div className="text-white font-semibold">
                      {gaps[0]?.skill || 'System Design Fundamentals'}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Highest-priority capability gap standing between current profile and {selectedRole}.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0d121f] border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Recommended Focus #2
                    </span>
                    <div className="text-slate-200 font-semibold">
                      {gaps[1]?.skill || 'Event-Driven Streaming'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-1.5">
                <Link href="/dashboard/career-assistant">
                  <Button size="sm" variant="outline" className="w-full text-xs" leftIcon={<Bot className="w-3.5 h-3.5 text-blue-400" />}>
                    Consult Career Mentor On This Gap
                  </Button>
                </Link>
                {selectedJobId && (
                  <Link href={`/jobs/${selectedJobId}`} className="block">
                    <Button size="sm" variant="ghost" className="w-full text-xs text-slate-400 hover:text-white" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Inspect Benchmark Vacancy
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Role Selector Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="target-role-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-[#0d121f] border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="space-y-0.5">
                <h3 id="target-role-modal-title" className="text-sm font-bold text-white">
                  Select Target Role
                </h3>
                <p className="text-xs text-slate-400">Choose a benchmark vacancy to recalculate skill gaps</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search engineering positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search engineering roles"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090d16] border border-slate-800 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            {/* Role List */}
            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-[140px]" role="listbox" aria-label="Available engineering roles">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => {
                  const isSelected = selectedRole === job.title;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectRole(job)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-colors border flex items-center justify-between min-h-[40px] ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-300 font-semibold'
                          : 'bg-[#090d16] border-slate-800/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="block text-white font-medium">{job.title}</span>
                        {job.department && (
                          <span className="text-[10px] text-slate-400">{job.department}</span>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No vacancies match your search term.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800 shrink-0">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
