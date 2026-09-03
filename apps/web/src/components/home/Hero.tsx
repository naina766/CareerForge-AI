
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';

export function Hero() {
  return (
    <section className="relative pt-6 pb-16 md:pt-12 md:pb-24 overflow-hidden">
      {/* Background ambient radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-teal-500/10 via-cyan-500/10 to-indigo-500/10 blur-[130px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-purple-500/5 blur-[90px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Value Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-semibold tracking-wide shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span>AI-Powered Career Intelligence</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Find the{' '}
              <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Right Job.
              </span>
              <br />
              Build the{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Skills to Get It.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              CareerForge AI analyzes your profile, skills, experience, and goals to match you with relevant opportunities and build a personalized path toward your next career move.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link href="/jobs" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full sm:w-auto shadow-xl shadow-teal-500/20"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Jobs
                </Button>
              </Link>

              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-slate-700 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200"
                  leftIcon={<Sparkles className="w-4 h-4 text-cyan-400" />}
                >
                  Get Your AI Career Plan
                </Button>
              </Link>
            </div>

            {/* Micro value cues */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> AI-powered matching
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Personalized skill gaps
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Grounded career guidance
              </span>
            </div>
          </div>

          {/* Right Column: Hero Visual (Interactive AI Match Mockup) */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Ambient glow behind card */}
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 via-cyan-500/15 to-indigo-500/20 blur-2xl -z-10 rounded-3xl" />

            {/* Main Centerpiece Card */}
            <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5 relative">
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">AI Career Match</span>
                </div>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                  Live Preview
                </span>
              </div>

              {/* Role & Top Match Rating */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">Senior Full Stack Developer</h3>
                  <p className="text-xs text-slate-400 mt-0.5">TechNova Innovations • Remote</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    87%
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Strong Match</span>
                </div>
              </div>

              {/* Match Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500 h-2.5 rounded-full w-[87%]" />
                </div>
              </div>

              {/* Signal Breakdown */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Skills</span>
                  <span className="text-xs font-bold text-teal-300 font-mono">92%</span>
                </div>
                <div className="border-x border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Experience</span>
                  <span className="text-xs font-bold text-cyan-300 font-mono">84%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Semantic Fit</span>
                  <span className="text-xs font-bold text-indigo-300 font-mono">89%</span>
                </div>
              </div>

              {/* Matched Skills Tags */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium flex items-center gap-1">
                    ✓ React
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium flex items-center gap-1">
                    ✓ Node.js
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium flex items-center gap-1">
                    ✓ TypeScript
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium">
                    + 2 skills to bridge
                  </span>
                </div>
              </div>

              {/* Action */}
              <Link href="/jobs" className="block pt-1">
                <div className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs font-semibold text-center text-slate-200 transition-colors flex items-center justify-center gap-2">
                  <span>View Match Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                </div>
              </Link>

              {/* Floating Chip 1: AI Recommendation */}
              <div className="absolute -top-5 -right-4 sm:-right-6 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-3 animate-pulse duration-1000">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">AI Recommendation</div>
                  <div className="text-[10px] text-slate-400">3 new jobs match your profile</div>
                </div>
              </div>

              {/* Floating Chip 2: Skill Gap Bridge */}
              <div className="absolute -bottom-5 -left-4 sm:-left-6 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">Career Readiness</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-semibold">82% Target Achieved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
