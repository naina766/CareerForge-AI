import React from 'react';
import { Target, Bot, BarChart2, Compass, FileText } from 'lucide-react';

export function FeatureStrip() {
  const features = [
    {
      icon: <Target className="w-5 h-5 text-teal-400" />,
      title: 'Smart Job Matching',
      description: 'Hybrid scoring tailored to your career trajectory',
      color: 'from-teal-500/10 to-teal-500/5',
      borderColor: 'group-hover:border-teal-500/40',
    },
    {
      icon: <Bot className="w-5 h-5 text-cyan-400" />,
      title: 'AI Career Mentor',
      description: 'Grounded advisory context based on your profile',
      color: 'from-cyan-500/10 to-cyan-500/5',
      borderColor: 'group-hover:border-cyan-500/40',
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-blue-400" />,
      title: 'Skill Gap Analysis',
      description: 'Identify exact missing capabilities for target roles',
      color: 'from-blue-500/10 to-blue-500/5',
      borderColor: 'group-hover:border-blue-500/40',
    },
    {
      icon: <Compass className="w-5 h-5 text-indigo-400" />,
      title: 'Personalized Learning',
      description: 'Prioritized roadmaps to bridge verified gaps',
      color: 'from-indigo-500/10 to-indigo-500/5',
      borderColor: 'group-hover:border-indigo-500/40',
    },
    {
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      title: 'Resume Intelligence',
      description: 'Deep ATS parsing and keyword extraction',
      color: 'from-purple-500/10 to-purple-500/5',
      borderColor: 'group-hover:border-purple-500/40',
    },
  ];

  return (
    <section className="py-8 border-y border-slate-800/60 bg-slate-950/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Everything you need to move your career forward
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 ${feature.borderColor} transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-md flex flex-col justify-between`}
            >
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-slate-800/80 w-fit border border-slate-700/50">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">{feature.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
