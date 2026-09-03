import React from 'react';
import Link from 'next/link';
import { Bot, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function AIMentorPreview() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Chat Visual */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4">
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none">Career Copilot</h4>
                    <span className="text-[10px] text-emerald-400 font-medium">Grounded in Candidate Profile</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Career Consultation
                </span>
              </div>

              {/* Message 1: Candidate Question */}
              <div className="flex items-start gap-3 justify-end pl-6">
                <div className="bg-gradient-to-r from-teal-500/15 to-cyan-500/15 border border-teal-500/30 rounded-2xl rounded-tr-sm p-4 max-w-lg">
                  <p className="text-xs sm:text-sm text-slate-200">
                    What should I learn next to become a stronger backend candidate for senior engineering roles?
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-teal-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* Message 2: AI Mentor Grounded Answer */}
              <div className="flex items-start gap-3 pr-6">
                <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-sm p-4 sm:p-5 max-w-xl space-y-3">
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    Based on your verified profile skills and target <strong className="text-white">Senior Backend Engineer</strong> positions, I recommend prioritizing these specific areas:
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-300 pl-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-cyan-400">1.</span>
                      <span><strong className="text-white">System Design:</strong> Scalability, distributed caching, and microservices architecture.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-cyan-400">2.</span>
                      <span><strong className="text-white">Redis:</strong> Session storage, caching layers, and distributed locks.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-cyan-400">3.</span>
                      <span><strong className="text-white">Kafka:</strong> Event-driven architecture and streaming data pipelines.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-bold text-cyan-400">4.</span>
                      <span><strong className="text-white">Kubernetes:</strong> Container orchestration and production workload management.</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      You already have strong foundations in <span className="text-slate-200 font-medium">Node.js, TypeScript, and REST APIs</span>. Your highest-impact immediate step is <span className="text-white font-semibold">System Design</span>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Sample Prompt Shortcuts */}
              <div className="flex flex-wrap gap-2 pt-1 pl-11">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 cursor-pointer transition-colors">
                  💡 Prepare for my upcoming technical interview
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 cursor-pointer transition-colors">
                  🎯 How does my resume match Staff roles?
                </span>
              </div>
            </div>
          </div>

          {/* Right Text Column */}
          <div className="lg:col-span-5 order-1 lg:order-2 space-y-6 text-center lg:text-left">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Grounded AI Guidance
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Your career questions, <br />
              <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                answered with context.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Unlike generic chatbots that offer vague advice, the CareerForge AI Mentor evaluates your actual resumes, target positions, and verified skill gaps to provide grounded, actionable career guidance.
            </p>

            <div className="pt-2">
              <Link href="/dashboard/career-assistant">
                <Button variant="primary" size="md" leftIcon={<Bot className="w-4 h-4" />} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Ask AI Mentor
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
