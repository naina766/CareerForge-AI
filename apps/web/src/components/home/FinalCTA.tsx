import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Briefcase } from 'lucide-react';
import { Button } from '../ui/Button';

export function FinalCTA() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-teal-950/20 via-slate-950 to-transparent pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-teal-500/10 blur-[130px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Elevate Your Career Trajectory</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Your next opportunity starts with{' '}
          <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            knowing where you stand.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Discover your best-fit roles, understand your gaps, and build a smarter path forward with CareerForge AI.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link href="/register" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="primary"
              className="w-full sm:w-auto shadow-xl shadow-teal-500/20"
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Get Started Free
            </Button>
          </Link>

          <Link href="/jobs" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200"
              leftIcon={<Briefcase className="w-4 h-4 text-cyan-400" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Explore Jobs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
