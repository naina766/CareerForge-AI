'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  JobRecommendationItem,
  JobRecommendationListResponse,
  RecommendationLevel,
} from '@careerforge/types';
import {
  Sparkles,
  RefreshCw,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Brain,
  SlidersHorizontal,
  TrendingUp,
  Target,
  BookOpen,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function RecommendationsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [recommendations, setRecommendations] = useState<JobRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [workMode, setWorkMode] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('recommended');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [engineVersion, setEngineVersion] = useState<string>('1.0');

  const fetchRecommendations = useCallback(
    async (forceRefresh = false) => {
      try {
        if (forceRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const queryParams = new URLSearchParams();
        queryParams.set('page', page.toString());
        queryParams.set('limit', '10');
        if (workMode) queryParams.set('workMode', workMode);
        if (minScore > 0) queryParams.set('minScore', minScore.toString());
        if (sortBy) queryParams.set('sortBy', sortBy);

        let res;
        if (forceRefresh) {
          res = await api.post<JobRecommendationListResponse>(
            '/recommendations/jobs/refresh',
            {}
          );
        } else {
          res = await api.get<JobRecommendationListResponse>(
            `/recommendations/jobs?${queryParams.toString()}`
          );
        }

        if (res?.data) {
          setRecommendations(res.data.items || []);
          setTotalPages(res.data.totalPages || 1);
          setTotalItems(res.data.total || 0);
          setEngineVersion(res.data.engineVersion || '1.0');
        }
      } catch (err: any) {
        console.error('Failed to load recommendations:', err);
        setError(err.message || 'Could not load job recommendations');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, workMode, minScore, sortBy]
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      fetchRecommendations();
    }
  }, [authLoading, isAuthenticated, router, fetchRecommendations]);

  const getScoreBadge = (score: number, level: RecommendationLevel) => {
    let color = 'from-emerald-500 to-teal-400 text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    let label = 'TOP MATCH';

    if (score >= 90 || level === 'TOP_MATCH') {
      color = 'from-emerald-500 to-teal-400 text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
      label = 'TOP MATCH';
    } else if (score >= 80 || level === 'EXCELLENT_MATCH') {
      color = 'from-teal-500 to-cyan-400 text-teal-300 border-teal-500/30 bg-teal-500/10';
      label = 'EXCELLENT';
    } else if (score >= 70 || level === 'STRONG_MATCH') {
      color = 'from-blue-500 to-indigo-400 text-blue-300 border-blue-500/30 bg-blue-500/10';
      label = 'STRONG FIT';
    } else if (score >= 60 || level === 'GOOD_MATCH') {
      color = 'from-indigo-500 to-purple-400 text-indigo-300 border-indigo-500/30 bg-indigo-500/10';
      label = 'GOOD MATCH';
    } else if (score >= 50 || level === 'POSSIBLE_MATCH') {
      color = 'from-amber-500 to-orange-400 text-amber-300 border-amber-500/30 bg-amber-500/10';
      label = 'POSSIBLE';
    } else {
      color = 'from-slate-500 to-slate-400 text-slate-300 border-slate-700 bg-slate-800/40';
      label = 'LOW FIT';
    }

    return { color, label };
  };

  const getProgressBarColor = (val: number) => {
    if (val >= 80) return 'bg-emerald-400';
    if (val >= 60) return 'bg-teal-400';
    if (val >= 40) return 'bg-blue-400';
    if (val >= 20) return 'bg-amber-400';
    return 'bg-slate-600';
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Phase 15 Recommendation Engine (v{engineVersion})
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Personalized Job Recommendations
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Ranked through a deterministic multi-signal formula analyzing your verified skill taxonomy (40%), FAISS semantic resume embeddings (25%), experience seniority (15%), career preferences (15%), and publication freshness (5%).
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button
            variant="secondary"
            onClick={() => fetchRecommendations(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-400' : ''}`} />
            {refreshing ? 'Recomputing AI Matches...' : 'Refresh Feed'}
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Eligible Vacancies</p>
            <p className="text-2xl font-bold text-white mt-1">{totalItems}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">High Match Potential</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {recommendations.filter((r) => r.recommendationScore >= 70).length} Roles
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Engine Provenance</p>
            <p className="text-sm font-semibold text-slate-300 mt-1.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              Hybrid Deterministic + FAISS
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Brain className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Sorting Controls */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Work Mode Filter */}
          <select
            value={workMode}
            onChange={(e) => {
              setWorkMode(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">All Work Modes</option>
            <option value="REMOTE">Remote Only</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </select>

          {/* Min Score Filter */}
          <select
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="0">All Match Scores</option>
            <option value="60">60%+ Good Match</option>
            <option value="70">70%+ Strong Fit</option>
            <option value="80">80%+ Excellent Fit</option>
            <option value="90">90%+ Top Match</option>
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="recommended">Recommended Fit</option>
            <option value="highest_match">Highest Skill Match</option>
            <option value="newest">Newest Published</option>
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-3xl p-6 border border-slate-800 animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-6 w-64 bg-slate-800 rounded-lg" />
                  <div className="h-4 w-40 bg-slate-800/60 rounded-md" />
                </div>
                <div className="h-12 w-20 bg-slate-800 rounded-2xl" />
              </div>
              <div className="h-2 bg-slate-800 rounded-full w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="glass-card rounded-3xl p-8 border border-rose-500/30 bg-rose-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Failed to load recommendations</h3>
          <p className="text-sm text-slate-400">{error}</p>
          <Button variant="secondary" onClick={() => fetchRecommendations()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="glass-card rounded-3xl p-12 border border-slate-800 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Matching Vacancies Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Try broadening your work mode or score filters, or complete your candidate profile with skills and experience to unlock AI-powered recommendations.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/dashboard/profile">
              <Button variant="primary">Update Profile Skills</Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setWorkMode('');
                setMinScore(0);
                setSortBy('recommended');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Recommendations Feed */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="space-y-6">
          {recommendations.map((rec) => {
            const badge = getScoreBadge(rec.recommendationScore, rec.recommendationLevel);
            const { job } = rec;

            return (
              <div
                key={rec.id}
                className="glass-card rounded-3xl p-6 sm:p-7 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-6 group"
              >
                {/* Card Header: Job Details + Score Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-lg">
                        {job.companyName}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${
                          job.workMode === 'REMOTE'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : job.workMode === 'HYBRID'
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {job.workMode}
                      </span>
                      <span className="text-xs font-medium text-slate-400 bg-slate-900/60 border border-slate-800/80 px-2.5 py-0.5 rounded-lg">
                        {job.employmentType.replace('_', ' ')}
                      </span>
                    </div>

                    <Link href={`/jobs/${job.slug}`}>
                      <h3 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                        {job.title}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {job.location}
                      </span>
                      {job.salaryMin && job.salaryMax ? (
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}{' '}
                          {job.currency}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Recommendation Score Gauge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <div
                      className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${badge.color}`}
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <div className="text-right">
                        <span className="text-xl font-extrabold tracking-tight">
                          {Math.round(rec.recommendationScore)}%
                        </span>
                        <span className="text-[10px] font-bold block uppercase tracking-wider">
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5-Signal Breakdown Meters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  {/* Signal 1: Skills */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Skills (40%)</span>
                      <span className="text-white font-bold">{Math.round(rec.breakdown.skillScore)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(rec.breakdown.skillScore)}`}
                        style={{ width: `${rec.breakdown.skillScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Signal 2: Semantic FAISS */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Semantic (25%)</span>
                      <span className="text-white font-bold">{Math.round(rec.breakdown.semanticScore)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(rec.breakdown.semanticScore)}`}
                        style={{ width: `${rec.breakdown.semanticScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Signal 3: Experience */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Experience (15%)</span>
                      <span className="text-white font-bold">{Math.round(rec.breakdown.experienceScore)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(rec.breakdown.experienceScore)}`}
                        style={{ width: `${rec.breakdown.experienceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Signal 4: Preferences */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Preferences (15%)</span>
                      <span className="text-white font-bold">{Math.round(rec.breakdown.preferenceScore)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(rec.breakdown.preferenceScore)}`}
                        style={{ width: `${rec.breakdown.preferenceScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Signal 5: Freshness */}
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Freshness (5%)</span>
                      <span className="text-white font-bold">{Math.round(rec.breakdown.freshnessScore)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(rec.breakdown.freshnessScore)}`}
                        style={{ width: `${rec.breakdown.freshnessScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Skills Taxonomy Tags */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 mr-1">Matched Skills:</span>
                    {rec.matchedSkills.length > 0 ? (
                      rec.matchedSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No direct skill matches</span>
                    )}

                    {rec.missingSkills.length > 0 && (
                      <>
                        <span className="text-xs font-semibold text-slate-400 ml-2 mr-1">Skill Gaps:</span>
                        {rec.missingSkills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Explainable AI "Why Recommended" Box */}
                <div className="p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/20 text-xs text-slate-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-teal-300 font-semibold">Why this job: </strong>
                    {rec.reason}
                  </p>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/jobs/${job.slug}`}>
                      <Button variant="secondary" className="text-xs py-1.5 px-3">
                        View Vacancy
                      </Button>
                    </Link>

                    <Link href={`/jobs/${job.slug}#match-report`}>
                      <button className="text-xs font-medium text-slate-400 hover:text-teal-300 transition-colors flex items-center gap-1 px-2.5 py-1.5">
                        <Target className="w-3.5 h-3.5" />
                        Match Analysis
                      </button>
                    </Link>

                    <Link href={`/jobs/${job.slug}#learning-path`}>
                      <button className="text-xs font-medium text-slate-400 hover:text-teal-300 transition-colors flex items-center gap-1 px-2.5 py-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Learning Roadmap
                      </button>
                    </Link>
                  </div>

                  <Link href={`/jobs/${job.slug}#apply`}>
                    <Button variant="primary" className="text-xs py-1.5 px-4 flex items-center gap-1.5">
                      Apply Now
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 glass-card rounded-2xl border border-slate-800">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs"
              >
                Previous
              </Button>
              <span className="text-xs text-slate-400 font-medium">
                Page {page} of {totalPages} ({totalItems} Total Vacancies)
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
