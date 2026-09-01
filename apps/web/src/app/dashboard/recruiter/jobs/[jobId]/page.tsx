'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';
import { api } from '../../../../../lib/api';
import { Job, JobStatus } from '@careerforge/types';
import {
  ArrowLeft,
  Edit,
  PlayCircle,
  PauseCircle,
  XCircle,
  Archive,
  Copy,
  MapPin,
  Layers,
  AlertCircle,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transition Modal
  const [actionModal, setActionModal] = useState<{
    action: 'PUBLISH' | 'PAUSE' | 'REOPEN' | 'CLOSE' | 'ARCHIVE';
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadJobData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<Job>(`/recruiter/jobs/${jobId}`);
      setJob(res.data);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to fetch job details' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && jobId) {
      loadJobData();
    }
  }, [isAuthenticated, jobId]);

  const handleDuplicateJob = async () => {
    try {
      const res = await api.post<{ id: string }>(`/recruiter/jobs/${jobId}/duplicate`);
      router.push(`/dashboard/recruiter/jobs/${res.data.id}/edit`);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to duplicate job' });
    }
  };

  const handleExecuteStatusTransition = async () => {
    if (!actionModal || !job) return;
    setIsProcessingAction(true);
    try {
      const targetStatus: JobStatus =
        actionModal.action === 'PUBLISH' || actionModal.action === 'REOPEN'
          ? 'PUBLISHED'
          : actionModal.action === 'PAUSE'
          ? 'PAUSED'
          : actionModal.action === 'CLOSE'
          ? 'CLOSED'
          : 'ARCHIVED';

      if (actionModal.action === 'ARCHIVE') {
        await api.patch(`/recruiter/jobs/${jobId}/archive`);
      } else {
        await api.patch(`/recruiter/jobs/${jobId}/status`, { status: targetStatus });
      }

      setMessage({
        type: 'success',
        text: `Job status transitioned to ${targetStatus}.`,
      });
      setActionModal(null);
      loadJobData();
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to change status' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  if (isLoading || !job) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading job details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/recruiter/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Job Postings
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{job.title}</h1>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                job.status === 'PUBLISHED' || job.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : job.status === 'DRAFT'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  : job.status === 'PAUSED'
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                  : job.status === 'CLOSED'
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {job.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <Building className="w-3.5 h-3.5 text-slate-500" /> {job.companyName} •{' '}
            <MapPin className="w-3.5 h-3.5 text-slate-500" /> {job.location || 'Remote'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`/dashboard/recruiter/jobs/${jobId}/edit`}>
            <Button size="sm" variant="outline" leftIcon={<Edit className="w-3.5 h-3.5 text-indigo-400" />}>
              Edit
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicateJob}
            leftIcon={<Copy className="w-3.5 h-3.5 text-teal-400" />}
          >
            Duplicate
          </Button>

          {job.status === 'DRAFT' && (
            <Button
              size="sm"
              onClick={() => setActionModal({ action: 'PUBLISH' })}
              leftIcon={<PlayCircle className="w-3.5 h-3.5 text-emerald-400" />}
            >
              Publish Job
            </Button>
          )}

          {job.status === 'PUBLISHED' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActionModal({ action: 'PAUSE' })}
                leftIcon={<PauseCircle className="w-3.5 h-3.5 text-amber-400" />}
              >
                Pause
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setActionModal({ action: 'CLOSE' })}
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
              >
                Close
              </Button>
            </>
          )}

          {job.status === 'PAUSED' && (
            <>
              <Button
                size="sm"
                onClick={() => setActionModal({ action: 'REOPEN' })}
                leftIcon={<PlayCircle className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Reopen
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setActionModal({ action: 'CLOSE' })}
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
              >
                Close
              </Button>
            </>
          )}

          {job.status === 'CLOSED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActionModal({ action: 'ARCHIVE' })}
              leftIcon={<Archive className="w-3.5 h-3.5 text-slate-400" />}
            >
              Archive
            </Button>
          )}
        </div>
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

      {/* Overview Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Work Mode</span>
          <p className="text-sm font-bold text-white">{job.workMode}</p>
          <p className="text-[10px] text-slate-400">{job.employmentType.replace('_', ' ')}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Experience</span>
          <p className="text-sm font-bold text-white">
            {job.experienceMin}
            {job.experienceMax ? ` – ${job.experienceMax} years` : '+ years'}
          </p>
          <p className="text-[10px] text-slate-400">Required range</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Compensation</span>
          <p className="text-sm font-bold text-emerald-400 font-mono">
            {job.salaryMin
              ? `$${job.salaryMin.toLocaleString()}${
                  job.salaryMax ? ` – $${job.salaryMax.toLocaleString()}` : ''
                }`
              : 'Undisclosed'}
          </p>
          <p className="text-[10px] text-slate-400">
            {job.salaryPeriod ? `${job.salaryPeriod.toLowerCase()}` : 'Yearly'} ({job.currency})
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Deadline</span>
          <p className="text-sm font-bold text-white">
            {job.applicationDeadline
              ? new Date(job.applicationDeadline).toLocaleDateString()
              : 'Open Until Filled'}
          </p>
          <p className="text-[10px] text-slate-400">Application window</p>
        </div>
      </div>

      {/* Main Details Panel */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-8">
        {/* Overview */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">About the Role</h2>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
            {job.description}
          </p>
        </div>

        {/* Responsibilities */}
        {job.responsibilities && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Key Responsibilities
            </h2>
            <div className="text-xs text-slate-300 whitespace-pre-line bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 font-mono">
              {job.responsibilities}
            </div>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Requirements & Qualifications
            </h2>
            <div className="text-xs text-slate-300 whitespace-pre-line bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 font-mono">
              {job.requirements}
            </div>
          </div>
        )}

        {/* Technical Skills */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Technical Skills & Requirements ({(job.jobSkills || []).length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {(job.jobSkills || []).map((js, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                  js.importance === 'REQUIRED'
                    ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                }`}
              >
                <span>{js.skill?.name || 'Skill'}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-400">
                  {js.importance}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        {job.benefits && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Benefits & Perks</h2>
            <div className="text-xs text-slate-300 whitespace-pre-line bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 font-mono">
              {job.benefits}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation State Transition Dialog */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm {actionModal.action.toLowerCase()} action?
                </h3>
                <p className="text-xs text-slate-400">{job.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {actionModal.action === 'PUBLISH'
                ? 'Publishing this posting will make it active and eligible for talent matching pipelines.'
                : actionModal.action === 'PAUSE'
                ? 'Pausing will temporarily hold candidate interactions.'
                : actionModal.action === 'REOPEN'
                ? 'Reopening will restore this job to active published status.'
                : actionModal.action === 'CLOSE'
                ? 'Once closed, the job will no longer be available for active recruitment.'
                : 'Archiving will move this record to permanent cold storage.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal(null)}
                disabled={isProcessingAction}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={isProcessingAction}
                onClick={handleExecuteStatusTransition}
                variant={actionModal.action === 'CLOSE' || actionModal.action === 'ARCHIVE' ? 'danger' : 'primary'}
              >
                Confirm {actionModal.action.toLowerCase()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
