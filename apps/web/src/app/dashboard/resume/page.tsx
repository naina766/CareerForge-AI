'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { ResumeMetadata, ParsedResume } from '@careerforge/types';
import {
  UploadCloud,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { ScoreBadge } from '../../../components/ui/ScoreBadge';
import { SectionHeader } from '../../../components/ui/SectionHeader';

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function ResumeManagementPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const [resume, setResume] = useState<ResumeMetadata | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [indexStatus, setIndexStatus] = useState<{
    isIndexed: boolean;
    totalChunks: number;
    indexedChunks: number;
    embeddingModel: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ chunkId: string; resumeId: string; section: string; content: string; similarityScore: number }>
  >([]);

  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'uploading' | 'processing'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Modals
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isReplaceModalOpen) setIsReplaceModalOpen(false);
        if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReplaceModalOpen, isDeleteModalOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadResumeData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ resume: ResumeMetadata | null }>('/candidates/me/resume');
      setResume(res.data.resume);

      if (res.data.resume?.parsedResume) {
        setParsedResume(res.data.resume.parsedResume);
      } else if (res.data.resume?.processingStatus === 'PARSED' || res.data.resume?.processingStatus === 'EMBEDDED') {
        try {
          const parsedRes = await api.get<{ parsedResume: ParsedResume }>('/candidates/me/resume/parsed');
          setParsedResume(parsedRes.data.parsedResume);
        } catch {
          // No parsed record yet
        }
      }

      // Fetch vector index status
      try {
        const idxRes = await api.get<{
          isIndexed: boolean;
          totalChunks: number;
          indexedChunks: number;
          embeddingModel: string;
        }>('/candidates/me/resume/index-status');
        setIndexStatus(idxRes.data);
      } catch {
        // Not indexed yet
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to fetch resume metadata' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadResumeData();
    }
  }, [isAuthenticated]);

  const handleFileSelect = async (file: File) => {
    setMessage(null);

    // Validation
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Only PDF documents (.pdf) are supported.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: `File exceeds maximum allowed size of 5 MB (${formatBytes(file.size)}).`,
      });
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setIsUploading(true);
      setUploadState('validating');

      setTimeout(() => setUploadState('uploading'), 300);
      setTimeout(() => setUploadState('processing'), 700);

      const res = await api.upload<{ resume: ResumeMetadata }>('/candidates/me/resume', formData);
      setResume(res.data.resume);
      setParsedResume(null);
      setMessage({ type: 'success', text: 'Resume uploaded successfully. Click "Analyze Resume" to extract taxonomy skills.' });
      setIsReplaceModalOpen(false);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to upload resume. Please verify the PDF file format.' });
    } finally {
      setIsUploading(false);
      setUploadState('idle');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  const handleParseResume = async () => {
    setMessage(null);
    setIsParsing(true);
    try {
      const res = await api.post<{
        resume: { id: string; processingStatus: string };
        parsedResume: ParsedResume;
      }>('/candidates/me/resume/parse');

      setParsedResume(res.data.parsedResume);
      if (resume) {
        setResume({
          ...resume,
          processingStatus: 'PARSED',
          parsedResume: res.data.parsedResume,
        });
      }
      setMessage({ type: 'success', text: 'Resume analyzed successfully. Extracted skills and structured sections.' });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to analyze resume.' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleIndexResume = async () => {
    setMessage(null);
    setIsIndexing(true);
    try {
      const res = await api.post<{
        success: boolean;
        totalChunks: number;
        indexedChunks: number;
        embeddingModel: string;
        embeddingDimension: number;
      }>('/candidates/me/resume/index');

      setIndexStatus({
        isIndexed: true,
        totalChunks: res.data.totalChunks,
        indexedChunks: res.data.indexedChunks,
        embeddingModel: res.data.embeddingModel,
      });

      setMessage({
        type: 'success',
        text: `Resume profile indexed into FAISS (${res.data.totalChunks} chunks). Semantic search is ready.`,
      });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to index resume.' });
    } finally {
      setIsIndexing(false);
    }
  };

  const handleDeleteResume = async () => {
    try {
      await api.delete('/candidates/me/resume');
      setResume(null);
      setParsedResume(null);
      setIndexStatus(null);
      setSearchResults([]);
      setIsDeleteModalOpen(false);
      setMessage({ type: 'success', text: 'Resume deleted successfully from storage and vector index.' });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to delete resume.' });
    }
  };

  const handleDownload = async () => {
    if (!resume || isDownloading) return;
    setIsDownloading(true);
    setMessage(null);

    try {
      const token = api.getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/candidates/me/resume/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        let errorMsg = 'Failed to download resume file.';
        try {
          const errData = await res.json();
          if (errData?.error?.message) {
            errorMsg = errData.error.message;
          } else if (errData?.message) {
            errorMsg = errData.message;
          }
        } catch {
          if (res.status === 404) {
            errorMsg = 'Resume file not found on disk. Please upload a new resume.';
          }
        }
        throw new Error(errorMsg);
      }

      // Extract filename from Content-Disposition header if present
      let downloadFileName = resume.originalFileName || 'resume.pdf';
      const disposition = res.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          downloadFileName = decodeURIComponent(match[1]);
        }
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Delay object URL revocation so browser download manager has initiated stream reading
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 1500);

      setMessage({ type: 'success', text: 'Resume download initiated.' });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({
        type: 'error',
        text: `${e.message || 'Failed to download resume.'} If this file is missing from storage, click "Replace" above to upload an updated version.`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.post<{
        query: string;
        results: Array<{ chunkId: string; resumeId: string; section: string; content: string; similarityScore: number }>;
        totalMatched: number;
      }>('/candidates/me/resume/search', { query: searchQuery, topK: 5 });

      setSearchResults(res.data.results);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Search failed.' });
    } finally {
      setIsSearching(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <DashboardShell headerTitle="Resume Lab">
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Loading document workspace...</span>
        </div>
      </DashboardShell>
    );
  }

  const isAnalyzed = resume?.processingStatus === 'PARSED' || resume?.processingStatus === 'EMBEDDED' || resume?.processingStatus === 'ANALYZED';
  const isIndexed = indexStatus?.isIndexed ?? (resume?.processingStatus === 'EMBEDDED');

  return (
    <DashboardShell
      headerTitle="Resume Lab"
      headerDescription="Manage your primary resume document, review extracted taxonomy skills, and test semantic retrieval."
    >
      <div className="space-y-6 max-w-6xl animate-fade-in">
        {/* Notification Banner */}
        {message && (
          <div
            role="alert"
            aria-live="polite"
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
              message.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Primary Document Workspace Card */}
        {resume ? (
          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
            {/* Document Header & Primary Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight truncate">
                      {resume.originalFileName}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                      v{resume.version || 1}.0
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{formatBytes(resume.fileSize || 0)}</span>
                    <span className="text-slate-600">·</span>
                    <span>PDF Document</span>
                    <span className="text-slate-600">·</span>
                    <span>Uploaded {new Date(resume.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {isAnalyzed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Skills Parsed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3.5 h-3.5" /> Needs Parsing
                  </span>
                )}

                {isIndexed ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    <Search className="w-3.5 h-3.5 text-blue-400" /> FAISS Indexed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                    <Layers className="w-3.5 h-3.5" /> Unindexed
                  </span>
                )}
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
                  leftIcon={
                    isDownloading ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleParseResume}
                  disabled={isParsing}
                  className="text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isParsing ? 'animate-spin' : ''}`} />}
                >
                  {isParsing ? 'Extracting Skills...' : isAnalyzed ? 'Re-Analyze Skills' : 'Analyze Resume'}
                </Button>

                {!isIndexed && isAnalyzed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleIndexResume}
                    disabled={isIndexing}
                    className="text-xs border-blue-500/40 text-blue-300 hover:bg-blue-950/20"
                    leftIcon={<Search className="w-3.5 h-3.5 text-blue-400" />}
                  >
                    {isIndexing ? 'Indexing Vectors...' : 'Index in FAISS'}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReplaceModalOpen(true)}
                  className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  Replace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Document Metadata Audit Sheet (Collapsible) */}
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowTechDetails(!showTechDetails)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-medium transition-colors"
              >
                <span>Document system audit</span>
                {showTechDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTechDetails && (
                <div className="mt-3 p-4 rounded-xl bg-[#090d16] border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Status</span>
                    <span className="font-mono text-slate-200">{resume.processingStatus}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Vector Chunks</span>
                    <span className="font-mono text-slate-200">
                      {indexStatus?.indexedChunks ?? (isIndexed ? 'Indexed' : 'Pending')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Embedding Model</span>
                    <span className="font-mono text-slate-200 truncate block">
                      {indexStatus?.embeddingModel || 'sentence-transformers (384-dim)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">MIME Type</span>
                    <span className="font-mono text-slate-200 truncate block">
                      {resume.mimeType || 'application/pdf'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State / Upload Zone */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center transition-all bg-[#0d121f] ${
              isDragging
                ? 'border-blue-500 bg-blue-950/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              aria-label="Upload PDF resume file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />

            <div className="h-12 w-12 rounded-xl bg-[#090d16] border border-slate-800 flex items-center justify-center text-blue-400 mx-auto mb-4">
              <UploadCloud className="w-6 h-6" aria-hidden="true" />
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">Upload Your Engineering Resume</h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              Upload a standard PDF resume (up to 5 MB). Our parser extracts skills, verifies work history, and indexes semantic chunks for grounded matching.
            </p>

            <div className="mt-5 flex items-center justify-center">
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-5 py-2"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    {uploadState === 'validating'
                      ? 'Validating file format...'
                      : uploadState === 'uploading'
                      ? 'Uploading to storage...'
                      : 'Processing...'}
                  </span>
                ) : (
                  'Select PDF File'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 2. Extracted Taxonomy Skills */}
        {parsedResume?.parsedData?.skills && parsedResume.parsedData.skills.length > 0 && (
          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <SectionHeader
              title={`Extracted Skills (${parsedResume.parsedData.skills.length})`}
              subtitle="Normalized skills mapped to CareerForge canonical taxonomy"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              {parsedResume.parsedData.skills.map((skill: string | any, sIdx: number) => {
                const skillName = typeof skill === 'string' ? skill : skill?.name || skill?.canonicalName || 'Skill';
                return (
                  <span
                    key={sIdx}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#090d16] text-slate-200 border border-slate-800 font-medium"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    {skillName}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Verified Work Experience & Education Sections */}
        {parsedResume?.parsedData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Experience */}
            <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-4">
              <SectionHeader
                title="Work History"
                subtitle="Parsed chronologically from document"
                icon={<Briefcase className="w-4 h-4 text-emerald-400" />}
              />
              <div className="space-y-3">
                {parsedResume.parsedData.experience && parsedResume.parsedData.experience.length > 0 ? (
                  parsedResume.parsedData.experience.map((exp: any, eIdx: number) => (
                    <div key={eIdx} className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 text-xs space-y-1.5">
                      <div className="font-bold text-white text-sm">{exp.jobTitle || exp.title || 'Role'}</div>
                      <div className="text-slate-400 font-medium">
                        {exp.companyName || exp.company || 'Company'} · {exp.duration || exp.startDate || 'Present'}
                      </div>
                      {exp.description && (
                        <p className="text-slate-300 text-xs leading-relaxed line-clamp-3 pt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-4 text-center">No work history sections parsed.</div>
                )}
              </div>
            </div>

            {/* Education */}
            <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 space-y-4">
              <SectionHeader
                title="Education & Credentials"
                subtitle="Degrees and institutions parsed"
                icon={<GraduationCap className="w-4 h-4 text-blue-400" />}
              />
              <div className="space-y-3">
                {parsedResume.parsedData.education && parsedResume.parsedData.education.length > 0 ? (
                  parsedResume.parsedData.education.map((edu: any, edIdx: number) => (
                    <div key={edIdx} className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 text-xs space-y-1.5">
                      <div className="font-bold text-white text-sm">{edu.degree || 'Degree'}</div>
                      <div className="text-slate-400 font-medium">
                        {edu.institution || edu.school || 'University'} · {edu.year || edu.endDate || 'Completed'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-4 text-center">No education sections parsed.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Semantic Resume Query (Candidate-Facing Grounded Search) */}
        {resume && (
          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <SectionHeader
              title="Ask Your Resume (Vector Retrieval)"
              subtitle="Query your parsed resume chunks via FAISS dense vector search"
              icon={<Search className="w-4 h-4 text-blue-400" />}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSemanticSearch();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                aria-label="Search your indexed resume sections using natural language"
                placeholder='e.g. "What distributed systems or backend experience do I have?"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
              <Button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white min-h-[42px] px-4"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>

            {/* Quick Query Ideas */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-slate-500">
                <Sparkles className="w-3 h-3" /> Quick queries:
              </span>
              {[
                'Backend & database technologies',
                'Leadership and architectural decisions',
                'Education and degree credentials',
              ].map((querySuggestion, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => setSearchQuery(querySuggestion)}
                  className="px-2.5 py-1 rounded-md bg-[#090d16] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  {querySuggestion}
                </button>
              ))}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block">
                  Matched Resume Chunks ({searchResults.length})
                </span>
                {searchResults.map((res, rIdx) => (
                  <div
                    key={res.chunkId || rIdx}
                    className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                        Section: <strong className="text-white">{res.section ? res.section.replace(/_/g, ' ') : 'General'}</strong>
                      </span>
                      <ScoreBadge score={res.similarityScore * (res.similarityScore <= 1 ? 100 : 1)} size="sm" />
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed p-3 rounded-lg bg-[#0d121f] border border-slate-800/80 font-mono text-[11px]">
                      &quot;{res.content}&quot;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Replace Modal */}
      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-modal-title"
            className="bg-[#0d121f] border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4"
          >
            <h4 id="replace-modal-title" className="text-sm font-bold text-white">Replace Resume File</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uploading a new PDF resume will overwrite your active file and refresh all extracted skills and vector embeddings.
            </p>
            <input
              type="file"
              ref={replaceFileInputRef}
              accept="application/pdf"
              aria-label="Select replacement PDF resume file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsReplaceModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                onClick={() => replaceFileInputRef.current?.click()}
              >
                Select New PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="bg-[#0d121f] border border-rose-900/60 rounded-2xl p-6 max-w-sm w-full space-y-4"
          >
            <h4 id="delete-modal-title" className="text-sm font-bold text-white">Delete Active Resume</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete your resume? This will clear all stored files, extracted skills, and vector indices.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white"
                onClick={handleDeleteResume}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
