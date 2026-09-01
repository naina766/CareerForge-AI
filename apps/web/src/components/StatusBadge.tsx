'use client';

import React from 'react';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  serviceName: string;
  status: 'ok' | 'degraded' | 'offline';
  port: number;
}

export function StatusBadge({ serviceName, status, port }: StatusBadgeProps) {
  const statusConfig = {
    ok: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400',
      icon: CheckCircle2,
      label: 'Operational'
    },
    degraded: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-400',
      icon: Activity,
      label: 'Degraded'
    },
    offline: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-400',
      icon: AlertCircle,
      label: 'Offline'
    }
  };

  const current = statusConfig[status];
  const Icon = current.icon;

  return (
    <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${current.bg} transition-all duration-200`}>
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`}></span>
        </span>
        <span className="font-medium text-sm text-slate-200">{serviceName}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-mono">:{port}</span>
        <div className="flex items-center gap-1 font-semibold">
          <Icon className="w-3.5 h-3.5" />
          <span>{current.label}</span>
        </div>
      </div>
    </div>
  );
}
