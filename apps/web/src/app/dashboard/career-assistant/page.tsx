'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Bot,
  User,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  FileText,
  Briefcase,
  AlertTriangle,
  BookOpen,
  SendHorizontal,
  ChevronRight,
  Database,
  CheckCircle2,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import {
  CareerConversationItem,
  CareerMessageItem,
} from '@careerforge/types';
import { api } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';

export default function CareerAssistantPage() {
  const [conversations, setConversations] = useState<CareerConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CareerMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  // 1. Load Conversations on Mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Load Messages when Active Conversation Changes
  useEffect(() => {
    if (activeConversationId) {
      fetchConversationDetails(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // 3. Scroll to Bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
        title: 'New Career Consultation',
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
      const errorMsg = (err as Error).message || 'AI Copilot unavailable. Please try again.';
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
    { label: 'Biggest skill gaps', query: 'What are my biggest skill gaps for my target roles?' },
    { label: 'Next learning steps', query: 'What should I learn next according to my roadmap?' },
    { label: 'Job readiness', query: 'How ready am I for my top matched job vacancies?' },
    { label: 'Resume insights', query: 'What does my parsed resume highlight as my core strengths?' },
  ];

  function getSourceIcon(type: string) {
    switch (type) {
      case 'RESUME':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'JOB':
        return <Briefcase className="w-3.5 h-3.5 text-emerald-400" />;
      case 'SKILL_GAP':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'LEARNING_PATH':
        return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Database className="w-3.5 h-3.5 text-slate-400" />;
    }
  }

  function getStatusBadge(status?: string | null) {
    switch (status) {
      case 'BLOCKED':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold bg-rose-950/70 border border-rose-800/80 text-rose-300 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Security Blocked
          </span>
        );
      case 'INSUFFICIENT_CONTEXT':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold bg-amber-950/70 border border-amber-800/80 text-amber-300 rounded-full flex items-center gap-1">
            <Info className="w-3 h-3" /> Insufficient Context
          </span>
        );
      case 'FALLBACK':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 rounded-full flex items-center gap-1">
            <Database className="w-3 h-3" /> Grounded Fallback
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Grounded Fact-Checked
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-3.5 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white flex items-center gap-2">
              Grounded Career RAG Assistant
              <span className="text-xs font-normal px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                FAISS + Postgres Grounded
              </span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/recommendations"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Recommendations
          </Link>
          <span className="text-slate-700">|</span>
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Conversations Drawer */}
        <div className="w-72 border-r border-slate-800 bg-slate-900/40 flex flex-col">
          <div className="p-4 border-b border-slate-800/80">
            <button
              onClick={handleCreateNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-950"
            >
              <Plus className="w-4 h-4" />
              New Consultation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {isInitializing ? (
              <div className="p-4 text-xs text-slate-500 text-center">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-xs text-slate-500 text-center">No active chats. Start one above!</div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-left transition-all ${
                      isActive
                        ? 'bg-slate-800/90 text-white border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 truncate pr-2">
                      <div className="text-xs font-medium truncate">{conv.title || 'Career Consultation'}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Candidate Data Isolated & Protected</span>
          </div>
        </div>

        {/* Center: Interactive Chat Arena */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner shadow-indigo-500/10">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">How can I assist your career today?</h2>
                  <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                    I answer questions using your verified CareerForge profile, FAISS resume embeddings, skill gaps, learning roadmap, and active job applications.
                  </p>
                </div>

                {/* Quick Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qp.query)}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all group"
                    >
                      <div className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200">
                        {qp.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
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
                    className={`flex gap-3.5 max-w-3xl ${
                      isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                          : 'bg-slate-800 border border-slate-700 text-indigo-400'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Content Box */}
                    <div
                      className={`rounded-2xl p-4 space-y-3 ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-950'
                          : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {/* Status Header for Assistant */}
                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-800/60">
                          {getStatusBadge(msg.responseStatus)}
                          <div className="text-[10px] text-slate-500">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      )}

                      {/* Text */}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {/* Source Citations for Assistant */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60 space-y-2">
                          <button
                            onClick={() =>
                              setExpandedSources((prev) => ({
                                ...prev,
                                [msg.id]: !isSourcesOpen,
                              }))
                            }
                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Grounded Sources ({msg.sources.length})</span>
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
                                  className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs space-y-1"
                                >
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                                    {getSourceIcon(src.sourceType)}
                                    <span>{src.title}</span>
                                    <span className="text-[10px] text-slate-500 font-normal ml-auto">
                                      {src.sourceType}
                                    </span>
                                  </div>
                                  {src.snippet && (
                                    <p className="text-[11px] text-slate-400 italic pl-5">
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
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-slate-500">Was this accurate?</span>
                          <button
                            onClick={() => handleFeedback(msg.id, true)}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                              msg.isHelpful === true ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, false)}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                              msg.isHelpful === false ? 'text-rose-400' : 'text-slate-500'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex gap-3.5 max-w-3xl mr-auto">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="rounded-2xl p-4 bg-slate-900 border border-slate-800 text-slate-400 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Retrieving isolated candidate facts & running grounded generation...</span>
                </div>
              </div>
            )}

            {/* Error Message with Retry */}
            {chatError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{chatError}</span>
                </div>
                {lastFailedQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(lastFailedQuery)}
                    className="border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs py-1 px-3"
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur sticky bottom-0">
            <div className="max-w-4xl mx-auto flex gap-2 sm:gap-2.5 items-end">
              <label htmlFor="career-copilot-input" className="sr-only">
                Ask anything about your career
              </label>
              <textarea
                id="career-copilot-input"
                value={inputText}
                rows={1}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                aria-label="Ask anything about your career, skill gaps, roadmap, or resume"
                placeholder="Ask about skill gaps, roadmap, resume... Press Enter to send"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none max-h-32 min-h-[46px]"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputText.trim()}
                aria-label="Send question to AI Mentor"
                className="h-[46px] px-4 sm:px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all shadow-md shadow-indigo-950 shrink-0"
              >
                <span className="hidden sm:inline">Send</span>
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mt-2 px-1 gap-1">
              <span>🔒 Candidate-scoped grounding with strict guardrails.</span>
              <span>Model: careerforge-grounded-rag-v1</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Ground Truth Context Panel (Desktop Only) */}
        <div className="hidden xl:flex w-80 border-l border-slate-800 bg-slate-900/30 flex-col p-5 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              Grounded Data Sources
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              All answers are constrained to verified candidate records.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> Resume & Profile
                </span>
                <span className="text-[10px] text-emerald-400 font-normal">Active</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Indexed in vector space for semantic similarity discovery.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Skill Gaps
                </span>
                <span className="text-[10px] text-indigo-400 font-normal">Synced</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Evaluates missing required vs preferred skills with priority scoring.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Learning Path
                </span>
                <span className="text-[10px] text-purple-400 font-normal">Active</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Sequential dependency roadmaps using vetted technical resources.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Job Recommendations
                </span>
                <span className="text-[10px] text-emerald-400 font-normal">Targeted</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Multi-signal ranking combining skills, vectors, experience, and preferences.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="text-xs font-semibold text-slate-300">Security & Privacy Guardrails</div>
            <ul className="text-[11px] text-slate-400 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> Zero Cross-Candidate Access
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> Prompt Injection Interception
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> Grounded Fact Verification
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
