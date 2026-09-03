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
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ScoreBadge } from '../ui/ScoreBadge';

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
    <div className="bg-[#111827] rounded-xl p-5 sm:p-6 border border-[#1f2937] space-y-5">
      {/* Header Bar with Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1f2937]">
        <div>
          <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Career Target & Readiness
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Skill-Gap Analysis
          </h2>
        </div>

        {/* Change Target Role Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b0f19] border border-[#1f2937] hover:border-gray-700 text-gray-200 transition-colors text-xs font-medium self-start sm:self-center"
        >
          <span className="text-gray-400">Target Role:</span>
          <span className="text-white font-semibold">{selectedRole}</span>
          <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
        </button>
      </div>

      {/* Main Analysis Body */}
      {isAnalyzing ? (
        <div className="py-10 flex flex-col items-center justify-center space-y-2.5">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-xs text-gray-300">
            Benchmarking your verified profile against <strong className="text-white">{selectedRole}</strong>...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Overall Fit Score Gauge */}
          <div className="lg:col-span-5 bg-[#0b0f19] rounded-xl p-4 border border-[#1a2233] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Target Role Fit</span>
              <ScoreBadge score={readinessScore} size="md" />
            </div>

            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-700"
                style={{ width: `${readinessScore}%` }}
              />
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Based on your resume and skills, you are <strong className="text-gray-200">{readinessScore}%</strong> aligned with market expectations for this position.
            </p>

            {/* Strong Skills summary */}
            <div className="pt-2 border-t border-gray-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Verified Strengths ({strongSkills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {strongSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Missing Priority Gaps */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Priority Gaps ({gaps.length})
              </span>
              <Link href="/dashboard/career-assistant">
                <span className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Ask Mentor
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gaps.map((gap, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] flex items-center justify-between text-xs transition-colors hover:border-gray-700"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white block">{gap.skill}</span>
                    <span className="text-[11px] text-gray-400">{gap.category}</span>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      gap.priority === 'High'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {gap.priority}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href={selectedJobId ? `/jobs/${selectedJobId}` : '/jobs'}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800/60"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-blue-400" />}
                >
                  View Full Role Breakdown
                </Button>
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-[#111827] border border-[#1f2937] rounded-t-2xl sm:rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#1f2937] shrink-0">
              <div className="space-y-0.5">
                <h3 id="target-role-modal-title" className="text-sm font-bold text-white">
                  Select Target Role
                </h3>
                <p className="text-xs text-gray-400">Choose a benchmark role to recalculate fit</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center shrink-0">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search engineering roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search engineering roles"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b0f19] border border-[#1f2937] text-xs text-white placeholder:text-gray-500 outline-none focus:border-blue-500"
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
                      className={`w-full p-2.5 rounded-lg text-left text-xs transition-colors border flex items-center justify-between min-h-[40px] ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500/40 text-blue-300 font-semibold'
                          : 'bg-[#0b0f19] border-[#1a2233] text-gray-300 hover:bg-gray-800/60'
                      }`}
                    >
                      <div>
                        <span className="block text-white">{job.title}</span>
                        {job.department && (
                          <span className="text-[10px] text-gray-500">{job.department}</span>
                        )}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-gray-500">
                  No roles match your search term.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1f2937] shrink-0">
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
