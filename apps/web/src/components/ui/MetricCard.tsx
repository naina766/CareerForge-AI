import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: string;
  trendPositive?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  progress?: number;
  description?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subvalue,
  trend,
  trendPositive,
  icon: Icon,
  iconColor = 'text-blue-400',
  progress,
  description,
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`bg-[#0d121f] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors hover:border-slate-700 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
          {subvalue && (
            <span className="text-xs text-slate-400 font-medium truncate">{subvalue}</span>
          )}
          {trend && (
            <span
              className={`text-xs font-semibold ${
                trendPositive === false ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>

        {progress !== undefined && (
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {description && (
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed truncate">{description}</p>
        )}
      </div>
    </div>
  );
}
