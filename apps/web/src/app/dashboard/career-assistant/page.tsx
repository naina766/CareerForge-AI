'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bot,
  User,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  FileText,
  Briefcase,
  AlertCircle,
  BookOpen,
  SendHorizontal,
  ChevronRight,
  Database,
  CheckCircle2,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  CareerConversationItem,
  CareerMessageItem,
  CandidateProfileSummary,
} from '@careerforge/types';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { DashboardShell } from '../../../components/dashboard/DashboardShell';

function CareerAssistantContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');

  const [conversations, setConversations] = useState<CareerConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CareerMessageItem[]>([]);
  const [profileSummary, setProfileSummary] = useState<CandidateProfileSummary | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  // 1. Load Conversations and Profile on Mount
  useEffect(() => {
    fetchConversations();
    fetchProfileContext();
  }, []);

  // 2. Load Messages when Active Conversation Changes
  useEffect(() => {
    if (activeConversationId) {
      fetchConversationDetails(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // 3. Handle incoming initial query from dashboard
  useEffect(() => {
    if (initialQuery && !isLoading && conversations.length > 0) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  // 4. Scroll to Bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function fetchProfileContext() {
    try {
      const res = await api.get<{ profile: CandidateProfileSummary }>('/candidates/me/profile');
      if (res?.data?.profile) {
        setProfileSummary(res.data.profile);
      }
    } catch {
      // Fallback silently if unauthenticated or error
    }
  }

  async function fetchConversations() {
    try {
      setIsInitializing(true);
      setChatError(null);
      const res = await api.get<CareerConversationItem[]>('/career-assistant/conversations');
      const convs = res.data || [];
      setConversations(convs);
      if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0].id);
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    } finally {
      setIsInitializing(false);
    }
  }

  async function fetchConversationDetails(id: string) {
    try {
      const res = await api.get<CareerConversationItem>(`/career-assistant/conversations/${id}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.warn('Failed to load conversation messages:', err);
    }
  }

  async function handleCreateNewChat() {
    try {
      const res = await api.post<CareerConversationItem>('/career-assistant/conversations', {
        title: 'Career Consultation',
      });
      const newConv = res.data;
      setConversations([newConv, ...conversations]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.warn('Failed to create new chat:', err);
    }
  }

  async function handleDeleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.request(`/career-assistant/conversations/${id}`, { method: 'DELETE' });
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      if (activeConversationId === id) {
        setActiveConversationId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      console.warn('Failed to delete chat:', err);
    }
  }

  async function handleSendMessage(overrideQuery?: string) {
    const queryToSend = overrideQuery || inputText;
    if (!queryToSend.trim() || isLoading) return;

    let targetConvId = activeConversationId;
    setChatError(null);
    setLastFailedQuery(null);

    // Auto-create chat if none active
    if (!targetConvId) {
      try {
        const res = await api.post<CareerConversationItem>('/career-assistant/conversations', {
          title: queryToSend.slice(0, 30),
        });
        targetConvId = res.data.id;
        setActiveConversationId(targetConvId);
        setConversations([res.data, ...conversations]);
      } catch (err) {
        console.error('Auto-create chat failed:', err);
        setChatError('Could not initialize conversation session. Please try again.');
        return;
      }
    }

    const optimisticUserMsg: CareerMessageItem = {
      id: `temp-${Date.now()}`,
      conversationId: targetConvId!,
      role: 'USER',
      content: queryToSend,
      sources: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await api.post<{
        messageId: string;
        answer: string;
        status?: any;
        sources?: any[];
      }>(`/career-assistant/conversations/${targetConvId}/messages`, {
        message: queryToSend,
      });

      const ragRes = res.data;
      const assistantMsg: CareerMessageItem = {
        id: ragRes.messageId || `msg-${Date.now()}`,
        conversationId: targetConvId!,
        role: 'ASSISTANT',
        content: ragRes.answer,
        responseStatus: ragRes.status || 'SUCCESS',
        sources: ragRes.sources || [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'The Career Mentor is temporarily unavailable. Your profile is safe.';
      setChatError(errorMsg);
      setLastFailedQuery(queryToSend);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFeedback(messageId: string, isHelpful: boolean) {
    try {
      await api.post(`/career-assistant/messages/${messageId}/feedback`, { isHelpful });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isHelpful } : m))
      );
    } catch (err) {
      console.warn('Feedback failed:', err);
    }
  }

  const quickPrompts = [
    { label: 'Highest priority gap', query: 'What are my biggest skill gaps for my target roles?' },
    { label: 'Next roadmap step', query: 'What should I learn next according to my roadmap?' },
    { label: 'Market readiness', query: 'How ready am I for my top matched job vacancies?' },
    { label: 'Resume highlights', query: 'What does my parsed resume highlight as my core strengths?' },
  ];

  function getSourceIcon(type: string) {
    switch (type) {
      case 'RESUME':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'JOB':
        return <Briefcase className="w-3.5 h-3.5 text-emerald-400" />;
      case 'SKILL_GAP':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'LEARNING_PATH':
        return <BookOpen className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Database className="w-3.5 h-3.5 text-slate-400" />;
    }
  }

  function getStatusBadge(status?: string | null) {
    switch (status) {
      case 'BLOCKED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-rose-400" /> Guardrail Blocked
          </span>
        );
      case 'INSUFFICIENT_CONTEXT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400" /> Context Incomplete
          </span>
        );
      case 'FALLBACK':
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300 rounded flex items-center gap-1">
            <Database className="w-3 h-3 text-slate-400" /> Grounded Fallback
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Grounded in Profile
          </span>
        );
    }
  }

  const targetRole = profileSummary?.profile?.headline || 'Senior Backend Engineer';
  const skillsList: string[] = (profileSummary?.profile as any)?.skills || ['Node.js', 'PostgreSQL', 'TypeScript', 'Docker', 'REST APIs'];

  return (
    <DashboardShell
      headerTitle="AI Career Mentor"
      headerDescription="Grounded technical guidance anchored in your verified resume and target role benchmarks."
      actionButton={
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreateNewChat}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Consultation
        </Button>
      }
    >
      <div className="flex flex-col lg:flex-row h-[calc(100vh-14rem)] min-h-[580px] bg-[#0d121f] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {/* Left Drawer: Active Profile Context & Session History (w-80) */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#090d16] flex flex-col justify-between shrink-0">
          <div className="space-y-4 p-4 overflow-y-auto">
            {/* Active Context Panel */}
            <div className="p-3.5 rounded-xl bg-[#0d121f] border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                  Candidate Context
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Target Role</span>
                <span className="font-bold text-white text-xs">{targetRole}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono mb-1">
                  Active Taxonomy Skills
                </span>
                <div className="flex flex-wrap gap-1">
                  {skillsList.slice(0, 5).map((sk: any, i: number) => {
                    const name = typeof sk === 'string' ? sk : sk?.name || 'Skill';
                    return (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Conversation Sessions List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 font-semibold uppercase">
                <span>Recent Consultations</span>
                <span>{conversations.length}</span>
              </div>

              {isInitializing ? (
                <div className="py-4 text-center text-xs text-slate-500">Loading sessions...</div>
              ) : conversations.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">No previous sessions</div>
              ) : (
                conversations.map((conv) => {
                  const isCurrent = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={`group p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors border ${
                        isCurrent
                          ? 'bg-[#131a2c] text-white border-blue-500/50 font-medium'
                          : 'bg-[#0d121f] text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-medium">{conv.title || 'Career Consultation'}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChat(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                        aria-label={`Delete conversation ${conv.title || 'Career Consultation'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="font-mono text-[10px]">Data Isolated & Candidate-Scoped</span>
          </div>
        </aside>

        {/* Center: Conversation Stream & Message Form */}
        <section className="flex-1 flex flex-col bg-[#090d16] overflow-hidden">
          {/* Message Stream */}
          <div role="log" aria-live="polite" aria-label="Career mentor conversation history" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">How can I guide your career today?</h2>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                    Ask questions grounded in your verified resume chunks, identified skill gaps, and live vacancy requirements.
                  </p>
                </div>

                {/* Quick Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(qp.query)}
                      className="p-3.5 rounded-xl bg-[#0d121f] border border-slate-800 hover:border-blue-500/40 transition-colors text-left group"
                    >
                      <div className="text-xs font-semibold text-blue-300 group-hover:text-blue-200">
                        {qp.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        &quot;{qp.query}&quot;
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'USER';
                const isSourcesOpen = expandedSources[msg.id] ?? false;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl ${
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#0d121f] border border-slate-800 text-blue-400'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content Box */}
                    <div
                      className={`rounded-xl p-4 space-y-2.5 ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#0d121f] border border-slate-800 text-slate-200'
                      }`}
                    >
                      {/* Status Header for Assistant */}
                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800">
                          {getStatusBadge(msg.responseStatus)}
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      )}

                      {/* Content Body */}
                      {msg.responseStatus === 'INSUFFICIENT_CONTEXT' ? (
                        <div className="space-y-2 text-xs">
                          <p className="leading-relaxed text-amber-200">
                            {msg.content}
                          </p>
                          <div className="p-2.5 rounded bg-[#090d16] border border-amber-500/20 text-slate-300 space-y-1">
                            <span className="font-semibold text-white block">Suggested next steps:</span>
                            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                              <li>Upload an updated resume in <a href="/dashboard/resume" className="text-blue-400 underline">Resume Lab</a></li>
                              <li>Set your target role in <a href="/dashboard/profile" className="text-blue-400 underline">Profile & Goals</a></li>
                              <li>Ask about verified skills currently in your profile</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}

                      {/* Source Citations for Assistant */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSources((prev) => ({
                                ...prev,
                                [msg.id]: !isSourcesOpen,
                              }))
                            }
                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Grounded Citations ({msg.sources.length} sources)</span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform ${
                                isSourcesOpen ? 'rotate-90' : ''
                              }`}
                            />
                          </button>

                          {isSourcesOpen && (
                            <div className="space-y-1.5 pt-1">
                              {msg.sources.map((src, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800 text-xs space-y-1"
                                >
                                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                                    {getSourceIcon(src.sourceType)}
                                    <span className="truncate">{src.title}</span>
                                    <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                      {src.sourceType}
                                    </span>
                                  </div>
                                  {src.snippet && (
                                    <p className="text-[11px] text-slate-300 font-mono bg-[#0d121f] p-1.5 rounded border border-slate-800">
                                      &quot;{src.snippet}&quot;
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feedback Trigger for Assistant */}
                      {!isUser && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-500">Accurate advice?</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, true)}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                              msg.isHelpful === true ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                            aria-label="Mark advice as helpful"
                          >
                            <ThumbsUp className="w-3 h-3" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, false)}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                              msg.isHelpful === false ? 'text-rose-400' : 'text-slate-500'
                            }`}
                            aria-label="Mark advice as unhelpful"
                          >
                            <ThumbsDown className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div role="status" aria-live="polite" className="flex items-center gap-3 max-w-3xl mr-auto">
                <div className="w-7 h-7 rounded-lg bg-[#0d121f] border border-slate-800 text-blue-400 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
                </div>
                <div className="rounded-xl p-3 bg-[#0d121f] border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" aria-hidden="true" />
                  <span>Synthesizing grounded career guidance...</span>
                </div>
              </div>
            )}

            {chatError && (
              <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>{chatError}</span>
                </div>
                {lastFailedQuery && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendMessage(lastFailedQuery)}
                    className="text-xs border-rose-800 text-rose-300 hover:bg-rose-900/30 shrink-0"
                    leftIcon={<RefreshCw className="w-3 h-3" aria-hidden="true" />}
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 sm:p-4 border-t border-slate-800 bg-[#0d121f]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                id="career-mentor-input"
                name="careerQuery"
                type="text"
                aria-label="Ask your career mentor a question"
                placeholder="Ask about skill gaps, learning paths, or career readiness..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!inputText.trim() || isLoading}
                className="min-h-[38px] px-3.5"
                aria-label="Send career question"
              >
                <SendHorizontal className="w-4 h-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export default function CareerAssistantPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell headerTitle="AI Career Mentor">
          <div className="py-12 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        </DashboardShell>
      }
    >
      <CareerAssistantContent />
    </Suspense>
  );
}
