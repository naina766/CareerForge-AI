'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { api } from '../../../../lib/api';
import { ApplicationStatus, ApplicationStatusHistoryItem } from '@careerforge/types';
import {
  ArrowLeft,
  Building,
  MapPin,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

function getStatusBadge(status: ApplicationStatus) {
  switch (status) {
    case 'APPLIED':
      return { label: 'Application Submitted', class: 'bg-slate-800 text-slate-300 border-slate-700' };
    case 'SCREENING':
      return { label: 'In Screening', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    case 'SHORTLISTED':
      return { label: 'Shortlisted for Interview', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
    case 'INTERVIEW':
      return { label: 'Interview Scheduled', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' };
    case 'OFFERED':
    case 'OFFER':
      return { label: 'Offer Extended', class: 'bg-purple-500/10 text-purple-300 border-purple-500/20' };
    case 'HIRED':
      return { label: 'Hired 🎉', class: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
    case 'REJECTED':
      return { label: 'Application Closed', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    case 'WITHDRAWN':
      return { label: 'Application Withdrawn', class: 'bg-slate-900 text-slate-500 border-slate-800' };
    default:
      return { label: status, class: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
}

export default function CandidateApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [application, setApplication] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const fetchApplication = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/applications/${applicationId}`);
      setApplication(res.data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Application not found or unauthorized');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/dashboard/applications/${applicationId}`);
      return;
    }
    if (isAuthenticated && applicationId) {
      fetchApplication();
    }
  }, [authLoading, isAuthenticated, applicationId]);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      await api.post(`/applications/${applicationId}/withdraw`, {});
      setWithdrawModalOpen(false);
      await fetchApplication();
    } catch (err: unknown) {
      const e = err as Error;
      setWithdrawError(e.message || 'Failed to withdraw application');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Loading application status...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="glass-panel rounded-3xl p-10 border border-slate-800/90 space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Application Unavailable</h2>
          <p className="text-xs text-slate-400">{error || 'This application record was not found.'}</p>
          <Link href="/dashboard/applications">
            <Button size="sm" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to My Applications
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const badge = getStatusBadge(application.status);
  const canWithdraw = !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status);

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/applications"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Applications
        </Link>

        {canWithdraw && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWithdrawModalOpen(true)}
            className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs"
          >
            Withdraw Application
          </Button>
        )}
      </div>

      {/* Hero Header Card */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800/90 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${badge.class}`}>
                {badge.label}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {application.workMode}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {application.employmentType.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {application.jobTitle}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mt-2 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <Building className="w-4 h-4 text-teal-400" /> {application.companyName}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" /> {application.jobLocation || 'Remote'}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Applied on {new Date(application.appliedAt).toLocaleDateString()}
              </span>
            </p>
          </div>

          <Link href={`/jobs/${application.jobSlug}`}>
            <Button size="sm" variant="outline">
              View Public Listing
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid: Status Timeline + Submission Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left 2 Cols: Timeline */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400" /> Application Progress Timeline
            </h2>

            {/* Vertical Chronological Timeline */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {(application.statusHistory || []).map((h: ApplicationStatusHistoryItem, idx: number) => (
                <div key={h.id || idx} className="relative space-y-1 group">
                  <div className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full bg-teal-400 border-4 border-slate-950 shadow-sm" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-sm font-bold text-white">
                      Stage: {h.newStatus}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(h.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {h.note && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 italic mt-1">
                      "{h.note}"
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 block">
                    Updated by: {h.changedBy || h.changedByRole || 'System'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submitted Cover Letter */}
          {application.coverLetter && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/80 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" /> Submitted Cover Letter
              </h3>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                {application.coverLetter}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Resume Artifact Card & Role Specs */}
        <div className="space-y-6">
          {/* Resume Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800/80 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" /> Attached Resume
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{application.resumeName}</p>
                  <p className="text-[10px] text-slate-400">PDF Artifact</p>
                </div>
              </div>

              {application.resumeFileUrl && (
                <a
                  href={application.resumeFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button size="sm" variant="outline" className="w-full" leftIcon={<Download className="w-3.5 h-3.5" />}>
                    Download Resume
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Quick Specs */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800/80 space-y-3 text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider">Opportunity Specs</h3>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Work Mode</span>
                <span className="font-medium">{application.workMode}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Employment Type</span>
                <span className="font-medium">{application.employmentType.replace('_', ' ')}</span>
              </div>
              {application.salaryMin && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Salary Band</span>
                  <span className="font-mono text-emerald-400">
                    ${application.salaryMin.toLocaleString()}
                    {application.salaryMax ? ` - $${application.salaryMax.toLocaleString()}` : '+'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setWithdrawModalOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl z-10">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Withdraw Application?</h3>
            </div>
            <p className="text-xs text-slate-400">
              Are you sure you want to withdraw your application for <strong className="text-white">{application.jobTitle}</strong>?
              This action cannot be undone.
            </p>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {withdrawError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button size="sm" variant="ghost" onClick={() => setWithdrawModalOpen(false)}>
                Keep Active
              </Button>
              <Button
                size="sm"
                className="bg-rose-500 hover:bg-rose-600 text-white"
                disabled={isWithdrawing}
                onClick={handleWithdraw}
              >
                {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
