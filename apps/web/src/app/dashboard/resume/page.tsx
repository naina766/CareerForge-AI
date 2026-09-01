'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { ResumeMetadata, ParsedResume } from '@careerforge/types';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Lock,
  BrainCircuit,
  Briefcase,
  GraduationCap,
  User,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

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
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'uploading' | 'storing'>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        text: `FAISS vector index generated successfully (${res.data.totalChunks} section vectors). You can now test live semantic search!`,
      });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to create semantic index' });
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
      setMessage({ type: 'error', text: e.message || 'Semantic search failed' });
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

    // Frontend pre-validation
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'Only PDF documents (.pdf) are supported in CareerForge AI.' });
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
      setTimeout(() => setUploadState('storing'), 700);

      const res = await api.upload<{ resume: ResumeMetadata }>('/candidates/me/resume', formData);
      setResume(res.data.resume);
      setParsedResume(null); // Reset parsed resume on new upload
      setMessage({ type: 'success', text: 'Resume uploaded and securely stored! Click "Analyze Resume" to extract structured intelligence.' });
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
      setMessage({ type: 'success', text: 'Resume analyzed successfully! Structured skills, experience, and education extracted.' });
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
      setMessage({ type: 'success', text: 'Resume deleted successfully from storage and profile.' });
    } catch (err: unknown) {
      const e = err as Error;
      setMessage({ type: 'error', text: e.message || 'Failed to delete resume' });
    }
  };

  const handleDownload = async () => {
    try {
      const token = api.getAccessToken();
      const res = await fetch('http://localhost:4000/api/v1/candidates/me/resume/download', {
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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Loading resume pipeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-teal-400" /> Resume Storage & Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Secure resume ingestion with deterministic section parsing and structured intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Encrypted & IDOR Protected
          </span>
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
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Active Resume Card */}
      {resume ? (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-lg shadow-teal-500/10">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white tracking-tight break-all">
                      {resume.originalFileName}
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        resume.processingStatus === 'PARSED'
                          ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                          : resume.processingStatus === 'PROCESSING'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {resume.processingStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span>📄 {formatBytes(resume.fileSize)}</span>
                    <span>•</span>
                    <span>Version {resume.version}</span>
                    <span>•</span>
                    <span>Uploaded {new Date(resume.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {resume.processingStatus !== 'PARSED' ? (
                  <Button
                    size="sm"
                    onClick={handleParseResume}
                    isLoading={isParsing}
                    leftIcon={<BrainCircuit className="w-4 h-4" />}
                  >
                    Analyze Resume
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleParseResume}
                    isLoading={isParsing}
                    leftIcon={<RefreshCw className="w-4 h-4 text-teal-400" />}
                  >
                    Re-Analyze
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  leftIcon={<Download className="w-4 h-4 text-teal-400" />}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReplaceModalOpen(true)}
                  leftIcon={<RefreshCw className="w-4 h-4 text-cyan-400" />}
                >
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Storage Metadata Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  MIME Format
                </span>
                <p className="text-sm font-medium text-white">{resume.mimeType}</p>
                <p className="text-[10px] text-slate-400">Verified via magic byte signature (%PDF-)</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  SHA-256 Checksum
                </span>
                <p className="text-xs font-mono text-teal-300 truncate">{resume.checksum || 'Verified'}</p>
                <p className="text-[10px] text-slate-400">Cryptographic deduplication hash</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Parsing Engine
                </span>
                <p className="text-sm font-medium text-teal-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {parsedResume ? `v${parsedResume.parserVersion} (Active)` : 'Ready'}
                </p>
                <p className="text-[10px] text-slate-400">Deterministic + FastAPI AI extraction</p>
              </div>
            </div>
          </div>

          {/* Parsed Resume Insights Preview Card */}
          {parsedResume && parsedResume.parsedData && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-teal-500/30 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Extracted Resume Intelligence</h2>
                    <p className="text-xs text-slate-400">Structured data extracted from your document (Parser v{parsedResume.parserVersion})</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                  Phase 6 Complete
                </span>
              </div>

              {/* Personal Info Bar */}
              {parsedResume.parsedData.personal && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
                  {parsedResume.parsedData.personal.fullName && (
                    <span className="flex items-center gap-1.5 font-semibold text-white">
                      <User className="w-3.5 h-3.5 text-teal-400" /> {parsedResume.parsedData.personal.fullName}
                    </span>
                  )}
                  {parsedResume.parsedData.personal.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" /> {parsedResume.parsedData.personal.email}
                    </span>
                  )}
                  {parsedResume.parsedData.personal.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" /> {parsedResume.parsedData.personal.phone}
                    </span>
                  )}
                  {parsedResume.parsedData.personal.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {parsedResume.parsedData.personal.location}
                    </span>
                  )}
                  {parsedResume.parsedData.personal.linkedin && (
                    <a
                      href={parsedResume.parsedData.personal.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-teal-400 hover:underline"
                    >
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                  {parsedResume.parsedData.personal.github && (
                    <a
                      href={parsedResume.parsedData.personal.github}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-teal-400 hover:underline"
                    >
                      <Github className="w-3.5 h-3.5" /> GitHub
                    </a>
                  )}
                </div>
              )}

              {/* Professional Summary */}
              {parsedResume.parsedData.summary && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Professional Summary</h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
                    {parsedResume.parsedData.summary}
                  </p>
                </div>
              )}

              {/* Skills Grid */}
              {parsedResume.parsedData.skills && parsedResume.parsedData.skills.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Extracted Technical Skills ({parsedResume.parsedData.skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedResume.parsedData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Timeline */}
              {parsedResume.parsedData.experience && parsedResume.parsedData.experience.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-teal-400" /> Work Experience ({parsedResume.parsedData.experience.length})
                  </h3>
                  <div className="space-y-3">
                    {parsedResume.parsedData.experience.map((exp, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">{exp.title}</h4>
                          <span className="text-[11px] text-slate-400">
                            {exp.startDate || 'N/A'} – {exp.endDate || (exp.isCurrent ? 'Present' : 'N/A')}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-teal-400">{exp.company}</p>
                        {exp.description && (
                          <p className="text-xs text-slate-300 whitespace-pre-line pt-1">{exp.description}</p>
                        )}
                        {exp.technologies && exp.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {exp.technologies.map((tech, tIdx) => (
                              <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Grid */}
              {parsedResume.parsedData.education && parsedResume.parsedData.education.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-cyan-400" /> Education ({parsedResume.parsedData.education.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {parsedResume.parsedData.education.map((edu, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                        <h4 className="text-sm font-bold text-white">{edu.institution}</h4>
                        <p className="text-xs text-cyan-300">{edu.degree} {edu.fieldOfStudy ? `• ${edu.fieldOfStudy}` : ''}</p>
                        <p className="text-[11px] text-slate-400">{edu.startDate || ''} {edu.endDate ? `– ${edu.endDate}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 8: Semantic Vector Indexing & FAISS Search Playground */}
          {parsedResume && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">FAISS Semantic Vector Index</h2>
                    <p className="text-xs text-slate-400">
                      Convert parsed sections into 384-dimensional dense vectors for semantic similarity search
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      indexStatus?.isIndexed
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}
                  >
                    {indexStatus?.isIndexed ? '✓ Vector Index Active' : 'Not Indexed'}
                  </span>
                  <Button
                    size="sm"
                    onClick={handleIndexResume}
                    isLoading={isIndexing}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5 text-indigo-400" />}
                  >
                    {indexStatus?.isIndexed ? 'Re-Index FAISS' : 'Create Semantic Index'}
                  </Button>
                </div>
              </div>

              {/* Index Metadata stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Indexed Chunks</span>
                  <p className="text-sm font-bold text-white">{indexStatus?.indexedChunks || 0} Sections</p>
                  <p className="text-[10px] text-slate-400">Summary, skills, roles, education, projects</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Vector Dimension</span>
                  <p className="text-sm font-bold text-indigo-300">384 Dimensions (L2-Normalized)</p>
                  <p className="text-[10px] text-slate-400">FAISS IndexFlatIP (Inner Product = Cosine)</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Embedding Model</span>
                  <p className="text-xs font-mono text-teal-300 truncate">all-MiniLM-L6-v2</p>
                  <p className="text-[10px] text-slate-400">100% Free & Self-Hosted</p>
                </div>
              </div>

              {/* Semantic Search Interactive Playground */}
              {indexStatus?.isIndexed && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Live Semantic Search Playground
                    </h3>
                    <p className="text-xs text-slate-400">
                      Query your resume using natural language concepts to see vector retrieval in action:
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                      placeholder="e.g. backend developer with Node.js and PostgreSQL"
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <Button
                      size="sm"
                      onClick={handleSemanticSearch}
                      isLoading={isSearching}
                      leftIcon={<BrainCircuit className="w-4 h-4 text-indigo-400" />}
                    >
                      Search
                    </Button>
                  </div>

                  {/* Sample Query Chips */}
                  <div className="flex flex-wrap gap-2 items-center text-xs text-slate-400">
                    <span>Try:</span>
                    {['Node.js backend APIs', 'React and TypeScript', 'Database schema design'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setSearchQuery(chip);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:border-indigo-500/50 transition-colors text-[11px]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Top Semantic Matches ({searchResults.length})
                      </h4>
                      <div className="space-y-2.5">
                        {searchResults.map((res, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {res.section}
                              </span>
                              <span className="text-xs font-mono text-emerald-400 font-semibold">
                                Similarity: {Math.round(res.similarityScore * 100)}% ({res.similarityScore})
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                              {res.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty State & Upload Drag-and-Drop Card */
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`glass-panel rounded-3xl p-10 sm:p-14 border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-5 cursor-pointer ${
              isDragging
                ? 'border-teal-400 bg-teal-500/10 scale-[0.99]'
                : 'border-slate-800 hover:border-teal-500/40 hover:bg-slate-900/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="h-20 w-20 rounded-3xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shadow-xl shadow-teal-500/10">
              <UploadCloud className="w-10 h-10" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isDragging ? 'Drop your resume file here' : 'Drop your resume here or browse files'}
              </h2>
              <p className="text-xs text-slate-400">
                Upload your latest resume in PDF format. CareerForge AI extracts structured skills, experience, and education with deterministic accuracy.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                PDF Document (.pdf)
              </span>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                Maximum 5 MB
              </span>
            </div>

            <Button
              type="button"
              size="md"
              isLoading={isUploading}
              className="mt-2 pointer-events-none"
            >
              {isUploading ? `${uploadState}...` : 'Select PDF Resume'}
            </Button>
          </div>
        </div>
      )}

      {/* Replace Confirmation Modal */}
      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Replace Current Resume?</h3>
                <p className="text-xs text-slate-400">Upload a new version to supersede your current resume</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Uploading a new resume will archive your current resume (<strong className="text-white">{resume?.originalFileName}</strong>) and replace it as your active career profile document.
            </p>

            <input
              ref={replaceFileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReplaceModalOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={isUploading}
                onClick={() => replaceFileInputRef.current?.click()}
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Choose New PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Resume?</h3>
                <p className="text-xs text-slate-400">Permanent removal from storage</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete <strong className="text-white">{resume?.originalFileName}</strong>? The file and parsed intelligence will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteResume}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
