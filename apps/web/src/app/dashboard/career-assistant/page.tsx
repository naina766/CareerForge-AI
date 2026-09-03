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
  Clock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  CareerConversationItem,
  CareerMessageItem,
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
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      case 'LEARNING_PATH':
        return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Database className="w-3.5 h-3.5 text-gray-400" />;
    }
  }

  function getStatusBadge(status?: string | null) {
    switch (status) {
      case 'BLOCKED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-rose-400" /> Security Guardrail
          </span>
        );
      case 'INSUFFICIENT_CONTEXT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400" /> Profile Context Needed
          </span>
        );
      case 'FALLBACK':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-800 border border-gray-700 text-gray-300 rounded-full flex items-center gap-1">
            <Database className="w-3 h-3 text-gray-400" /> Grounded Fallback
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-purple-400" /> Grounded in Profile
          </span>
        );
    }
  }

  return (
    <DashboardShell
      headerTitle="AI Career Mentor"
      headerDescription="Grounded career advisory grounded in your verified resume, skills, and target goals."
    >
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f19] h-[calc(100vh-13rem)] min-h-[580px]">
        {/* Left Sidebar: Conversations Drawer */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#1f2937] bg-[#111827] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#1f2937]">
            <Button
              onClick={handleCreateNewChat}
              className="w-full text-xs justify-center bg-purple-600 hover:bg-purple-500 text-white"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isInitializing ? (
              <div className="p-4 text-xs text-gray-500 text-center">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-xs text-gray-500 text-center">No active chats. Start one above!</div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-left transition-colors ${
                      isActive
                        ? 'bg-purple-600/15 text-white border border-purple-500/30'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 truncate pr-2">
                      <div className="text-xs font-medium truncate">{conv.title || 'Career Consultation'}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 transition-opacity"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2.5 border-t border-[#1f2937] text-[11px] text-gray-400 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Profile Data Isolated & Grounded</span>
          </div>
        </div>

        {/* Center: Interactive Chat Arena */}
        <div className="flex-1 flex flex-col bg-[#030712] overflow-hidden">
          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-8 text-center space-y-5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">How can I guide your career today?</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
                    I answer questions grounded in your verified resume, identified skill gaps, target role benchmarks, and active job applications.
                  </p>
                </div>

                {/* Quick Prompts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qp.query)}
                      className="p-3 rounded-lg bg-[#111827] border border-[#1f2937] hover:border-purple-500/40 transition-colors text-left group"
                    >
                      <div className="text-xs font-semibold text-purple-300 group-hover:text-purple-200">
                        {qp.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        "{qp.query}"
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
                          : 'bg-[#111827] border border-[#1f2937] text-purple-400'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content Box */}
                    <div
                      className={`rounded-xl p-3.5 space-y-2.5 ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#111827] border border-[#1f2937] text-gray-200'
                      }`}
                    >
                      {/* Status Header for Assistant */}
                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 pb-1 border-b border-gray-800">
                          {getStatusBadge(msg.responseStatus)}
                          <div className="text-[10px] text-gray-500">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      )}

                      {/* Text / Insufficient Context Notice */}
                      {msg.responseStatus === 'INSUFFICIENT_CONTEXT' ? (
                        <div className="space-y-2 text-xs">
                          <p className="leading-relaxed text-amber-200">
                            {msg.content}
                          </p>
                          <div className="p-2.5 rounded bg-[#0b0f19] border border-amber-500/20 text-gray-300 space-y-1">
                            <span className="font-semibold text-white block">Suggested next steps:</span>
                            <ul className="list-disc list-inside text-gray-400 space-y-0.5">
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
                        <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSources((prev) => ({
                                ...prev,
                                [msg.id]: !isSourcesOpen,
                              }))
                            }
                            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Grounded Evidence ({msg.sources.length} sources)</span>
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
                                  className="p-2.5 rounded-lg bg-[#0b0f19] border border-gray-800 text-xs space-y-1"
                                >
                                  <div className="flex items-center gap-1.5 font-medium text-gray-200">
                                    {getSourceIcon(src.sourceType)}
                                    <span className="truncate">{src.title}</span>
                                    <span className="text-[10px] text-gray-500 font-normal ml-auto">
                                      {src.sourceType}
                                    </span>
                                  </div>
                                  {src.snippet && (
                                    <p className="text-[11px] text-gray-300 font-mono bg-gray-900/60 p-1.5 rounded border border-gray-800">
                                      "{src.snippet}"
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
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-800/40">
                          <span className="text-[10px] text-gray-500">Accurate advice?</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, true)}
                            className={`p-1 rounded hover:bg-gray-800 transition-colors ${
                              msg.isHelpful === true ? 'text-emerald-400' : 'text-gray-500'
                            }`}
                            aria-label="Mark helpful"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, false)}
                            className={`p-1 rounded hover:bg-gray-800 transition-colors ${
                              msg.isHelpful === false ? 'text-rose-400' : 'text-gray-500'
                            }`}
                            aria-label="Mark unhelpful"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex items-center gap-3 max-w-3xl mr-auto">
                <div className="w-7 h-7 rounded-lg bg-[#111827] border border-[#1f2937] text-purple-400 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="rounded-xl p-3 bg-[#111827] border border-[#1f2937] text-xs text-gray-400 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  <span>Synthesizing grounded career advice...</span>
                </div>
              </div>
            )}

            {chatError && (
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{chatError}</span>
                </div>
                {lastFailedQuery && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendMessage(lastFailedQuery)}
                    className="text-xs border-rose-800 text-rose-300 hover:bg-rose-900/30 shrink-0"
                    leftIcon={<RefreshCw className="w-3 h-3" />}
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 sm:p-4 border-t border-[#1f2937] bg-[#111827]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about skill gaps, learning paths, or career readiness..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0b0f19] border border-[#1f2937] text-xs sm:text-sm text-white placeholder:text-gray-500 outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-500 text-white min-h-[38px] px-3.5"
                aria-label="Send career question"
              >
                <SendHorizontal className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
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
            <div className="h-6 w-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        </DashboardShell>
      }
    >
      <CareerAssistantContent />
    </Suspense>
  );
}
