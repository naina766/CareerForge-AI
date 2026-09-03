'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { api } from '../../../../lib/api';
import { ApplicationStatusHistoryItem } from '@careerforge/types';
import {
  ArrowLeft,
  Building,
  MapPin,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { DashboardShell } from '../../../../components/dashboard/DashboardShell';
import { StatusPill } from '../../../../components/ui/StatusPill';

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
      <DashboardShell headerTitle="Application Details">
        <div className="py-12 flex justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !application) {
    return (
      <DashboardShell headerTitle="Application Details">
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 text-center space-y-3 max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Application Unavailable</h2>
          <p className="text-xs text-gray-400">{error || 'This application record was not found.'}</p>
          <Link href="/dashboard/applications">
            <Button size="sm" variant="outline" className="text-xs border-[#1f2937]" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} >
              Back to Applications
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const canWithdraw = !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status);

  return (
    <DashboardShell
      headerTitle="Application Details"
      headerDescription={`Tracking status for ${application.jobTitle || 'Engineering Role'} at ${application.companyName || 'Company'}.`}
      actionButton={
        <div className="flex items-center gap-2">
          <Link href="/dashboard/applications">
            <Button variant="outline" size="sm" className="text-xs border-[#1f2937]" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back
            </Button>
          </Link>
          {canWithdraw && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWithdrawModalOpen(true)}
              className="border-rose-900/40 text-rose-400 hover:bg-rose-950/20 text-xs"
            >
              Withdraw
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 max-w-5xl">
        {/* Hero Header Card */}
        <div className="bg-[#111827] rounded-xl p-5 border border-[#1f2937] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={application.status} />
                {application.workMode && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 capitalize">
                    {application.workMode.toLowerCase()}
                  </span>
                )}
                {application.employmentType && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    {application.employmentType.replace('_', ' ')}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-white tracking-tight">
                {application.jobTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-1">
                <span className="flex items-center gap-1 font-medium text-gray-200">
                  <Building className="w-3.5 h-3.5 text-blue-400" /> {application.companyName}
                </span>
                {application.jobLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" /> {application.jobLocation}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" /> Applied {new Date(application.appliedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <Link href={`/jobs/${application.jobSlug || application.jobId}`}>
              <Button size="sm" variant="outline" className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-300">
                View Public Listing
              </Button>
            </Link>
          </div>
        </div>

        {/* Grid: Status Timeline + Submission Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left 2 Cols: Timeline */}
          <div className="md:col-span-2 space-y-5">
            <div className="bg-[#111827] rounded-xl p-5 border border-[#1f2937] space-y-4">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Application Progress Timeline
              </h2>

              {/* Vertical Timeline */}
              <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-800">
                {(application.statusHistory || []).map((h: ApplicationStatusHistoryItem, idx: number) => (
                  <div key={h.id || idx} className="relative space-y-1">
                    <div className="absolute -left-[18px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-[#111827]" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-white">
                        Stage: {h.newStatus.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {h.note && (
                      <div className="p-2.5 rounded-lg bg-[#0b0f19] border border-[#1a2233] text-xs text-gray-300 italic">
                        "{h.note}"
                      </div>
                    )}
                    <span className="text-[10px] text-gray-500 block">
                      Updated by: {h.changedBy || h.changedByRole || 'System'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submitted Cover Letter */}
            {application.coverLetter && (
              <div className="bg-[#111827] rounded-xl p-5 border border-[#1f2937] space-y-2">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> Submitted Cover Letter
                </h3>
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233]">
                  {application.coverLetter}
                </div>
              </div>
            )}
          </div>

          {/* Right 1 Col: Attached Resume & Specs */}
          <div className="space-y-4">
            <div className="bg-[#111827] rounded-xl p-4 border border-[#1f2937] space-y-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Attached Resume
              </h3>

              <div className="p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] space-y-2">
                <span className="text-xs font-medium text-gray-200 block truncate">
                  {application.resume?.originalFileName || 'Resume Document.pdf'}
                </span>
                <span className="text-[10px] text-gray-500 block">
                  Snapshot attached on application date
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111827] border border-rose-900/40 rounded-xl p-5 max-w-sm w-full space-y-3">
            <h4 className="text-sm font-bold text-white">Withdraw Application</h4>
            <p className="text-xs text-gray-400">
              Are you sure you want to withdraw your application for <strong className="text-white">{application.jobTitle}</strong>?
            </p>
            {withdrawError && <div className="text-xs text-rose-400">{withdrawError}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWithdrawModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white"
                disabled={isWithdrawing}
                onClick={handleWithdraw}
              >
                {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
