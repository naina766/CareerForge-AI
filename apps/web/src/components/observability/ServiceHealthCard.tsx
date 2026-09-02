import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { ServiceHealthItem } from '@careerforge/types';

interface ServiceHealthCardProps {
  name: string;
  health: ServiceHealthItem;
}

export const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({ name, health }) => {
  const getStatusBadge = () => {
    switch (health.status) {
      case 'HEALTHY':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Degraded
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Unhealthy
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800/80 text-indigo-400 border border-slate-700/50">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white capitalize tracking-wide">{name}</h3>
        </div>
        {getStatusBadge()}
      </div>

      <p className="text-xs text-slate-400 mb-4 line-clamp-2 min-h-[32px]">
        {health.message || 'Operational with normal responsiveness.'}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Latency</span>
        </div>
        <span className="font-mono font-medium text-slate-200">{health.latencyMs ?? 0} ms</span>
      </div>
    </div>
  );
};
