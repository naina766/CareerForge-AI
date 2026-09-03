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
      className={`bg-[#111827] border border-[#1f2937] rounded-xl p-4 flex flex-col justify-between space-y-3 transition-colors hover:border-gray-700 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400">{label}</span>
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
          {subvalue && (
            <span className="text-xs text-gray-400 font-medium truncate">{subvalue}</span>
          )}
          {trend && (
            <span
              className={`text-xs font-medium ${
                trendPositive === false ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>

        {progress !== undefined && (
          <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {description && (
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed truncate">{description}</p>
        )}
      </div>
    </div>
  );
}
