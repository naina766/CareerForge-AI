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
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';
import { ScoreBadge } from '../../../components/ui/ScoreBadge';
import { SectionHeader } from '../../../components/ui/SectionHeader';

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
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
          // No parsed data yet
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
        text: `Resume profile indexed successfully (${res.data.totalChunks} sections). Semantic search is ready!`,
      });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to index resume' });
    } finally {
      setIsIndexing(false);
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
      setMessage({ type: 'error', text: e.message || 'Search failed' });
    } finally {
      setIsSearching(false);
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
        text: `File exceeds the maximum allowed size of 5 MB (${formatBytes(file.size)}).`,
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
      setMessage({ type: 'success', text: 'Resume uploaded successfully! Click "Analyze Resume" to extract your skills.' });
      setIsReplaceModalOpen(false);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to upload resume. Please check file format.' });
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
      setMessage({ type: 'success', text: 'Resume analyzed successfully! Extracted skills, experience, and education.' });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to analyze resume.' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDeleteResume = async () => {
    try {
      await api.delete('/candidates/me/resume');
      setResume(null);
      setParsedResume(null);
      setIsDeleteModalOpen(false);
      setMessage({ type: 'success', text: 'Resume deleted successfully.' });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to delete resume' });
    }
  };

  const handleDownload = async () => {
    try {
      const token = api.getAccessToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/candidates/me/resume/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to download resume file.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume?.originalFileName || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to download resume' });
    }
  };

  if (authLoading || isLoading) {
    return (
      <DashboardShell headerTitle="Resume Lab">
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-xs text-gray-400">Loading resume intelligence...</span>
        </div>
      </DashboardShell>
    );
  }

  const isAnalyzed = resume?.processingStatus === 'PARSED' || resume?.processingStatus === 'EMBEDDED';
  const isIndexed = indexStatus?.isIndexed ?? (resume?.processingStatus === 'EMBEDDED');

  return (
    <DashboardShell
      headerTitle="Resume Lab"
      headerDescription="Manage your resume, review extracted skills, and test AI semantic search."
    >
      <div className="space-y-6 max-w-5xl">
        {/* Alert Banner */}
        {message && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
              message.type === 'success'
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Resume File Card / Upload Area */}
        {resume ? (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1f2937]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {resume.originalFileName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                    <span>{formatBytes(resume.fileSize || 0)}</span>
                    <span>•</span>
                    <span>Uploaded {new Date(resume.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                {isAnalyzed && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Analyzed
                  </span>
                )}
                {isIndexed && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    <Sparkles className="w-3 h-3 text-purple-400" /> AI Search Ready
                  </span>
                )}
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleParseResume}
                  disabled={isParsing}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isParsing ? 'animate-spin' : ''}`} />}
                >
                  {isParsing ? 'Analyzing...' : isAnalyzed ? 'Re-Analyze Skills' : 'Analyze Resume'}
                </Button>

                {!isIndexed && isAnalyzed && (
                  <Button
                    size="sm"
                    onClick={handleIndexResume}
                    disabled={isIndexing}
                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white"
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    {isIndexing ? 'Indexing...' : 'Enable AI Search'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-300"
                  leftIcon={<Download className="w-3.5 h-3.5 text-gray-400" />}
                >
                  Download PDF
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReplaceModalOpen(true)}
                  className="text-xs border-[#1f2937] hover:bg-gray-800 text-gray-300"
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

            {/* Collapsible Technical Details */}
            <div className="pt-2 border-t border-[#1f2937]/60">
              <button
                type="button"
                onClick={() => setShowTechDetails(!showTechDetails)}
                className="text-[11px] text-gray-400 hover:text-gray-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>Technical details</span>
                {showTechDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showTechDetails && (
                <div className="mt-2 p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-400">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Status</span>
                    <span className="font-mono text-gray-200">{resume.processingStatus}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Indexed Chunks</span>
                    <span className="font-mono text-gray-200">{indexStatus?.indexedChunks ?? (isIndexed ? 'Indexed' : '0')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Embedding Model</span>
                    <span className="font-mono text-gray-200 truncate block">{indexStatus?.embeddingModel || 'FastEmbed BGE-small'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">MIME Type</span>
                    <span className="font-mono text-gray-200 truncate block">{resume.mimeType}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Clean Upload Area */
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
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-colors bg-[#0b0f19] ${
              isDragging
                ? 'border-blue-500 bg-blue-950/10'
                : 'border-[#1f2937] hover:border-gray-700'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />

            <div className="h-12 w-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-blue-400 mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h3 className="text-base font-semibold text-white">Upload your resume</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Upload your PDF resume (up to 5 MB) to unlock grounded skill extraction and AI matching.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
              >
                {isUploading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    {uploadState === 'validating'
                      ? 'Validating PDF...'
                      : uploadState === 'uploading'
                      ? 'Uploading...'
                      : 'Processing...'}
                  </span>
                ) : (
                  'Choose PDF File'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 2. Extracted Skills Taxonomy */}
        {parsedResume?.parsedData?.skills && parsedResume.parsedData.skills.length > 0 && (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-3">
            <SectionHeader
              title={`Extracted Skills (${parsedResume.parsedData.skills.length})`}
              subtitle="Skills mapped to CareerForge normalization taxonomy"
              icon={<CheckCircle2 className="w-4 h-4 text-blue-400" />}
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedResume.parsedData.skills.map((skill: string | any, sIdx: number) => {
                const skillName = typeof skill === 'string' ? skill : skill?.name || skill?.canonicalName || 'Skill';
                return (
                  <span
                    key={sIdx}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#0b0f19] text-gray-200 border border-[#1a2233]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    {skillName}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Parsed Work Experience & Education */}
        {parsedResume?.parsedData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Experience */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
              <SectionHeader
                title="Work Experience"
                icon={<Briefcase className="w-4 h-4 text-emerald-400" />}
              />
              <div className="space-y-2.5">
                {parsedResume.parsedData.experience && parsedResume.parsedData.experience.length > 0 ? (
                  parsedResume.parsedData.experience.map((exp: any, eIdx: number) => (
                    <div key={eIdx} className="p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] text-xs space-y-1">
                      <div className="font-semibold text-white">{exp.jobTitle || exp.title || 'Role'}</div>
                      <div className="text-gray-400">{exp.companyName || exp.company || 'Company'} • {exp.duration || exp.startDate || 'Present'}</div>
                      {exp.description && (
                        <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2 mt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 py-3">No work experience sections detected.</div>
                )}
              </div>
            </div>

            {/* Education */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
              <SectionHeader
                title="Education"
                icon={<GraduationCap className="w-4 h-4 text-purple-400" />}
              />
              <div className="space-y-2.5">
                {parsedResume.parsedData.education && parsedResume.parsedData.education.length > 0 ? (
                  parsedResume.parsedData.education.map((edu: any, edIdx: number) => (
                    <div key={edIdx} className="p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] text-xs space-y-1">
                      <div className="font-semibold text-white">{edu.degree || 'Degree'}</div>
                      <div className="text-gray-400">{edu.institution || edu.school || 'University'} • {edu.year || 'Completed'}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 py-3">No education sections detected.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Ask Your Resume (Candidate-Facing Semantic Search) */}
        {resume && (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-4">
            <SectionHeader
              title="Ask Your Resume"
              subtitle="Search your indexed resume sections using natural language"
              icon={<Search className="w-4 h-4 text-purple-400" />}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSemanticSearch();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder='e.g. "What backend technologies have I used?"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#1f2937] text-xs sm:text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500"
              />
              <Button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="text-xs bg-purple-600 hover:bg-purple-500 text-white min-h-[38px]"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-gray-400 block">
                  Search Results ({searchResults.length} matched sections)
                </span>
                {searchResults.map((res, rIdx) => (
                  <div
                    key={res.chunkId || rIdx}
                    className="p-3 rounded-lg bg-[#0b0f19] border border-[#1a2233] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-200 capitalize">
                        {res.section ? res.section.replace(/_/g, ' ') : 'Section'}
                      </span>
                      <ScoreBadge score={res.similarityScore * (res.similarityScore <= 1 ? 100 : 1)} size="sm" />
                    </div>
                    <p className="text-gray-300 font-mono text-[11px] leading-relaxed bg-gray-900/60 p-2 rounded border border-gray-800">
                      "{res.content}"
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
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-bold text-white">Replace Resume</h4>
            <p className="text-xs text-gray-400">
              Uploading a new resume will replace your current file and refresh your extracted skills.
            </p>
            <input
              type="file"
              ref={replaceFileInputRef}
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
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
          <div className="bg-[#111827] border border-rose-900/40 rounded-xl p-5 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-bold text-white">Delete Resume</h4>
            <p className="text-xs text-gray-400">
              Are you sure you want to delete your resume? This will clear your indexed sections.
            </p>
            <div className="flex justify-end gap-2 pt-2">
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
