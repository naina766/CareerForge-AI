import React from 'react';
import { Layers, Activity, UserCircle2, CheckCircle } from 'lucide-react';

export function ProductCapabilities() {
  const metrics = [
    {
      value: '5',
      label: 'Career Intelligence Modules',
      subtext: 'Matching, ATS, Skill Gap, Learning Paths, AI Mentor',
      icon: <Layers className="w-5 h-5 text-teal-400" />,
    },
    {
      value: '4',
      label: 'Personalized Fit Signals',
      subtext: 'Skills (40%), Semantics (25%), Experience (20%), Roles (15%)',
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
    },
    {
      value: '1',
      label: 'Unified Career Profile',
      subtext: 'Continuous career readiness & milestone tracking',
      icon: <UserCircle2 className="w-5 h-5 text-blue-400" />,
    },
    {
      value: '100%',
      label: 'Explainable Guidance',
      subtext: 'Transparent match reasoning with zero black-box scoring',
      icon: <CheckCircle className="w-5 h-5 text-indigo-400" />,
    },
  ];

  return (
    <section className="py-12 border-y border-slate-800/60 bg-slate-950/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 transition-all text-center space-y-2"
            >
              <div className="mx-auto w-fit p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                {item.icon}
              </div>
              <div className="text-3xl font-black text-white font-mono">{item.value}</div>
              <div className="text-sm font-bold text-slate-200">{item.label}</div>
              <div className="text-xs text-slate-400 leading-tight">{item.subtext}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
