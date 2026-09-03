import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'ai' | 'success' | 'warning' | 'neutral';
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  badgeVariant = 'primary',
  action,
  className = '',
}: PageHeaderProps) {
  const badgeClasses = {
    primary: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ai: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    neutral: 'bg-gray-800 text-gray-300 border-gray-700',
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
          {badge && (
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeClasses[badgeVariant]}`}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-400 max-w-3xl leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
