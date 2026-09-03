import React from 'react';
import { UserCheck, Sparkles, SearchCheck, Rocket, ArrowRight } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Build Your Profile',
      description: 'Add your skills, work experience, education, and specific target career roles.',
      icon: <UserCheck className="w-5 h-5 text-teal-400" />,
      accent: 'text-teal-400',
      badgeBg: 'bg-teal-500/10 border-teal-500/20',
    },
    {
      step: '02',
      title: 'AI Understands Your Fit',
      description: 'CareerForge evaluates your multi-dimensional alignment across skills, experience, and semantics.',
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
      accent: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      step: '03',
      title: 'Discover Your Gaps',
      description: 'See clear, explainable breakdowns of missing skills for high-priority target opportunities.',
      icon: <SearchCheck className="w-5 h-5 text-blue-400" />,
      accent: 'text-blue-400',
      badgeBg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      step: '04',
      title: 'Take the Next Step',
      description: 'Follow tailored learning milestones, track career readiness, and apply with high confidence.',
      icon: <Rocket className="w-5 h-5 text-indigo-400" />,
      accent: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/10 border-indigo-500/20',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Intelligent Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            From your profile to your next opportunity.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            CareerForge operates as a continuous career intelligence engine—translating where you are today into the exact steps required to reach your target role.
          </p>
        </div>

        {/* 4 Steps Grid with Connection Line */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item, index) => (
            <div
              key={index}
              className="relative rounded-3xl p-6 bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header: Step Number & Icon */}
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-black font-mono tracking-wider ${item.accent}`}>
                    {item.step}
                  </span>
                  <div className={`p-2.5 rounded-2xl border ${item.badgeBg}`}>
                    {item.icon}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight mb-2 group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Step indicator arrow (for desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-slate-600 group-hover:text-cyan-400 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
