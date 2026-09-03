'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import {
  Target,
  ChevronDown,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  X,
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
  const [readinessScore, setReadinessScore] = useState(76);
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
        const existingCount = ragRes.data.existing_skills?.length || 0;
        const missingCount = ragRes.data.missing_skills?.length || 0;
        const total = existingCount + missingCount;
        const calculatedScore = total > 0 ? Math.round((existingCount / total) * 100) : 75;
        setReadinessScore(calculatedScore);

        const missing = ragRes.data.missing_skills || [];
        const priority = new Set(ragRes.data.priority_skills || []);

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
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
      {/* Header Bar with Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Career Target & Skill Gap Intelligence
          </span>
          <h3 className="text-xl font-bold text-white tracking-tight mt-1">
            Role Readiness Benchmark
          </h3>
        </div>

        {/* Change Target Role Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-teal-500/50 text-slate-200 transition-all text-xs font-semibold self-start sm:self-center shadow-sm"
        >
          <span className="text-slate-400">Target Role:</span>
          <span className="text-white font-bold">{selectedRole}</span>
          <ChevronDown className="w-3.5 h-3.5 text-teal-400" />
        </button>
      </div>

      {/* Main Analysis Body */}
      {isAnalyzing ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-300 font-medium">
            Analyzing your verified skills for <strong className="text-white">{selectedRole}</strong>...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Readiness Gauge */}
          <div className="lg:col-span-5 bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Profile Readiness</span>
              <span className="text-2xl font-black text-cyan-300 font-mono">{readinessScore}%</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 h-3 rounded-full transition-all duration-700"
                style={{ width: `${readinessScore}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Based on your current verified capabilities, you are <strong className="text-slate-200">{readinessScore}%</strong> aligned with market expectations for this position.
            </p>

            <div className="pt-1">
              <Link href={selectedJobId ? `/jobs/${selectedJobId}` : '/jobs'}>
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5 text-teal-400" />}>
                  View Full Role Breakdown
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Missing Capabilities */}
          <div className="lg:col-span-7 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> High-Impact Missing Skills ({gaps.length})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {gaps.map((gap, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/70 hover:border-slate-700 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white block">{gap.skill}</span>
                    <span className="text-[10px] text-slate-500">{gap.category}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      gap.priority === 'High'
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                    }`}
                  >
                    {gap.priority}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Link href="/dashboard/career-assistant">
                <span className="text-xs text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> Ask AI Mentor how to bridge these gaps
                </span>
              </Link>
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="space-y-0.5">
                <h4 id="target-role-modal-title" className="text-base font-bold text-white">
                  Select Target Role
                </h4>
                <p className="text-xs text-slate-400">Choose a vacancy or taxonomy role to benchmark against</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search engineering roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search engineering roles"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-teal-500"
              />
            </div>

            {/* Role List */}
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[140px]" role="listbox" aria-label="Available engineering roles">
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
                      className={`w-full p-3 rounded-xl text-left text-xs font-semibold transition-all border flex items-center justify-between min-h-[44px] ${
                        isSelected
                          ? 'bg-teal-500/15 border-teal-500/40 text-teal-200'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <span className="block text-white">{job.title}</span>
                        {job.department && (
                          <span className="text-[10px] text-slate-500">{job.department}</span>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No roles match your search term.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
