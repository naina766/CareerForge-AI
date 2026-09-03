import React from 'react';
import Link from 'next/link';
import { CheckCircle2, PlusCircle, ArrowRight, Building2, MapPin, DollarSign, Briefcase } from 'lucide-react';
import { Button } from '../ui/Button';

export function JobMatchPreview() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-transparent via-slate-950/60 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Context Column */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Explainable Job Matching
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Stop applying blindly. <br />
              <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Know why a role fits you
              </span>{' '}
              before you apply.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Traditional job boards rank applications by keyword frequency. CareerForge computes multi-dimensional match scores across your verified skills, project depth, and role requirements—so you always know your exact readiness.
            </p>

            <div className="pt-2">
              <Link href="/jobs">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Matched Jobs
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Preview Card */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
              {/* Job Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs font-semibold">
                    <Building2 className="w-3.5 h-3.5" /> TechNova
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Senior Full Stack Engineer</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> Remote
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" /> Full Time
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-200 font-mono font-medium">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> $120K — $160K
                    </span>
                  </div>
                </div>

                {/* Score Widget */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-center self-start shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Overall Match</span>
                  <div className="text-3xl font-black bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent font-mono">
                    87%
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400">High Confidence</span>
                </div>
              </div>

              {/* Match Factors Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block">Skills Match</span>
                  <span className="text-sm font-bold text-teal-300 font-mono">92%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block">Experience</span>
                  <span className="text-sm font-bold text-cyan-300 font-mono">81%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block">Role Fit</span>
                  <span className="text-sm font-bold text-indigo-300 font-mono">90%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
                  <span className="text-[11px] text-slate-400 block">Location</span>
                  <span className="text-sm font-bold text-emerald-300 font-mono">100%</span>
                </div>
              </div>

              {/* Two Columns: Why Matches vs Bridgeable Gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Why this matches you */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Why this matches you
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    <li className="flex items-center gap-1.5">✓ React & Next.js ecosystem</li>
                    <li className="flex items-center gap-1.5">✓ Node.js / TypeScript API design</li>
                    <li className="flex items-center gap-1.5">✓ PostgreSQL database architecture</li>
                    <li className="flex items-center gap-1.5">✓ REST & GraphQL integrations</li>
                  </ul>
                </div>

                {/* Your opportunity */}
                <div className="space-y-2 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4" /> Your opportunity
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    <li className="flex items-center gap-1.5">+ Add Kubernetes cluster fundamentals</li>
                    <li className="flex items-center gap-1.5">+ Deepen AWS cloud deployment patterns</li>
                    <li className="text-[11px] text-slate-400 pt-1">
                      Target readiness reaches 94% upon completing 2 learning items.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="pt-2 flex justify-end">
                <Link href="/jobs" className="w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4 text-teal-400" />}>
                    View Full Match
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
