'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  CandidateProfile,
  CandidateSkill,
  CandidateExperience,
  CandidateEducation,
  CareerPreference,
  ProfileCompleteness,
  SkillProficiency,
  WorkMode,
  EmploymentType,
} from '@careerforge/types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import {
  ArrowLeft,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  Compass,
  Link as LinkIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
  Save,
  Globe,
  Github,
  Linkedin,
} from 'lucide-react';

export default function CandidateProfilePage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'basic' | 'summary' | 'skills' | 'experience' | 'education' | 'preferences' | 'links'
  >('basic');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Profile Data State
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);
  const [experiences, setExperiences] = useState<CandidateExperience[]>([]);
  const [educations, setEducations] = useState<CandidateEducation[]>([]);
  const [preferences, setPreferences] = useState<CareerPreference | null>(null);
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  // Modal States
  const [showExpModal, setShowExpModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState<SkillProficiency>('INTERMEDIATE');

  // Form State for Experience Modal
  const [expForm, setExpForm] = useState<{
    company: string;
    title: string;
    location: string;
    employmentType: EmploymentType;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>({
    company: '',
    title: '',
    location: '',
    employmentType: 'FULL_TIME',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  });

  // Form State for Education Modal
  const [eduForm, setEduForm] = useState<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate: string;
    grade: string;
    description: string;
  }>({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    grade: '',
    description: '',
  });

  // Load Profile from API
  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{
        profile: CandidateProfile & {
          skills: CandidateSkill[];
          experiences: CandidateExperience[];
          educations: CandidateEducation[];
          preferences?: CareerPreference;
        };
        completeness: ProfileCompleteness;
      }>('/candidates/me/profile');

      setProfile(res.data.profile);
      setSkills(res.data.profile.skills || []);
      setExperiences(res.data.profile.experiences || []);
      setEducations(res.data.profile.educations || []);
      setPreferences(res.data.profile.preferences || null);
      setCompleteness(res.data.completeness);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setToast({ type: 'error', message: errorObj.message || 'Failed to load candidate profile' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      fetchProfileData();
    }
  }, [authLoading, isAuthenticated, router, fetchProfileData]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Save Basic Profile & Links
  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const res = await api.patch<{ profile: CandidateProfile; completeness: ProfileCompleteness }>(
        '/candidates/me/profile',
        {
          name: profile.name,
          headline: profile.headline,
          summary: profile.summary,
          phone: profile.phone,
          location: profile.location,
          city: profile.city,
          country: profile.country,
          workMode: profile.workMode,
          experienceYears: profile.experienceYears ? Number(profile.experienceYears) : 0,
          githubUrl: profile.githubUrl,
          linkedinUrl: profile.linkedinUrl,
          portfolioUrl: profile.portfolioUrl,
          websiteUrl: profile.websiteUrl,
        }
      );
      setProfile(res.data.profile);
      setCompleteness(res.data.completeness);
      showToast('success', 'Profile information updated successfully');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Skill
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      const res = await api.post<CandidateSkill>('/candidates/me/skills', {
        name: newSkillName.trim(),
        proficiency: newSkillProficiency,
      });
      setSkills([...skills, res.data]);
      setNewSkillName('');
      await fetchProfileData();
      showToast('success', `Added skill '${res.data.skill.name}'`);
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to add skill');
    }
  };

  // Delete Skill
  const handleDeleteSkill = async (skillId: string) => {
    try {
      await api.delete(`/candidates/me/skills/${skillId}`);
      setSkills(skills.filter((s) => s.id !== skillId));
      await fetchProfileData();
      showToast('success', 'Skill removed');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to remove skill');
    }
  };

  // Add Experience
  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expForm.company || !expForm.title || !expForm.startDate) {
      showToast('error', 'Company, Job Title, and Start Date are required');
      return;
    }

    try {
      const res = await api.post<CandidateExperience>('/candidates/me/experience', {
        ...expForm,
        startDate: new Date(expForm.startDate).toISOString(),
        endDate: expForm.endDate && !expForm.current ? new Date(expForm.endDate).toISOString() : null,
      });
      setExperiences([res.data, ...experiences]);
      setShowExpModal(false);
      setExpForm({
        company: '',
        title: '',
        location: '',
        employmentType: 'FULL_TIME',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
      });
      await fetchProfileData();
      showToast('success', 'Work experience added');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to add experience');
    }
  };

  // Delete Experience
  const handleDeleteExperience = async (id: string) => {
    try {
      await api.delete(`/candidates/me/experience/${id}`);
      setExperiences(experiences.filter((exp) => exp.id !== id));
      await fetchProfileData();
      showToast('success', 'Experience record deleted');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to delete experience');
    }
  };

  // Add Education
  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduForm.institution || !eduForm.degree || !eduForm.fieldOfStudy || !eduForm.startDate) {
      showToast('error', 'Institution, Degree, Field of Study, and Start Date are required');
      return;
    }

    try {
      const res = await api.post<CandidateEducation>('/candidates/me/education', {
        ...eduForm,
        startDate: new Date(eduForm.startDate).toISOString(),
        endDate: eduForm.endDate ? new Date(eduForm.endDate).toISOString() : null,
      });
      setEducations([res.data, ...educations]);
      setShowEduModal(false);
      setEduForm({
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
        grade: '',
        description: '',
      });
      await fetchProfileData();
      showToast('success', 'Education record added');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to add education');
    }
  };

  // Delete Education
  const handleDeleteEducation = async (id: string) => {
    try {
      await api.delete(`/candidates/me/education/${id}`);
      setEducations(educations.filter((edu) => edu.id !== id));
      await fetchProfileData();
      showToast('success', 'Education record deleted');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to delete education');
    }
  };

  // Save Preferences
  const handleSavePreferences = async (updated: Partial<CareerPreference>) => {
    try {
      const payload = {
        desiredJobTitles: updated.desiredJobTitles ?? preferences?.desiredJobTitles ?? [],
        preferredLocations: updated.preferredLocations ?? preferences?.preferredLocations ?? [],
        preferredWorkModes: updated.preferredWorkModes ?? preferences?.preferredWorkModes ?? [],
        preferredEmploymentTypes: updated.preferredEmploymentTypes ?? preferences?.preferredEmploymentTypes ?? [],
        minimumSalary: updated.minimumSalary ?? preferences?.minimumSalary ?? null,
        maximumSalary: updated.maximumSalary ?? preferences?.maximumSalary ?? null,
        willingToRelocate: updated.willingToRelocate ?? preferences?.willingToRelocate ?? false,
        preferredIndustries: updated.preferredIndustries ?? preferences?.preferredIndustries ?? [],
      };

      const res = await api.put<CareerPreference>('/candidates/me/preferences', payload);
      setPreferences(res.data);
      await fetchProfileData();
      showToast('success', 'Career preferences saved');
    } catch (err: unknown) {
      const errorObj = err as Error;
      showToast('error', errorObj.message || 'Failed to save preferences');
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading candidate profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md transition-all animate-slideIn ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span className="text-xs font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/dashboard" className="hover:text-teal-300 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span>/</span>
            <span className="text-teal-400">Profile Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Career Profile
          </h1>
          <p className="text-xs text-slate-400">
            Maintain your career identity, structured skills, and job preferences for explainable AI matching.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveProfile}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Profile Strength Hero Banner */}
      {completeness && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800/90 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 p-0.5 glow-teal">
              <div className="h-full w-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center text-teal-300 font-extrabold">
                <span className="text-lg leading-none">{completeness.percentage}%</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Profile Completeness</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/30">
                  {completeness.percentage >= 80 ? 'Strong' : 'In Progress'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {completeness.missingSections.length === 0
                  ? 'All profile sections completed!'
                  : `${completeness.missingSections.length} sections need attention`}
              </p>
            </div>
          </div>

          <div className="md:col-span-8 space-y-2">
            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500 transition-all duration-500"
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {completeness.completedSections.map((sec) => (
                <span key={sec} className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-teal-400" /> {sec}
                </span>
              ))}
              {completeness.missingSections.map((sec) => (
                <span key={sec} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" /> {sec}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Tabs Sidebar + Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-1.5">
          <nav className="glass-panel p-2 rounded-2xl border border-slate-800 space-y-1">
            <button
              onClick={() => setActiveTab('basic')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'basic'
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <User className="w-4 h-4 text-teal-400" /> Basic Information
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'summary'
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" /> Professional Summary
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'skills'
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Building className="w-4 h-4 text-blue-400" /> Technical Skills ({skills.length})
            </button>
            <button
              onClick={() => setActiveTab('experience')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'experience'
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Briefcase className="w-4 h-4 text-indigo-400" /> Work Experience ({experiences.length})
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'education'
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-purple-400" /> Education ({educations.length})
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'preferences'
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Compass className="w-4 h-4 text-emerald-400" /> Career Preferences
            </button>
            <button
              onClick={() => setActiveTab('links')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'links'
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <LinkIcon className="w-4 h-4 text-amber-400" /> Social & Portfolio Links
            </button>
          </nav>
        </div>

        {/* Content Section Panel */}
        <div className="lg:col-span-9">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-6">
            {/* 1. Basic Information */}
            {activeTab === 'basic' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-white">Basic Information</h2>
                  <p className="text-xs text-slate-400">Personal details displayed to recruiters and used for role matching.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Professional Headline"
                    placeholder="e.g. Senior Full-Stack Engineer | Distributed Systems"
                    value={profile.headline || ''}
                    onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                  />
                  <Input
                    label="Location (City, State / Region)"
                    placeholder="e.g. San Francisco, CA"
                    value={profile.location || ''}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  />
                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Preferred Work Mode</label>
                    <select
                      value={profile.workMode || 'REMOTE'}
                      onChange={(e) => setProfile({ ...profile, workMode: e.target.value as WorkMode })}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 p-2.5 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none"
                    >
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="ONSITE">Onsite</option>
                    </select>
                  </div>
                  <Input
                    label="Years of Experience"
                    type="number"
                    min="0"
                    max="50"
                    value={profile.experienceYears ?? 0}
                    onChange={(e) => setProfile({ ...profile, experienceYears: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            {/* 2. Professional Summary */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Professional Bio & Summary</h2>
                  <p className="text-xs text-slate-400">
                    Provide a concise summary of your engineering impact, key domains, and technical vision.
                  </p>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={profile.summary || ''}
                    onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                    placeholder="Describe your engineering leadership, architectures built, and technical strengths..."
                    className="w-full rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Recommended minimum: 30 characters</span>
                    <span>{(profile.summary || '').length} / 3000 characters</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Technical Skills (Phase 7 Canonical Taxonomy) */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Technical Skills & Taxonomy</h2>
                    <p className="text-xs text-slate-400">Canonical, normalized skills mapped to your profile for deterministic role matching.</p>
                  </div>
                </div>

                {/* Add Skill Bar with Autocomplete */}
                <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row gap-3 relative">
                  <div className="flex-1 relative">
                    <input
                      placeholder="Search or add a skill (e.g. ReactJS, NodeJS, Postgres, TypeScript, Docker)..."
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none"
                    />
                  </div>
                  <select
                    value={newSkillProficiency}
                    onChange={(e) => setNewSkillProficiency(e.target.value as SkillProficiency)}
                    className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-teal-500"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                  <Button type="submit" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                    Add Skill
                  </Button>
                </form>

                {/* Skills Chips Grouped by Category */}
                {skills.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl space-y-2">
                    <Building className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No skills added yet. Add at least 3 skills to strengthen your profile.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {skills.map((item) => (
                      <div
                        key={item.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors shadow-sm"
                      >
                        <span className="font-semibold text-white">{item.skill.name}</span>
                        {item.skill.category && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                            {item.skill.category.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            item.proficiency === 'EXPERT'
                              ? 'bg-purple-500/20 text-purple-300'
                              : item.proficiency === 'ADVANCED'
                              ? 'bg-teal-500/20 text-teal-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.proficiency}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(item.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors"
                          aria-label={`Remove ${item.skill.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Work Experience */}
            {activeTab === 'experience' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Work Experience</h2>
                    <p className="text-xs text-slate-400">Positions, accomplishments, and team responsibilities.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowExpModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                    Add Experience
                  </Button>
                </div>

                {experiences.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl space-y-2">
                    <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No work experience added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {experiences.map((exp) => (
                      <div key={exp.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{exp.title}</h3>
                            <span className="text-xs text-teal-400 font-medium">@ {exp.company}</span>
                            {exp.current && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                                Current Role
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>{new Date(exp.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })} — {exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'N/A'}</span>
                            {exp.location && <span>• {exp.location}</span>}
                          </div>
                          {exp.description && <p className="text-xs text-slate-300 pt-1 leading-relaxed">{exp.description}</p>}
                        </div>
                        <button
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors rounded-lg hover:bg-slate-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Education */}
            {activeTab === 'education' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Education History</h2>
                    <p className="text-xs text-slate-400">Degrees, academic institutions, and coursework.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowEduModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
                    Add Education
                  </Button>
                </div>

                {educations.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl space-y-2">
                    <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No education history added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {educations.map((edu) => (
                      <div key={edu.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-white">{edu.degree} in {edu.fieldOfStudy}</h3>
                          <div className="text-xs text-teal-400 font-medium">{edu.institution}</div>
                          <div className="text-xs text-slate-400">
                            {new Date(edu.startDate).toLocaleDateString(undefined, { year: 'numeric' })} — {edu.endDate ? new Date(edu.endDate).toLocaleDateString(undefined, { year: 'numeric' }) : 'Present'}
                            {edu.grade && ` • Grade: ${edu.grade}`}
                          </div>
                          {edu.description && <p className="text-xs text-slate-300 pt-1">{edu.description}</p>}
                        </div>
                        <button
                          onClick={() => handleDeleteEducation(edu.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors rounded-lg hover:bg-slate-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. Career Preferences */}
            {activeTab === 'preferences' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-white">Career Preferences</h2>
                  <p className="text-xs text-slate-400">Define desired job targets for future AI recommendations.</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Desired Job Titles (comma separated)"
                    placeholder="e.g. Senior Software Engineer, Backend Lead, Distributed Systems Engineer"
                    value={(preferences?.desiredJobTitles || []).join(', ')}
                    onChange={(e) =>
                      setPreferences({
                        ...(preferences as CareerPreference),
                        desiredJobTitles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />

                  <Input
                    label="Preferred Locations (comma separated)"
                    placeholder="e.g. San Francisco, CA, New York, NY, Remote"
                    value={(preferences?.preferredLocations || []).join(', ')}
                    onChange={(e) =>
                      setPreferences({
                        ...(preferences as CareerPreference),
                        preferredLocations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Minimum Expected Salary (USD / year)"
                      type="number"
                      placeholder="e.g. 150000"
                      value={preferences?.minimumSalary || ''}
                      onChange={(e) =>
                        setPreferences({
                          ...(preferences as CareerPreference),
                          minimumSalary: parseFloat(e.target.value) || null,
                        })
                      }
                    />
                    <Input
                      label="Maximum Expected Salary (USD / year)"
                      type="number"
                      placeholder="e.g. 220000"
                      value={preferences?.maximumSalary || ''}
                      onChange={(e) =>
                        setPreferences({
                          ...(preferences as CareerPreference),
                          maximumSalary: parseFloat(e.target.value) || null,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="relocate-checkbox"
                      checked={preferences?.willingToRelocate || false}
                      onChange={(e) =>
                        setPreferences({
                          ...(preferences as CareerPreference),
                          willingToRelocate: e.target.checked,
                        })
                      }
                      className="rounded bg-slate-900 border-slate-800 text-teal-500 focus:ring-teal-500/20"
                    />
                    <label htmlFor="relocate-checkbox" className="text-xs text-slate-300 cursor-pointer">
                      Willing to relocate for the right role
                    </label>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleSavePreferences(preferences || {})}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Career Preferences
                  </Button>
                </div>
              </div>
            )}

            {/* 7. Social & Portfolio Links */}
            {activeTab === 'links' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Social & Portfolio Links</h2>
                  <p className="text-xs text-slate-400">Share your GitHub, LinkedIn, and personal engineering showcase.</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="GitHub Profile"
                    placeholder="https://github.com/username"
                    value={profile.githubUrl || ''}
                    onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                    icon={<Github className="w-4 h-4" />}
                  />
                  <Input
                    label="LinkedIn Profile"
                    placeholder="https://linkedin.com/in/username"
                    value={profile.linkedinUrl || ''}
                    onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                    icon={<Linkedin className="w-4 h-4" />}
                  />
                  <Input
                    label="Portfolio / Personal Site"
                    placeholder="https://yourportfolio.dev"
                    value={profile.portfolioUrl || ''}
                    onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                    icon={<Globe className="w-4 h-4" />}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Experience Modal */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add Work Experience</h3>
            <form onSubmit={handleAddExperience} className="space-y-3.5">
              <Input
                label="Company Name"
                required
                value={expForm.company}
                onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
              />
              <Input
                label="Job Title"
                required
                value={expForm.title}
                onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
              />
              <Input
                label="Location (e.g. Remote, San Francisco, CA)"
                value={expForm.location}
                onChange={(e) => setExpForm({ ...expForm, location: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date"
                  type="date"
                  required
                  value={expForm.startDate}
                  onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                />
                {!expForm.current && (
                  <Input
                    label="End Date"
                    type="date"
                    value={expForm.endDate}
                    onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="current-role"
                  checked={expForm.current}
                  onChange={(e) => setExpForm({ ...expForm, current: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-800 text-teal-500"
                />
                <label htmlFor="current-role" className="text-xs text-slate-300">This is my current role</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Impact</label>
                <textarea
                  rows={3}
                  value={expForm.description}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-100 outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowExpModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save Experience
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Education Modal */}
      {showEduModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add Education History</h3>
            <form onSubmit={handleAddEducation} className="space-y-3.5">
              <Input
                label="Institution / University"
                required
                value={eduForm.institution}
                onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
              />
              <Input
                label="Degree"
                placeholder="e.g. Bachelor of Science"
                required
                value={eduForm.degree}
                onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
              />
              <Input
                label="Field of Study"
                placeholder="e.g. Computer Science"
                required
                value={eduForm.fieldOfStudy}
                onChange={(e) => setEduForm({ ...eduForm, fieldOfStudy: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date"
                  type="date"
                  required
                  value={eduForm.startDate}
                  onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })}
                />
                <Input
                  label="End Date (or Expected)"
                  type="date"
                  value={eduForm.endDate}
                  onChange={(e) => setEduForm({ ...eduForm, endDate: e.target.value })}
                />
              </div>
              <Input
                label="Grade / GPA (Optional)"
                placeholder="e.g. 3.8 GPA"
                value={eduForm.grade}
                onChange={(e) => setEduForm({ ...eduForm, grade: e.target.value })}
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowEduModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save Education
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
