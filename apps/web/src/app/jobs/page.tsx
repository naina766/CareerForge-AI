'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { JobSearchResultItem, PaginationMeta } from '@careerforge/types';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  Filter,
  X,
  ChevronRight,
  ChevronLeft,
  Building,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

function JobsDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search and Filter States synced with URL query parameters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>(
    searchParams.get('workMode') ? searchParams.get('workMode')!.split(',') : []
  );
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>(
    searchParams.get('employmentType') ? searchParams.get('employmentType')!.split(',') : []
  );
  const [locationInput, setLocationInput] = useState(searchParams.get('location') || '');
  const [experienceRange, setExperienceRange] = useState<string>(
    searchParams.get('experienceMin') !== null || searchParams.get('experienceMax') !== null
      ? `${searchParams.get('experienceMin') || 0}-${searchParams.get('experienceMax') || ''}`
      : 'ALL'
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    searchParams.get('skills') ? searchParams.get('skills')!.split(',') : []
  );
  const [skillMatch, setSkillMatch] = useState<'any' | 'all'>(
    (searchParams.get('skillMatch') as 'any' | 'all') || 'any'
  );
  const [skillInput, setSkillInput] = useState('');
  const [salaryMin, setSalaryMin] = useState(searchParams.get('salaryMin') || '');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'deadline' | 'salary'>(
    (searchParams.get('sort') as any) || 'newest'
  );
  const [page, setPage] = useState<number>(
    searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1
  );

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [jobs, setJobs] = useState<JobSearchResultItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Synchronize state with URL query parameters
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();

    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (selectedWorkModes.length > 0) params.set('workMode', selectedWorkModes.join(','));
    if (selectedEmploymentTypes.length > 0) params.set('employmentType', selectedEmploymentTypes.join(','));
    if (locationInput.trim()) params.set('location', locationInput.trim());

    if (experienceRange !== 'ALL') {
      const [min, max] = experienceRange.split('-');
      if (min) params.set('experienceMin', min);
      if (max) params.set('experienceMax', max);
    }

    if (selectedSkills.length > 0) {
      params.set('skills', selectedSkills.join(','));
      if (skillMatch !== 'any') params.set('skillMatch', skillMatch);
    }

    if (salaryMin) params.set('salaryMin', salaryMin);
    if (sort !== 'newest') params.set('sort', sort);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    router.replace(`/jobs${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [
    debouncedSearch,
    selectedWorkModes,
    selectedEmploymentTypes,
    locationInput,
    experienceRange,
    selectedSkills,
    skillMatch,
    salaryMin,
    sort,
    page,
    router,
  ]);

  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

  // Fetch jobs from backend API
  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (selectedWorkModes.length > 0) params.set('workMode', selectedWorkModes.join(','));
      if (selectedEmploymentTypes.length > 0) params.set('employmentType', selectedEmploymentTypes.join(','));
      if (locationInput.trim()) params.set('location', locationInput.trim());

      if (experienceRange !== 'ALL') {
        const [min, max] = experienceRange.split('-');
        if (min) params.set('experienceMin', min);
        if (max) params.set('experienceMax', max);
      }

      if (selectedSkills.length > 0) {
        params.set('skills', selectedSkills.join(','));
        params.set('skillMatch', skillMatch);
      }

      if (salaryMin) params.set('salaryMin', salaryMin);
      params.set('sort', sort);
      params.set('page', page.toString());
      params.set('limit', '12');

      const res = await api.get<{
        success: boolean;
        data: JobSearchResultItem[];
        meta: { pagination: PaginationMeta };
      }>(`/jobs?${params.toString()}`);

      setJobs(res.data as any || []);
      if ((res as any).meta?.pagination) {
        setPagination((res as any).meta.pagination);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to load job listings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [
    debouncedSearch,
    selectedWorkModes,
    selectedEmploymentTypes,
    locationInput,
    experienceRange,
    selectedSkills,
    skillMatch,
    salaryMin,
    sort,
    page,
  ]);

  const toggleWorkMode = (mode: string) => {
    setPage(1);
    setSelectedWorkModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const toggleEmploymentType = (type: string) => {
    setPage(1);
    setSelectedEmploymentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    const s = skillInput.trim();
    if (!selectedSkills.some((item) => item.toLowerCase() === s.toLowerCase())) {
      setPage(1);
      setSelectedSkills([...selectedSkills, s]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setPage(1);
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

  const handleClearAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedWorkModes([]);
    setSelectedEmploymentTypes([]);
    setLocationInput('');
    setExperienceRange('ALL');
    setSelectedSkills([]);
    setSkillMatch('any');
    setSalaryMin('');
    setSort('newest');
    setPage(1);
  };

  const hasActiveFilters =
    debouncedSearch ||
    selectedWorkModes.length > 0 ||
    selectedEmploymentTypes.length > 0 ||
    locationInput ||
    experienceRange !== 'ALL' ||
    selectedSkills.length > 0 ||
    salaryMin;

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Search Header */}
      <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-800/90 shadow-2xl relative overflow-hidden bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-slate-950/90">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Verified Candidate Job Marketplace
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Find your next opportunity in tech & AI.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Discover active, verified openings with transparent salary bands, normalized skill taxonomy, and flexible work modes.
          </p>

          {/* Search Bar */}
          <div className="relative pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 mt-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search by job title, technologies, or keywords..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Sidebar Filters + Job Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sticky Filter Sidebar */}
        <div className="hidden lg:block space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-slate-800/90 shadow-xl space-y-6 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-400" /> Filters
              </h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Work Mode Filter */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Work Mode
              </label>
              {(['REMOTE', 'HYBRID', 'ONSITE'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedWorkModes.includes(mode)}
                    onChange={() => toggleWorkMode(mode)}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>{mode === 'REMOTE' ? 'Remote' : mode === 'HYBRID' ? 'Hybrid' : 'Onsite'}</span>
                </label>
              ))}
            </div>

            {/* Employment Type Filter */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800/60">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Employment Type
              </label>
              {[
                { id: 'FULL_TIME', label: 'Full Time' },
                { id: 'PART_TIME', label: 'Part Time' },
                { id: 'CONTRACT', label: 'Contract' },
                { id: 'INTERNSHIP', label: 'Internship' },
                { id: 'FREELANCE', label: 'Freelance' },
              ].map((emp) => (
                <label key={emp.id} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedEmploymentTypes.includes(emp.id)}
                    onChange={() => toggleEmploymentType(emp.id)}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>{emp.label}</span>
                </label>
              ))}
            </div>

            {/* Experience Filter */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800/60">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Experience Level
              </label>
              <select
                value={experienceRange}
                onChange={(e) => {
                  setPage(1);
                  setExperienceRange(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Any Experience</option>
                <option value="0-2">Entry Level (0–2 years)</option>
                <option value="3-5">Mid Level (3–5 years)</option>
                <option value="5-8">Senior Level (5–8 years)</option>
                <option value="8-">Lead / Principal (8+ years)</option>
              </select>
            </div>

            {/* Location Search */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800/60">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => {
                    setPage(1);
                    setLocationInput(e.target.value);
                  }}
                  placeholder="e.g. San Francisco, London..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Skills Filter */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Required Skills
                </label>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <button
                    type="button"
                    onClick={() => setSkillMatch('any')}
                    className={`px-1.5 py-0.5 rounded ${skillMatch === 'any' ? 'bg-teal-500/20 text-teal-300 font-bold' : ''}`}
                  >
                    ANY
                  </button>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => setSkillMatch('all')}
                    className={`px-1.5 py-0.5 rounded ${skillMatch === 'all' ? 'bg-teal-500/20 text-teal-300 font-bold' : ''}`}
                  >
                    ALL
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="e.g. ReactJS, Python..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <Button type="button" size="sm" onClick={handleAddSkill}>
                  Add
                </Button>
              </div>

              {/* Selected Skills */}
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[11px] flex items-center gap-1"
                    >
                      {sk}
                      <button type="button" onClick={() => handleRemoveSkill(sk)} className="hover:text-rose-400">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Minimum Salary Filter */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800/60">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Minimum Salary ($)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={salaryMin}
                onChange={(e) => {
                  setPage(1);
                  setSalaryMin(e.target.value);
                }}
                placeholder="e.g. 100000"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Job Listings Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Controls Bar: Total Count + Sort Selector + Mobile Filter Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
              >
                <Filter className="w-3.5 h-3.5 text-teal-400" /> Filters
              </button>
              <span className="text-xs text-slate-400 font-medium">
                {isLoading ? 'Searching vacancies...' : `${pagination.total} active vacancies found`}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setPage(1);
                  setSort(e.target.value as any);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="salary">Highest Salary</option>
                <option value="deadline">Application Deadline</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Active:</span>
              {debouncedSearch && (
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-xs flex items-center gap-1.5">
                  &quot;{debouncedSearch}&quot;
                  <button type="button" onClick={() => setSearch('')} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedWorkModes.map((m) => (
                <span key={m} className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-xs flex items-center gap-1.5">
                  {m}
                  <button type="button" onClick={() => toggleWorkMode(m)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedEmploymentTypes.map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-xs flex items-center gap-1.5">
                  {t.replace('_', ' ')}
                  <button type="button" onClick={() => toggleEmploymentType(t)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedSkills.map((sk) => (
                <span key={sk} className="px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs flex items-center gap-1.5">
                  {sk}
                  <button type="button" onClick={() => handleRemoveSkill(sk)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {salaryMin && (
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 text-xs flex items-center gap-1.5">
                  ${parseInt(salaryMin, 10).toLocaleString()}+
                  <button type="button" onClick={() => setSalaryMin('')} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold underline ml-2"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Job Cards Stream */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-panel rounded-3xl p-6 border border-slate-800/60 animate-pulse h-36" />
              ))}
            </div>
          ) : error ? (
            <div className="glass-panel rounded-3xl p-10 border border-rose-500/30 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-white">Unable to load jobs</h3>
                <p className="text-xs text-slate-400 mt-1">{error}</p>
              </div>
              <Button size="sm" onClick={fetchJobs} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Retry
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            /* Empty State */
            <div className="glass-panel rounded-3xl p-12 border border-slate-800/90 text-center space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-8 h-8 text-teal-400" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white">No matching jobs found</h3>
                <p className="text-xs text-slate-400">
                  Try adjusting or clearing your filters, searching for a different skill, or expanding your location preferences.
                </p>
              </div>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={handleClearAllFilters}>
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-panel rounded-3xl p-6 border border-slate-800/80 hover:border-teal-500/40 transition-all hover:scale-[1.005] group space-y-4 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/jobs/${job.slug}`}
                          className="text-base font-bold text-white group-hover:text-teal-300 transition-colors"
                        >
                          {job.title}
                        </Link>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          {job.workMode}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {job.employmentType.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-slate-500" /> {job.companyName} •{' '}
                        <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location || 'Remote'}
                      </p>
                    </div>

                    <div className="text-right sm:text-right">
                      {job.salaryMin ? (
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          ${job.salaryMin.toLocaleString()}
                          {job.salaryMax ? ` – $${job.salaryMax.toLocaleString()}` : '+'}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            / {job.salaryPeriod ? job.salaryPeriod.toLowerCase() : 'yr'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Salary Not Disclosed</span>
                      )}
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {job.experienceMin}
                        {job.experienceMax ? `–${job.experienceMax} yrs exp` : '+ yrs exp'}
                      </span>
                    </div>
                  </div>

                  {/* Skills Chips */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skills.slice(0, 5).map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-slate-900/80 text-slate-300 border border-slate-800 text-[11px] font-medium"
                        >
                          {sk.name}
                        </span>
                      ))}
                      {job.skills.length > 5 && (
                        <span className="text-[11px] text-slate-500 pt-0.5">
                          +{job.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Footer: Timestamps & CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> Posted{' '}
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <Link href={`/jobs/${job.slug}`}>
                      <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        View Opportunity
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {/* Pagination Bar */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>

                  <span className="text-xs text-slate-400 font-medium">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs h-full bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto space-y-6 z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-400" /> Filters
              </h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Work Mode */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Work Mode</span>
              {(['REMOTE', 'HYBRID', 'ONSITE'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedWorkModes.includes(mode)}
                    onChange={() => toggleWorkMode(mode)}
                    className="rounded border-slate-700 bg-slate-800 text-teal-500"
                  />
                  <span>{mode}</span>
                </label>
              ))}
            </div>

            {/* Employment Type */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 block">Employment Type</span>
              {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'].map((t) => (
                <label key={t} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedEmploymentTypes.includes(t)}
                    onChange={() => toggleEmploymentType(t)}
                    className="rounded border-slate-700 bg-slate-800 text-teal-500"
                  />
                  <span>{t.replace('_', ' ')}</span>
                </label>
              ))}
            </div>

            {/* Experience Level */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 block">Experience Level</span>
              <select
                value={experienceRange}
                onChange={(e) => {
                  setPage(1);
                  setExperienceRange(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">Any Experience</option>
                <option value="0-2">Entry Level (0–2 years)</option>
                <option value="3-5">Mid Level (3–5 years)</option>
                <option value="5-8">Senior Level (5–8 years)</option>
                <option value="8-">Lead / Principal (8+ years)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-2">
              <Button size="sm" className="w-full" onClick={() => setMobileFiltersOpen(false)}>
                Show {pagination.total} Results
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" className="w-full" onClick={handleClearAllFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidateJobsDiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
        </div>
      }
    >
      <JobsDiscoveryContent />
    </Suspense>
  );
}
