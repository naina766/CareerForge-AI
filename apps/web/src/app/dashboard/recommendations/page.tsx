'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import {
  JobRecommendationItem,
  JobRecommendationListResponse,
} from '@careerforge/types';
import {
  RefreshCw,
  Briefcase,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { ScoreBadge } from '../../../components/ui/ScoreBadge';
import { MetricCard } from '../../../components/ui/MetricCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonCardGrid } from '../../../components/ui/Skeleton';

export default function RecommendationsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [recommendations, setRecommendations] = useState<JobRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedExplain, setExpandedExplain] = useState<Record<string, boolean>>({});

  // Filters & Pagination
  const [workMode, setWorkMode] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('recommended');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

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

  if (authLoading) {
    return (
      <DashboardShell headerTitle="Job Matches">
        <div className="py-12 flex justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  const strongMatchesCount = recommendations.filter((r) => r.recommendationScore >= 70).length;

  return (
    <DashboardShell
      headerTitle="Job Matches"
      headerDescription="Personalized job recommendations ranked by verified skill overlap and resume compatibility."
      actionButton={
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing || loading}
          className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-200"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />}
        >
          {refreshing ? 'Recomputing...' : 'Refresh Matches'}
        </Button>
      }
    >
      <div className="space-y-5 max-w-6xl">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <MetricCard
            label="Total Matched Roles"
            value={totalItems}
            description="Open vacancies aligned with your profile"
            icon={Briefcase}
            iconColor="text-blue-400"
          />

          <MetricCard
            label="Strong Matches"
            value={strongMatchesCount}
            subvalue="≥70% compatibility"
            description="Roles with high skill alignment"
            icon={TrendingUp}
            iconColor="text-emerald-400"
          />

          <MetricCard
            label="Matching Engine"
            value="Semantic + Skills"
            subvalue="Multi-signal ranking"
            description="Continuous alignment recalculation"
            icon={Target}
            iconColor="text-purple-400"
          />
        </div>

        {/* Filters & Sorting Toolbar */}
        <div className="bg-[#111827] rounded-xl p-3.5 border border-[#1f2937] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Work Mode Filter */}
            <select
              value={workMode}
              onChange={(e) => {
                setWorkMode(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by work mode"
              className="bg-[#0b0f19] border border-[#1f2937] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
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
              aria-label="Filter by minimum score"
              className="bg-[#0b0f19] border border-[#1f2937] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="0">All Match Scores</option>
              <option value="60">60%+ Match</option>
              <option value="70">70%+ Strong Fit</option>
              <option value="80">80%+ Excellent</option>
              <option value="90">90%+ Top Match</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              aria-label="Sort recommendations"
              className="bg-[#0b0f19] border border-[#1f2937] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="recommended">Best Match</option>
              <option value="score">Highest Score</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={() => fetchRecommendations()}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <SkeletonCardGrid count={4} />
        ) : recommendations.length === 0 ? (
          /* Empty State */
          <EmptyState
            icon={Briefcase}
            title="No strong matches found"
            description="Try broadening your work mode filters or adding more verified skills to your profile."
            actionLabel="Reset Filters"
            onAction={() => {
              setWorkMode('');
              setMinScore(0);
              setSortBy('recommended');
            }}
          />
        ) : (
          /* Job Recommendation Cards Grid */
          <div className="space-y-3.5">
            {recommendations.map((rec) => {
              const jobId = rec.jobId || rec.id;
              const jobTitle = rec.job?.title || 'Engineering Role';
              const companyName = rec.job?.companyName || 'Technology Company';
              const location = rec.job?.location;
              const workMode = rec.job?.workMode;
              const isExplained = expandedExplain[jobId] ?? false;

              return (
                <div
                  key={jobId}
                  className="bg-[#111827] rounded-xl p-4 sm:p-5 border border-[#1f2937] hover:border-gray-700 transition-colors space-y-3"
                >
                  {/* Card Header: Job Title, Company, Location, Match Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/jobs/${jobId}`}
                          className="text-base font-bold text-white hover:text-blue-400 transition-colors"
                        >
                          {jobTitle}
                        </Link>
                        <span className="text-xs text-gray-400 font-medium">
                          {companyName}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-500" />
                            {location}
                          </span>
                        )}
                        {workMode && (
                          <span className="px-2 py-0.2 rounded bg-gray-800 text-gray-300 text-[11px] capitalize">
                            {workMode.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-auto">
                      <ScoreBadge score={rec.recommendationScore} size="md" />
                    </div>
                  </div>

                  {/* Skills Grid: Matched vs Missing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    {/* Matched Skills */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Matched Skills ({rec.matchedSkills?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rec.matchedSkills && rec.matchedSkills.length > 0 ? (
                          rec.matchedSkills.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">No direct skills extracted</span>
                        )}
                      </div>
                    </div>

                    {/* Skill Gaps */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Skill Gaps ({rec.missingSkills?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rec.missingSkills && rec.missingSkills.length > 0 ? (
                          rec.missingSkills.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-medium"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-emerald-400 text-[11px]">All required skills verified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Explainability Breakdown (Collapsible) */}
                  {rec.reason && (
                    <div className="pt-2 border-t border-[#1f2937]/70">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedExplain((prev) => ({
                            ...prev,
                            [jobId]: !isExplained,
                          }))
                        }
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                      >
                        <Target className="w-3.5 h-3.5 text-blue-400" />
                        <span>Why this matches your profile</span>
                        {isExplained ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExplained && (
                        <div className="mt-2 p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] space-y-2 text-xs">
                          <p className="text-gray-300 leading-relaxed">{rec.reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Footer: View Role Button */}
                  <div className="flex items-center justify-end pt-1">
                    <Link href={`/jobs/${jobId}`}>
                      <Button
                        size="sm"
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        View Role & Apply
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs border-[#1f2937]"
                >
                  Previous
                </Button>
                <span className="text-xs text-gray-400 px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs border-[#1f2937]"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
