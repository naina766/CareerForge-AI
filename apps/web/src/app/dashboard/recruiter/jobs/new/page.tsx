'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';
import { api } from '../../../../../lib/api';
import { CreateJobDto, SkillImportance, WorkMode, EmploymentType } from '@careerforge/types';
import {
  Briefcase,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';

export default function CreateJobPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    responsibilities: string;
    requirements: string;
    benefits: string;
    companyName: string;
    location: string;
    city: string;
    state: string;
    country: string;
    workMode: WorkMode;
    employmentType: EmploymentType;
    experienceMin: number;
    experienceMax: number | string;
    salaryMin: number | string;
    salaryMax: number | string;
    currency: string;
    salaryPeriod: 'YEARLY' | 'MONTHLY' | 'HOURLY';
    applicationDeadline: string;
  }>({
    title: '',
    description: '',
    responsibilities: '',
    requirements: '',
    benefits: '',
    companyName: '',
    location: 'Remote',
    city: '',
    state: '',
    country: '',
    workMode: 'REMOTE',
    employmentType: 'FULL_TIME',
    experienceMin: 2,
    experienceMax: 5,
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    salaryPeriod: 'YEARLY',
    applicationDeadline: '',
  });

  const [skills, setSkills] = useState<
    Array<{ name: string; importance: SkillImportance; minimumYears?: number }>
  >([
    { name: 'TypeScript', importance: 'REQUIRED', minimumYears: 2 },
    { name: 'React', importance: 'REQUIRED', minimumYears: 2 },
    { name: 'Node.js', importance: 'REQUIRED', minimumYears: 2 },
  ]);

  const [skillInput, setSkillInput] = useState('');
  const [skillImportance, setSkillImportance] = useState<SkillImportance>('REQUIRED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    const trimmed = skillInput.trim();
    if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    setSkills([...skills, { name: trimmed, importance: skillImportance }]);
    setSkillInput('');
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (targetStatus: 'DRAFT' | 'PUBLISHED') => {
    setMessage(null);

    // Basic frontend validations
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Job title is required.' });
      return;
    }
    if (formData.description.trim().length < 20) {
      setMessage({ type: 'error', text: 'Job description must be at least 20 characters.' });
      return;
    }

    const expMax = formData.experienceMax !== '' ? Number(formData.experienceMax) : undefined;
    if (expMax !== undefined && expMax < formData.experienceMin) {
      setMessage({ type: 'error', text: 'Maximum experience must be greater than or equal to minimum experience.' });
      return;
    }

    const salMin = formData.salaryMin !== '' ? Number(formData.salaryMin) : undefined;
    const salMax = formData.salaryMax !== '' ? Number(formData.salaryMax) : undefined;
    if (salMin !== undefined && salMax !== undefined && salMax < salMin) {
      setMessage({ type: 'error', text: 'Maximum salary must be greater than or equal to minimum salary.' });
      return;
    }

    const payload: CreateJobDto = {
      title: formData.title,
      description: formData.description,
      responsibilities: formData.responsibilities || undefined,
      requirements: formData.requirements || undefined,
      benefits: formData.benefits || undefined,
      companyName: formData.companyName || undefined,
      location: formData.location || 'Remote',
      city: formData.city || undefined,
      state: formData.state || undefined,
      country: formData.country || undefined,
      workMode: formData.workMode,
      employmentType: formData.employmentType,
      experienceMin: Number(formData.experienceMin),
      experienceMax: expMax,
      salaryMin: salMin,
      salaryMax: salMax,
      currency: formData.currency,
      salaryPeriod: formData.salaryPeriod,
      status: targetStatus,
      applicationDeadline: formData.applicationDeadline
        ? new Date(formData.applicationDeadline).toISOString()
        : undefined,
      skills: skills.map((s) => ({
        name: s.name,
        importance: s.importance,
        minimumYears: s.minimumYears,
      })),
    };

    setIsSubmitting(true);
    try {
      const res = await api.post<{ id: string }>('/recruiter/jobs', payload);
      setMessage({
        type: 'success',
        text: `Job successfully ${targetStatus === 'PUBLISHED' ? 'published' : 'saved as draft'}!`,
      });
      setTimeout(() => {
        router.push(`/dashboard/recruiter/jobs/${res.data.id}`);
      }, 1000);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to create job posting.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/recruiter/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Job Postings
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Briefcase className="w-6 h-6 text-cyan-400" /> Create New Job Posting
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Specify role requirements, experience parameters, canonical skills, and compensation bands.
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Multi-Section Form */}
      <div className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">1. Basic Role Information</h2>
              <p className="text-xs text-slate-400">Position title, company name, location, and work arrangement</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Job Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Apex Cloud Solutions"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Location / Headquarters</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. San Francisco, CA / Remote"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Work Mode</label>
              <select
                value={formData.workMode}
                onChange={(e) => setFormData({ ...formData, workMode: e.target.value as WorkMode })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) =>
                  setFormData({ ...formData, employmentType: e.target.value as EmploymentType })
                }
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="FREELANCE">Freelance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Job Description & Details */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">2. Job Description & Responsibilities</h2>
              <p className="text-xs text-slate-400">Overview, day-to-day duties, and required qualifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Job Overview <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the mission of this role and company culture..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Key Responsibilities</label>
              <textarea
                rows={3}
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                placeholder="- Architect scalable backend microservices&#10;- Collaborate with cross-functional design teams"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Role Requirements</label>
              <textarea
                rows={3}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="- 3+ years experience with TypeScript and Node.js&#10;- Solid understanding of relational database schema design"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Experience & Compensation */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">3. Experience & Compensation</h2>
              <p className="text-xs text-slate-400">Experience levels and salary range specifications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Minimum Experience (Years)</label>
              <input
                type="number"
                min="0"
                value={formData.experienceMin}
                onChange={(e) => setFormData({ ...formData, experienceMin: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Maximum Experience (Years)</label>
              <input
                type="number"
                min="0"
                value={formData.experienceMax}
                onChange={(e) => setFormData({ ...formData, experienceMax: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Minimum Salary</label>
              <input
                type="number"
                min="0"
                value={formData.salaryMin}
                onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                placeholder="e.g. 100000"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Maximum Salary</label>
              <input
                type="number"
                min="0"
                value={formData.salaryMax}
                onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                placeholder="e.g. 140000"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Salary Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Salary Period</label>
              <select
                value={formData.salaryPeriod}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salaryPeriod: e.target.value as 'YEARLY' | 'MONTHLY' | 'HOURLY',
                  })
                }
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="YEARLY">Per Year</option>
                <option value="MONTHLY">Per Month</option>
                <option value="HOURLY">Per Hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Canonical Skills Selector */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">4. Technical Skills & Requirements</h2>
              <p className="text-xs text-slate-400">
                Skills are normalized via canonical taxonomy for deterministic candidate matching
              </p>
            </div>
          </div>

          {/* Add Skill Input */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              placeholder="e.g. ReactJS, NodeJS, PostgreSQL, AWS..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <select
              value={skillImportance}
              onChange={(e) => setSkillImportance(e.target.value as SkillImportance)}
              className="px-3 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none"
            >
              <option value="REQUIRED">Required</option>
              <option value="PREFERRED">Preferred</option>
            </select>
            <Button type="button" size="sm" onClick={handleAddSkill} leftIcon={<Plus className="w-4 h-4" />}>
              Add Skill
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <span>Quick add:</span>
            {['Docker', 'Kubernetes', 'GraphQL', 'Next.js', 'Prisma', 'Tailwind CSS'].map((tech) => (
              <button
                key={tech}
                type="button"
                onClick={() => {
                  if (!skills.some((s) => s.name.toLowerCase() === tech.toLowerCase())) {
                    setSkills([...skills, { name: tech, importance: 'REQUIRED' }]);
                  }
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-teal-500/40 text-[10px]"
              >
                + {tech}
              </button>
            ))}
          </div>

          {/* Selected Skills Badges */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Configured Skills ({skills.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    s.importance === 'REQUIRED'
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-400">
                    {s.importance}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(idx)}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: Benefits & Deadline */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">5. Perks & Application Deadline</h2>
              <p className="text-xs text-slate-400">Benefits package and application closing date</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Benefits & Perks</label>
              <textarea
                rows={2}
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="- 401(k) matching&#10;- Unlimited PTO&#10;- Annual learning stipend"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Application Deadline</label>
              <input
                type="date"
                value={formData.applicationDeadline}
                onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <Link href="/dashboard/recruiter/jobs" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="md"
            isLoading={isSubmitting}
            onClick={() => handleSubmit('DRAFT')}
            className="w-full sm:w-auto"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            size="md"
            isLoading={isSubmitting}
            onClick={() => handleSubmit('PUBLISHED')}
            className="w-full sm:w-auto"
          >
            Publish Job Posting
          </Button>
        </div>
      </div>
    </div>
  );
}
