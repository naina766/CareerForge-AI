'use client';

import React, { useState } from 'react';
import {
  BrainCircuit,
  User,
  Target,
  AlertTriangle,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';

interface RoleScenario {
  id: string;
  title: string;
  matchScore: number;
  readinessLevel: string;
  profileHeadline: string;
  currentSkills: Array<{ name: string; verified: boolean; experienceYears: number }>;
  gaps: Array<{ skill: string; priority: 'High' | 'Medium'; impact: string }>;
  learningRoadmap: Array<{ phase: string; title: string; duration: string; status: 'In Progress' | 'Up Next' | 'Queued' }>;
}

const ROLE_SCENARIOS: Record<string, RoleScenario> = {
  distributed: {
    id: 'distributed',
    title: 'Distributed Systems Engineer',
    matchScore: 87,
    readinessLevel: 'High Fit · 2 Critical Gaps',
    profileHeadline: 'Senior Backend Engineer · 4+ Years · Transactional Systems',
    currentSkills: [
      { name: 'Node.js / TypeScript', verified: true, experienceYears: 4 },
      { name: 'PostgreSQL & SQL Tuning', verified: true, experienceYears: 4 },
      { name: 'REST & gRPC APIs', verified: true, experienceYears: 3 },
      { name: 'Docker & Containerization', verified: true, experienceYears: 3 },
      { name: 'Redis Caching', verified: true, experienceYears: 2 },
    ],
    gaps: [
      { skill: 'Apache Kafka', priority: 'High', impact: 'Event-driven streaming pipeline mastery' },
      { skill: 'Kubernetes Orchestration', priority: 'High', impact: 'Zero-downtime container lifecycle' },
      { skill: 'Distributed Consensus (Raft/Paxos)', priority: 'Medium', impact: 'State synchronization across nodes' },
    ],
    learningRoadmap: [
      { phase: 'Phase 1', title: 'High-Throughput Caching & Redis Clustering', duration: '10 hrs', status: 'In Progress' },
      { phase: 'Phase 2', title: 'Kafka Partitioning, Consumer Groups & Exactly-Once', duration: '14 hrs', status: 'Up Next' },
      { phase: 'Phase 3', title: 'Kubernetes Pod Networking & Canary Deployments', duration: '16 hrs', status: 'Queued' },
    ],
  },
  cloud: {
    id: 'cloud',
    title: 'Cloud Platform Architect',
    matchScore: 76,
    readinessLevel: 'Moderate Fit · 3 Critical Gaps',
    profileHeadline: 'Systems Infrastructure Engineer · 3+ Years · Microservices',
    currentSkills: [
      { name: 'Linux Kernel & POSIX', verified: true, experienceYears: 3 },
      { name: 'Docker & OCI Images', verified: true, experienceYears: 3 },
      { name: 'CI/CD GitHub Actions', verified: true, experienceYears: 2 },
      { name: 'Python Automation', verified: true, experienceYears: 3 },
      { name: 'Networking (TCP/HTTP/TLS)', verified: true, experienceYears: 3 },
    ],
    gaps: [
      { skill: 'Terraform / OpenTofu IaC', priority: 'High', impact: 'Declarative immutable infrastructure' },
      { skill: 'AWS Cloud Architecture', priority: 'High', impact: 'Multi-region VPC & IAM governance' },
      { skill: 'OpenTelemetry Observability', priority: 'Medium', impact: 'Distributed tracing across services' },
    ],
    learningRoadmap: [
      { phase: 'Phase 1', title: 'Terraform Multi-Environment State Architecture', duration: '12 hrs', status: 'In Progress' },
      { phase: 'Phase 2', title: 'AWS EKS & VPC Peering Deep Dive', duration: '18 hrs', status: 'Up Next' },
      { phase: 'Phase 3', title: 'OpenTelemetry Distributed Tracing & Metrics', duration: '10 hrs', status: 'Queued' },
    ],
  },
};

export function CareerMapVisual() {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('distributed');
  const [activeStep, setActiveStep] = useState<'skills' | 'profile' | 'roles' | 'gaps' | 'learning'>('roles');

  const currentScenario = ROLE_SCENARIOS[selectedScenarioKey];

  return (
    <div
      className="w-full bg-[#0d121f] border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
      role="region"
      aria-label="Interactive Career Map Visualization"
    >
      {/* Top Workspace Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#090d16] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-700 inline-block" />
          </div>
          <span className="text-xs font-mono text-slate-400 pl-2 border-l border-slate-800">
            careerforge://intelligence/career-map
          </span>
        </div>

        {/* Target Role Selector */}
        <div className="flex items-center gap-1.5 bg-[#131a2c] p-1 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
            Target Scenario:
          </span>
          <button
            type="button"
            onClick={() => setSelectedScenarioKey('distributed')}
            aria-pressed={selectedScenarioKey === 'distributed'}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedScenarioKey === 'distributed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Distributed Systems
          </button>
          <button
            type="button"
            onClick={() => setSelectedScenarioKey('cloud')}
            aria-pressed={selectedScenarioKey === 'cloud'}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedScenarioKey === 'cloud'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cloud Platform
          </button>
        </div>
      </div>

      {/* Main Career Map Workspace */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Stage Flow Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-xs">
          {[
            { id: 'skills', label: '1. Current Skills', icon: BrainCircuit, tag: '5 Verified' },
            { id: 'profile', label: '2. Profile', icon: User, tag: 'Senior Tier' },
            { id: 'roles', label: '3. Target Role', icon: Target, tag: `${currentScenario.matchScore}% Match` },
            { id: 'gaps', label: '4. Skill Gaps', icon: AlertTriangle, tag: `${currentScenario.gaps.length} Identified` },
            { id: 'learning', label: '5. Learning Path', icon: GraduationCap, tag: '3 Phases' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeStep === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveStep(item.id as any)}
                aria-pressed={isActive}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-[#131a2c] border-blue-500/60 shadow-sm'
                    : 'bg-[#090d16] border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300 font-semibold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.tag}
                  </span>
                </div>
                <div className={`font-semibold text-xs ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Connected Visual Diagram */}
        <div className="p-5 rounded-xl bg-[#090d16] border border-slate-800/90 relative">
          {/* Target Role & Fit Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Live Career Map
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Deterministic Match</span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
                {currentScenario.title}
              </h4>
              <p className="text-xs text-slate-400">{currentScenario.profileHeadline}</p>
            </div>

            <div className="flex items-center gap-3 bg-[#0d121f] px-3.5 py-2 rounded-xl border border-slate-800 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Fit Score</span>
                <span className="text-xl font-bold font-mono text-white leading-none">
                  {currentScenario.matchScore}%
                </span>
              </div>
              <div className="h-7 w-[1px] bg-slate-800" />
              <div className="text-xs font-medium text-emerald-400">
                {currentScenario.readinessLevel}
              </div>
            </div>
          </div>

          {/* Connected Grid: Skills -> Gaps -> Roadmap */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column A: Verified Profile Foundation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/60">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Skills
                </span>
                <span className="text-[11px] font-mono text-slate-500">Taxonomy</span>
              </div>
              <div className="space-y-1.5">
                {currentScenario.currentSkills.map((sk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0d121f] border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-200 font-medium">{sk.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {sk.experienceYears}y exp
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column B: Identified Gaps for Target Position */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/60">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Identified Gaps
                </span>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">Priority</span>
              </div>
              <div className="space-y-1.5">
                {currentScenario.gaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0d121f] border border-amber-500/30 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{gap.skill}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {gap.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{gap.impact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column C: Sequential Learning Roadmap */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/60">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                  Learning Roadmap
                </span>
                <span className="text-[11px] font-mono text-slate-500">Milestones</span>
              </div>
              <div className="space-y-1.5">
                {currentScenario.learningRoadmap.map((road, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0d121f] border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-blue-400 font-semibold">{road.phase}</span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          road.status === 'In Progress'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {road.status}
                      </span>
                    </div>
                    <div className="text-slate-200 font-medium leading-snug">{road.title}</div>
                    <div className="text-[10px] font-mono text-slate-500">Est. {road.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Context Footnote */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>
              Matches are computed across candidate skills, experience depth, and semantic role requirements.
            </span>
          </div>
          <span className="font-mono text-slate-500 text-[11px]">
            FastEmbed BGE-Small · FAISS IndexFlatIP
          </span>
        </div>
      </div>
    </div>
  );
}
